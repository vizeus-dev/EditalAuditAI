# PLANO DE MELHORIA ARQUITETURAL EM 9 EIXOS (/IMPROVE)

**Projeto:** EditalAudit AI (`vizeus-dev/EditalAuditAI`)  
**Autor:** Consultor Arquitetural Sênior (Skill /improve)  
**Data:** Setembro de 2026  
**Status:** PRONTO PARA EXECUÇÃO POR SUBAGENTES

---

## 1. Avaliação Diagnóstica nos 9 Eixos

### 1.1 Eixo 1: Correção e Confiabilidade (Correctness & Bugs)
- **Diagnóstico:** O sistema apresenta paridade offline/online estabilizada após a unificação dos campos de critérios (`criterio` / `name`). O motor de cálculo de prazos (`time_auditor.py`) foi aperfeiçoado para parsing flexível de datas (ISO e BR).
- **Ação Planejada:** Monitorar a ausência de divisões por zero ou valores `NaN` quando planilhas orçamentárias vierem vazias no frontend.

### 1.2 Eixo 2: Segurança Cibernética (Security)
- **Diagnóstico:** A blindagem anti-SSRF em `validate_safe_url` está 100% ativa, bloqueando loopback, redes privadas e metadados de nuvem. Os tetos de 50 MB e 35 MB bloqueiam tentativas de DoS. A chave Gemini é trafegada via header `x-goog-api-key`.
- **Ação Planejada:** Manter a trava inegociável de **ZERO GIT PUSH**, mantendo 100% dos dados no ambiente local.

### 1.3 Eixo 3: Performance e Latência (Performance)
- **Diagnóstico:** O `DocumentRetriever` (BM25) responde em menos de 0.1 ms com in-memory chunk cache. O motor de fusos responde em 0.04 ms.
- **Ação Planejada:** Preservar a política de LRU cache em `services/api.py` com limite de 50 entradas para evitar estouro de memória em execuções longas.

### 1.4 Eixo 4: Cobertura e Confiabilidade de Testes (Test Coverage)
- **Diagnóstico:** 75 testes automatizados em 20 arquivos executados com 100% de aprovação em ~6.2 segundos.
- **Ação Planejada:** Nenhuma modificação pode ser mesclada se a contagem de testes cair ou se qualquer teste falhar.

### 1.5 Eixo 5: Dívida Técnica e Arquitetura (Tech Debt & Architecture)
- **Diagnóstico:** Os arquivos `server.py` e `app.js` são monólitos de grande porte. No entanto, sua separação funcional está bem demarcada por controladores desacoplados em `src/controllers/` (`localCrossEngine.js`, `aiController.js`, `auditorDB.js`).
- **Ação Planejada:** Manter o desacoplamento incremental sem refatorações destrutivas ou quebra de contratos de rotas.

### 1.6 Eixo 6: Dependências e Migrações (Dependencies & Migrations)
- **Diagnóstico:** Dependências enxutas e atualizadas (`openpyxl==3.1.5`, `pypdf>=6.15.0`, `python-docx==1.2.0`, `reportlab==5.0.0`). Nenhuma dependência externa pesada (como LangChain) foi introduzida.
- **Ação Planejada:** Princípio Ponytail (YAGNI): utilizar bibliotecas da stdlib sempre que possível.

### 1.7 Eixo 7: Experiência do Desenvolvedor (DX & Tooling)
- **Diagnóstico:** Criado o utilitário `tools/orchestrator_loop.py` que permite executar a esteira completa com um único comando (`--cycles 1`).
- **Ação Planejada:** Integrar comandos de execução rápida no terminal para os subagentes.

### 1.8 Eixo 8: Documentação e Continuidade de Conhecimento (Docs & Memory)
- **Diagnóstico:** Base documental robusta em `docs/` com mais de 10 relatórios técnicos, ADR-001, nota no Segundo Cérebro e governança em `AGENTS.md`.
- **Ação Planejada:** Alimentar continuamente o arquivo `docs/AUDIT-LOOP-LOG.md` a cada iteração do loop.

### 1.9 Eixo 9: Direcionamento do Produto & Autonomia (Product Direction)
- **Diagnóstico:** Transição bem-sucedida de um script utilitário para uma suíte de auditoria completa orientada a 14 especialistas M.U.S.A.
- **Ação Planejada:** Operação do sistema de loop contínuo local para homologação permanente.

---

## 2. Planos Autocontidos de Execução para Subagentes

1. **Subagente Backend (ALPHA):**
   - Reforçar validação de limites numéricos nos endpoints de PDF e Excel.
   - Manter testes de regressão de rotas rápidos e idempotentes.
2. **Subagente Jurídico (BETA):**
   - Monitorar a jurisprudência do TCU sobre prazos e impugnações.
   - Garantir que o texto dos 14 pareceristas seja preciso e cite os artigos legais correspondentes.
3. **Subagente Qualidade (GAMMA):**
   - Executar o gauntlet de testes a cada ciclo.
   - Auditar o isolamento do Git e manter a integridade dos logs.
