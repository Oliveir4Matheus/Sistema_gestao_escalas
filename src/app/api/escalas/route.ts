import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return NextResponse.json({ message: 'Token necessário' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Token inválido' }, { status: 401 });
    }

    // Obter parâmetros do body
    const body = await request.json();
    const mes = parseInt(body.mes) || new Date().getMonth() + 1;
    const ano = parseInt(body.ano) || new Date().getFullYear();
    const page = parseInt(body.page) || 1;
    const limit = parseInt(body.limit) || 200;
    const offset = (page - 1) * limit;

    console.log(`Buscando escalas para ${mes}/${ano}, página ${page}, limite ${limit}`);

    // Primeiro, obter o total de registros para paginação
    const { count: totalCount, error: countError } = await supabase
      .from('escalas')
      .select('*', { count: 'exact', head: true })
      .eq('mes', mes)
      .eq('ano', ano);

    if (countError) {
      console.error('Erro ao contar escalas:', countError);
      return NextResponse.json({ message: 'Erro ao contar escalas' }, { status: 500 });
    }

    // Buscar escalas com JOIN simples e paginação
    const { data: escalas, error } = await supabase
      .from('escalas')
      .select(`
        id,
        mes,
        ano,
        colaboradores (
          id,
          matricula,
          nome,
          grupo,
          funcao,
          cod_escala,
          horario_trabalho
        ),
        escala_dias (
          id,
          dia,
          status,
          horario,
          alterado
        )
      `)
      .eq('mes', mes)
      .eq('ano', ano)
      .order('id')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar escalas:', error);
      return NextResponse.json({ message: 'Erro ao buscar escalas' }, { status: 500 });
    }

    console.log(`Encontradas ${escalas?.length || 0} escalas`);

    // Buscar opções para filtros
    const { data: colaboradores } = await supabase
      .from('colaboradores')
      .select('grupo, funcao, cod_escala')
      .eq('ativo', true);

    const filters = {
      grupos: Array.from(new Set(colaboradores?.map(c => c.grupo).filter(Boolean) || [])),
      funcoes: Array.from(new Set(colaboradores?.map(c => c.funcao).filter(Boolean) || [])),
      cod_escalas: Array.from(new Set(colaboradores?.map(c => c.cod_escala).filter(Boolean) || []))
    };

    // Ordenar todos os filtros alfabeticamente (A-Z)
    filters.grupos.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    filters.funcoes.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    filters.cod_escalas.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      success: true,
      escalas: escalas || [],
      filters,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: totalCount || 0,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Erro na API de escalas:', error);
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  }
}