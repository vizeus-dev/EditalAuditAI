# ADR-001: Arquitetura Híbrida Offline-First, Tolerância a Falhas e Guardrail Local (Zero Git Push)

> **Status:** APROVADO  
> **Data:** Setembro de 2026  
> **Decisores:** Antigravity Architect, Subagente Backend, Subagente Governança  
> **Contexto:** Projeto EditalAudit AI (`vizeus-dev/EditalAuditAI`)

---

## 1. Contexto & Desafios Técnicos

O sistema **EditalAudit AI** opera em ambiente desktop e servidor local para auditoria de editais de compras públicas (Lei 14.133/2021) e fomento cultural (Lei 14.903/2024). Três grandes desafios precisavam de posicionamento arquitetural estrito:
1. **Confiabilidade e Sobrevivência Sem Conexão:** Editais públicos exigem auditoria orçamentária matemática exata (tetos de 15% adm, 10% divulgação, fórmulas de soma de itens). Delegar a matemática para LLMs produz alucinações de cálculo e falha se a rede cair.
2. **Fusos Horários e Deadlines Rígidos:** No Brasil existem 4 fusos horários oficiais (Brasília UTC-3, Manaus UTC-4, Acre UTC-5, Noronha UTC-2). A perda de prazo por latência de rede de poucos segundos inabilita o licitante.
3. **Segurança e Isolamento do Repositório Remoto:** Diretriz expressa do usuário de que nenhum comando `git push` ou atualização externa ao GitHub pode ser disparada durante os ciclos de otimização contínua.

---

## 2. Decisão Arquitetural

### 2.1 Padrão Híbrido: "Matemática no Motor Local, Síntese Narrativa na LLM"
- **Pilar Determinístico Local (`LocalCrossEngine.js` e `services/time_auditor.py`):**
  - Toda a auditoria matemática de orçamento, validação de tetos, checagem de seções obrigatórias e conformidade de prazos é calculada **localmente sem chamadas de rede**.
  - O cálculo de deadline aplica uma janela técnica de tolerância (*Grace Period*) de 120 segundos para absorver latência de transmissão de pacotes TCP/IP e carimbo de tempo no servidor do órgão.
- **Pilar Generativo / Semântico (`aiController.js` e `services/api.py`):**
  - O LLM Gemini atua exclusivamente na síntese qualitativa, calibração de pareceres dos 14 especialistas M.U.S.A., interpretação semântica de justificativas e sugestões de redação.
  - Caso o provedor Gemini esteja sem cota ou indisponível (HTTP 503 / 429), o sistema degrada graciosamente para o relatório determinístico gerado pelo `LocalCrossEngine`.

### 2.2 Guardrail de Git: Trava Absoluta de Git Push
- Nenhum script, comando de teste ou automação no projeto possui autorização para emitir `git push origin <branch>`.
- Todas as alterações, relatórios de auditoria, logs e métricas são consolidados localmente nas pastas `docs/`, `tools/` e artefatos de sessão.

---

## 3. Sabatina de Decisões Técnicas (Grill Me)

| Pergunta Crítica da Sabatina | Resposta & Justificativa Técnica |
| :--- | :--- |
| **"Por que não usar uma biblioteca de LLM mais pesada (LangChain/LlamaIndex)?"** | Viola o princípio YAGNI (`ponytail`). O retriever embutido em `services/api.py` implementa BM25, segmentação de tabelas e cache semântico com menos de 300 linhas de código nativo Python, sem centenas de dependências frágeis. |
| **"Por que manter o IndexedDB no cliente em vez de SQLite no backend?"** | Garante o princípio *Offline-First* no navegador do usuário com zero dependência de inicialização de servidor para consulta de relatórios salvos e histórico. |
| **"Como garantir que o Grace Period de 120s não induza o usuário ao erro?"** | O `time_auditor.py` marca explicitamente nos logs se a proposta foi aceita no prazo legal estrito ou dentro da tolerância de latência de rede. |

---

## 4. Consequências da Decisão
- **Positivas:**
  - 100% de disponibilidade operacional mesmo offline.
  - Custo de tokens drasticamente reduzido (FinOps) graças ao pré-cálculo e cache semântico.
  - Risco nulo de vazamento de dados locais para o repositório público do GitHub.
- **Negativas / Cuidados:**
  - Exige manutenção contínua da paridade de campos entre o `LocalCrossEngine` e o `aiController`.
