# GRAFO DE EXECUÇÃO DAG & ORQUESTRAÇÃO POR GIT WORKTREES (FASE 3)

**Projeto:** EditalAudit AI  
**Data:** Setembro de 2026  
**Topologia:** Directed Acyclic Graph (DAG) com 3 Worktrees Paralelas & Redutor de Estado  
**Trava de Segurança:** **100% Local (Zero Git Push)**

---

## 1. Topologia do Grafo de Execução (DAG com Supersteps)

```mermaid
graph TD
    subgraph "SUPERSTEP 0: Setup de Isolamento & Contratos A2A"
        S0_Init["Inicialização do Despacho"] --> S0_Contracts["Definição de Contratos A2A (JSON Schema)"]
        S0_Contracts --> S0_WT1["Worktree Backend: .worktrees/backend (branch feature/alpha-backend)"]
        S0_Contracts --> S0_WT2["Worktree Frontend: .worktrees/frontend (branch feature/beta-frontend)"]
        S0_Contracts --> S0_WT3["Worktree Governança: .worktrees/governanca (branch feature/gamma-governanca)"]
    end

    subgraph "SUPERSTEP 1: Execução Paralela Isolada (Zero Colisão)"
        S0_WT1 --> N1_Alpha["[NÓ 1A] Subagente Backend (ALPHA)
• Skills: /ecc-backend-patterns, /ecc-coding-standards
• Escopo: services/api.py, services/time_auditor.py, server.py
• Foco: Robustez de sockets, schema validation, streaming SSE"]
        
        S0_WT2 --> N1_Beta["[NÓ 1B] Subagente Frontend (BETA)
• Skills: /od-master-design, /ecc-frontend-patterns, /accessibility-wcag
• Escopo: src/controllers/, styles.css, app.js, index.html
• Foco: 14 Pareceristas M.U.S.A., badges normativos, responsividade"]

        S0_WT3 --> N1_Gamma["[NÓ 1C] Subagente Governança (GAMMA)
• Skills: /segundo-cerebro-ciclo-memoria-ativa, /ecc-security-review
• Escopo: docs/, AGENTS.md, task.md, logs
• Foco: Memória ativa Obsidian, trava Zero Git Push, métricas"]
    end

    subgraph "SUPERSTEP 2: Sincronização & Redução de Estado (Reducer)"
        N1_Alpha --> S2_Collect["Coletor de Diffs A2A"]
        N1_Beta --> S2_Collect
        N1_Gamma --> S2_Collect
        S2_Collect --> S2_Reducer["Redutor de Estado (Atomic Squash & Merge local para main)"]
    end

    subgraph "SUPERSTEP 3: Gauntlet de Verificação & Fechamento"
        S2_Reducer --> S3_Tests["Bateria de 75 Testes Automatizados (100% Aprovação)"]
        S3_Tests --> S3_Security["Auditoria Estática de Segurança (Anti-SSRF & Segredos)"]
        S3_Security --> S3_Cleanup["Cleanup Seguro das Worktrees Locais & Registro em AUDIT-LOOP-LOG.md"]
    end
```

---

## 2. Matriz de Paralelismo & Contratos de Interoperabilidade

| Nó de Execução | Subagente | Diretório Isolado (Worktree) | Branch Local | Protocolo de Troca |
| :--- | :---: | :--- | :--- | :--- |
| **Nó 1A: Backend** | **ALPHA** | `.worktrees/backend` | `feature/alpha-backend` | **MCP / A2A:** Retorna endpoints validados, tipagem estrita e benchmarks de latência. |
| **Nó 1B: Frontend** | **BETA** | `.worktrees/frontend` | `feature/beta-frontend` | **MCP / A2A:** Retorna componentes de visualização, tokens de design e badges acessíveis. |
| **Nó 1C: Governança** | **GAMMA** | `.worktrees/governanca` | `feature/gamma-governanca` | **MCP / A2A:** Retorna notas do Segundo Cérebro, histórico de ADRs e logs de ciclo. |

---

## 3. Regras de Unificação de Diffs (State Reducer)

1. **Separação Rígida de Arquivos:**
   - Alpha modifica exclusivamente: `server.py`, `services/**`, `tools/**`.
   - Beta modifica exclusivamente: `src/controllers/**`, `styles.css`, `index.html`, `app.js`.
   - Gamma modifica exclusivamente: `docs/**`, `AGENTS.md`, `task.md`.
2. **Mesclagem sem Conflito:** Como os escopos de diretório são disjuntos, a fusão local para a branch `main` é realizada por *fast-forward* ou *non-fast-forward squash* sem atrito.
3. **Trava Inegociável:** Nenhuma das worktrees ou branches locais será alvo de `git push origin`.
