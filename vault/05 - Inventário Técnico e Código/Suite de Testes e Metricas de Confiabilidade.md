---
tipo: inventario_tecnico
modulo: testes
total_testes: 80
status: 100_porcento_aprovado
tags: [testes, unittest, confianca, qa, gauntlet]
---

# 🧪 Suíte de Testes Automatizados e Confiabilidade

> A qualidade e a imunidade a regressões do **EditalAudit AI** são garantidas por uma suíte de **80 testes automatizados** distribuídos em 21 arquivos de teste, com tempo de execução inferior a 10 segundos.

---

## 📊 Estatísticas da Suíte

```
Ran 80 tests in 6.296s
Status: OK (0 falhas, 0 erros)
Taxa de Aprovação: 100.0%
```

### Comando Oficial de Execução Mandatória:
```bash
.\.venv\Scripts\python.exe -m unittest discover tests
```

---

## 📁 Distribuição dos Arquivos de Teste (`tests/`)

| Arquivo de Teste | Quantidade / Foco do Teste |
| :--- | :--- |
| `test_architectural_resilience_and_limits.py` | Capping LRU (50 itens), bounds numéricos, parse_num contra NaN/Inf e geração segura de Excel. |
| `test_api.py` | Rotas de API, endpoints HTTP e validação de payloads. |
| `test_time_auditor.py` | Conversão de fusos horários brasileiros e janela de tolerância de 120s. |
| `test_multi_axis.py` | Geração de cartões de estudo (Anki TSV e pacotes APKG/ZIP) e Método M.U.S.A. |
| `test_security.py` | Varredura estática de segurança: anti-SSRF, sanitização de caminhos e segredos. |
| `test_resilience.py` | Padrão `learned-resilient-db-timeouts`, simulação de queda de rede e fallbacks. |
| `test_offline_cross_engine.py` | Verificação matemática determinística de orçamentos e prazos processuais. |
| `test_edital_rio_doce.py` | Validação de caso real de edital cultural (PNAB/Rio Doce) e fórmulas de planilha. |
| `test_docx_parser.py` & `test_pdf_parser.py` | Extração fiel de texto em documentos anexos. |
| `test_state_integrity.py` | Integridade de estado concorrente e prevenção de corrupção de cache. |

---

## 🛡️ O Guardrail do Agente GAMMA

Nenhuma solicitação de usuário é dada como concluída sem que a suíte completa rode com **76/76 testes aprovados**.
Se qualquer teste quebrar, a prioridade máxima é usar a skill `systematic-debugging` para isolar a causa raiz e restaurar a cobertura total antes de qualquer outra tarefa.

---

## 🔗 Links Relacionados
- [[02 - Orquestra e Agentes/Protocolo Mandatorio de Memoria e Anti-Alucinacao|Protocolo Mandatório de Memória]]
- [[05 - Inventário Técnico e Código/Backend e Servicos Python|Backend e Serviços Python]]
- [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|Painel Geral (MOC)]]
