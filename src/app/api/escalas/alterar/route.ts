import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar se é analista ou gerencia (permissão para alteração direta)
    if (!['analista', 'gerencia'].includes(decoded.role)) {
      return NextResponse.json({ 
        error: 'Acesso negado. Apenas analistas e gerência podem fazer alterações diretas.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      colaborador_id,
      data_escala,
      valor_atual,
      valor_novo,
      justificativa
    } = body;

    console.log('🔵 DT_DEBUG - API Escalas/Alterar POST - RECEIVED:', {
      body,
      valor_novo,
      isDT_empty: valor_novo === '',
      isDT_string: valor_novo === 'DT',
      valor_novo_type: typeof valor_novo,
      valor_novo_length: valor_novo?.length
    });

    // Definir userId antes de usar
    const userId = decoded.id || decoded.userId;

    // Validar permissões específicas por role
    // DT vem como string vazia quando processado do frontend
    const isDT_validation = valor_novo === '' || valor_novo === 'DT';
    if (decoded.role === 'treinamento' && valor_novo !== 'TR' && !isDT_validation) {
      return NextResponse.json({ 
        error: 'Usuários de treinamento só podem marcar colaboradores como "TR - Treinamento" ou "DT - Dia Trabalhado".' 
      }, { status: 403 });
    }

    // Validações simplificadas
    if (!colaborador_id || !data_escala) {
      return NextResponse.json({ 
        error: 'Colaborador e data da escala são obrigatórios' 
      }, { status: 400 });
    }
    
    // Validação separada para valor_novo (aceita string vazia para DT)
    if (valor_novo === null || valor_novo === undefined) {
      return NextResponse.json({ error: 'Novo valor é obrigatório' }, { status: 400 });
    }

    // Verificar se o colaborador existe
    const { data: colaborador, error: colaboradorError } = await supabase
      .from('colaboradores')
      .select('id, nome, departamento')
      .eq('id', colaborador_id)
      .single();

    if (colaboradorError || !colaborador) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Processar a data
    console.log('🔵 DT_DEBUG - API Escalas/Alterar - DATE PROCESSING:', {
      data_escala_received: data_escala,
      data_escala_type: typeof data_escala
    });
    
    // Parse manual da data para evitar problemas de timezone
    // Formato esperado: "YYYY-MM-DD"
    const [anoStr, mesStr, diaStr] = data_escala.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);
    const dia = parseInt(diaStr, 10);
    
    // Criar objeto Date apenas para referência, mas usar valores parsed
    const dataEscala = new Date(data_escala);
    
    console.log('🔵 DT_DEBUG - API Escalas/Alterar - DATE PARSED:', {
      data_escala_split: [anoStr, mesStr, diaStr],
      dia_parsed: dia,
      mes_parsed: mes,
      ano_parsed: ano,
      dataEscala_object_for_ref: dataEscala,
      timezone_offset: dataEscala.getTimezoneOffset(),
      comparison: {
        parsed_dia: dia,
        date_getDate: dataEscala.getDate(),
        difference: dia - dataEscala.getDate()
      }
    });

    // Buscar ou criar a escala do mês
    let { data: escala, error: escalaError } = await supabase
      .from('escalas')
      .select('id')
      .eq('colaborador_id', colaborador_id)
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    if (escalaError && escalaError.code === 'PGRST116') {
      // Criar nova escala se não existir
      const { data: novaEscala, error: createEscalaError } = await supabase
        .from('escalas')
        .insert({
          colaborador_id,
          mes,
          ano,
          uploaded_by: userId
        })
        .select('id')
        .single();

      if (createEscalaError) {
        console.error('Erro ao criar escala:', createEscalaError);
        return NextResponse.json({ error: 'Erro ao criar escala' }, { status: 500 });
      }

      escala = novaEscala;
    } else if (escalaError) {
      console.error('Erro ao buscar escala:', escalaError);
      return NextResponse.json({ error: 'Erro ao buscar escala' }, { status: 500 });
    }

    // Determinar se o novo valor é um status ou horário
    const novoValor = valor_novo;
    const isDT = novoValor === '' || novoValor === 'DT'; // DT pode vir como string vazia ou 'DT'
    const isStatus = ['FR', 'FT', 'TR', 'FC'].includes(novoValor) || isDT;

    console.log('🔵 DT_DEBUG - API Escalas/Alterar - PROCESSING:', {
      novoValor,
      isDT,
      isStatus,
      logic_check: {
        is_empty: novoValor === '',
        is_DT_string: novoValor === 'DT',
        is_in_array: ['FR', 'FT', 'TR', 'FC'].includes(novoValor)
      }
    });

    // Buscar ou criar o dia da escala
    let { data: escalaDia, error: escalaDiaError } = await supabase
      .from('escala_dias')
      .select('id, status, horario')
      .eq('escala_id', escala.id)
      .eq('dia', dia)
      .single();

    if (escalaDiaError && escalaDiaError.code === 'PGRST116') {
      // Criar novo dia da escala
      const { data: novoDiaEscala, error: createDiaError } = await supabase
        .from('escala_dias')
        .insert({
          escala_id: escala.id,
          dia,
          status: isStatus && !isDT ? novoValor : null,
          horario: !isStatus && !isDT ? novoValor : null,
          alterado: true,
          alterado_por: userId,
          alterado_em: new Date().toISOString()
        })
        .select('*')
        .single();

      if (createDiaError) {
        console.error('Erro ao criar dia da escala:', createDiaError);
        return NextResponse.json({ error: 'Erro ao criar dia da escala' }, { status: 500 });
      }

      escalaDia = novoDiaEscala;
    } else if (!escalaDiaError) {
      // Atualizar dia da escala existente
      const { data: diaAtualizado, error: updateDiaError } = await supabase
        .from('escala_dias')
        .update({
          status: isStatus && !isDT ? novoValor : null,
          horario: !isStatus && !isDT ? novoValor : null,
          alterado: true,
          alterado_por: userId,
          alterado_em: new Date().toISOString()
        })
        .eq('id', escalaDia.id)
        .select('*')
        .single();

      if (updateDiaError) {
        console.error('Erro ao atualizar dia da escala:', updateDiaError);
        return NextResponse.json({ error: 'Erro ao atualizar dia da escala' }, { status: 500 });
      }

      escalaDia = diaAtualizado;
    } else {
      console.error('Erro ao buscar dia da escala:', escalaDiaError);
      return NextResponse.json({ error: 'Erro ao buscar dia da escala' }, { status: 500 });
    }

    // Registrar a alteração direta como uma solicitação já aprovada para auditoria
    const auditData = {
      solicitante_id: userId,
      colaborador_id,
      escala_dia_id: escalaDia.id,
      data_escala,
      valor_atual: valor_atual || null,
      valor_novo: isDT ? 'DT' : novoValor,
      motivo: 'Alteração direta por analista',
      justificativa: justificativa || 'Alteração aplicada diretamente pelo analista',
      status: 'aprovado',
      aprovado_por: userId,
      aprovado_em: new Date().toISOString()
    };

    console.log('🔵 DT_DEBUG - API Escalas/Alterar - AUDIT INSERT:', auditData);

    const { error: solicitacaoError } = await supabase
      .from('solicitacoes_alteracao')
      .insert(auditData);

    if (solicitacaoError) {
      console.error('🔵 DT_DEBUG - API Escalas/Alterar - AUDIT ERROR:', solicitacaoError);
      // Não retornar erro aqui pois a alteração já foi aplicada
    } else {
      console.log('🔵 DT_DEBUG - API Escalas/Alterar - AUDIT SUCCESS');
    }

    return NextResponse.json({
      message: 'Alteração aplicada com sucesso',
      escala_dia: escalaDia,
      colaborador: colaborador.nome,
      data: dataEscala.toLocaleDateString('pt-BR'),
      alteracao: `${valor_atual || '-'} → ${novoValor}`
    }, { status: 200 });

  } catch (error) {
    console.error('Erro na API de alteração direta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}