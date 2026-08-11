# Relatório de Auditoria de Testes e Cobertura do Projeto

> **Data da Auditoria:** 11/08/2026  
> **Escopo:** Avaliação da suíte de testes existente, cálculo de cobertura estática de código e criação de testes automatizados para prazos/fusos horários, elegibilidade e fluxo completo de submissão.  
> **Ferramentas Utilizadas:** `coverage 7.15.4`, `unittest` nativo, subprocess runner automatizado.  

---

## 1. Execução da Suíte de Testes

Foram identificados e executados **17 arquivos de teste automatizados** no projeto:

| Arquivo de Teste | Duração (s) | Status | Detalhes / Observação |
| :--- | :---: | :---: | :--- |
| [`test_architectural_fixes.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_architectural_fixes.py) | 0.30s | ✅ **PASS** | Cache semântico e sanitização de dados. |
| [`test_e2e.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_e2e.py) | 0.33s | ⚠️ **FAIL** | Falha de formatação no console Windows (caractere unicode `\u2717` no print). |
| [`test_encoding_and_profile.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_encoding_and_profile.py) | 0.40s | ✅ **PASS** | Correção de Mojibake UTF-8 duplo e formatação ReportLab. |
| [`test_excel_gen.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_excel_gen.py) | 0.52s | ✅ **PASS** | Geração e fórmulas da planilha orçamentária (`openpyxl`). |
| [`test_fluxo_submissao_proposta.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_fluxo_submissao_proposta.py) *(Novo)* | 1.40s | ✅ **PASS** | **Pipeline completo 5 etapas:** Ingestão -> Auditoria -> Revisão -> Supervisão -> Exportação DOCX/XLSX. |
| [`test_full_architecture.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_full_architecture.py) | 0.32s | ✅ **PASS** | Integridade dos módulos do servidor e handlers HTTP. |
| [`test_integration.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_integration.py) | 1.17s | ✅ **PASS** | Integração da rota de busca web DuckDuckGo. |
| [`test_live_full_flow.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_live_full_flow.py) | 1.57s | ✅ **PASS** | Execução do fluxo de IA (fallback tratado com sucesso). |
| [`test_live_giant_edital_audit.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_live_giant_edital_audit.py) | 2.24s | ✅ **PASS** | RAG BM25 com edital de 90k caracteres. |
| [`test_local_cross_engine_validation.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_local_cross_engine_validation.py) | 0.16s | ✅ **PASS** | Validação estrutural do motor `LocalCrossEngine`. |
| [`test_multi_axis.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_multi_axis.py) | 0.28s | ✅ **PASS** | Empacotamento de decks Anki (`.apkg` ZIP e TSV). |
| [`test_offline_validation.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_offline_validation.py) | 0.18s | ✅ **PASS** | Validação da arquitetura *Offline-First* e IndexedDB. |
| [`test_prazo_deadline_timezone.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_prazo_deadline_timezone.py) *(Novo)* | 0.25s | ✅ **PASS** | **Prazos & Fusos Horários:** Conversão UTC-3 Brasília vs UTC / Manaus UTC-4 e verificação de tempestividade. |
| [`test_quick_api.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_quick_api.py) | 0.22s | ⚠️ **FAIL** | Script manual interativo (exige argumento `python test_quick_api.py <API_KEY>`). |
| [`test_supervisor_and_flow.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_supervisor_and_flow.py) | 3.88s | ✅ **PASS** | Teste E2E via WebSocket Chrome DevTools Protocol no navegador ativo. |
| [`test_unified_pipeline.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_unified_pipeline.py) | 0.21s | ⚠️ **FAIL** | Script manual que requer a variável de ambiente `GEMINI_API_KEY`. |
| [`test_validacao_elegibilidade.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_validacao_elegibilidade.py) *(Novo)* | 0.21s | ✅ **PASS** | **Elegibilidade:** Natureza jurídica, validade de certidões, tetos de custos administrativos e territorialidade. |

### 1.1 Resumo Quantitativo
- **Total de Suítes Executadas:** 17
- **Passaram com Sucesso:** **14 (82.4%)**
- **Falharam / Requerem Parâmetros Manuais de Nuvem:** 3 (17.6%)

---

## 2. Métricas de Cobertura de Testes (Coverage Report)

A cobertura foi calculada sobre os módulos de backend e serviços Python utilizando `coverage.py`:

| Módulo / Arquivo | Total de Linhas (Statements) | Linhas Não Cobertas (Miss) | Cobertura (%) |
| :--- | :---: | :---: | :---: |
| [`services/skills/anki_exporter.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/skills/anki_exporter.py) | 28 | 0 | **100%** |
| [`services/api.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/api.py) | 372 | 273 | **27%** |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py) | 1.508 | 1.369 | **9%** |
| **TOTAL CONSOLIDADO** | **1.908** | **1.642** | **14%** |

> **Análise de Gaps de Cobertura:**  
> - A baixa cobertura em `server.py` se deve à presença de grandes blocos de formatação visual do ReportLab (criação de tabelas, layouts de páginas de PDFs executivos) e rotas HTTP que exigem chamadas de rede ao vivo.  
> - Os serviços utilitários de IA em `services/api.py` possuem cobertura concentrada em cache semântico e retrieval BM25 local, enquanto os provedores externos (Ollama e Gemini API) ficam sem cobertura quando não há servidor local Ollama ou chave remota ativa.

---

## 3. Diagnóstico dos 3 Cenários Críticos Solicitados

### 3.1 Cálculo de Prazo/Deadline com Fuso Horário
- **Status Inicial:** ❌ **Inexistente.** Não havia nenhum teste automatizado verificando a conversão de fusos horários (ex: Horário de Brasília UTC-3 vs UTC ou fuso do Amazonas/Acre UTC-4/UTC-5) nem a validação do segundo limite de submissão (23:59:59).
- **Ação Realizada:** Criada a suíte [`test_prazo_deadline_timezone.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_prazo_deadline_timezone.py) cobrindo:
  - Parsing de prazos com fuso `America/Sao_Paulo` (UTC-3).
  - Conversão bidirecional de timestamps para UTC.
  - Submissão com origem em outros fusos (Manaus UTC-4): aceita às 22h30 local (23h30 BRT) e rejeitada às 23h15 local (00h15 BRT do dia seguinte).
  - Condições de borda no limite exato: submissão às 23:59:59 (aprovada) vs 00:00:00 do dia seguinte (reprovada por intempestividade).

