-- Sistema de Gestão de Escala - PostgreSQL Schema
-- Criado para gerenciar escalas de colaboradores

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum para tipos de usuário
CREATE TYPE user_role AS ENUM (
    'supervisor',
    'analista',
    'gerencia',
    'treinamento',
    'rh',
    'qhse',
    'occ',
    'ponto'
);

-- Enum para status de alteração
CREATE TYPE status_type AS ENUM (
    'FR', -- Folga Remunerada
    'FT', -- Falta
    'TR', -- Treinamento
    'FC', -- Folga Compensatória
    'DT'  -- Dia Trabalhado
);

-- Enum para status de solicitação
CREATE TYPE request_status AS ENUM (
    'pendente',
    'aprovado',
    'rejeitado'
);

-- Enum para tipos de alteração especial
CREATE TYPE special_change_type AS ENUM (
    'responsavel',
    'departamento',
    'funcao',
    'jornada',
    'cod_escala'
);

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    ativo BOOLEAN DEFAULT true,
    primeiro_acesso BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de colaboradores
CREATE TABLE colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    responsavel VARCHAR(255),
    departamento VARCHAR(255),
    grupo VARCHAR(255),
    funcao VARCHAR(255),
    cod_escala VARCHAR(50),
    horario_trabalho VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de escalas mensais
CREATE TABLE escalas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    upload_file_name VARCHAR(255),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(colaborador_id, mes, ano)
);

-- Tabela de dias da escala
CREATE TABLE escala_dias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escala_id UUID REFERENCES escalas(id) ON DELETE CASCADE,
    dia INTEGER NOT NULL,
    status status_type,
    horario VARCHAR(50),
    observacao TEXT,
    alterado BOOLEAN DEFAULT false,
    alterado_por UUID REFERENCES users(id),
    alterado_em TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(escala_id, dia)
);

-- Tabela de solicitações de alteração da escala
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

-- Tabela de solicitações especiais (alteração de dados do colaborador)
CREATE TABLE solicitacoes_especiais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitante_id UUID REFERENCES users(id) NOT NULL,
    colaborador_id UUID REFERENCES colaboradores(id) NOT NULL,
    tipo_alteracao special_change_type NOT NULL,
    valor_atual VARCHAR(255),
    valor_novo VARCHAR(255) NOT NULL,
    motivo TEXT NOT NULL,
    status request_status DEFAULT 'pendente',
    aprovado_por UUID REFERENCES users(id),
    motivo_rejeicao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de notificações
CREATE TABLE notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES users(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    lida BOOLEAN DEFAULT false,
    solicitacao_id UUID, -- Pode referenciar solicitacoes_alteracao ou solicitacoes_especiais
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de auditoria
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES users(id),
    acao VARCHAR(255) NOT NULL,
    tabela_afetada VARCHAR(100),
    registro_id UUID,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para contabilizar alterações por usuário
CREATE TABLE usuario_alteracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    total_alteracoes INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, mes, ano)
);

-- Índices para melhor performance
CREATE INDEX idx_users_matricula ON users(matricula);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_colaboradores_matricula ON colaboradores(matricula);
CREATE INDEX idx_colaboradores_responsavel ON colaboradores(responsavel);
CREATE INDEX idx_colaboradores_departamento ON colaboradores(departamento);
CREATE INDEX idx_escalas_mes_ano ON escalas(mes, ano);
CREATE INDEX idx_escala_dias_dia ON escala_dias(dia);
CREATE INDEX idx_solicitacoes_status ON solicitacoes_alteracao(status);
CREATE INDEX idx_solicitacoes_especiais_status ON solicitacoes_especiais(status);
CREATE INDEX idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);
CREATE INDEX idx_audit_logs_usuario_created ON audit_logs(usuario_id, created_at);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON colaboradores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalas_updated_at BEFORE UPDATE ON escalas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escala_dias_updated_at BEFORE UPDATE ON escala_dias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solicitacoes_alteracao_updated_at BEFORE UPDATE ON solicitacoes_alteracao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solicitacoes_especiais_updated_at BEFORE UPDATE ON solicitacoes_especiais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para incrementar contador de alterações do usuário
CREATE OR REPLACE FUNCTION increment_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO usuario_alteracoes (usuario_id, mes, ano, total_alteracoes)
    VALUES (NEW.alterado_por, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 1)
    ON CONFLICT (usuario_id, mes, ano)
    DO UPDATE SET 
        total_alteracoes = usuario_alteracoes.total_alteracoes + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_user_changes_trigger AFTER UPDATE ON escala_dias
    FOR EACH ROW 
    WHEN (NEW.alterado = true AND OLD.alterado = false)
    EXECUTE FUNCTION increment_user_changes();

-- Dados iniciais - Usuário administrador padrão
INSERT INTO users (matricula, nome, email, senha_hash, role, primeiro_acesso) VALUES
('34589', 'Matheus de Oliveira Ferreira', 'matheus.ferreira@swissport.com', crypt('asdw_Fxugn2', gen_salt('bf')), 'analista', false);

-- Comentários das tabelas
COMMENT ON TABLE users IS 'Tabela de usuários do sistema com diferentes funções';
COMMENT ON TABLE colaboradores IS 'Tabela de colaboradores da empresa';
COMMENT ON TABLE escalas IS 'Tabela de escalas mensais dos colaboradores';
COMMENT ON TABLE escala_dias IS 'Tabela dos dias individuais de cada escala';
COMMENT ON TABLE solicitacoes_alteracao IS 'Tabela de solicitações de alteração na escala';
COMMENT ON TABLE solicitacoes_especiais IS 'Tabela de solicitações especiais (alteração de dados do colaborador)';
COMMENT ON TABLE notificacoes IS 'Tabela de notificações do sistema';
COMMENT ON TABLE audit_logs IS 'Tabela de logs de auditoria para rastreamento de alterações';
COMMENT ON TABLE usuario_alteracoes IS 'Tabela para contabilizar alterações feitas por cada usuário';