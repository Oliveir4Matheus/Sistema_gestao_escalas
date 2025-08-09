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

    // Verificar se tem permissão para criar solicitações
    if (!['supervisor', 'treinamento'].includes(decoded.role)) {
      return NextResponse.json({ 
        error: 'Acesso negado. Apenas supervisores e treinamento podem criar solicitações.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      colaborador_id,
      data_escala,
      valor_atual,
      valor_novo,
      motivo,
      justificativa
    } = body;

    console.log('🔵 DT_DEBUG - API Solicitacoes POST - RECEIVED:', {
      body,
      valor_novo,
      isDT_empty: valor_novo === '',
      isDT_string: valor_novo === 'DT',
      valor_novo_type: typeof valor_novo,
      valor_novo_length: valor_novo?.length
    });

    // Validar permissões específicas por role
    // DT vem como string vazia quando processado do frontend
    const isDT = valor_novo === '' || valor_novo === 'DT';
    if (decoded.role === 'treinamento' && valor_novo !== 'TR' && !isDT) {
      return NextResponse.json({ 
        error: 'Usuários de treinamento só podem marcar colaboradores como "TR - Treinamento" ou "DT - Dia Trabalhado".' 
      }, { status: 403 });
    }

    // Validações simplificadas
    if (!colaborador_id || !data_escala || !motivo || !justificativa) {
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos' }, { status: 400 });
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

    // Buscar dados do solicitante
    console.log('🔍 Decoded token:', decoded);
    const userId = decoded.id || decoded.userId;
    console.log('👤 Using userId for solicitante:', userId);
    
    const { data: solicitante, error: solicitanteError } = await supabase
      .from('users')
      .select('id, nome')
      .eq('id', userId)
      .single();

    if (solicitanteError || !solicitante) {
      return NextResponse.json({ error: 'Usuário solicitante não encontrado' }, { status: 404 });
    }

    // Verificar se já existe uma solicitação pendente para a mesma data/colaborador
    const { data: solicitacaoExistente, error: checkError } = await supabase
      .from('solicitacoes_alteracao')
      .select('id')
      .eq('colaborador_id', colaborador_id)
      .eq('data_escala', data_escala)
      .eq('status', 'pendente')
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Erro ao verificar solicitação existente:', checkError);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    if (solicitacaoExistente) {
      return NextResponse.json({ 
        error: 'Já existe uma solicitação pendente para este colaborador nesta data' 
      }, { status: 409 });
    }

    // Buscar escala_dia_id se existir
    console.log('🔵 DT_DEBUG - API Solicitacoes - DATE PROCESSING:', {
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
    
    console.log('🔵 DT_DEBUG - API Solicitacoes - DATE PARSED:', {
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

    // Primeiro buscar a escala
    const { data: escala } = await supabase
      .from('escalas')
      .select('id')
      .eq('colaborador_id', colaborador_id)
      .eq('mes', mes)
      .eq('ano', ano)
      .single();

    // Depois buscar o dia da escala se a escala existir
    let escalaDia = null;
    if (escala) {
      const { data: escalaDiaData } = await supabase
        .from('escala_dias')
        .select('id')
        .eq('escala_id', escala.id)
        .eq('dia', dia)
        .single();
      
      escalaDia = escalaDiaData;
    }

    // Criar a solicitação
    console.log('🔵 DT_DEBUG - API Solicitacoes POST - BEFORE INSERT:', {
      solicitante_id: userId,
      colaborador_id,
      escala_dia_id: escalaDia?.id || null,
      data_escala,
      valor_atual: valor_atual || null,
      valor_novo,
      motivo,
      justificativa,
      status: 'pendente'
    });

    const { data: novaSolicitacao, error: insertError } = await supabase
      .from('solicitacoes_alteracao')
      .insert({
        solicitante_id: userId,
        colaborador_id,
        escala_dia_id: escalaDia?.id || null,
        data_escala,
        valor_atual: valor_atual || null,
        valor_novo,
        motivo,
        justificativa,
        status: 'pendente'
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('🔵 DT_DEBUG - API Solicitacoes POST - INSERT ERROR:', insertError);
      return NextResponse.json({ error: 'Erro ao criar solicitação' }, { status: 500 });
    }

    console.log('🔵 DT_DEBUG - API Solicitacoes POST - SUCCESS:', novaSolicitacao);

    return NextResponse.json({
      message: 'Solicitação criada com sucesso',
      solicitacao: novaSolicitacao
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de solicitações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('solicitacoes_alteracao')
      .select(`
        *,
        solicitante:users!solicitante_id(id, nome, matricula),
        colaborador:colaboradores!colaborador_id(id, nome, matricula, departamento, funcao),
        aprovador:users!aprovado_por(id, nome, matricula)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por status se fornecido
    if (status && ['pendente', 'aprovado', 'rejeitado'].includes(status)) {
      query = query.eq('status', status);
    }

    // Filtrar por role do usuário
    const userIdForFilter = decoded.id || decoded.userId;
    if (decoded.role === 'supervisor' || decoded.role === 'treinamento') {
      // Supervisores e treinamento veem apenas suas próprias solicitações
      query = query.eq('solicitante_id', userIdForFilter);
    } else if (decoded.role === 'ponto') {
      // Ponto vê apenas solicitações aprovadas
      query = query.eq('status', 'aprovado');
    } else if (!['analista', 'gerencia'].includes(decoded.role)) {
      // Apenas analistas e gerencia podem ver todas as solicitações
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { data: solicitacoes, error } = await query;

    if (error) {
      console.error('Erro ao buscar solicitações:', error);
      return NextResponse.json({ error: 'Erro ao buscar solicitações' }, { status: 500 });
    }

    // Contar total de registros para paginação
    let countQuery = supabase
      .from('solicitacoes_alteracao')
      .select('*', { count: 'exact', head: true });

    if (status && ['pendente', 'aprovado', 'rejeitado'].includes(status)) {
      countQuery = countQuery.eq('status', status);
    }

    if (decoded.role === 'supervisor' || decoded.role === 'treinamento') {
      countQuery = countQuery.eq('solicitante_id', userIdForFilter);
    } else if (decoded.role === 'ponto') {
      countQuery = countQuery.eq('status', 'aprovado');
    }

    const { count } = await countQuery;

    return NextResponse.json({
      solicitacoes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de solicitações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}