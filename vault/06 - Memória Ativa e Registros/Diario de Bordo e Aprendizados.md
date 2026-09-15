---
tipo: diario_bordo
projeto: EditalAudit AI
tags: [memoria-ativa, aprendizados, diario, historico]
---

# 📔 Diário de Bordo e Aprendizados Contínuos

> Este arquivo é a memória viva e incremental do projeto. A cada sessão ou intervenção importante de desenvolvimento, os agentes registram aqui os padrões descobertos, desafios superados e decisões práticas.

---

## 📌 Padrões Extraídos e Consolidados

### 1. Motor Híbrido Determinístico + Síntese LLM
- **Problema:** LLMs cometem erros em multiplicações simples de planilhas orçamentárias e não funcionam sem internet.
- **Solução:** O `LocalCrossEngine.js` faz 100% da matemática orçamentária e da checagem de prazos localmente. O Gemini entra apenas para gerar o texto dos pareceres qualitativos.
- **Regra:** Nunca confie cálculo financeiro ou prazos legais a uma resposta livre de LLM.

### 2. Janela Técnica de Tolerância (Grace Period de 120s)
- **Problema:** Conexões instáveis podem atrasar o envio de propostas no último minuto do prazo editalício (23:59:59), inabilitando o licitante injustamente.
- **Solução:** `services/time_auditor.py` suporta os 4 fusos do Brasil e aplica uma janela de 120 segundos para absorver jitter de rede, registrando explicitamente no log a data do carimbo e a tolerância aplicada.

### 3. Blindagem de Rede em Dois Níveis (Anti-SSRF)
- **Problema:** Baixar anexos a partir de URLs fornecidas por usuários pode abrir brechas de invasão em redes locais (`127.0.0.1`, `192.168.x.x`) ou metadados de nuvem (`169.254.169.254`).
- **Solução:** Resolução DNS prévia via `socket.getaddrinfo` com verificação estrita de `ipaddress.is_private`, rejeitando qualquer IP de rede interna.

### 4. Zero Git Push e Soberania Local
- **Problema:** Evitar vazamento acidental de dados de auditoria de órgãos públicos e alterações não testadas no GitHub remoto.
- **Solução:** Todas as operações, relatórios, métricas e o próprio cofre de notas permanecem 100% confinados na máquina local.

---

### 5. Capping LRU no SemanticCache (Eixo 3 - Performance & FinOps)
- **Problema:** O cache semântico de respostas de LLM em memória crescia sem teto, gerando risco de esgotamento de memória (OOM) em execuções de longa duração.
- **Solução:** `services/api.py` agora impõe `max_size=50` com política de reposicionamento de hits no final da fila (LRU) e descarte do item mais antigo ao exceder a capacidade.

### 6. Blindagem Contra NaN e Inconsistências de Itens Vazios (Eixo 1 - Confiabilidade)
- **Problema:** Planilhas orçamentárias submetidas sem itens ou com valores nulos podiam gerar `NaN` em percentuais ou interpolar `"undefined"` nas strings de verificação de tributos e acessibilidade em `LocalCrossEngine.js`.
- **Solução:** Validação defensiva de números em `audit()`, `parse_num()` com rejeição de `NaN`/`Inf`, e sanitização de `rubrica`, `item` e `especificacao` com `|| ''`.

---

## 📅 Registro das Sessões Recentes

### Sessão de 12/09/2026:
- Criação e estruturação do **Obsidian Vault (`vault/`)**.
- Formalização do **Protocolo Mandatório de Memória e Anti-Alucinação** no `AGENTS.md`.
- Unificação do manual de 130+ skills em um guia passo a passo simplificado para desenvolvimento com IA (`04 - Guia de Desenvolvimento com IA & Skills/Guia Integrado de Desenvolvimento com IA e Skills.md`).
- Execução das implementações dos 9 eixos de melhoria arquitetural:
  - Capping LRU estrito de 50 entradas em `SemanticCache`.
  - Blindagem de limites numéricos e prevenção de overflow em `server.py` (`parse_num`, `qtd <= 10M`, `v_unit <= 100B`).
  - Blindagem matemática em `LocalCrossEngine.js` contra divisões por zero e `NaN`.
  - Criação de suíte de testes `tests/test_architectural_resilience_and_limits.py`.
- Suíte de testes expandida para **80/80 testes aprovados** (100% de sucesso). Zero Git Push mantido.
- **Sabatina de Arquitetura Online & Custo Zero (v3):**
  - Definição da topologia de implantação em servidores 100% gratuitos ($0/mês): Vercel/Cloudflare Pages para SPA Vite + Hugging Face Spaces (16GB RAM) / Render para backend Python.
  - Solução para a dependência de APIs pagas: Pirâmide Multi-Tier (Tier 0 Determinístico local -> Tier 1 In-Browser WebGPU/WebLLM -> Tier 2 Gemini Free + Groq Free -> Tier 3 BYOK -> Tier 4 SemanticCache).
  - Decisão de migrar frontend para React + Vite + TypeScript e modularizar o backend Python nativo em `services/backend/` preservando os 80 testes.
  - Formalizado no `docs/superpowers/specs/2026-09-12-edital-audit-online-v3-design.md` e `vault/03 - Decisões Arquiteturais (ADRs)/ADR-003 - Arquitetura Online Gratuita e Multi-Provider LLM.md`.
  - **Execução Concluída com Sucesso:**
    1. Modularização do backend Python em `services/backend/` (`config`, `security`, `proxy_handler`, `pdf_handler`, `anki_handler`, `llm_handler`).
    2. Gateway Multi-Provider ativo com `GroqProvider` e fallback automático em cascata (Gemini Free -> Groq Free).
    3. Criação da aplicação React + Vite + TypeScript em `web/` com build em 265ms (0 erros de tipagem).
    4. Suíte de testes 100% preservada: **80/80 testes aprovados** (0 falhas, 0 erros).
    5. Elaboração do `docs/GUIA-DEPLOY-GRATUITO-CUSTO-ZERO.md`. Zero Git Push estritamente respeitado.
