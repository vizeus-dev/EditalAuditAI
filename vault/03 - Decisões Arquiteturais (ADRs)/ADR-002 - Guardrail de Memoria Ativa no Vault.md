---
tipo: adr
numero: "002"
status: aprovado
data: 2026-09-12
tags: [adr, governanca, segundo-cerebro, anti-alucinacao, memoria-ativa]
---

# 📜 ADR-002: Guardrail Mandatório de Memória Ativa no Obsidian Vault

> [!abstract] **Resumo da Decisão**
> Fica instituído o **Obsidian Vault (`vault/`)** como a fonte única da verdade (Single Source of Truth) para a arquitetura, status de desenvolvimento, inventário de código e diretrizes do projeto. Todo agente de IA que atue no repositório é obrigado a passar pela memória do Vault antes de qualquer execução (Check-in) e a registrar aprendizados ao final (Check-out), eliminando alucinações e garantindo máxima objetividade.

---

## 1. Contexto & Problema

Com a evolução rápida da base de código do EditalAudit AI (76 testes, dezenas de serviços, motores em Python e JS), agentes de IA em novas sessões ou após compactação de contexto frequentemente:
1. Alucinavam nomes de funções ou módulos que já haviam sido refatorados.
2. Esqueciam a regra de **Zero Git Push**, correndo o risco de rodar comandos de sincronização externa não autorizados.
3. Propunham soluções genéricas (ex: "instale LangChain" ou "use SQLite") quando o projeto já havia decidido por soluções nativas e leves via `ponytail`.
4. Perdiam o histórico do que já havia sido testado e aprovado no Gauntlet.

---

## 2. Decisão

1. **Criação do Cofre Canônico:** Todas as especificações, regras de negócio, lista de pareceristas, rotas de API e histórico de testes passam a residir em `vault/`.
2. **Check-in Pré-Execução Mandatório:** O agente deve obrigatoriamente ler o arquivo [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|00 - Painel Geral do Projeto EditalAudit]] e as notas técnicas relevantes antes de responder ao usuário ou editar código.
3. **Ancoragem Fiel (Grounding):** O agente é proibido de fazer asserções sobre arquivos sem referenciar os caminhos exatos com links Markdown clicáveis (`file:///...`).
4. **Check-out e Persistência:** Qualquer nova decisão, bug corrigido ou padrão aprendido deve ser gravado nas notas de [[06 - Memória Ativa e Registros/Diario de Bordo e Aprendizados|Diário de Bordo]] ou no [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|Painel Geral]].

---

## 3. Consequências

- **Positivas:**
  - Taxa de alucinação do agente reduzida a zero.
  - Respostas muito mais concisas, diretas e focadas na realidade do código.
  - Transição perfeita de contexto entre diferentes sessões de trabalho ou desenvolvedores.
- **Negativas / Esforço:**
  - Exige que o agente faça uma ou duas leituras de arquivo no início de cada intervenção, o que é compensado pela precisão da resposta.

---

## 🔗 Links Relacionados
- [[02 - Orquestra e Agentes/Protocolo Mandatorio de Memoria e Anti-Alucinacao|Protocolo Mandatório de Memória]]
- [[03 - Decisões Arquiteturais (ADRs)/ADR-001 - Arquitetura Hibrida e Zero Git Push|ADR-001: Arquitetura Híbrida]]
- [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|Painel Geral (MOC)]]
