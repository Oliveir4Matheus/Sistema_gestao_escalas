-- Script para adicionar 'DT - Dia Trabalhado' ao enum status_type
-- Este script deve ser executado no banco de dados de produção

-- Adicionar o novo valor 'DT' ao enum status_type
ALTER TYPE status_type ADD VALUE IF NOT EXISTS 'DT';

-- Verificar se o valor foi adicionado corretamente
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_type')
ORDER BY enumsortorder;

-- Comentário de confirmação
-- O valor 'DT' (Dia Trabalhado) foi adicionado ao enum status_type
-- Este status representa um dia trabalhado onde o valor deve ser null/vazio