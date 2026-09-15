---
tipo: adr
numero: "004"
status: aprovado
data: 2026-09-12
tags: [adr, ddd, domain-modeling, linguagem-ubiqua, ponytail, tickets-dag, invariantes-contabeis]
---

# 📜 ADR-004: Modelagem de Domínio Ubíquo (DDD), Filtro Ponytail e Fatiamento em Tickets DAG

> [!abstract] **Resumo da Decisão**
> O EditalAudit AI formaliza a adoção do **Domain-Driven Design (DDD)** com vocabulário estritamente ubíquo baseado na Lei 14.133/2021 e Lei 14.903/2024, proíbe nomenclaturas técnicas genéricas (`item`, `data`, `user`, `result`), aplica o filtro de minimalismo **Ponytail** para cortar 5 bibliotecas redundantes em favor de Web APIs nativas e da Stdlib Python, e decompõe a execução em um grafo direcionado acíclico (DAG) de tickets atômicos rastreáveis em `task.md`.

---

## 1. Contexto & Forças em Disputa

1. **Ambiguidade Semântica:** O uso de termos genéricos gerava acoplamento e ruído entre as regras contábeis do frontend (`LocalCrossEngine`) e os pareceres jurídicos da Banca M.U.S.A.
2. **Proliferação de Dependências:** Bibliotecas de estado (Redux/Zustand), utilitários de data (Moment/Dayjs) e formatadores monetários aumentavam o bundle size e a superfície de vulnerabilidades sem benefício real sobre as Web APIs modernas.
3. **Complexidade de Integração:** Mudanças na planilha orçamentária quebravam a validação de capa por falta de invariantes matemáticas formalizadas.

---

## 2. Decisão Arquitetural

### 2.1 Instituição da Linguagem Ubíqua e Mapa de Domínio (`CONTEXT.md`)
Fica formalizado o mapa canônico em `docs/CONTEXT.md`, onde:
- `InstrumentoConvocatorio` substitui `Edital` genérico ou `data`.
- `DemonstrativoOrcamentario` substitui `Planilha` ou `budget`.
- `RubricaOrcamentaria` substitui `item` ou `row`.
- `ValorCapaDeclarado` e `ValorAnaliticoCalculado` expressam formalmente a checagem de fechamento.
- `RiscoGlosa` e `ApontamentoConformidade` modelam os achados de auditoria.

### 2.2 Aplicação do Filtro Ponytail (Corte de Abstrações Excessivas)
- **Eliminação de Libs de Estado:** Estado concentrado em React `useReducer` nativo + persistência local assíncrona em IndexedDB nativo.
- **Eliminação de Libs de Data e Moeda:** Utilização compulsória de `Intl.DateTimeFormat` e `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Backend Stdlib-First:** Persistência do servidor em Python nativo (`http.server`, `urllib`), com pegada de memória $< 40$ MB.

### 2.3 Fatiamento em DAG de Tickets Atômicos
A evolução técnica é modelada como um Grafo Acíclico Direcionado (DAG):
- **TK-01:** Tipagem Canônica de Domínio Ubíquo (`web/src/types/edital.ts`).
- **TK-02:** Refinamento do Motor Aritmético e Invariantes Legais (`localCrossEngine.ts`).
- **TK-03:** Persistência IndexedDB com Vocabulário Ubíquo (`auditorDB.ts`).
- **TK-04:** Sincronização Capa vs Planilha na Interface Viva (`BudgetAuditorView.tsx`).
- **TK-05:** Conexão da Banca M.U.S.A. com Fallback FinOps (`MusaBancaView.tsx`).
- **TK-06:** Laudo Consolidado PDF (ReportLab) e Anki (APKG/ZIP).

---

## 3. Sabatina de Decisões Técnicas (Grill Me)

| Pergunta Crítica da Sabatina | Resposta & Justificativa Técnica |
| :--- | :--- |
| **"Por que gastar tempo modelando vocabulário em vez de codificar direto?"** | Porque o domínio de licitações públicas e cultura (Lei 14.133 e 14.903) pune com nulidade orçamentária divergências de capa e sobrepreço. O vocabulário ubíquo garante que engenheiros, pareceristas IA e usuários falem a mesma língua. |
| **"Por que não usar Zustand ou Redux Toolkit no frontend?"** | O fluxo de dados do EditalAudit é unidirecional e hierárquico (Edital -> Demonstrativo -> Rubricas -> Laudo). O `useReducer` do React cobre 100% da necessidade com zero dependências externas e tempo de carga instantâneo. |
| **"Como o fatiamento em DAG melhora o desenvolvimento com IA?"** | Evita regressões permitindo que subagentes paralelos trabalhem em tickets independentes sem tocar no mesmo arquivo simultaneamente. |

---

## 4. Consequências & Conformidade

- **Positivas:** Zero custo de licença de dependências, bundle frontend menor que 250 KB (gzip 78 KB), clareza conceitual absoluta e aderência rigorosa às normas do TCU.
- **Negativas:** Requer disciplina dos desenvolvedores e agentes para manter o padrão sem importar atalhos de pacotes externos no `package.json`.
- **Conformidade de Guardrails:** 100% aderente a Zero Git Push, 80/80 testes verdes e Padrão Matt Pocock.
