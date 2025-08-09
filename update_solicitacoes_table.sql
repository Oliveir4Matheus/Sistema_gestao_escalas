-- Script para atualizar a tabela solicitacoes_alteracao
-- Execute este script no Supabase SQL Editor

-- Primeiro, vamos dropar a tabela atual se existir e recriar
DROP TABLE IF EXISTS solicitacoes_alteracao CASCADE;

-- Recriar a tabela com a nova estrutura
CREATE TABLE solicitacoes_alteracao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitante_id UUID REFERENCES users(id) NOT NULL,
    colaborador_id UUID REFERENCES colaboradores(id) NOT NULL,
    escala_dia_id UUID REFERENCES escala_dias(id),
    data_escala DATE NOT NULL,
    valor_atual VARCHAR(10),
    valor_novo VARCHAR(10) NOT NULL,
    motivo VARCHAR(50) NOT NULL, -- Atestado, Férias, Troca, Emergência, Outros
    justificativa TEXT NOT NULL,
    status request_status DEFAULT 'pendente',
    comentario_aprovador TEXT,
    aprovado_por UUID REFERENCES users(id),
    aprovado_em TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recriar o índice
CREATE INDEX idx_solicitacoes_status ON solicitacoes_alteracao(status);
CREATE INDEX idx_solicitacoes_data_escala ON solicitacoes_alteracao(data_escala);
CREATE INDEX idx_solicitacoes_solicitante ON solicitacoes_alteracao(solicitante_id);

-- Recriar o trigger de updated_at
CREATE TRIGGER update_solicitacoes_alteracao_updated_at BEFORE UPDATE ON solicitacoes_alteracao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentário da tabela
COMMENT ON TABLE solicitacoes_alteracao IS 'Tabela de solicitações de alteração na escala com novo formato';