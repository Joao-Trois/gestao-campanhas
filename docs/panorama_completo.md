# Panorama Arquitetural e Funcional: Sistema de Gestão de Campanhas

## 1. Visão Geral
Plataforma web B2B projetada para gestão, orquestração e disparo de campanhas de mensageria via WhatsApp. O sistema provê uma interface para gestão de templates, processamento de contatos em lote via planilhas estruturadas, e schedulamento de disparos. Todo o ecossistema é protegido por controles de acesso baseados em roles (RBAC).

---

## 2. Stack Tecnológica

### Frontend (Client-Side)
- **Framework Core:** React 19 executado em ambiente Node via Vite 8.
- **Roteamento:** React Router DOM (v7) com validação de guarda de rotas (`ProtectedRoute`, `AdminRoute`).
- **Engenharia de UI/UX:** Tailwind CSS v4 para estilização baseada em utilitários, otimizado por `tailwind-merge`. A biblioteca de ícones padronizada é o `lucide-react`.
- **Processamento de Dados:** Utilização da biblioteca `xlsx` para parsing, validação e extração em memória de dados tabulares (`.xlsx`, `.csv`).

### Backend (BaaS & Serverless)
- **Infraestrutura DB:** Supabase (PostgreSQL para dados estruturados).
- **Gestão de Identidade e Acesso (IAM):** Supabase Auth com persistência de sessões stateful no client.
- **Serverless Compute:** Supabase Edge Functions rodando em Deno para operações críticas e bypass seguro de políticas de client auth (ex: provisionamento de usuários por admins).
- **Segurança da Camada de Dados:** Políticas de RLS (Row Level Security) estritas configuradas nativamente no banco de dados.
- **Jobs Assíncronos:** Processamento e orquestração de filas de disparo operando via rotinas (Jobs) nativas configuradas no Supabase.

---

## 3. Arquitetura e Estrutura de Diretórios

O design pattern da aplicação separa as camadas de visualização, gestão de estado e integração de API em componentes modulares.

```text
gestao-campanhas/
├── src/
│   ├── components/        # Componentes visuais atômicos e módulos independentes (ex: Sidebar, Modals)
│   ├── contexts/          # Gerenciadores de estado global e middlewares lógico-funcionais (AuthContext)
│   ├── layouts/           # High Order Components de interface para encapsulamento das Views (ex: DashboardLayout)
│   ├── lib/               # Clientes e instâncias de infraestrutura de rede (supabase.js)
│   ├── pages/             # Controladores de visão responsáveis por injetar lógica de negócios local e instanciar componentes
│   ├── App.jsx            # Entry point central da arvore de roteamento do React Router
│   ├── index.css          # Injeção global dos layers do Tailwind e definições do CSSOM raiz
│   └── main.jsx           # Setup de bootsrap do React no DOM
├── supabase/
│   └── functions/         # Serviços Edge (Serverless backend functions)
├── docs/                  # Documentação técnica e modelagem relacional (schema.sql, panoramas)
└── package.json           # Manifesto de dependências e automação de scripts de build
```

---

## 4. Módulos e Funcionalidades Principais

### Autenticação e IAM (`Login.jsx`, `Settings.jsx`)
Sistema de autenticação baseado em tokens JWT com mitigação de falhas ativas de token e reautenticação automática. O painel de Settings atua como hub restrito aos perfis `admin` para gerenciamento do pool de usuários corporativos.

### Taxonomia e Tags (`Tags.jsx`)
Módulo voltado ao CRUD de metadados para indexação das peças de comunicação (Templates).

### Gestão de Templates (`Templates.jsx`, `TemplateForm.jsx`)
Interface de setup de modelos de mensagens a serem pré-aprovados pela Meta. Implementa um parser em tempo real que mapeia strings via Regex (ex: `{{Variavel_Teste}}`) e prepara os blocos de texto para merge de dados advindos das planilhas de contatos.

### Ingestion e Tratamento de Contatos (`ContactLists.jsx`, `ContactListImport.jsx`, `ContactListDetails.jsx`)
Módulo que recebe payloads de planilhas. A rotina processa a matriz de dados em memória, valida heurísticas de numerações DDI/DDD (telefones móveis), executa a sanitização dos IDs de contato, e persiste os dados de forma paginada para otimização de queries curtas durante renderizações e listagens extensas.

### Orquestração de Campanhas (`Campaigns.jsx`, `CampaignWizard.jsx`, `CampaignDetails.jsx`)
Core-engine do projeto. Modulado em um pipeline (Wizard) de 4 steps lógicos:
1. Parametrização dos Metadados (Nome, Tags Opcionais).
2. Vinculação de Template preexistente.
3. Alocação do dataset de destino (Contact List).
4. Data Matching (associação lógica das colunas da planilha às chaves mapeadas no template), agendamento no CRON do servidor de dispatch, e deploy da campanha.
O módulo `CampaignDetails` atua como hub de monitoramento de performance de rede e status da entrega.

---

## 5. Status do Sistema e Integração

O motor de processamento backend já encontra-se instrumentado para o disparo de volume assíncrono. O processamento da fila de envios das campanhas já está executando de modo nativo via Jobs configurados dentro da infraestrutura do Supabase. As mecânicas cruciais de setup e persistência relacional estão em regime operacional.

**Fase Atual de Finalização e Deploy:**
O roadmap concentra-se nas seguintes etapas conclusivas antes de Go-Live e liberação comercial:
1. **Implantação de Módulo de Pagamento:** Setup e integração das rotinas de billing associativas aos usuários ou uso de infraestrutura.
2. **Finalização da Configuração de Disparos:** Parametrização final do gateway lógico e finalização do setup integrado à API estendida da nuvem da Meta, para que os Jobs comecem a despachar e consumir as mensagens no pipeline produtivo real.
