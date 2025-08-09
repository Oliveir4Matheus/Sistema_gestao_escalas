import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // Contar total de colaboradores
    const { count: totalColaboradores, error: colaboradoresError } = await supabase
      .from('colaboradores')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (colaboradoresError) {
      console.error('Error counting colaboradores:', colaboradoresError);
    }

    // Contar solicitações pendentes
    const { count: solicitacoesPendentes, error: solicitacoesError } = await supabase
      .from('solicitacoes_alteracao')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente');

    if (solicitacoesError) {
      console.error('Error counting solicitações:', solicitacoesError);
    }

    // Contar alterações do mês atual
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { count: alteracoesMes, error: alteracoesError } = await supabase
      .from('usuario_alteracoes')
      .select('*', { count: 'exact', head: true })
      .eq('mes', currentMonth)
      .eq('ano', currentYear);

    if (alteracoesError) {
      console.error('Error counting alterações:', alteracoesError);
    }

    // Contar notificações não lidas
    const { count: notificacoesNaoLidas, error: notificacoesError } = await supabase
      .from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', decoded.id)
      .eq('lida', false);

    if (notificacoesError) {
      console.error('Error counting notificações:', notificacoesError);
    }

    return NextResponse.json({
      success: true,
      total_colaboradores: totalColaboradores || 0,
      solicitacoes_pendentes: solicitacoesPendentes || 0,
      alteracoes_mes: alteracoesMes || 0,
      notificacoes_nao_lidas: notificacoesNaoLidas || 0
    });

  } catch (error) {
    console.error('Error in dashboard stats API:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}