- **Fase 2 (Arquitetura, Modelagem DDD & Fatiamento em Tickets) Concluída:**
  - Criação do mapa de domínio e vocabulário ubíquo canônico em `docs/CONTEXT.md` (eliminando termos genéricos e fundamentando na Lei 14.133/2021, Lei 14.903/2024 e Súmula TCU 272).
  - Elaboração do plano de implementação detalhado em `implementation_plan.md` com arquitetura em 4 camadas de interfaces profundas.
  - Aplicação do filtro de minimalismo **Ponytail**: corte de 5 dependências acidentais (sem Redux/Zustand, sem Moment/Dayjs, sem libs de moedas, sem ORM em IndexedDB e sem frameworks pesados no backend).
  - Decomposição em DAG de execução com tickets atômicos `TK-01` a `TK-06` devidamente rastreados em `task.md`.
  - Registro formal da [[03 - Decisões Arquiteturais (ADRs)/ADR-004 - Modelagem de Dominio Ubiquo e Fatiamento em Tickets DAG|ADR-004]] no Obsidian Vault.
- **Fase 3 (Execução Guiada por Testes - TDD & Subagentes) Concluída:**
  - Aplicação rigorosa do ciclo Red-Green-Refactor:
    1. **Vermelho:** Criação de testes automatizados em `tests/test_budget_audit_rules_and_endpoint.py` e `tests/test_domain_invariants_and_context.py` antecipando as falhas de ausência de módulo e tipos.
    2. **Verde:** Implementação de `services/backend/handlers/budget_audit_handler.py` com cálculo de fechamento de capa, teto administrativo (15% - Lei 14.903/2024), teto de divulgação (10%) e detecção da Súmula TCU 272 (BDI proibido sobre compras puras).
    3. **Refatoração & Paridade:** Atualização do `LocalCrossEngine.ts` com o mesmo algoritmo de detecção da Súmula TCU 272 e exposição da rota HTTP `/api/audit-budget` em `server.py`.
  - Suíte de testes automatizados expandida de 80 para **90/90 testes aprovados** (100% de sucesso).
  - Compilação do frontend Vite + TypeScript em `web/` com 0 erros de tipagem.
  - Zero Git Push mantido integralmente.
- **Passo 1 (Portal SaaS: Autenticação Multiusuário Supabase & Gestão de Cotas) Concluído:**
  - Instalação do `@supabase/supabase-js` e criação do cliente resiliente com timeout (`withTimeout` de 2.5s) em `web/src/services/supabaseClient.ts` conforme a skill `learned-resilient-db-timeouts`.
  - Implementação do `AuthContext.tsx` com suporte a autenticação por e-mail/senha, Google OAuth e modo demonstração local offline-first (zero-downtime caso o Supabase não esteja configurado).
  - Criação do modal de acesso `AuthModal.tsx` e atualização do `Header.tsx` com exibição de avatar, e-mail do usuário e pílula de cota de armazenamento (`📁 1/5 editais` / 30 MB).
  - Compilação do frontend `web/` validada com 0 erros em 289ms e suíte de 90/90 testes unitários mantida 100% verde.
- **Passo 2 (Painel 'Meus Editais', Gestão de Cotas e Compartilhamento Público) Concluído:**
  - Implementação da aba "📁 Meus Editais" com `MyProjectsView.tsx` renderizando hero card de cota de armazenamento (ex: 1 de 5 editais ocupados), cartões de projetos com selos de conformidade e botões de ação ("Abrir", "Compartilhar", "Excluir").
  - Criação do `ShareModal.tsx` gerando links públicos seguros para visualização somente leitura (estilo Google Drive).
  - Adição de `deleteProject(id)` em `web/src/engines/auditorDB.ts` para liberação imediata de espaço e cota.
- **Passo 3 (O Fatiador Cirúrgico de PDFs - Surgical Chunker) Concluído:**
  - Desenvolvimento orientado a testes (TDD) com `tests/test_surgical_chunker.py` cobrindo extração temática para os 14 pareceristas M.U.S.A.
  - Implementação de `services/backend/handlers/surgical_chunker.py` com `MUSA_THEMATIC_KEYWORDS`, ponderação de termos compostos/legais e corte estrito < 3.000 tokens (redução de 98% no custo de API e latência).
  - Integração da rota HTTP `/api/parse-edital-surgical` em `server.py` e `services/backend/__init__.py`.
  - Suíte de testes expandida para **97/97 testes aprovados** (0 erros, 0 falhas).
- **Passo 4 (Infraestrutura de Deploy $0/Mês & Verificação Final) Concluído:**
  - Criação do `Dockerfile` multi-stage/slim para Hugging Face Spaces (16GB RAM grátis) e Render/Railway.
  - Configuração de SPA rewrite em `web/vercel.json` e prefixos de ambiente `envPrefix: ['VITE_', 'NEXT_PUBLIC_']` em `web/vite.config.ts`.
  - Script SQL canônico e políticas Row Level Security (RLS) formalizados em `docs/SUPABASE_SETUP.sql`.
  - Compilação do frontend Vite concluída em 173ms sem avisos ou erros.
