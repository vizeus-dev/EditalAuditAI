# Relatório de Auditoria do Backend: Autenticação, Autorização e Dados

> **Data da Auditoria:** 11/08/2026  
> **Escopo:** Endpoints da API ([`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py)), mecanismos de autenticação e RBAC, validação e sanitização de inputs, SSRF, e estrutura de dados / IndexedDB ([`src/controllers/auditorDB.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js)).  
> **Status de Alteração:** *Apenas reporte (nenhum arquivo foi modificado).*

---

## 1. Mapeamento Completo de Rotas / Endpoints da API

O backend do projeto roda em [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py) utilizando `http.server.BaseHTTPRequestHandler`. Foram identificadas **17 rotas** (16 endpoints de API + fallback estático):

| Método | Rota / Endpoint | Linha | Propósito / Funcionalidade | Autenticação | Controle de Papel (RBAC) |
| :---: | :--- | :---: | :--- | :---: | :---: |
| `GET` | `/favicon.ico` | [615](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L615) | Retorna status HTTP 204 No Content | ❌ Nenhuma | ❌ Público |
| `GET` | `/api/health` | [620](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L620) | Healthcheck do servidor (PID, uptime, cwd, versão) | ❌ Nenhuma | ❌ Público |
| `GET` | `/api/restart` | [630](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L630) | **Administrativo:** Reinicia o processo Python via `os.execv` | ❌ **Nenhuma** | ❌ **Público** |
| `GET` | `/*` (Fallback) | [641](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L641) | Servidor estático (`SimpleHTTPRequestHandler`) | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/fetch-url` | [657](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L657) | Proxy de requisições HTTP para download de editais remotos | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/search-web-editais` | [723](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L723) | Busca em tempo real na web (DuckDuckGo / web scraper) | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/parse-portal-page` | [745](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L745) | Extração e raspagem de texto de páginas de editais | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/generate-audit-pdf` | [799](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L799) | Geração de PDF executivo de auditoria (ReportLab) | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/generate-revisor-report-pdf` | [1111](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1111) | Geração de PDF do relatório de pareceristas | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/generate-finance-pdf` | [1239](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1239) | Geração de PDF da planilha orçamentária | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/export-finance-xlsx` | [1503](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1503) | Geração de pasta de trabalho Excel (`openpyxl`) | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/save-audit-report` | [1932](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1932) | Salva relatório em arquivo JSON local (`relatorio_auditoria.json`) | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/load-audit-report` | [1943](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1943) | Lê relatório do arquivo JSON local | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/analyze-edital-context` | [1954](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1954) | Streaming SSE de análise estrutural via Gemini | ⚠️ Passthrough API Key | ❌ Público |
| `POST` | `/api/generate-proposal-unified` | [2079](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L2079) | Streaming SSE de redação unificada via Gemini | ⚠️ Passthrough API Key | ❌ Público |
| `POST` | `/api/export-anki` | [2254](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L2254) | Empacotamento de baralho Anki (.apkg ZIP) | ❌ Nenhuma | ❌ Público |
| `POST` | `/api/llm/generate` | [2272](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L2272) | Proxy genérico de inferência LLM com BM25 RAG | ⚠️ Passthrough API Key | ❌ Público |

---

## 2. Rotas Protegidas e Administrativas sem Checagem de Permissão

> [!CAUTION]
> **Inexistência de Camada de Autenticação e RBAC no Backend**  
> O backend foi projetado para execução em ambiente desktop local monoposto (Single-User Localhost). Caso seja exposto a uma rede local ou internet (ex: `0.0.0.0`), **qualquer requisição tem acesso irrestrito a todas as operações**, incluindo comandos administrativos e execução de modelos de IA.

### 2.1 Principais Vulnerabilidades de Autorização

1. **Endpoint Administrativo de Reinício de Processo (`GET /api/restart` — Linha 630):**
   - **Comportamento:** Dispara `os.execv(...)` reiniciando o interpretador Python e o processo do servidor.
   - **Risco:** Qualquer cliente que envie um `GET /api/restart` derruba e reinicia o servidor backend, permitindo ataques de Negação de Serviço (DoS).
   - **Recomendação:** Exigir autenticação/token de sessão administrativa ou desabilitar o endpoint quando o host não for estritamente `127.0.0.1`.