### 3.2 Validação de Elegibilidade
- **Status Inicial:** ❌ **Inexistente de forma isolada.** As regras de elegibilidade existiam dispersas no motor JavaScript `LocalCrossEngine`, mas não havia testes em Python assegurando a reprovação imediata de propostas que descumprissem os critérios eliminatórios do edital.
- **Ação Realizada:** Criada a suíte [`test_validacao_elegibilidade.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_validacao_elegibilidade.py) cobrindo:
  - Proponente 100% elegível (natureza jurídica sem fins lucrativos, território da Bacia do Rio Doce, certidões válidas e acessibilidade).
  - Rejeição por estouro de teto orçamentário (R$ 250.000 solicitados para teto de R$ 220.000).
  - Rejeição por estouro de custos administrativos (18.5% quando o limite do edital é 15%).
  - Rejeição por certidão fiscal vencida antes da data de encerramento das inscrições.
  - Rejeição por sede fora dos municípios atingidos elegíveis.

### 3.3 Fluxo Completo de Submissão de Proposta
- **Status Inicial:** ⚠️ **Parcial / Frágil.** Os testes existentes (`test_live_full_flow.py`) dependiam de chamadas externas de IA via rede, falhando quando executados sem credenciais de API.
- **Ação Realizada:** Criada a suíte [`test_fluxo_submissao_proposta.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_fluxo_submissao_proposta.py) que simula o ciclo de vida completo de 5 etapas 100% offline:
  1. **Ingestão:** Extração e parsing do edital de referência.
  2. **Revisão Técnica Setorial:** Avaliação dos eixos temáticos.
  3. **Supervisão Estratégica:** Consolidação de parecer e diretrizes.
  4. **Geração de Documento ABNT:** Compilação da minuta em `.docx` (Word) com metadados de capa.
  5. **Exportação Orçamentária:** Geração e validação de fórmulas da planilha `.xlsx` (Excel).

---

## 4. Sumário de Recomendações para a Suíte de Testes

1. **Configurar CI/CD com Pytest:** Adicionar `pytest` e `pytest-cov` no repositório com execução automática em cada commit/PR.
2. **Mocking de Provedores de IA:** Utilizar `unittest.mock` para mockar as chamadas da API do Google Gemini em `test_live_full_flow.py` e `test_unified_pipeline.py`, permitindo execução 100% verde sem requisições reais.
3. **Tratar Codificação no Windows:** Corrigir os caracteres unicode em `test_e2e.py` para evitar quebras em terminais CP1252.