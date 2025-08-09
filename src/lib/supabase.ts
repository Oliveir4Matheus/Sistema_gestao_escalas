import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gydhqpxojckiqrqfkjbl.supabase.co'
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5ZGhxcHhvamNraXFycWZramJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTUyODAsImV4cCI6MjA2OTMzMTI4MH0.f8obm_UULTzOACRc0jIkQh57wMy2n_07d2iJzSYbOaw').trim()

// Validar se a key tem formato correto
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error('Invalid Supabase anon key format')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função helper para executar queries SQL diretamente (para compatibilidade com crypt)
export async function executeQuery(query: string, params: any[] = []) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params
    })
    
    if (error) {
      throw error
    }
    
    return { rows: data || [] }
  } catch (err) {
    // Fallback: tentar usar o cliente normal do Supabase para queries simples
    console.log('Fallback to regular Supabase client')
    throw err
  }
}

export default supabase