# Sistema de Gestão de Escalas

## 📋 Sobre o Projeto

Sistema completo para gestão de escalas de colaboradores com interface moderna estilo Excel, desenvolvido em Next.js 14 com TypeScript e Supabase. Permite controle total sobre escalas mensais, alterações, solicitações e aprovações com diferentes níveis de permissão por usuário.

## ✨ Funcionalidades Principais

### 🎯 Interface de Escalas Estilo Excel
- **Colunas fixas** à esquerda (Grupo, Nome, Função, Chapa, Jornada, Escala, Status)
- **Cabeçalhos fixos** no topo durante scroll vertical
- **Scroll horizontal sincronizado** entre cabeçalho e dados dos dias
- **Visual minimalista** e compacto para melhor aproveitamento do espaço

### 📊 Sistema DT - Dia Trabalhado
- Status especial "DT - Dia Trabalhado" com valor null no banco
- Processamento específico para status DT em todos os fluxos
- Permissões diferenciadas por role de usuário
- Validações customizadas para valores DT

### 🔐 Gestão de Alterações por Roles
- **Analista/Gerência**: Alterações diretas imediatas
- **Supervisor**: Solicitações que necessitam aprovação
- **Treinamento**: Apenas status TR e DT, com aprovação necessária
- **Sistema de aprovação/rejeição** com comentários

### 🛠️ Correções e Otimizações
- Fix de timezone para alterações aplicadas no dia correto
- Timeout handling para evitar telas de processamento infinito
- Logging detalhado para debugging
- Tratamento robusto de erros

## 🚀 Tecnologias Utilizadas

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Autenticação**: JWT personalizado
- **Validação**: Zod
- **Icons**: Lucide React

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/              # Rotas da API
│   │   ├── auth/         # Autenticação
│   │   ├── escalas/      # CRUD de escalas
│   │   ├── solicitacoes/ # Sistema de solicitações
│   │   └── user/         # Perfil do usuário
│   ├── dashboard/        # Dashboard principal
│   ├── escalas/          # Interface de escalas
│   ├── solicitacoes/     # Gestão de solicitações
│   └── globals.css       # Estilos globais
├── components/
│   ├── forms/            # Formulários e modais
│   ├── layout/           # Componentes de layout
│   ├── notifications/    # Sistema de notificações
│   └── ui/               # Componentes UI reutilizáveis
├── lib/                  # Utilitários e configurações
├── types/                # Tipagens TypeScript
└── hooks/                # Hooks customizados
```

## ⚙️ Configuração e Instalação

### 1. Pré-requisitos
```bash
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
```

### 2. Clone e Instalação
```bash
git clone https://github.com/Oliveir4Matheus/Sistema_gestao_escalas.git
cd Sistema_gestao_escalas
npm install
```

### 3. Configuração do Banco de Dados

#### Criar projeto no Supabase:
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Execute os scripts SQL na ordem:

```bash
# 1. Schema principal
database_schema.sql

# 2. Correções e ajustes
fix_database_schema.sql

# 3. Adicionar status DT
add_dt_status_enum.sql

# 4. Atualizar tabela de solicitações
update_solicitacoes_table.sql

# 5. Funções auxiliares
supabase_functions.sql
```

### 4. Variáveis de Ambiente

Crie um arquivo `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# JWT
JWT_SECRET=sua_chave_secreta_jwt_muito_segura

# NextAuth (opcional)
NEXTAUTH_SECRET=sua_chave_secreta_nextauth
NEXTAUTH_URL=http://localhost:3000
```

### 5. Executar o Projeto

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais:
- **users**: Usuários do sistema com roles
- **colaboradores**: Dados dos colaboradores
- **escalas**: Escalas mensais
- **escala_dias**: Dias individuais das escalas
- **solicitacoes_alteracao**: Solicitações de mudanças

### Roles de Usuário:
- **analista**: Alterações diretas + aprovações
- **gerencia**: Alterações diretas + aprovações  
- **supervisor**: Solicitações que necessitam aprovação
- **treinamento**: Apenas TR e DT, com aprovação
- **ponto**: Visualização de aprovações apenas

## 🔑 Usuários de Teste

Execute o script `usuarios_teste.sql` (se disponível) ou crie usuários manualmente com diferentes roles para testar as funcionalidades.

## 🐛 Debug e Logs

O sistema possui logging detalhado com prefixo `DT_DEBUG` para rastreamento de operações relacionadas ao status DT. Monitore o console do navegador para debugging.

## 🤝 Contribuições

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 🆘 Suporte

Para dúvidas ou problemas:
- Abra uma **Issue** no GitHub
- Contato: contato.matheusoliv@outlook.com

---

⭐ **Se este projeto foi útil, considere dar uma estrela no repositório!**
