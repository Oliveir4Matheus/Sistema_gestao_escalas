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

    // Buscar dados do usuário
    console.log('🔍 Decoded token:', decoded);
    const userId = decoded.id || decoded.userId;
    console.log('👤 Using userId:', userId);
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, matricula, nome, email, role, ativo, primeiro_acesso, created_at, updated_at')
      .eq('id', userId)
      .eq('ativo', true)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ User found:', userData);
    
    return NextResponse.json({
      success: true,
      user: userData,
      role: userData.role // Para compatibilidade
    });

  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}