---
tipo: projeto
status: homologado
prioridade: alta
ferramenta_principal: Python / Vanilla JS / Gemini SSE / IndexedDB
para_quem_e: Equipe EditalAudit AI & Operador
categoria: LegalTech / Auditoria de Compras Públicas e Fomento Cultural
---

# Projeto: EditalAudit AI (M.U.S.A. Framework)

Sistema avançado de auditoria, conformidade regulatória e otimização de propostas para licitações públicas (Lei 14.133/2021) e fomento cultural (Marco Legal da Cultura — Lei 14.903/2024, PNAB, Aldir Blanc, Rouanet/Salic).

---

## 🎯 Objetivos
- [x] Mapear toda a arquitetura de backend, frontend, testes e ferramentas utilitárias.
- [x] Conduzir pesquisa aprofundada normativa (Lei 14.133/2021, Lei 14.903/2024, Súmulas TCU 263 e 272).
- [x] Estruturar Orquestra de 3 Agentes Especialistas (Alpha, Beta, Gamma) com todas as skills globais.
- [x] Implementar executor autônomo do loop contínuo de verificação, otimização e auditoria local (`tools/orchestrator_loop.py`).
- [x] Garantir 100% de aprovação na suíte de testes (76 testes em 20 arquivos).
- [x] Blindar guardrail de Git: **ZERO GIT PUSH** — operação e armazenamento 100% locais.

---

## 🗺️ Roadmap & Frentes de Trabalho
- [x] **Fase 0: Setup & Inteligência:** Mapeamento de tendências, registro no Segundo Cérebro e inspeção de skills.
- [x] **Fase 1: Gating Cognitivo:** Sabatina técnica, ADR-001 (Arquitetura Híbrida Offline-First), Design Brief.
- [x] **Fase 2: Decomposição & DAGs:** Grafo de dependências (`graphify`), priorização YAGNI (`ponytail`), geração de tickets TK-01 a TK-06.
- [x] **Fase 3: Execução Paralela:** Subagentes Backend, Frontend e Governança atuando nas melhorias de código.
- [x] **Fase 4: Gauntlet Loops:** Suíte de 76 testes aprovados, security review, verificação de acessibilidade e performance.
- [x] **Fase 5: Handoff & Aprendizado Contínuo:** Registro de padrões aprendidos, log incremental e prontidão do loop contínuo.

---

## Relações & Dependências

### Depende de
- [[docs/PESQUISA-WEB-E-ANALISE-EDITALAUDIT]]
- [[docs/ORQUESTRACAO-3-AGENTES]]
- [[docs/SISTEMA-LOOP-CONTINUO]]

### Relacionado a
- [[server.py]]
- [[services/api.py]]
- [[services/time_auditor.py]]
- [[src/controllers/localCrossEngine.js]]
- [[src/controllers/aiController.js]]
