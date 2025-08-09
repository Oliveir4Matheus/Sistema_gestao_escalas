-- Função RPC para verificar senhas usando crypt
CREATE OR REPLACE FUNCTION verify_password(input_password TEXT, stored_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN crypt(input_password, stored_hash) = stored_hash;
END;
$$;

-- Dar permissão para usuários anônimos executarem a função
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO authenticated;

-- Função RPC para executar queries SQL personalizadas (se necessário)
CREATE OR REPLACE FUNCTION execute_sql(query TEXT, params JSONB DEFAULT '[]'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Esta função seria implementada conforme necessidade
  -- Por segurança, está desabilitada por padrão
  RAISE EXCEPTION 'Function not implemented for security reasons';
END;
$$;