import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar token de autorização
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return NextResponse.json(
        { message: 'Token de acesso necessário' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { message: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verificar permissões
    if (!['analista', 'gerencia'].includes(decoded.role)) {
      return NextResponse.json(
        { message: 'Acesso negado. Apenas analistas podem fazer upload de escalas.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mes = parseInt(formData.get('mes') as string);
    const ano = parseInt(formData.get('ano') as string);

    if (!file) {
      return NextResponse.json(
        { message: 'Arquivo não fornecido' },
        { status: 400 }
      );
    }

    if (!mes || !ano || mes < 1 || mes > 12) {
      return NextResponse.json(
        { message: 'Mês e ano são obrigatórios e devem ser válidos' },
        { status: 400 }
      );
    }

    // Ler o conteúdo do arquivo CSV
    const csvContent = await file.text();
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { message: 'Arquivo CSV deve conter pelo menos uma linha de cabeçalho e uma linha de dados' },
        { status: 400 }
      );
    }

    // Analisar cabeçalho - detectar separador automaticamente
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
    
    console.log('Separator detected:', separator);
    console.log('Headers found:', headers);
    
    // Verificar colunas obrigatórias (case insensitive)
    const requiredColumns = ['MATRICULA', 'NOME', 'RESPONSAVEL', 'DEPART', 'GRUPO', 'FUNÇÃO', 'COD_ESCALA'];
    const headersUpper = headers.map(h => h.toUpperCase());
    const missingColumns = requiredColumns.filter(col => !headersUpper.includes(col));
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { message: `Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}` },
        { status: 400 }
      );
    }

    // Encontrar colunas dos dias (1-31)
    const dayColumns = [];
    for (let day = 1; day <= 31; day++) {
      const dayIndex = headers.indexOf(day.toString());
      if (dayIndex !== -1) {
        dayColumns.push({ day, index: dayIndex });
      }
    }
    
    console.log('Day columns found:', dayColumns.length);

    // Verificar se já existe escala para este mês/ano
    const { data: existingEscalas, error: checkError } = await supabase
      .from('escalas')
      .select('id, colaborador_id')
      .eq('mes', mes)
      .eq('ano', ano);

    if (checkError) {
      return NextResponse.json(
        { message: `Erro ao verificar escalas existentes: ${checkError?.message || 'Erro desconhecido'}` },
        { status: 500 }
      );
    }

    let replacedData = false;
    if (existingEscalas && existingEscalas.length > 0) {
      console.log(`Encontradas ${existingEscalas.length} escalas existentes para ${mes}/${ano}. Iniciando limpeza...`);
      
      const escalaIds = existingEscalas.map(e => e.id);
      const batchSize = 50; // Processar em lotes de 50 para evitar URL muito grande
      
      try {
        // 1. Primeiro, deletar solicitações de alteração em lotes
        for (let i = 0; i < escalaIds.length; i += batchSize) {
          const batch = escalaIds.slice(i, i + batchSize);
          
          // Buscar escala_dia_ids relacionados a essas escalas
          const { data: escalaDias, error: fetchError } = await supabase
            .from('escala_dias')
            .select('id')
            .in('escala_id', batch);

          if (fetchError) {
            console.error('Erro ao buscar dias das escalas:', fetchError);
            continue;
          }

          if (escalaDias && escalaDias.length > 0) {
            const escalaDiaIds = escalaDias.map(d => d.id);
            
            // Deletar solicitações que referenciam esses escala_dia_ids
            for (let j = 0; j < escalaDiaIds.length; j += batchSize) {
              const diaBatch = escalaDiaIds.slice(j, j + batchSize);
              const { error: deleteSolicitacoesError } = await supabase
                .from('solicitacoes_alteracao')
                .delete()
                .in('escala_dia_id', diaBatch);

              if (deleteSolicitacoesError) {
                console.error('Erro ao deletar solicitações (lote):', deleteSolicitacoesError);
              }
            }
          }
        }

        // 2. Deletar dias das escalas em lotes
        for (let i = 0; i < escalaIds.length; i += batchSize) {
          const batch = escalaIds.slice(i, i + batchSize);
          const { error: deleteDiasError } = await supabase
            .from('escala_dias')
            .delete()
            .in('escala_id', batch);

          if (deleteDiasError) {
            console.error('Erro ao deletar dias das escalas (lote):', deleteDiasError);
          }
        }

        // 3. Deletar as escalas em lotes
        for (let i = 0; i < escalaIds.length; i += batchSize) {
          const batch = escalaIds.slice(i, i + batchSize);
          const { error: deleteEscalasError } = await supabase
            .from('escalas')
            .delete()
            .in('id', batch);

          if (deleteEscalasError) {
            console.error('Erro ao deletar escalas (lote):', deleteEscalasError);
          }
        }

        console.log('Escalas anteriores e dados relacionados foram removidos com sucesso');
        replacedData = true;

      } catch (error) {
        console.error('Erro durante limpeza de dados:', error);
        return NextResponse.json(
          { message: `Erro ao limpar dados existentes: ${error instanceof Error ? error.message : String(error)}` },
          { status: 500 }
        );
      }
    }

    const stats = {
      colaboradores: 0,
      dias: 0,
      errors: [] as string[],
      replacedExisting: replacedData,
      removedEscalas: existingEscalas?.length || 0
    };

    // Processar cada linha de dados
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
        
        // Extrair dados do colaborador (case insensitive)
        const getColumnValue = (columnName: string) => {
          const index = headersUpper.indexOf(columnName.toUpperCase());
          return index !== -1 ? values[index]?.trim() : null;
        };

        const matricula = getColumnValue('MATRICULA');
        const nome = getColumnValue('NOME');
        const responsavel = getColumnValue('RESPONSAVEL');
        const departamento = getColumnValue('DEPART');
        const grupo = getColumnValue('GRUPO');
        const funcao = getColumnValue('FUNÇÃO');
        const codEscala = getColumnValue('COD_ESCALA');

        if (!matricula || !nome) {
          stats.errors.push(`Linha ${i + 1}: Matrícula e nome são obrigatórios`);
          continue;
        }

        // Inserir ou atualizar colaborador
        const { data: colaboradorData, error: colaboradorError } = await supabase
          .from('colaboradores')
          .upsert({
            matricula,
            nome,
            responsavel: responsavel || null,
            departamento: departamento || null,
            grupo: grupo || null,
            funcao: funcao || null,
            cod_escala: codEscala || null,
            horario_trabalho: codEscala || null, // Assumindo que o código da escala também é o horário
            ativo: true
          }, {
            onConflict: 'matricula'
          })
          .select('id')
          .single();

        if (colaboradorError) {
          stats.errors.push(`Linha ${i + 1}: Erro ao salvar colaborador: ${colaboradorError?.message || 'Erro desconhecido'}`);
          continue;
        }

        const colaboradorId = colaboradorData.id;
        stats.colaboradores++;

        // Inserir ou atualizar escala
        const { data: escalaData, error: escalaError } = await supabase
          .from('escalas')
          .upsert({
            colaborador_id: colaboradorId,
            mes,
            ano,
            upload_file_name: file.name,
            uploaded_by: decoded.id
          }, {
            onConflict: 'colaborador_id,mes,ano'
          })
          .select('id')
          .single();

        if (escalaError) {
          stats.errors.push(`Linha ${i + 1}: Erro ao salvar escala: ${escalaError?.message || 'Erro desconhecido'}`);
          continue;
        }

        const escalaId = escalaData.id;

        // Processar dias da escala
        for (const { day, index } of dayColumns) {
          const valorDia = values[index]?.trim();
          
          if (valorDia) {
            let status = null;
            let horario = null;

            // Verificar se é um status especial (FR, FT, TR, FC, DT)
            if (['FR', 'FT', 'TR', 'FC', 'DT'].includes(valorDia.toUpperCase())) {
              status = valorDia.toUpperCase();
            } else {
              // Assumir que é horário de trabalho
              horario = valorDia;
            }

            // Inserir ou atualizar dia da escala
            const { error: diaError } = await supabase
              .from('escala_dias')
              .upsert({
                escala_id: escalaId,
                dia: day,
                status,
                horario,
                alterado: false
              }, {
                onConflict: 'escala_id,dia'
              });

            if (diaError) {
              stats.errors.push(`Linha ${i + 1}, Dia ${day}: ${diaError?.message || 'Erro desconhecido'}`);
            } else {
              stats.dias++;
            }
          }
        }

      } catch (error) {
        stats.errors.push(`Linha ${i + 1}: Erro ao processar linha: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Retornar resultado
    const hasErrors = stats.errors.length > 0;
    
    let message = '';
    if (stats.replacedExisting) {
      message = hasErrors 
        ? `⚠️ ESCALA SUBSTITUÍDA: Upload concluído com ${stats.errors.length} erros. Escala anterior para ${mes}/${ano} foi removida (${stats.removedEscalas} registros), incluindo todas as solicitações de alteração. ${stats.colaboradores} colaboradores e ${stats.dias} dias processados.`
        : `✅ ESCALA SUBSTITUÍDA: Upload realizado com sucesso! Escala anterior para ${mes}/${ano} foi removida (${stats.removedEscalas} registros), incluindo todas as solicitações de alteração. ${stats.colaboradores} colaboradores e ${stats.dias} dias importados.`;
    } else {
      message = hasErrors 
        ? `Upload concluído com ${stats.errors.length} erros. ${stats.colaboradores} colaboradores e ${stats.dias} dias processados.`
        : `Upload realizado com sucesso! ${stats.colaboradores} colaboradores e ${stats.dias} dias importados.`;
    }

    return NextResponse.json({
      success: !hasErrors,
      message,
      stats,
      replacedExisting: stats.replacedExisting
    });

  } catch (error) {
    console.error('Erro no upload da escala:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}