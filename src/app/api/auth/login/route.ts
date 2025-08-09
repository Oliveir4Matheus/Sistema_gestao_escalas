import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateToken, verifyPassword } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { matricula, senha } = await request.json();

    if (!matricula || !senha) {
      return NextResponse.json(
        { message: 'Matrícula e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário por matrícula
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('matricula', matricula)
      .eq('ativo', true)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return NextResponse.json(
          { message: 'Usuário não encontrado ou inativo' },
          { status: 401 }
        );
      }
      throw userError;
    }

    // Verificar senha
    
    let isValidPassword = false;
    
    // Detectar tipo de hash e usar método apropriado
    if (userData.senha_hash.startsWith('$2a$') || userData.senha_hash.startsWith('$2b$')) {
      // Hash bcrypt
      isValidPassword = await bcrypt.compare(senha, userData.senha_hash);
    } else if (userData.senha_hash.startsWith('$')) {
      // Hash crypt - tentar função RPC do Supabase
      try {
        const { data: cryptResult, error: cryptError } = await supabase
          .rpc('verify_password', {
            input_password: senha,
            stored_hash: userData.senha_hash
          });
        
        if (cryptError) {
          // Fallback para comparação simples
          isValidPassword = senha === userData.senha_hash;
        } else {
          isValidPassword = cryptResult;
        }
      } catch (err) {
        isValidPassword = senha === userData.senha_hash;
      }
    } else {
      // Senha em texto simples
      isValidPassword = senha === userData.senha_hash;
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Gerar token
    const token = generateToken(userData);

    // Retornar dados do usuário (sem a senha)
    const { senha_hash, ...userWithoutPassword } = userData;
    return NextResponse.json({
      message: 'Login realizado com sucesso',
      token,
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}