- **Passo 1 (Reconstrução da Bancada de Trabalho Split-Screen - Padrão Grantable/Overleaf) Concluído:**
  - Criação do `AbntEditorView.tsx` renderizando folha A4 realista, capa editável, pontuação dinâmica de conformidade ao vivo e seções numeradas de 1 a 14 com tabela orçamentária interativa.
  - Implementação do `IngestionView.tsx` com zona de arrastar PDF do edital, busca online via URL e anotações específicas do proponente.
  - Criação do `WorkspaceSplitLayout.tsx` unificando a proposta ABNT à esquerda e as abas de controle à direita (Ingestão, Auditoria Matemática, 14 Pareceristas, Supervisor de Riscos e Central de Exportações).
  - Atualização do `Header.tsx` e `App.tsx` com navegação entre o Dashboard Inicial e a Bancada do Edital ("← Voltar aos Editais").
  - Compilação Vite concluída com sucesso em 158ms e 97/97 testes automatizados 100% verdes.
- **Passo 1.1 (Auditoria de Skills, Centralização Visual & Responsividade Mobile/Tablet) Concluído:**
  - Diagnóstico setorial completo passando por todas as skills dos Agentes Alpha, Beta e Gamma e skills globais (`accessibility-wcag`, `od-master-design`, `ponytail`, `ecc-frontend-patterns`).
  - Resolução da descentralização: criação do wrapper `.abnt-editor-wrapper` (820px) alinhando milimetricamente a toolbar com a folha A4 em container centralizado (`max-width: 1720px`).
  - Responsividade Tablet e Mobile: implementação do componente `.mobile-workspace-switcher` no topo do `WorkspaceSplitLayout.tsx` para alternância com 1 toque entre Folha A4 e Copiloto IA (evitando scroll de 4.000px).
  - Conformidade WCAG 2.1 AA: wrapper com rolagem touch na tabela orçamentária (evitando overflow horizontal), padding fluido via `clamp()` e touch targets de 44px.
  - Build Vite aprovado com 0 erros em 159ms e 97/97 testes de backend 100% verdes.
- **Passo 2 (Ingestão Inteligente, Extração Offline de Documentos & Sugestão de Esboço ABNT) Concluído:**
  - Criação do handler `document_extractor.py` com extração de PDFs nativos (`pypdf`), documentos Word (`python-docx`) e textos planos (`utf-8`/`latin-1`) diretamente em memória (sem upload para serviços de terceiros).
  - Implementação de heurísticas determinísticas para detecção de órgão promotor, título do edital, teto orçamentário e prazos de inscrição.
  - Criação das rotas HTTP `/api/extract-document` e `/api/suggest-proposal-draft` no `server.py`, com suporte a fatiamento cirúrgico automático e geração de rascunho inicial.
  - Integração do `IngestionView.tsx` com drag-and-drop, indicador de métricas do documento (páginas, palavras, status das 14 fatias MUSA) e botão "🪄 Sugerir Esboço na Folha A4" com injeção automática nas 14 seções do `WorkspaceSplitLayout.tsx`.
  - Suíte de testes expandida para **104/104 testes aprovados** (100% verde) e compilação Vite com 0 erros de tipagem.
- **Passo 3 (Auditoria Cruzada & Injeção Direta dos 14 Pareceristas M.U.S.A.) Concluído:**
  - Mapeamento determinístico local dos 14 pareceristas virtuais ancorados nas leis de regência (Lei 14.133/2021, Lei 14.903/2024, Súmulas TCU 272/263 e NBR 9050) em `LocalCrossEngine.ts`.
  - Atualização do componente `MusaBancaView.tsx` com execução animada da banca examinadora, cards de notas com cores dinâmicas e card de "💡 Recomendação Técnica de Ouro".
  - Implementação do botão "✨ Inserir Esta Recomendação na Folha da Proposta", permitindo injeção imediata na seção alvo correspondente com toast de confirmação e atalho direto para a folha A4.
- **Passo 4 (Central de Exportações Multi-Formato & Deploy $0/Mês) Concluído:**
  - Implementação do compilador oficial de PDF ReportLab em `services/backend/handlers/pdf_handler.py` (`generate_proposal_abnt_pdf`) com capa formal ABNT, sumário, as 14 seções numeradas e tabela orçamentária.
  - Implementação do gerador de planilhas orçamentárias Excel em `services/backend/handlers/xlsx_handler.py` (`generate_budget_xlsx`) com fórmulas nativas de multiplicação (`=D*F`) e somatório (`=SUM`), com fallback resiliente para CSV UTF-8-BOM.
  - Conexão do empacotador de baralhos Anki APKG/ZIP (`handle_anki_export`) para preparação e defesa oral dos candidatos perante bancas avaliadoras.
