# TASK.MD — CHECKLIST DE TAREFAS ATÔMICAS (DAG DE EXECUÇÃO)

**Projeto:** EditalAudit AI  
**Fase Vigente:** Fase 2 — Arquitetura, Modelagem DDD & Fatiamento em Tickets  
**Status do Pipeline:** DAG DEFINIDA — FILTRO PONYTAIL APLICADO — 80/80 TESTES PYTHON BASE VERDES

---

## 🧭 Grafo de Dependências (DAG de Execução)

```
[TK-01: Tipagem Canônica DDD]
       │
       ├─────────────────────────┐
       ▼                         ▼
[TK-02: Motor Aritmético]  [TK-03: Persistência IndexedDB]
       │                         │
       └───────────┬─────────────┘
                   ▼
       [TK-04: Sincronização Capa vs Planilha UI]
                   │
                   ▼
       [TK-05: Banca M.U.S.A. com Fallback FinOps]
                   │
                   ▼
       [TK-06: Laudo Consolidado PDF & Anki]
```

---

## 📋 Tickets Atômicos da Fase 2

### 🔹 Pacote 1: Domínio & Motores Locais (Agente ALPHA & BETA)
- [x] **TK-01:** Modelagem formal do vocabulário ubíquo em `docs/CONTEXT.md` e tipagem estrutural TypeScript em `web/src/types/edital.ts`.
- [x] **TK-02:** Implementação do motor determinístico `localCrossEngine.ts` com cálculo de fechamento de capa, teto administrativo (15%), teto de divulgação (10%) e Súmula TCU 272.
- [x] **TK-03:** Camada de persistência local-first `auditorDB.ts` utilizando Web API nativa IndexedDB sem dependências pesadas (YAGNI).

---

### 🔹 Pacote 2: Interface Reativa & Conexão de Domínio (Agente BETA)
- [x] **TK-04:** Sincronização em tempo real entre o valor declarado na Capa do Projeto e o somatório analítico na planilha viva `BudgetAuditorView.tsx`, com emissão de badges de conformidade.
- [x] **TK-05:** Conexão da Banca M.U.S.A. (`MusaBancaView.tsx`) com streaming SSE e cascata de fallback FinOps (Gemini 15 RPM -> Groq Llama 3.3 70B 30 RPM -> BYOK).

---

### 🔹 Pacote 3: Governança, Integração & Saídas Executivas (Agente GAMMA)
- [x] **TK-06:** Integração com exportação formal de Laudo Executivo em PDF e Flashcards Anki (`services/backend/handlers/pdf_handler.py` e `anki_handler.py`).
- [x] **TK-07:** Formalização da decisão arquitetural (ADR-004) no Obsidian Vault (`vault/03 - Decisões Arquiteturais (ADRs)/`).
- [x] **TK-08:** Atualização dos registros de memória ativa e MOC central no Obsidian Vault (`vault/00 - Dashboard/` e `vault/06 - Memória Ativa/`).

---

### 🔹 Pacote 4: Robustez de Ingestão, Fatiamento & Compliance ABNT (Fase Vigente)
- [x] **TK-09:** Heurísticas contextuais de teto orçamentário e extração de objeto no `document_extractor.py` (filtragem de taxas e valores zerados).
- [x] **TK-10:** Mapeamento de aliases e interoperabilidade entre o frontend e os exportadores PDF e Markdown (`democratizacao`/`publico`, `equipe`/`ficha_tecnica`, `rider_tecnico`/`rider`).
- [x] **TK-11:** Geração de sugestão de esboço completa para todas as seções ABNT incluindo Seção 1 (Apresentação).
- [x] **TK-12:** Expansão da suíte de testes unitários para **108/108 testes aprovados (100% de sucesso)**.
- [x] **TK-13:** Avaliação aprofundada M.U.S.A. com IA (`/api/musa-deep-review`), fatiamento cirúrgico (< 3k tokens) e fallback offline determinístico resiliente na interface.
- [x] **TK-14:** Expansão da suíte de testes unitários para **112/112 testes aprovados (100% de sucesso)**.

---

## 🛡️ Guardrails Inegociáveis
1. **Zero Git Push:** Operação estritamente local.
2. **112/112 Testes Unitários Aprovados:** Nenhuma regressão na suíte Python.
3. **Padrão Matt Pocock:** Tipagem estrutural estrita em TypeScript, proscrito uso de `any`.
4. **Memória Ativa:** Registro mandatório pré e pós-execução no Obsidian Vault.