2. **Persistência Compartilhada Monousuário (`/api/save-audit-report` e `/api/load-audit-report` — Linhas 1932/1943):**
   - **Comportamento:** Escreve e lê diretamente um arquivo estático `relatorio_auditoria.json` na raiz do projeto.
   - **Risco:** Não há segregação por usuário, sessão ou proponente. Qualquer requisição sobrescreve os dados de auditoria salvos por outros usuários sem controle de concorrência ou permissão.
   - **Recomendação:** Implementar isolamento por tenant/user_id ou delegar a persistência ao IndexedDB local do navegador.

3. **Proxy de LLM Aberto (`/api/llm/generate` e `/api/generate-proposal-unified` — Linhas 2079, 2272):**
   - **Comportamento:** Se a variável de ambiente `GEMINI_API_KEY` estiver configurada no servidor, clientes podem emitir requisições sem enviar `api_key` no body e consumir a cota de IA do servidor arbitrariamente.
   - **Risco:** Esgotamento de cotas de API e custos imprevistos caso o servidor esteja acessível na rede.
   - **Recomendação:** Requerer chave de API explícita ou token de autorização de usuário antes de acionar a geração.

---

## 3. Validação e Sanitização de Entradas (Segurança de Dados)

### 3.1 Vulnerabilidade de SSRF (Server-Side Request Forgery)

> [!WARNING]
> **Endpoints Afetados:** [`/api/fetch-url`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L657) (Linha 657) e [`/api/parse-portal-page`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L745) (Linha 745).

- **Diagnóstico:** O backend recebe o parâmetro `url` via payload JSON e repassa diretamente para `urllib.request.urlopen(req)` sem sanitização ou validação de destino.
- **Vetores de Ataque Possíveis:**
  1. **Acesso a Serviços Locais / Intranet:** Requisições para `http://127.0.0.1:8000/api/restart`, `http://localhost:...` ou IPs de rede privada (`10.0.0.0/8`, `192.168.0.0/16`).
  2. **Metadados de Nuvem:** Requisições para `http://169.254.169.254` em ambientes de nuvem (AWS/GCP).
  3. **Esquemas Perigosos:** Embora `urllib.request.Request` lide com URLs, não há bloqueio explícito de protocolos não-HTTP (`file://`, `gopher://`, `ftp://`).
- **Recomendação:** Implementar validação estrita de URLs:
  ```python
  from urllib.parse import urlparse
  import ipaddress, socket

  def validate_safe_url(url_str):
      parsed = urlparse(url_str)
      if parsed.scheme not in ('http', 'https'):
          raise ValueError('Apenas protocolos HTTP e HTTPS são permitidos.')
      hostname = parsed.hostname
      if not hostname:
          raise ValueError('Hostname inválido.')
      # Bloquear localhost e IPs privados
      try:
          ip = socket.gethostbyname(hostname)
          ip_obj = ipaddress.ip_address(ip)
          if ip_obj.is_private or ip_obj.is_loopback:
              raise ValueError('Acesso a endereços de rede privada/loopback é proibido.')
      except socket.gaierror:
          pass
  ```

### 3.2 Ausência de Validação de Esquema (Schema Validation)
- **Problema:** Todos os endpoints utilizam dicionários Python brutos (`data.get('...')`) sem validação de tipos, faixas numéricas ou campos obrigatórios (ausência de `pydantic` ou `jsonschema`).
- **Impacto:**
  - Na geração de planilhas Excel ([`/api/export-finance-xlsx`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1503)), se `items` contiver dados corrompidos ou tipos incompatíveis (ex: strings não numéricas no lugar de floats), a aplicação lança exceções genéricas durante a montagem das fórmulas.
  - Na geração de PDFs ([`/api/generate-audit-pdf`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L799)), estruturas ausentes em `criterios` resultam em falhas de renderização.
- **Recomendação:** Criar modelos tipados (ex: Pydantic Dataclasses ou validação defensiva com schema) para todos os payloads de entrada.

### 3.3 Leitura Desprotegida de Body (Memory Flooding)
- **Problema:** Em todos os handlers `do_POST`, a leitura do corpo da requisição é feita com:
  ```python
  content_length = int(self.headers['Content-Length'])
  post_data = self.rfile.read(content_length)
  ```
