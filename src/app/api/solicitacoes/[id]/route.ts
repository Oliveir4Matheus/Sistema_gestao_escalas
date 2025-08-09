import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verificar se é analista ou gerencia
    if (!['analista', 'gerencia'].includes(decoded.role)) {
      return NextResponse.json({ 
        error: 'Acesso negado. Apenas analistas e gerência podem aprovar/rejeitar solicitações.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { status, comentario_aprovador } = body;
    const solicitacaoId = params.id;

    // Validações
    if (!['aprovado', 'rejeitado'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // Buscar a solicitação
    const { data: solicitacao, error: fetchError } = await supabase
      .from('solicitacoes_alteracao')
      .select(`
        *,
        colaborador:colaboradores!colaborador_id(id, nome, matricula),
        solicitante:users!solicitante_id(id, nome, matricula)
      `)
      .eq('id', solicitacaoId)
      .single();

    if (fetchError || !solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    // Verificar se a solicitação ainda está pendente
    if (solicitacao.status !== 'pendente') {
      return NextResponse.json({ 
        error: `Solicitação já foi ${solicitacao.status}` 
      }, { status: 409 });
    }

    // Atualizar a solicitação
    const userId = decoded.id || decoded.userId;
    const { data: solicitacaoAtualizada, error: updateError } = await supabase
      .from('solicitacoes_alteracao')
      .update({
        status,
        comentario_aprovador: comentario_aprovador || null,
        aprovado_por: userId,
        aprovado_em: new Date().toISOString()
      })
      .eq('id', solicitacaoId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar solicitação:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar solicitação' }, { status: 500 });
    }

    // Se aprovado, aplicar a alteração na escala
    if (status === 'aprovado') {
      // Parse manual da data para evitar problemas de timezone
      console.log('🔵 DT_DEBUG - API Solicitacoes/[id] - DATE PROCESSING:', {
        data_escala_received: solicitacao.data_escala
      });
      
      const [anoStr, mesStr, diaStr] = solicitacao.data_escala.split('-');
      const ano = parseInt(anoStr, 10);
      const mes = parseInt(mesStr, 10);
      const dia = parseInt(diaStr, 10);
      
      // Para referência
      const dataEscala = new Date(solicitacao.data_escala);
      
      console.log('🔵 DT_DEBUG - API Solicitacoes/[id] - DATE PARSED:', {
        dia_parsed: dia,
        mes_parsed: mes,
        ano_parsed: ano,
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
        .eq('colaborador_id', solicitacao.colaborador_id)
        .eq('mes', mes)
        .eq('ano', ano)
        .single();

      if (escalaError && escalaError.code === 'PGRST116') {
        // Criar nova escala se não existir
        const { data: novaEscala, error: createEscalaError } = await supabase
          .from('escalas')
          .insert({
            colaborador_id: solicitacao.colaborador_id,
            mes,
            ano,
            uploaded_by: decoded.userId
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

      if (!escala) {
        return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 });
      }

      // Buscar ou criar o dia da escala
      let { data: escalaDia, error: escalaDiaError } = await supabase
        .from('escala_dias')
        .select('id')
        .eq('escala_id', escala.id)
        .eq('dia', dia)
        .single();

      const novoValor = solicitacao.valor_novo;
      const isDT = novoValor === '' || novoValor === 'DT'; // DT pode vir como string vazia ou 'DT'
      const isStatus = ['FR', 'FT', 'TR', 'FC'].includes(novoValor) || isDT;

      console.log('🔵 DT_DEBUG - API Solicitacoes/[id] - PROCESSING APPROVAL:', {
        solicitacao_id: solicitacaoId,
        novoValor,
        isDT,
        isStatus,
        status_being_set: status,
        logic_check: {
          is_empty: novoValor === '',
          is_DT_string: novoValor === 'DT',
          is_in_array: ['FR', 'FT', 'TR', 'FC'].includes(novoValor)
        }
      });

      if (escalaDiaError && escalaDiaError.code === 'PGRST116') {
        // Criar novo dia da escala
        const { error: createDiaError } = await supabase
          .from('escala_dias')
          .insert({
            escala_id: escala.id,
            dia,
            status: isStatus && !isDT ? novoValor : null,
            horario: !isStatus && !isDT ? novoValor : null,
            alterado: true,
            alterado_por: userId,
            alterado_em: new Date().toISOString()
          });

        if (createDiaError) {
          console.error('Erro ao criar dia da escala:', createDiaError);
          return NextResponse.json({ error: 'Erro ao criar dia da escala' }, { status: 500 });
        }
      } else if (!escalaDiaError && escalaDia) {
        // Atualizar dia da escala existente
        const { error: updateDiaError } = await supabase
          .from('escala_dias')
          .update({
            status: isStatus && !isDT ? novoValor : null,
            horario: !isStatus && !isDT ? novoValor : null,
            alterado: true,
            alterado_por: userId,
            alterado_em: new Date().toISOString()
          })
          .eq('id', escalaDia.id);

        if (updateDiaError) {
          console.error('Erro ao atualizar dia da escala:', updateDiaError);
          return NextResponse.json({ error: 'Erro ao atualizar dia da escala' }, { status: 500 });
        }
      } else {
        console.error('Erro ao buscar dia da escala:', escalaDiaError);
        return NextResponse.json({ error: 'Erro ao buscar dia da escala' }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: `Solicitação ${status} com sucesso`,
      solicitacao: solicitacaoAtualizada
    });

  } catch (error) {
    console.error('Erro na API de solicitação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const solicitacaoId = params.id;

    // Buscar a solicitação
    const { data: solicitacao, error } = await supabase
      .from('solicitacoes_alteracao')
      .select(`
        *,
        solicitante:users!solicitante_id(id, nome, matricula),
        colaborador:colaboradores!colaborador_id(id, nome, matricula, departamento, funcao),
        aprovador:users!aprovado_por(id, nome, matricula)
      `)
      .eq('id', solicitacaoId)
      .single();

    if (error || !solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const userIdForCheck = decoded.id || decoded.userId;
    if ((decoded.role === 'supervisor' || decoded.role === 'treinamento') && solicitacao.solicitante_id !== userIdForCheck) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    } else if (!['supervisor', 'treinamento', 'analista', 'gerencia'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json({ solicitacao });

  } catch (error) {
    console.error('Erro na API de solicitação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}