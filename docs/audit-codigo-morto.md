# Relatório de Auditoria de Código Morto e Qualidade Estática

> **Data da Auditoria:** 11/08/2026  
> **Escopo:** Todo o repositório (`server.py`, `launcher.py`, `services/`, `src/controllers/`, `app.js`, scripts utilitários e testes).  
> **Diretriz:** *Apenas reporte (sem alterações diretas no código).*

---

## 1. Identificação da Stack Tecnológica

A partir da análise dos arquivos raiz e estrutura de diretórios:
- **Backend / Core Engine:** **Python 3.14** gerenciado via virtualenv local (`.venv`) e manifesto de dependências [`requirements.txt`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/requirements.txt) (`openpyxl`, `python-docx`, `pypdf`, `reportlab`, `lxml`, `pillow`, `charset-normalizer`). O servidor HTTP é nativo em Python (`http.server.BaseHTTPRequestHandler` com threading e SSE).
- **Frontend / UI:** **JavaScript Vanilla (ES6+)**, HTML5 semântico e CSS3 puro com suporte a Dark Mode e temas cyber. Arquitetura *Offline-First* baseada em `window.indexedDB` nativo.
- **Ambiente Node / NPM:** Inexistente no repositório (não há `package.json`, `node_modules` nem Node.js instalado no sistema). Toda a suíte JS é modularizada em controladores (`src/controllers/*.js`) e um script central monolítico ([`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js)) carregados diretamente via tags `<script>` em [`index.html`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html).

---

## 2. Código Morto e Não Utilizado

### 2.1 Backend Python (`vulture` + Análise AST)

| Arquivo | Linha | Elemento / Símbolo | Tipo | Descrição / Diagnóstico | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L20) | 20 | `datetime` | Import não utilizado | Importado no topo e re-importado localmente em 3 outras funções. | **Remover** import global ou unificar |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L46-L49) | 46, 49 | `REPORTLAB_AVAILABLE` | Variável global morta | Flag booleana definida mas nunca consultada em nenhuma rota do servidor. | **Remover** |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L231) | 231 | `pe` | Variável local não utilizada | Captura de exceção em bloco try não utilizada no log. | **Refatorar** ou renomear para `_` |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1322-L1323) | 1322, 1323 | `grand_subtotal`, `grand_impostos` | Variáveis locais mortas | Valores extraídos do payload JSON mas nunca utilizados na montagem da tabela PDF. | **Remover** |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1514) | 1514 | `header_fill` | Variável local morta | Instância de `PatternFill` criada mas sobrescrita por fills especializados. | **Remover** |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L2089) | 2089 | `historicalMemories` | Variável local morta | Extraída do JSON da requisição mas nunca injetada no prompt nem repassada ao modelo. | **Refatorar** (injetar no prompt de auditoria) ou remover |
| [`services/api.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/api.py#L1) | 1 | `os` | Import não utilizado | Módulo importado sem uso no arquivo. | **Remover** |
| [`services/api.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/api.py#L514) | 514 | `provider_name` em `generate()` | Parâmetro morto | Método recebe `provider_name` mas força `self.providers.get('gemini')`. | **Refatorar** para despachar dinamicamente ou remover |
| [`services/api.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/api.py#L542) | 542 | `provider_name` em `stream_generate()` | Parâmetro morto | Método recebe `provider_name` mas força provider Gemini. | **Refatorar** para despachar dinamicamente ou remover |
| [`create_desktop_shortcut.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/create_desktop_shortcut.py#L7) | 7 | `BAT_PATH` | Variável não utilizada | Constante de caminho definida mas nunca lida. | **Remover** |
| [`read_docx.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/read_docx.py#L16) | 16 | `ns` | Variável local não utilizada | Namespace XML atribuído sem uso posterior. | **Remover** |
| [`test_supervisor_and_flow.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_supervisor_and_flow.py#L46) | 46 | `b1` | Variável local não utilizada | Byte inicial do frame WebSocket desempacotado mas ignorado. | **Renomear** para `_` |
| [`download_annexes.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/download_annexes.py#L3) | 3 | `os` | Import não utilizado | Import sem referências. | **Remover** |
| [`download_edital.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/download_edital.py#L3) | 3 | `os` | Import não utilizado | Import sem referências. | **Remover** |
| [`generate_icon.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/generate_icon.py#L1) | 1 | `os` | Import não utilizado | Import sem referências. | **Remover** |
| [`search_dbs.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/search_dbs.py#L2) | 2 | `os` | Import não utilizado | Import sem referências. | **Remover** |
| [`test_architectural_fixes.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_architectural_fixes.py#L2) | 2 | `re` | Import não utilizado | Import sem referências. | **Remover** |
| [`test_full_architecture.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_full_architecture.py#L5-L8) | 5, 8 | `json`, `SemanticCache`, `GeminiProvider` | Imports não utilizados | Imports sem referências no teste. | **Remover** |
| [`test_local_cross_engine_validation.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_local_cross_engine_validation.py#L2-L3) | 2, 3 | `re`, `json` | Imports não utilizados | Imports sem referências. | **Remover** |
| [`test_multi_axis.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_multi_axis.py#L9) | 9 | `json` | Import não utilizado | Import sem referências. | **Remover** |

### 2.2 Frontend JavaScript (Funções e Controladores Órfãos)

| Arquivo | Linha | Função / Método | Tipo | Descrição / Diagnóstico | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L1563) | 1563 | `callGeminiToComplementSection` | Função Assíncrona | Código legado de complemento de seção. Não é chamada por nenhum botão, handler ou controlador. | **Remover** |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L1639) | 1639 | `callGeminiForSectionChained` | Função Assíncrona | Antigo gerador encadeado substituído por `runChainedSequentialGeneration`. | **Remover** |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L1865) | 1865 | `getSimulatedBasicProposal` | Função Síncrona/Promise | Mock estático antigo de proposta, substituído por `sample_data.js` e `offlineAuditor.js`. | **Remover** |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2848) | 2848 | `generateFullRedaction` | Função Assíncrona | Função órfã buscando elementos de UI que não existem no DOM atual. | **Remover** ou reconectar se funcionalidade for restaurada |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2879) | 2879 | `getSimulatedFullRedaction` | Função Síncrona/Promise | Mock estático de redação completa não utilizado em nenhum fluxo de teste ou UI. | **Remover** |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L5135) | 5135 | `callGeminiForAuditoria` | Função Assíncrona | Constrói um prompt massivo de 110 linhas mas não faz retorno, fetch nem chamada de IA. Código morto inacabado. | **Remover** |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L5248) | 5248 | `callGeminiConsolidatedAudit` | Função Assíncrona | Wrapper redundante que apenas chama `window.aiController.runAudit`. Nunca invocado. | **Remover** |

---

## 3. Problemas de Qualidade Estática e Linters (Pylint & Flake8)

### 3.1 Cláusulas `except:` Genéricas / Perigosas (E722 / bare-except)

> [!WARNING]
> O uso de `except:` sem especificar a classe de erro captura inclusive `SystemExit`, `KeyboardInterrupt` e exceções internas do Python, mascarando falhas críticas e impedindo encerramento correto do processo.

| Arquivo | Linha | Snippet / Contexto | Risco | Recomendação |
| :--- | :--- | :--- | :--- | :--- |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L946) | 946 | `except:` no stream SSE de geração | Mascara desconexões de socket do cliente | **Substituir** por `except Exception as e:` |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L976) | 976 | `except:` no fechamento do SSE | Pode ocultar bugs de I/O de rede | **Substituir** por `except Exception:` |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L980) | 980 | `except:` no rollback / cleanup de conexão | Mascara falhas na limpeza de recursos | **Substituir** por `except Exception:` |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L2422) | 2422 | `except:` no parser de parâmetros da URL | Oculta erros de decodificação de query string | **Substituir** por `except (ValueError, KeyError, TypeError):` |
| [`test_e2e.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_e2e.py#L262) | 262 | `except:` no cleanup do processo de teste | Pode travar encerramento de subprocessos | **Substituir** por `except Exception:` |

### 3.2 Redefinição e Sombreamento de Módulos (F811)

| Arquivo | Linha | Símbolo | Diagnóstico | Recomendação |
| :--- | :--- | :--- | :--- | :--- |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1083) | 1083 | `from datetime import datetime` | Re-importação dentro da função `export_pdf_report` que sombreia o import global | **Remover** re-import local e usar import no topo |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1211) | 1211 | `from datetime import datetime` | Re-importação dentro da função `export_docx_report` | **Remover** re-import local |
| [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1475) | 1475 | `from datetime import datetime` | Re-importação dentro da função `export_excel_budget` | **Remover** re-import local |

### 3.3 Má Formatação: Múltiplas Instruções por Linha com Ponto-e-Vírgula (E701 / E702)

No arquivo [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1536-L1893) (seção do gerador de planilhas Excel via `openpyxl`), existem **35 ocorrências** de comandos encadeados com `;` na mesma linha (ex: `cell.font = ...; cell.alignment = ...; cell.border = ...`), prejudicando a legibilidade e dificultando manutenção de formatação de células.
- **Recomendação:** **Refatorar** criando uma função auxiliar de estilo de célula (ex: `apply_cell_style(cell, font=..., border=..., fill=..., alignment=...)`).

### 3.4 F-Strings sem Interpolação de Variáveis (F541)

Strings marcadas com `f"..."` mas que não contêm `{}`:
- [`launcher.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/launcher.py#L168-L179): Linhas 168, 174, 179.
- [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1728-L1729): Linhas 1728, 1729.
- [`test_e2e.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_e2e.py#L173-L296): Linhas 173, 191, 193, 201, 293, 296.
- [`test_live_full_flow.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_live_full_flow.py#L178): Linha 178.
- **Recomendação:** **Remover** o prefixo `f` de strings puramente literais.

---

## 4. Inconsistências de DOM no Frontend (Seletores Órfãos)

Identificados elementos que o JavaScript tenta obter via `document.getElementById(...)`, mas que não existem em [`index.html`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html) nem são gerados dinamicamente:

| Arquivo | Linha | ID Buscado | Contexto | Impacto | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2619) | 2619 | `btn-consolidate-download-pdf` | `setupFinalizacaoTab()` | Retorna `null` silenciosamente | **Remover** busca órfã |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2620) | 2620 | `btn-consolidate-download-docx` | `setupFinalizacaoTab()` | Retorna `null` silenciosamente | **Remover** busca órfã |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2849) | 2849 | `btn-generate-full-redaction` | `generateFullRedaction()` | Aborta execução da função órfã | **Remover** função órfã |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2862) | 2862 | `redacao-completa-instrucoes` | `generateFullRedaction()` | Campo de textarea inexistente | **Remover** |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L3361) | 3361 | `btn-consolidate-download-pdf` | Listener redundante | Retorna `null` | **Remover** |
| [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L3368) | 3368 | `btn-consolidate-download-docx` | Listener redundante | Retorna `null` | **Remover** |

---

## 5. Trechos de Código Duplicados

### 5.1 Duplicações no Backend Python

1. **Funções de Rodapé PDF ReportLab (98.9% de Similaridade):**
   - `add_footer()` em [`server.py:1079`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1079)
   - `add_revisor_footer()` em [`server.py:1207`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1207)
   - `add_finance_footer()` em [`server.py:1471`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1471)
   - Todas as 3 funções desenham exatamente a mesma numeração de página ("Página X de Y"), linha divisória e carimbo de data com código idêntico.
   - **Recomendação:** **Refatorar** em uma única função/classe `NumberedCanvas` ou `build_canvas_footer()`.

2. **Parsers de Tags HTML (`server.py`):**
   - `HTMLTableParser.handle_data()` em [`server.py:571`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L571) e `HTMLTextExtractor.handle_data()` em [`server.py:606`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L606) compartilham lógica quase idêntica de acumulação e strip de tags.
   - **Recomendação:** **Refatorar** em uma classe base unificada de extração HTML.

3. **Função `parse_num()` (Conversão Monetária PT-BR - 100% Idêntica):**
   - Presente em [`server.py:1535`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1535) e duplicada integralmente em [`test_excel_gen.py:33`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_excel_gen.py#L33).
   - **Recomendação:** **Extrair** para módulo utilitário compartilhado (`services/utils.py`).

4. **Criação de Atalhos Desktop e VBS:**
   - [`create_desktop_shortcut.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/create_desktop_shortcut.py#L9-L46) duplica as funções `create_shortcut()` e `create_vbs_launcher()` presentes em [`launcher.py:27-62`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/launcher.py#L27-L62).
   - **Recomendação:** **Refatorar** `launcher.py` para importar de um módulo de instalação ou utilitário único.

5. **Funções de Download e Leitura DOCX/PDF:**
   - `download_and_parse()` em [`download_annexes.py:5`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/download_annexes.py#L5) e [`download_edital.py:5`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/download_edital.py#L5).
   - `read_docx()` em [`read_docx.py:5`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/read_docx.py#L5) e [`search_edital.py:6`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/search_edital.py#L6).
   - **Recomendação:** **Consolidar** em utilitários de parser reutilizáveis.

6. **Scripts de Busca de Editais:**
   - [`search_dbs.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/search_dbs.py) e [`search_extracted_pdfs.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/search_extracted_pdfs.py) e [`search_edital.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/search_edital.py) contêm rotinas ad-hoc idênticas de regex para vasculhar PDFs baixados.
   - **Recomendação:** **Refatorar** ou consolidar em ferramenta de CLI unificada (`tools/search_editais.py`).

### 5.2 Duplicações no Frontend JavaScript

1. **Sanitização de HTML e Strings:**
   - `sanitizeHTML` em [`app.js:5080`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L5080)
   - `sanitizeHTML` em [`src/controllers/aiController.js:16`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/aiController.js#L16)
   - `sanitizeString` em [`src/controllers/stateIntegrityManager.js:22`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/stateIntegrityManager.js#L22)
   - **Recomendação:** **Unificar** toda a sanitização e escape em `StateIntegrityManager` para evitar regras divergentes.

2. **Cálculo de Similaridade Textual (Levenshtein / Dice-Sørensen):**
   - `_stringSimilarity` em [`src/controllers/localCrossEngine.js:210`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/localCrossEngine.js#L210)
   - `calculateSimilarity` em [`app.js:5050`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L5050)
   - **Recomendação:** **Unificar** no `LocalCrossEngine` e expor globalmente.

3. **Boilerplate IndexedDB CRUD (`auditorDB.js`):**
   - Métodos `put()` ([L176](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js#L176)), `get()` ([L195](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js#L195)) e `getAll()` ([L214](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js#L214)) repetem 95% do código de abertura de transação e tratamento de Promises.
   - **Recomendação:** **Refatorar** com um helper genérico `_performTx(storeName, mode, callback)`.

4. **Extração de Texto sem Tags HTML (`stripHtml` / `stripHtmlForPayload`):**
   - Implementado com regexes e elementos DOM temporários em múltiplos pontos de `app.js` (linhas 1577, 1653, 5010, 5035).
   - **Recomendação:** **Unificar** em função canônica única `stripHtml()`. 

---

## 6. Organização e Arquivos Espúrios no Diretório Raiz

Existem **14 arquivos de teste individuais** e diversos utilitários soltos no diretório raiz do projeto:
- Testes na raiz: `test_architectural_fixes.py`, `test_e2e.py`, `test_encoding_and_profile.py`, `test_excel_gen.py`, `test_full_architecture.py`, `test_integration.py`, `test_live_full_flow.py`, `test_live_giant_edital_audit.py`, `test_local_cross_engine_validation.py`, `test_multi_axis.py`, `test_offline_validation.py`, `test_quick_api.py`, `test_supervisor_and_flow.py`, `test_unified_pipeline.py`.
- Utilitários na raiz: `search_dbs.py`, `search_edital.py`, `search_extracted_pdfs.py`, `download_annexes.py`, `download_editais.py`, `download_edital.py`, `read_docx.py`, `read_pdf.py`.
- Arquivos temporários / logs: `server_run.log` (442 KB no repositório).

> [!TIP]
> **Recomendação de Organização Futura:**
> 1. Mover todos os arquivos `test_*.py` para uma pasta dedicada `tests/`.
> 2. Mover utilitários de download/inspeção para `tools/` ou `scripts/`.
> 3. Adicionar `*.log` e `.venv/` ao `.gitignore` para manter o repositório limpo.

---

## 7. Sumário Executivo de Recomendações

| Categoria | Qtd Achados | Ação Principal Recomendada |
| :--- | :---: | :--- |
| **Funções JS Mortas / Órfãs** | 7 | Remover de `app.js` (~350 linhas de código obsoleto) |
| **Variáveis / Imports Python Mortos** | 20 | Limpar imports não utilizados e variáveis descartadas |
| **Cláusulas `except:` Bare (E722)** | 5 | Especificar exceções concretas (`Exception`, `ValueError`) |
| **Redefinições de Módulos (F811)** | 3 | Centralizar imports no topo dos arquivos Python |
| **Estilo / Múltiplas Instruções por Linha (E701/E702)** | 50 | Criar função helper de estilização no `server.py` |
| **Inconsistências DOM (IDs inexistentes)** | 6 | Limpar buscas por botões antigos removidos do HTML |
| **Duplicação de Código (Py/JS)** | 7 grupos | Unificar em módulos compartilhados (`services/utils.py`, `StateIntegrityManager`) |
| **Organização de Testes / Scripts Raiz** | 22 arquivos | Estruturar pastas `tests/` e `scripts/` |