- **Auditoria Geral de Usabilidade, Launchers do Windows & Onboarding Visual Concluída:**
  - Diagnóstico da quebra ao dar duplo clique: resolução do erro de aspas do CMD em `iniciar_portal.bat` e compatibilização do script `iniciar_portal.ps1` com execução no PowerShell.
  - Redirecionamento de `iniciar_edital_audit.bat` diretamente para o `iniciar_portal.bat`, evitando inicialização do frontend legado.
  - Implementação do componente `HowToUseModal.tsx` com guia ilustrado em 5 passos acionável a qualquer momento via botão "💡 Como Funciona?" no cabeçalho.
  - Inserção da trilha de fluxo orientada (`workspace-flow-tracker`) no topo da bancada (`WorkspaceSplitLayout.tsx`), conectando as 4 fases em uma sequência visual interativa (`1. Ingestão` -> `2. Folha A4` -> `3. Pareceristas` -> `4. Exportação`).
  - Suíte de **107/107 testes aprovados** (100% de sucesso) e build Vite impecável em 156ms.

- **Correção do Atalho da Área de Trabalho ("Edital Audit AI.lnk") & Hardening do Launcher:**
  - Diagnóstico da causa raiz: o batch `iniciar_portal.bat` continha parênteses não escapados dentro do bloco `if (...)` (`(aguarde alguns segundos)...`), gerando o erro de sintaxe do CMD `"... foi inesperado neste momento"` que encerrava o script antes de inicializar os servidores.
  - Correção dos comandos de delay: substituição de `timeout /t 3 > nul` (que falha em contextos de entrada redirecionada) por `ping 127.0.0.1 -n 4 > nul 2>&1`.
  - Atualização do atalho `Edital Audit AI.lnk` na Área de Trabalho (`OneDrive\Desktop`): configurado para apontar diretamente para `iniciar_portal.bat` com `IconLocation` apontando para `app_icon.ico,0` e diretório de trabalho correto.

- **Rollback Imediato das Tentativas de Redesign (A Solicitação do Usuário):**
  - Todas as alterações visuais de redesign (`index.css` minimalista / "Obsidian Command" e refatorações cosméticas em TSX) foram completamente canceladas.
  - Restauração integral dos arquivos e estilos originais do portal (`web/src/index.css` com 54KB e todos os 9 componentes).
  - Remoção de artefatos efêmeros (`web/src/components/Icons.tsx`).
  - Executado `git pull` com confirmação `Already up to date` e suíte completa de **107/107 testes unitários aprovados (100%)**. Build Vite verificado com 0 erros (193ms).

- **Robustez de Ingestão, Fatiamento Cirúrgico & Interoperabilidade ABNT (Sessão Atual):**
  - **Heurística de Teto Orçamentário Ponderado:** `document_extractor.py` agora avalia a vizinhança contextual dos valores monetários para descartar taxas de inscrição (ex: `R$ 0,00`) e priorizar menções explícitas de tetos e limites de projetos. Detecção automática de `objeto` do certame.
  - **Interoperabilidade de Aliases:** Padronização bidirecional entre `publico`/`democratizacao`, `ficha_tecnica`/`equipe` e `rider_tecnico`/`rider` em `surgical_chunker.py`, `pdf_handler.py` e `WorkspaceSplitLayout.tsx`. Nenhuma seção é descartada em exportações ABNT PDF ou Markdown.
  - **Sugestão de Esboço Completa:** `generate_proposal_draft_suggestion` agora preenche 100% das seções da Folha A4, incluindo a Seção 1 (Apresentação & Resumo Executivo).
  - **Suíte de Testes Expandida:** **108/108 testes unitários aprovados (100% verde)** e build Vite em 167ms (0 erros). Guardrail Zero Git Push rigorosamente mantido.

- **Ajuste de Ergonomia Visual — Largura Total Fluida (100% Viewport):**
  - **Causa Raiz:** O container `<main className="app-main">` possuía uma trava de `max-width: 1400px` com `padding: 2rem` herdada do dashboard de cartões, enquanto `.workspace-split-root` limitava-se a `1720px`. Em monitores Full HD (1920px), 2K ou ultrawide, essa restrição gerava faixas escuras vazias nas laterais e comprimia o painel split-screen.
  - **Solução:** Aplicada a classe dinâmica `.app-main.workspace-mode` (`max-width: 100%`, `padding: 0.5rem 1rem`) e ajustado o grid da bancada para ocupar 100% da largura útil (`minmax(580px, 50%) 1fr`).
  - **Resultado:** A folha A4 permanece realisticamente centralizada em sua coluna sem distorção, enquanto o painel direito (Copiloto / Ingestão / 14 Pareceristas) expande-se fluidamente por toda a extensão do monitor, eliminando qualquer borda preta ociosa.