- **Risco:** Não há limite máximo imposto ao cabeçalho `Content-Length`. Uma requisição maliciosa com `Content-Length: 1073741824` (1 GB) pode forçar alocação excessiva de memória e causar esgotamento de recursos (OOM Crash).
- **Recomendação:** Impor teto de payload (ex: máximo 50 MB para uploads de editais e 10 MB para requisições JSON normais):
  ```python
  MAX_BODY_SIZE = 50 * 1024 * 1024  # 50 MB
  if content_length > MAX_BODY_SIZE:
      self.send_json_response(413, {'error': 'Payload muito grande (máximo 50 MB).'})
      return
  ```

---

## 4. Banco de Dados, Migrations e Otimização de Índices

### 4.1 Arquitetura de Persistência
- **Backend:** O backend Python **não utiliza banco de dados relacional** nem ORM (sem SQLite, PostgreSQL, MySQL ou migrations Alembic/Flyway). Os dados gerados no backend são estritamente efêmeros (processamento em memória de PDFs, Excel e streaming SSE) ou gravados em arquivo estático único (`relatorio_auditoria.json`).
- **Frontend (Banco Local do Navegador):** Toda a persistência estruturada do sistema reside no cliente via **IndexedDB Nativo** ([`src/controllers/auditorDB.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js)).

### 4.2 Análise do Esquema IndexedDB (`AuditorDB_v1`)

| Object Store | Chave Primária (`keyPath`) | Índices Existentes | Índices Faltantes Recomendados | Impacto de Performance |
| :--- | :---: | :--- | :--- | :--- |
| `RegrasUniversais` | `id` | *Nenhum* | `categoria`, `fomento`, `tags` | Obriga varredura completa da tabela (`getAll()`) e filtragem linear em JavaScript para cada consulta de conformidade. |
| `HistoricoEditais` | `id` | `updatedAt` | `editalTitle`, `notaFinal`, `status` | Consultas por título ou score precisam ler todos os registros em memória. |
| `TemplatesRespostas` | `id` | *Nenhum* | `sectionKey`, `categoria` | Dificulta recuperação rápida de minutas padronizadas por seção ABNT. |

### 4.3 Inconsistência de Nomenclatura e Migração de Versão
- **Divergência de Nome da Store:** No cabeçalho de documentação de [`src/controllers/auditorDB.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js#L5) a terceira store é documentada como `MinutasProposta`, porém no código de criação ([L66](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js#L66)) ela foi implementada como `TemplatesRespostas`.
- **Versionamento de Migrations:** A versão do banco está fixada em `dbVersion: 1`. Se novas stores ou índices forem adicionados no futuro, será necessário incrementar para `dbVersion: 2` e estruturar blocos incrementais dentro de `onupgradeneeded` com verificação de `event.oldVersion` para evitar perda de dados dos editais salvos.

---

## 5. Sumário de Ações Recomendadas para o Backend

| Prioridade | Área | Vulnerabilidade / Achado | Ação de Correção Recomendada |
| :---: | :--- | :--- | :--- |
| 🔴 **Alta** | **Segurança / DoS** | `GET /api/restart` sem autenticação | Proteger com token ou restringir a localhost. |
| 🔴 **Alta** | **Segurança / SSRF** | `POST /api/fetch-url` e `/api/parse-portal-page` sem validação de IP/Host | Bloquear acesso a localhost, IPs privados (RFC 1918) e metadados de nuvem. |
| 🟡 **Média** | **Segurança / DoS** | `Content-Length` lido sem teto máximo de bytes | Impor limite global de 50 MB por requisição. |
| 🟡 **Média** | **Concorrência** | `relatorio_auditoria.json` compartilhado | Eliminar arquivo único estático; isolar por sessão ou usar IndexedDB. |
| 🟡 **Média** | **Qualidade de Dados** | Ausência de Schema Validation nos payloads | Validar campos e tipos antes de processar PDFs/Excel. |
| 🟢 **Baixa** | **Performance DB** | Object Stores do IndexedDB sem índices secundários | Adicionar índices para `categoria`, `editalTitle` e `sectionKey` na versão 2 do IndexedDB. |