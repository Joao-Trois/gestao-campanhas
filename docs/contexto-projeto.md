# Contexto do Projeto: Gestão de Campanhas WhatsApp

## 1. Stack Tecnológica
- **Frontend & Build:** React 19, Vite 8, React DOM.
- **Roteamento:** React Router DOM (v7).
- **Estilização & UI:** Tailwind CSS (v4) com Tailwind Merge, Lucide React para ícones, animações customizadas (`fadeIn`, `scaleIn`, `slideInUp`).
- **Backend & BaaS:** Supabase (Banco de Dados PostgreSQL, Autenticação, Storage e Realtime).
- **Processamento de Dados:** `xlsx` para leitura e importação de planilhas.

---

## 2. Estrutura de Pastas e Arquivos Principais

```text
gestao-campanhas/
├── src/
│   ├── components/
│   │   └── Sidebar.jsx        // Menu lateral de navegação inteligente
│   ├── contexts/
│   │   └── AuthContext.jsx    // Gerenciamento global de autenticação (Supabase Auth)
│   ├── layouts/
│   │   └── DashboardLayout.jsx // Layout base da aplicação (Sidebar + Main Content)
│   ├── lib/
│   │   └── supabase.js        // Inicialização e configuração do cliente Supabase
│   ├── pages/                 // Telas da aplicação
│   │   ├── Login.jsx          // Tela de autenticação
│   │   ├── Dashboard.jsx      // Visão geral (em construção)
│   │   ├── Tags.jsx           // CRUD de Tags (com animações de lista)
│   │   ├── Templates.jsx      // Listagem de Templates do WhatsApp
│   │   ├── TemplateForm.jsx   // Criação/Edição de Templates (com parsing de variáveis)
│   │   ├── ContactLists.jsx   // Listagem de Listas de Contatos
│   │   ├── ContactListImport.jsx // Fluxo de importação via CSV/Excel
│   │   ├── ContactListDetails.jsx // Visualização dos contatos de uma lista
│   │   ├── Campaigns.jsx      // Listagem de Campanhas com badges de status
│   │   ├── CampaignWizard.jsx // Assistente de 4 etapas para criação/edição de Campanhas
│   │   ├── CampaignDetails.jsx // Dashboard individual de disparo de campanha
│   │   └── Settings.jsx       // Configurações e Gestão de Usuários (Admin)
│   ├── App.jsx                // Configuração das Rotas (ProtectedRoute e AdminRoute)
│   ├── index.css              // Variáveis CSS Globais, Animações e imports do Tailwind
│   └── main.jsx               // Entry point do React
├── supabase/              // Infraestrutura de Backend
│   └── functions/
│       └── create-user/       // Edge Function para criação de usuários (Admin)
├── docs/
│   ├── schema.sql             // Definição completa do banco, Triggers e RLS no Supabase
│   ├── fase2-templates.md     // Detalhes da implementação da Fase 2
│   ├── fase5-configuracoes.md  // Detalhes da implementação da Fase 5
│   └── contexto-projeto.md    // Este documento
└── package.json               // Dependências e scripts
```

---

## 3. Resumo das Telas Implementadas

*   **Autenticação (`Login.jsx`, `AuthContext.jsx`):** Fluxo de login utilizando e-mail e senha integrado ao Supabase. Rotas protegidas não permitem acesso sem sessão. Implementada resiliência com timeouts e fallbacks.
*   **Tags (`Tags.jsx`):** Listagem e criação de tags para organizar templates. Possui uma lista animada em cascata e validações.
*   **Templates (`Templates.jsx`, `TemplateForm.jsx`):** Gestão de modelos de mensagens. O formulário detecta chaves de variáveis no texto (ex: `{{nome}}`) e o sistema gerencia a associação multi-select com Tags.
*   **Listas de Contatos (`ContactLists.jsx`, `ContactListImport.jsx`, `ContactListDetails.jsx`):** Upload de arquivos `.xlsx` e `.csv`, extração de colunas dinâmicas, validação de formato de número de telefone celular e listagem paginada.
*   **Campanhas (`Campaigns.jsx`, `CampaignWizard.jsx`, `CampaignDetails.jsx`):** Fluxo completo de criação guiada (Wizard) com escolha de Template, Lista, mapeamento de colunas do excel para as variáveis do template, e agendamento. Mostra cards de acompanhamento e progresso dos envios.
*   **Configurações (`Settings.jsx`):** Painel administrativo restrito a admins. Gestão de usuários (criação via Edge Function, edição e ativação/desativação) e visualização de parâmetros do sistema.

---

## 4. Padrões Visuais e de Código Adotados

### 🎨 Design System
- **Cores Principais:** Sistema baseado em tons de Roxo:
  - `--color-primary: #894bea;` (Roxo Vibrante)
  - `--color-sidebar: #5f36a2;` (Roxo Escuro para navegação)
  - Fundos Off-White para conteúdo (`#f8f3f9`) e base de Cards Branca com sombras suaves.
- **Tipografia:** Fonte `Plus Jakarta Sans` para um aspecto limpo e moderno.
- **Estrutura:** Utilização massiva de flex containers com *gap*, *rounded-xl/2xl* e espaçamentos consistentes.

### ✨ Animações (Micro-interações)
Configuradas no `index.css` global:
- `animate-fadeIn`: Para overlays densos (fundos de tela de modal).
- `animate-scaleIn`: Para cards e modais, criando o efeito de surgimento central suave.
- `animate-slideInUp`: Usado em listagens de mapas iterativos para dar efeito de cascata (delay progressivo).

### 🧩 Padrões de Componentização
- Separação clara entre *estado global* (Contextos), *roteamento* (`App.jsx`), *layouts* persistentes e as *pages*.
- Utilização de **Edge Functions** para bypassar restrições do cliente Auth no Supabase.
- Controle de acessos via `<AdminRoute>`.

---

## 5. Status Atual
O projeto concluiu a **Fase 5 (Gestão e Segurança)**. O sistema possui um fluxo de autenticação resiliente, controle de permissões por nível de usuário, e todas as funcionalidades principais de campanhas operando com estabilidade.

## 6. Próxima Tarefa

**Início da Fase 6: Integração Real com API do WhatsApp e Webhooks**
- Configurar o envio real de mensagens via API da Meta usando os dados salvos em `configuracoes`.
- Implementar o recebimento de status de entrega/leitura via Webhook (N8N ou direto no Supabase).
- Atualização em tempo real do dashboard de progresso da campanha.
