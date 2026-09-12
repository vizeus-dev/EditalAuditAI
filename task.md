# TASK.MD — CHECKLIST DE TAREFAS ATÔMICAS (DAG DE EXECUÇÃO)

**Projeto:** EditalAudit AI  
**Data:** Setembro de 2026  
**Status do Pipeline:** FASE 2 CONCLUÍDA — PRONTO PARA EXECUÇÃO DA FASE 3

---

## 📋 Checklist Ordenado por Dependência (DAG)

### 🔹 Pacote 1: Backend, Resiliência & Confiabilidade (Agente ALPHA)
- [x] **TK-01:** Refinamento defensivo de parsing de data em `services/time_auditor.py` (suporte multi-formato ISO 8601 e BR, precisão de microssegundos 999999).
- [x] **TK-02:** Expansão lexical do conjunto de compliance em `services/api.py` com institutos da Lei 14.133/2021 (ETP, matriz de risco, impugnação, BDI, SINAPI/SICRO).
- [x] **TK-03:** Criação do motor autônomo do loop contínuo local `tools/orchestrator_loop.py` com relatório incremental em `docs/AUDIT-LOOP-LOG.md`.
- [x] **TK-04:** Adicionar tratamento defensivo contra listas vazias ou nulas na geração de planilhas orçamentárias XLSX no backend (`server.py`).

---

### 🔹 Pacote 2: Frontend, Acessibilidade & Contratos de Dados (Agente BETA)
- [x] **TK-05:** Validação de paridade de critérios entre o motor offline (`LocalCrossEngine.js`) e online (`aiController.js`) eliminando campos `undefined`.
- [x] **TK-06:** Inspeção e manutenção de atributos descritivos de acessibilidade (`aria-label`) e suporte ao viewport responsivo de 390px no [styles.css](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/styles.css).
- [x] **TK-07:** Adicionar badges visuais de citação normativa da Lei 14.133/2021 e jurisprudência TCU na renderização de cards (`aiController.js` / `styles.css`).

---

### 🔹 Pacote 3: Governança, Gauntlet de Testes & Segurança (Agente GAMMA)
- [x] **TK-08:** Mapeamento de dependências estáticas da base legado em grafo navegável interativo (`graphify-out/graph.json` e `graphify-out/graph.html`).
- [x] **TK-09:** Plano de melhoria arquitetural em 9 eixos estruturado em `plans/architectural_improvement_plan.md`.
- [x] **TK-10:** Aplicação da disciplina Ponytail (YAGNI) e documentação de decomposição retrógrada em `docs/DECOMPOSICAO-RETROGRADA-E-PONYTAIL.md`.
- [x] **TK-11:** Execução da suíte de 75 testes automatizados via `.venv/Scripts/python.exe` com 100% de aprovação.
- [x] **TK-12:** Auditoria de segurança cibernética (anti-SSRF, headers CSP, limite de payload e trava mandatória de zero git push).

---

## 🎯 Critério de Conclusão da Fase 2
Todas as análises AST, consultorias em 9 eixos, podas YAGNI e decomposições retrógradas foram geradas e persistidas localmente.
Aguardando aprovação manual do usuário para seguir com os tickets pendentes da Fase 3.
