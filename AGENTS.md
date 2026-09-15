# AGENTS.md — Governança da Orquestra EditalAudit AI

Este repositório opera sob a orquestração de **3 Agentes Especialistas**, distribuindo as skills globais e respeitando a trava mandatória de segurança de **zero git push** (operação e persistência 100% locais).

---

## 👥 Os 3 Agentes Especialistas

### 1. Agente ALPHA: Engenharia de Sistemas, Confiabilidade & Performance
- **Foco:** Backend nativo, resiliência de sockets, tolerância a falhas, tempo de resposta e tipagem segura.
- **Skills Atribuídas:**
  - `arquitetura-design-modular`
  - `ecc-backend-patterns`
  - `ecc-coding-standards`
  - `learned-resilient-db-timeouts`
  - `engenharia-implementar-especificacao`
  - `systematic-debugging`
  - `testes-desenvolvimento-tdd`
  - `ponytail` / `ponytail-review`

### 2. Agente BETA: Inteligência Regulatória, Domínio Editalício & IA
- **Foco:** Conformidade com a Lei 14.133/2021, Marco Legal da Cultura (Lei 14.903/2024), jurisprudência do TCU, prompt engineering para os 14 pareceristas M.U.S.A. e RAG semântico.
- **Skills Atribuídas:**
  - `arquitetura-modelagem-dominio`
  - `brainstorming`
  - `documentacao-redacao-estruturada`
  - `firecrawl-research` / `produtividade-pesquisa-tecnica`
  - `ml-best-practices`
  - `gestao-especificacao-tecnica`
  - `accessibility-wcag`

### 3. Agente GAMMA: Guardião da Qualidade, Segurança & Loop Autônomo
- **Foco:** Esteira contínua de verificação (75/75 testes automatizados), varredura estática de segurança (anti-SSRF, DoS, segredos), documentação de memória ativa e controle de guardrails de Git.
- **Skills Atribuídas:**
  - `engenharia-revisar-codigo`
  - `verification-before-completion`
  - `ecc-verification-loop`
  - `ecc-security-review`
  - `documentacao-escrita-para-agentes`
  - `segundo-cerebro-ciclo-memoria-ativa`
  - `engenharia-guardrails-git`

---

## 🛡️ Guardrails e Regras Inegociáveis

1. **ZERO GIT PUSH:**
   - É estritamente proibido executar qualquer comando `git push` ou sincronização externa.
   - Todas as otimizações, relatórios e logs permanecem confinados nas pastas locais (`docs/`, `tools/`, `services/`, `src/`).
2. **Suíte de Testes Mandatória (100% de Aprovação):**
   - Nenhuma alteração é aceita sem que a suíte completa de testes (`.\.venv\Scripts\python.exe -m unittest discover tests`) passe com 131/131 testes aprovados (0 falhas, 0 erros).
3. **Padrão Matt Pocock & Tipagem Estrutural:**
   - Tipagem explícita com JSDoc no frontend e type hints em Python (`typing`, `timezone`, `datetime`).
   - Proibição de asserções inseguras (`any` / casting cego). Validação defensiva em limites de entrada.
4. **Resiliência Offline-First:**
   - Toda a auditoria matemática roda no motor determinístico local (`LocalCrossEngine.js`).
   - O backend e a API LLM atuam de forma desacoplada com timeouts estritos e fallbacks seguros.
5. **Gating Mandatório de Memória Ativa no Obsidian Vault (`vault/`) & Anti-Alucinação:**
   - **Função Compulsória de Check-in Pré-Ação:** Antes de executar QUALQUER ação, modificar arquivos, diagnosticar bugs, criar planos de implementação ou propor arquitetura, o agente DEVE OBRIGATORIAMENTE executar a leitura da memória persistente em `vault/`:
     1. Ler `vault/00 - Dashboard/00 - Painel Geral do Projeto EditalAudit.md` (MOC e status do sistema).
     2. Ler `vault/06 - Memória Ativa e Registros/Diario de Bordo e Aprendizados.md` (últimos aprendizados e padrões técnicos).
     3. Consultar a ADR relevante em `vault/03 - Decisões Arquiteturais (ADRs)/` se a tarefa envolver mudanças estruturais.
   - **Zero Alucinação & Grounding:** Proibido inventar caminhos de arquivos, bibliotecas, comandos ou regras sem evidência concreta no Vault ou no código ativo. Toda resposta deve conter links diretos para os arquivos reais (`file:///...`).
   - **Máxima Objetividade:** Respostas concisas, técnicas e direcionadas ao ponto central, sem prolixidade ou clichês de IA.
   - **Função Compulsória de Check-out Pós-Ação:** Ao concluir qualquer alteração significativa, o agente deve obrigatoriamente registrar o novo padrão em `vault/06 - Memória Ativa e Registros/Diario de Bordo e Aprendizados.md`.


