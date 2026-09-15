---
tipo: livro_razao
categoria: debitos_tecnicos
filosofia: ponytail
tags: [ponytail, debitos, yagni, simplificacao]
---

# 📒 Livro-Razão de Débitos Técnicos (Ponytail Ledger)

> Sob a filosofia **Ponytail**, atalhos e simplificações conscientes não são "código ruim", mas sim escolhas deliberadas de engenharia para evitar over-engineering (YAGNI). No entanto, esses atalhos devem ser registrados para que não fiquem invisíveis no projeto.

---

## 📌 Itens Rastreados e Decisões Pragmáticas

| Módulo / Arquivo | Simplificação Adotada (Ponytail) | Racional Técnico | Ação Futura (Se Necessário) |
| :--- | :--- | :--- | :--- |
| `services/api.py` | Busca textual BM25 e segmentação de tabelas nativa (sem LangChain/LlamaIndex). | Evitou instalar mais de 40 dependências externas frágeis para uma tarefa que Python puro resolve em 250 linhas. | Manter nativo enquanto o volume de documentos não exigir cluster distribuído. |
| `LocalCrossEngine.js` | Funções matemáticas síncronas no frontend em vez de fila de workers. | A execução de checagem orçamentária leva menos de 2 milissegundos para planilhas normais de até 500 itens. | Adicionar Web Worker apenas se o usuário importar planilhas com mais de 50.000 linhas. |
| `auditorDB.js` | Uso de `IndexedDB` nativo do navegador via Promises simples sem ORM pesado. | Zero dependência de pacotes npm, 100% suportado por todos os navegadores modernos. | Manter padrão nativo. |
| `tools/orchestrator_loop.py` | Loop contínuo baseado em chamadas nativas de subprocessos Python (`unittest`, regex). | Sem dependência de agentes externos em nuvem; roda de forma autônoma em qualquer terminal Windows. | Manter local. |

---

## 🔗 Links Relacionados
- [[04 - Guia de Desenvolvimento com IA & Skills/Guia Integrado de Desenvolvimento com IA e Skills|Guia de Skills & Ponytail]]
- [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|Painel Geral (MOC)]]