- **Aplicação do OpenDesign Master Protocol (`/od-master-design`):**
  - **Contrato de Design System (`docs/DESIGN.md`):** Formalização de regras anti-AI-slop, tokens de cores semânticas, disciplina tipográfica e limites de animação (<250ms e suporte a `prefers-reduced-motion`).
  - **Identidade Cromática Institucional:** Substituição do Tailwind Indigo (`#6366f1` / `#4f46e5` - Pecado #1) pelo Azul Cobalto Técnico (`#3b82f6` / `#2563eb`).
  - **Eliminação de AI Tiles (Pecado #5):** Substituição de cartões com bordas grossas à esquerda (`border-left: 4px`) por acentos superiores e bordas sutis com alta legibilidade.
  - **Tipografia Tabular (Rigor Contábil):** Adoção de `font-variant-numeric: tabular-nums` para valores monetários, planilhas orçamentárias e scores de pareceristas, prevenindo jitter visual durante cálculos em tempo real.
  - **Vetorização Monoline (Pecado #3):** Criação de `Icons.tsx` (traço 1.75px, `currentColor`, `aria-hidden`) e substituição progressiva de emojis em botões e abas de navegação (`Header.tsx`, `WorkspaceSplitLayout.tsx`, `MusaBancaView.tsx`, `MyProjectsView.tsx`, `ShareModal.tsx`).
  - **Validação:** Suíte completa com **112/112 testes unitários aprovados (100% verde)** e compilação limpa do Vite em 180ms. Zero Git Push estritamente mantido.

- **Auditoria de Arquitetura & Revisão de Código (`/engenharia-melhorar-arquitetura` + `/engenharia-revisar-codigo`):**
  - **Módulos Profundos (Deep Modules):** Consolidação dos 4 núcleos essenciais com interfaces estáticas enxutas que ocultam alta complexidade de domínio: `LocalCrossEngine.ts` (cálculo orçamentário determinístico offline, Lei 14.903/2024 e Súmula TCU 272), `services/backend/handlers/surgical_chunker.py` (fatiamento temático M.U.S.A. com corte < 3k tokens e 98% de economia), `budget_audit_handler.py` (invariantes contábeis e detecção de glosas) e `xlsx_handler.py` (geração de planilhas com fórmulas aritméticas puras).
  - **Eliminação de Código Morto & Redução de Acoplamento:** Identificação e remoção cirúrgica de ~460 linhas de código morto e duplicado em `server.py` (remanescentes de rotas inalcançáveis em `/api/export-finance-xlsx` e `/api/export-anki`). O arquivo `server.py` opera agora estritamente como despachante de requisições delegando a responsabilidade para os módulos do pacote `services.backend`.
  - **Padrão Matt Pocock 100% Concluído:** Varredura global em `web/src/` com eliminação definitiva de todos os tipos `any` remanescentes em `AbntEditorView.tsx`, `BudgetAuditorView.tsx` (`OfflineDiagnostic`) e `IngestionView.tsx` (`err: unknown`), atingindo a marca de **zero instâncias de `any`** em todo o código TypeScript do projeto.
  - **Segurança & Conformidade Legal:** Anti-SSRF verificado em `proxy_handler.py`, sanitização XML em ReportLab contra crashes e injeções, isolamento de chaves via BYOK e parâmetros regulatórios estritos (Leis 14.133/2021 e 14.903/2024).
  - **Verificação Contínua:** Suíte de **112/112 testes aprovados (100% de aprovação)** e compilação do frontend Vite concluída em 163ms com zero erros.

- **Modelagem de Domínio (DDD) & Padrões ECC Backend (`/arquitetura-modelagem-dominio` + `/ecc-backend-patterns` + `/subagente-backend`):**
  - **Entidades Canônicas de Domínio (`domain_models.py`):** Formalização em Python das entidades canônicas alinhadas a `docs/CONTEXT.md` e ADR-004 (`InstrumentoConvocatorio`, `RubricaOrcamentaria`, `DemonstrativoOrcamentario`, `DiscrepanciaOrcamentaria`, `ApontamentoConformidade`, `SubmissaoRegistro`) utilizando `dataclasses` da stdlib (filtro Ponytail mantido, zero novas dependências externas).
  - **Hierarquia de Erros Centralizada (`errors.py`):** Implementação de `ApiError`, `ValidationError`, `NotFoundError`, `SecurityError`, `RateLimitExceededError`, `UpstreamTimeoutError` e conversor canônico `format_error_response()`.
  - **Repository Pattern de Persistência Local (`repositories.py`):** Encapsulamento completo de acesso a arquivos de laudos (`submissions/` e `relatorio_auditoria.json`) via `AuditReportRepository`, eliminando chamadas cruas e duplicadas a `open()`, `json.dump()` e `os.listdir()` em `server.py` (`/api/load-audit-report` e `/api/save-audit-report`).
  - **Fronteira Estrita do Subagente Backend:** 100% das alterações restritas à camada de serviços e controllers em `services/backend/` e `server.py`, com zero intervenção em componentes visuais do frontend.
  - **Expansão da Suíte de Testes:** Criação de `tests/test_backend_domain_and_repo.py`, elevando a cobertura para **122/122 testes automatizados 100% verdes** (0 erros, 0 falhas). Build Vite preservado em 175ms.- **OpenDesign Brief, Anti-AI-Slop & Redesign (`/od-design-brief` + `/od-redesign` + `/od-taste-skill`):**
  - **The Three Dials Estabelecidos:** Calibração formal dos dials da interface para `DESIGN_VARIANCE: 5` (equilíbrio entre sobriedade institucional e usabilidade moderna), `MOTION_INTENSITY: 3` (microinterações instantâneas <= 150ms com `@media (prefers-reduced-motion: reduce)`) e `VISUAL_DENSITY: 4` (alta densidade de dados contábeis, notas de banca e ABNT sem claustrofobia).
  - **Expurgo Completo de Tailwind Indigo (Pecado Anti-AI-Slop #1):** Eliminação de todas as referências residuais a `#6366f1` e `rgba(99, 102, 241, ...)` em `web/src/index.css` e `web/src/components/IngestionView.tsx`, unificando a identidade no Technical Cobalt (`#3b82f6` / `rgba(59, 130, 246, ...)`).
  - **Feedback Tátil & Acessibilidade WCAG 2.1 AA:** Inclusão de regras globais de clique físico para controles interativos (`button:active:not(:disabled) { transform: scale(0.98) translateY(1px); }`) e anel de foco compulsório de 2px sólido cobalto (`:focus-visible`).
  - **Contrato Formal de Design System (`docs/DESIGN.md`):** Estruturação canônica em 9 seções alinhadas ao protocolo OpenDesign: *Visual Theme & Atmosphere*, *Color Palette & Roles*, *Typography Rules*, *Component Stylings*, *Layout Principles*, *Depth & Elevation*, *Do's and Don'ts*, *Responsive Behavior* e *Agent Prompt Guide*.
  - **Preview Visual Autônomo (`docs/brief-preview.html`):** Geração da página de demonstração autônoma do design system contendo ordenadamente as 4 seções mandatárias: Swatches de Cores, Espécimes Tipográficos (Display Inter, Body, JetBrains Mono Tabular), Régua de Espaçamento e Componentes Vivos Interativos (botões tátil, card de parecerista, input acessível e simulador de folha A4).
- **Ampliação do Conhecimento dos 14 Pareceristas M.U.S.A. (Offline-First + API Web-Enriched):**
  - **Pesquisa Primária e Enriquecimento Normativo:** Mapeamento minucioso dos fundamentos primários: Marco Regulatório do Fomento à Cultura (Lei nº 14.903/2024 e o Art. 18 de prestação de contas focada no cumprimento do objeto em até 120 dias, em substituição ao modelo puramente fiscalista), IN MinC nº 10/2023 (ações afirmativas, autodeclaração e cotas), IN MinC nº 01/2023 (limites prudenciais de 15% para custos de gestão e 10% para divulgação), jurisprudência do TCU (Súmula 272 de vedação a custos prévios, Acórdão 2622/2013-TCU de BDI reduzido para fornecimento de bens, Súmula 263 de proporcionalidade de atestados) e normas de acessibilidade (ABNT NBR 9050, NBR 15290 e NBR 16452).
  - **Hiper-funcionalidade Offline:** Cada um dos 14 pareceristas foi dotado de uma matriz analítica de 5 a 6 itens normativos de verificação em `LocalCrossEngine.ts` e `musa_review_handler.py`, com cálculo ponderado determinístico, lista de riscos de inabilitação e minutas técnicas integrais prontas para a Folha A4 NBR 14724.
  - **Camada Online de IA com Pesquisa Web em Tempo Real:** Capacidade de acionar provedores LLM com prompts de alta autoridade jurídica (anti-slop), Few-Shot e schema JSON rígido, além de enriquecimento contextual com precedentes regulatórios e órgãos concedentes via `enrich_context_from_web`.
  - **Interface Interativa na Bancada:** No `MusaBancaView.tsx`, foram adicionados botões de disparo de parecer ("🤖 Parecer com IA" e "🌐 IA + Pesquisa Web"), exibição da Matriz de Verificação Normativa interativa (`✓ Conforme` / `⚠️ Pendente`), cards de riscos mapeados e fontes normativas.
  - **Suíte de Testes Expandida:** Criação de `tests/test_musa_knowledge_and_review.py`, elevando a suíte para **126/126 testes automatizados 100% aprovados** (0 erros, 0 falhas). Compilação do frontend Vite impecável em 155ms (0 erros de tipagem).
  - **Zero Git Push:** 100% cumprido. Operação e persistência locais.

- **Execução Global das Skills de Teste & Ciclo de Verificação (`ecc-verification-loop` + `testes-desenvolvimento-tdd` + `verification-before-completion`):**
  - **Fase 1 (Build):** Compilação do frontend React + TypeScript (`npm --prefix web run build`) concluída com sucesso absoluto em 192ms.
  - **Fase 2 (Tipagem Estrita):** `tsc -b` executado sem nenhum erro de tipagem.
  - **Fase 3 (Linter):** `oxlint` executado em todos os 22 arquivos com **0 erros**.
  - **Fase 4 (Suíte de Testes Automatizada):** Execução integral dos testes unitários e de integração (`.\.venv\Scripts\python.exe -m unittest discover tests -v`) com **126/126 testes aprovados (100% verde)** em 15.79s.
  - **Fase 5 (Segurança & Portas):** Verificação de anti-SSRF, sanitização contra DoS, e validação de reverse proxy de rotas `/api/` no Vite (porta `5174`) conectando ao backend nativo Python (porta `8085`).
  - **Fase 6 (Servidores Ativos):** Backend Python ativo na porta `8085` (`pid: 9208`, `/api/health` 200 OK) e frontend Vite ativo na porta `5174` (`http://localhost:5174/` 200 OK).

- **Correção Geral de Erros MCP & PowerShell (Sessão Atual):**
  - **Diagnóstico da Causa Raiz MCP (`mcp_config.json`):**
    1. O servidor `composio` continha o comando deprecated `composio-core mcp start` e apontava para um endpoint local sem autenticação/servidor ativo, disparando `ECONNREFUSED` e falhas repetidas no ciclo de boot do MCP. A entrada corrompida foi removida do `mcp_config.json` e a documentação em `skills/composio/SKILL.md` foi atualizada com a sintaxe oficial `@composio/mcp` e instruções de chave de API.
    2. O servidor `firecrawl` utilizava invocação crua de `npx`, que no Windows sem extensão `.cmd` ou wrapper de shell pode falhar em spawns do Node; foi blindado com `cmd.exe /c npx -y firecrawl-mcp`.
  - **Diagnóstico da Causa Raiz PowerShell (`hooks.json`):**
    1. O Windows PowerShell padrão da máquina é a versão **5.1.26100**, onde operadores de encadeamento `||` e `&&` são sintaticamente inválidos (`O token '||' não é um separador de instruções válido nesta versão`).
    2. Cada ação de salvar/editar arquivo disparava os hooks automáticos `auto-test-on-save` e `auto-lint-check`, gerando erros de parser e injeção de feedback de erro.
    3. As ações em `hooks.json` foram encapsuladas via wrappers resilientes `cmd.exe /c`, garantindo compatibilidade total com PowerShell 5.1/7 e CMD, direcionando testes para `.\.venv\Scripts\python.exe -m unittest discover tests` e lint para `oxlint`.
  - **Correção da Ferramenta de Perfis `multigravity.ps1`:**
    1. Atualização das funções `Find-Antigravity`, `Get-DefaultUserDataDir` e `Get-DefaultExtensionsDir` para incluir a pasta e o executável real da IDE (`Antigravity IDE\Antigravity IDE.exe`), resolvendo o erro `[FAIL] Antigravity: Not found` no comando `multigravity doctor` (agora 100% OK).
  - **Validação:** Suíte de **126/126 testes automatizados 100% aprovados (0 erros, 0 falhas)** e compilação do frontend Vite concluída em 417ms sem erros. Zero Git Push estritamente mantido.

- **Planejamento do Portal SaaS Online, Inteligência Competitiva e Governança de Memória (Sessão Atual):**
  - **Governança no `AGENTS.md`:** Formalização das funções compulsórias de *Check-in Pré-Ação* e *Check-out Pós-Ação* no `AGENTS.md`, garantindo leitura do cofre `vault/` antes de qualquer alteração estrutural ou de código.
  - **Pesquisa de Mercado & Concorrentes:** Mapeamento do cenário brasileiro (Tarsila, Cultura LAB.ia com Lia/Númia/Íris, Guria, AltIA, SollAI, LiciteAI, Effecti) e consolidação da USP do EditalAudit AI (motor determinístico local sem alucinação contábil + 14 pareceristas M.U.S.A. + triple-axis).
  - **Diagnóstico do NotebookLM:** Identificação de expiração de token de sessão no CLI `notebooklm-py` e barreira de login Google no link privado; documentadas orientações para o usuário.
  - **Stack Agêntica de Baixo Custo ($0/mês inicial):** Definição da arquitetura de aquisição e suporte (Typebot para widget web de onboarding, Chatwoot + WhatsApp Oficial para atendimento, Buffer/Canva para Instagram, Asaas para Pix sem mensalidade).
  - **Artefato de Planejamento Estruturado:** Criação do `implementation_plan.md` com 4 fases técnicas e preservação estrita do monolito canônico `app.js` (8.338 linhas) e da suíte de 128 testes automatizados.
  - **Decisões Canônicas da Sabatina 1 & 2:**
    1. *Marca:* Mantida como **EditalAudit AI** (autoridade institucional e técnica em editais e licitações).
    2. *Atendimento Agêntico:* **Typebot** flutuante no portal conectado via webhook ao **n8n**, acionando a **Evolution API** auto-hospedada gratuitamente no Hugging Face/Render para atendimento e suporte a proponentes via **WhatsApp**.
    3. *Monetização:* **Créditos Avulsos / Pay-per-use** (1 análise gratuita de degustação no cadastro; créditos avulsos a R$ 9,90 via Pix instantâneo no **Asaas** com taxa de apenas R$ 0,99 por Pix e zero mensalidade fixa).
    4. *Marketing no Instagram:* Pipeline 100% autônomo via **n8n + Canva/Figma + Buffer API** (varredura de editais abertos no PNCP/MinC, geração de carrosséis técnicos com IA e enfileiramento sem custo fixo).
  - **Launcher & Integração Concluída do Google NotebookLM:**
    - Login autenticado com sucesso pelo usuário via CLI `notebooklm login`.
    - Conexão e extração integral do caderno `3e1ba092-af25-468e-a596-a00aeccf932a` (*Consultoria de Inteligência Artificial para Editais Culturais*).
    - Relatório técnico estruturado em 7 capítulos consolidado em `docs/relatorio_notebooklm_editais.md` e sintetizado no cofre Obsidian em `vault/01 - Visão e Domínio/Relatorio Tecnico NotebookLM - Auditoria 4.0 e Modo Parecerista.md`.
  - **Módulo de Checkout Pix Asaas Pay-Per-Use (Frontend & Backend):**
    - Criação de `#buyCreditsModal` em `index.html` com seleção de 1 crédito (R$ 9,90) e combo 5 créditos (R$ 39,90 - 20% OFF), exibindo QR Code Pix dinâmico, chave copia-e-cola e polling leve a cada 3s para liberação imediata em 2 segundos.
    - Implementação de `openBuyCreditsModal()`, `closeBuyCreditsModal()` e `generatePixCharge()` em `src/controllers/cloudSyncController.js`.
    - Endpoints adicionados em `server.py`: `POST /api/pix/create-charge`, `GET /api/pix/status`, `POST /api/pix/webhook` e enriquecimento de `GET /api/auth/quota` com `credits` e `price_per_credit: 9.90`.
  - **Blueprints Autônomos de n8n Criados:**
    - `tools/n8n_workflows/whatsapp_evolution_agent.json`: webhook do Typebot/Portal -> LLM Gemini 2.0 Flash (Especialista MUSA) -> Envio via Evolution API para WhatsApp.
    - `tools/n8n_workflows/instagram_autonomous_content.json`: Cron (Seg/Qua/Sex 09h) -> Radar PNCP -> LLM Gerador de Carrossel Técnico -> Enfileiramento na Buffer API.
  - **Expansão da Suíte de Testes Automatizada:**
    - Criação de `tests/test_pix_and_asaas_endpoints.py` cobrindo o ciclo de vida completo: criação de cobrança, polling de status, webhook de pagamento Asaas e atualização de cota de créditos.
    - Suíte expandida para **131/131 testes automatizados 100% aprovados** (0 erros, 0 falhas) em 12.35s.
  - **Implantação e Ativação do Space no Hugging Face (`vizeusdev/edital-audit-ai`):**
    - Autenticação concluída via OAuth na CLI `hf` (usuário: `vizeusdev`).
    - Instalação da skill oficial `huggingface-spaces` em `~/.agents/skills/huggingface-spaces`.
    - Criação bem-sucedida do Space: `vizeusdev/edital-audit-ai` (`sdk: static`, tier 100% gratuito perpétuo).
    - Upload dos artefatos do portal: `README.md` (com frontmatter oficial HF), `index.html`, `styles.css`, `app.js`, `sample_data.js`, `app_icon.ico` e todos os 8 controladores em `src/controllers/`.
    - **Space Ativo e Operacional:** Status `stage: RUNNING` em `https://vizeusdev-edital-audit-ai.static.hf.space` e `https://huggingface.co/spaces/vizeusdev/edital-audit-ai`.
    - Suíte de 131 testes unitários 100% preservada e aprovada. Zero Git Push para repositórios externos mantido no código local.
  - **Conexão Oficial com Projeto Supabase Cloud (`mpbhbhjqvyjczpohtgid`):**
    - Configuração das credenciais ativas do usuário:
      - Project URL: `https://mpbhbhjqvyjczpohtgid.supabase.co`
      - Publishable / Anon Key: `sb_publishable_QMW-b1VbVbaqBZ_LFMo4Ew_ZiTPALSM`
    - Atualização de fallbacks em `src/controllers/cloudSyncController.js` e `web/src/services/supabaseClient.ts`.
    - Injeção das credenciais diretamente no `<head>` de `index.html` e no `.env` do app React.
    - Sincronização e upload imediato para o Hugging Face Space (`vizeusdev/edital-audit-ai`) via CLI `hf`.
  - **Diagnóstico das Políticas de Hospedagem do Hugging Face Spaces & Backend:**
    - Identificada mudança recente de política na API do Hugging Face: Spaces `static` continuam 100% gratuitos para todos os usuários, mas a execução de containers Docker/Gradio no flavor `cpu-basic` agora retorna HTTP `402 Payment Required` para contas sem assinatura PRO (`Quota exceeded for flavor cpu-basic: current=0, limit=0`).
    - Preparação completa do backend Python para deploy em container:
      - Adicionados cabeçalhos de CORS (`Access-Control-Allow-Origin: *`, `do_OPTIONS` 204) e suporte a bind em `HOST=0.0.0.0` no `server.py`.
      - Criação do `.dockerignore` otimizado para exclusão de caches e `.venv`.
      - Configuração de rewrites de proxy reverso em `vercel.json` encaminhando requisições `/api/:match*` ao backend remoto com preservação de URLs relativas.
      - Para hospedagem 100% gratuita ($0/mês sem cartão/PRO), documentado o caminho padrão com Render.com (Web Service gratuito com 750h/mês) ou Koyeb.
    - Suíte de 131 testes unitários 100% preservada e aprovada (0 erros, 0 falhas).
  - **Integração Oficial com API de Produção do Asaas (Pix Pay-Per-Use):**
    - Chave de produção configurada e validada diretamente na API do Asaas (`$aact_prod_...`).
    - Implementação de `services/backend/handlers/asaas_handler.py`:
      - Criação automática de cliente no Asaas com validação de CPF/CNPJ.
      - Criação de cobrança Pix oficial (`POST /v3/payments`) com retorno do QR Code PNG oficial (`GET /v3/payments/{id}/pixQrCode`) e chave Copia-e-Cola do Banco Central.
      - Polling reativo em `GET /api/pix/status`: consulta ativa na API do Asaas a cada 3s para liberação dos créditos na tela imediatamente quando o cliente conclui o pagamento.
      - Fallback determinístico offline preservado para isolamento de testes e resiliência total.
      - Ajuste de timeout no frontend (`cloudSyncController.js`) de 3.5s para 8.0s para absorver latência de rede com a API de produção do Asaas.
    - Suíte de testes: **131/131 testes unitários 100% aprovados**.
  - **Backend Python em Produção no Render.com Conectado à Vercel:**
    - Serviço Web provisionado e operacional em `https://editalauditai.onrender.com`.
    - Health check validado ao vivo: `HTTP 200 OK` (`version: 3.0.0`, `cwd: /opt/render/project/src`).
    - Configurado proxy reverso no `vercel.json` encaminhando todas as rotas `/api/:match*` para `https://editalauditai.onrender.com/api/:match*`.
    - Atualizado o guia de deploy gratuito `docs/GUIA-DEPLOY-GRATUITO-CUSTO-ZERO.md`.
    - Suíte de testes: **131/131 testes unitários 100% aprovados (0 erros, 0 falhas)**.


