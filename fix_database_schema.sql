-- Script para corrigir o schema da tabela solicitacoes_alteracao
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, verificar se a tabela existe e qual sua estrutura atual
DO $$ 
BEGIN
    -- Se a tabela não tem a coluna data_escala, vamos recriá-la
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'solicitacoes_alteracao' 
        AND column_name = 'data_escala'
    ) THEN
        -- Fazer backup dos dados existentes se houver
        CREATE TEMP TABLE temp_solicitacoes AS 
        SELECT * FROM solicitacoes_alteracao;
        
        -- Dropar a tabela atual
        DROP TABLE IF EXISTS solicitacoes_alteracao CASCADE;
        
        -- Recriar com a estrutura correta
        CREATE TABLE solicitacoes_alteracao (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            solicitante_id UUID REFERENCES users(id) NOT NULL,
            colaborador_id UUID REFERENCES colaboradores(id) NOT NULL,
            escala_dia_id UUID REFERENCES escala_dias(id),
            data_escala DATE NOT NULL,
            valor_atual VARCHAR(10),
            valor_novo VARCHAR(10) NOT NULL,
            motivo VARCHAR(50) NOT NULL,
            justificativa TEXT NOT NULL,
            status request_status DEFAULT 'pendente',
            comentario_aprovador TEXT,
            aprovado_por UUID REFERENCES users(id),
            aprovado_em TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Recriar índices
        CREATE INDEX idx_solicitacoes_status ON solicitacoes_alteracao(status);
        CREATE INDEX idx_solicitacoes_data_escala ON solicitacoes_alteracao(data_escala);
        CREATE INDEX idx_solicitacoes_solicitante ON solicitacoes_alteracao(solicitante_id);
        
        -- Recriar trigger
        CREATE TRIGGER update_solicitacoes_alteracao_updated_at BEFORE UPDATE ON solicitacoes_alteracao
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            
        RAISE NOTICE 'Tabela solicitacoes_alteracao recriada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela solicitacoes_alteracao já possui a estrutura correta!';
    END IF;
    
    -- Verificar se o enum request_status existe, se não, criar
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
        RAISE NOTICE 'Enum request_status criado!';
    END IF;
    
END $$;

-- 2. Verificar a estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'solicitacoes_alteracao' 
ORDER BY ordinal_position;

-- 3. Comentário da tabela
COMMENT ON TABLE solicitacoes_alteracao IS 'Tabela de solicitações de alteração na escala - Estrutura atualizada';

RAISE NOTICE 'Script de correção executado com sucesso!';