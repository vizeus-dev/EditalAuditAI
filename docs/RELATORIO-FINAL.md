# RELATÓRIO FINAL CONSOLIDADO DE AUDITORIA — EDITALAUDIT AI

> **Data de Emissão:** 11/08/2026  
> **Versão do Sistema:** 3.0.0 (Release Candidate)  
> **Escopo da Auditoria:** Consolidação integral dos 7 relatórios setoriais:
> - [`audit-arquitetura.md`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/audit-arquitetura.md) (Topologia, acoplamento, vazamento de segredos e Git)
> - [`audit-backend.md`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/audit-backend.md) (Rotas, autenticação, RBAC, dados e schema)
> - [`audit-codigo-morto.md`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/audit-codigo-morto.md) (Linter, código não utilizado, duplicações e AST)
> - [`audit-frontend.md`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/audit-frontend.md) (UX, acessibilidade WCAG, responsividade mobile e DOM)
> - [`audit-performance.md`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/audit-performance.md) (Carga de pico, 200 usuários concorrentes, prazos e fusos)
> - [`audit-seguranca.md`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/audit-seguranca.md) (SCA, CVEs de bibliotecas, CSP/CORS, transporte e uploads)
> - [`audit-testes.md`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/audit-testes.md) (Cobertura de código, suítes automatizadas e regressão)

---

## Matriz Geral de Priorização de Achados

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        QUADRO GERAL DE PRÉ-LANÇAMENTO                                  │
├───────────────────┬────────────┬───────────────────────────────────────────────────────┤
│ Classificação     │ Quantidade │ Critério de Impacto                                   │
├───────────────────┼────────────┼───────────────────────────────────────────────────────┤
│ 🔴 CRÍTICO        │     9      │ Bloqueador imediato: Risco de RCE, perda de dados,    │
│ (Must-Fix)        │            │ DoS, SSRF ou vulnerabilidade de integridade pública.  │
├───────────────────┼────────────┼───────────────────────────────────────────────────────┤
│ 🟠 IMPORTANTE     │     12     │ Alta prioridade: Falhas graves de UX, responsividade, │
│ (Should-Fix)      │            │ falta de validações, CVEs moderados e código morto.   │
├───────────────────┼────────────┼───────────────────────────────────────────────────────┤
│ 🟡 DESEJÁVEL      │     15     │ Débito técnico: Refatoração de monolitos, lazy load,  │
│ (Nice-to-Have)    │            │ organização de pastas e incremento de cobertura.      │
└───────────────────┴────────────┴───────────────────────────────────────────────────────┘
```

---

# 1. Nível Crítico (Bloqueadores de Lançamento / Must-Fix)

> [!CAUTION]
> Os itens desta seção representam **falhas de segurança ativas**, **risco de corrupção/perda de propostas** ou **vulnerabilidades de infraestrutura**. O lançamento em produção não deve ocorrer sem a resolução prévia destes 9 pontos.

---

### 1.1 Perda Massiva de Submissões por Sobrescrita em Arquivo Único
- **Arquivo:** [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1932-L1941) (Linhas 1932–1941)
- **Problema:** O endpoint `POST /api/save-audit-report` abre o arquivo estático `relatorio_auditoria.json` em modo `'w'` sem travas de concorrência (*File Lock*). No teste de pico com 200 usuários concorrentes, **199 propostas foram permanentemente destruídas e sobrescritas**. O usuário recebe confirmação de sucesso `HTTP 200`, mas seus dados são perdidos.
- **Sugestão de Correção:**
  ```python
  # server.py — Substituição das linhas 1932-1941
  elif self.path == '/api/save-audit-report':
      content_length = int(self.headers.get('Content-Length', 0))
      if content_length > 10 * 1024 * 1024:
          self.send_json_response(413, {"error": "Payload excede o limite de 10 MB."})
          return
      post_data = self.rfile.read(content_length)
      try:
          data = json.loads(post_data.decode('utf-8'))
          submissions_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "submissions")
          os.makedirs(submissions_dir, exist_ok=True)
          
          sub_id = data.get('submission_id') or f"sub_{int(time.time() * 1000)}_{os.getpid()}"
          clean_sub_id = re.sub(r'[^\w\-]', '_', sub_id)
          file_path = os.path.join(submissions_dir, f"{clean_sub_id}.json")
          
          with open(file_path, 'w', encoding='utf-8') as f:
              json.dump(data, f, ensure_ascii=False, indent=2)
              
          self.send_json_response(200, {
              "success": True, 
              "message": "Proposta submetida e armazenada com sucesso.",
              "submission_id": clean_sub_id,
              "saved_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()
          })
      except Exception as e:
          self.send_json_response(500, {"error": f"Erro ao persistir submissão: {str(e)}"})
  ```

---

### 1.2 Execução Arbitrária de Código (XSS/RCE no Navegador) via PDF.js
- **Arquivos:** [`index.html`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L1146) (Linha 1146) e [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2117-L2125) (Linhas 2117–2125)
- **Problema:** O frontend carrega `pdfjs-dist@3.4.120`, versão vulnerável à **CVE-2024-4367 (CVSS 8.8 - Alta/Crítica)**. Ao abrir um PDF malicioso de edital ou proposta contendo fontes customizadas corrompidas, o PDF.js executa JavaScript arbitrário no contexto da página.
- **Sugestão de Correção:**
  1. No [`index.html:1146`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L1146), atualizar o CDN:
     ```html
     <!-- Atualização para PDF.js corrigido (4.10.38 ou superior) com integridade SRI -->
     <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs" type="module"></script>
     ```
  2. No [`app.js:2121-2125`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2121-L2125), forçar `isEvalSupported: false`:
     ```javascript
     // app.js:2125
     const loadingTask = pdfjsLib.getDocument({
         data: arrayBuffer,
         isEvalSupported: false,  // Desativa expressamente o motor de eval interno
         disableFontFace: false
     });
     ```

---

### 1.3 Server-Side Request Forgery (SSRF) Irrestrito no Backend
- **Arquivo:** [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L657-L679) (Linhas 657–679) e [`server.py:745-760`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L745-L760)
- **Problema:** As rotas `/api/fetch-url` e `/api/parse-portal-page` recebem URLs fornecidas pelo cliente e invocam `urllib.request.urlopen(url)` sem validação de host/IP. Um invasor pode atingir serviços internos da máquina (`127.0.0.1:8085/api/restart`), da rede local (`192.168.0.0/16`) ou metadados de nuvem (`169.254.169.254`).
- **Sugestão de Correção:**
  ```python
  # server.py — Adicionar função utilitária de validação de URL segura
  import ipaddress
  import socket
  from urllib.parse import urlparse

  def validate_safe_url(target_url: str):
      parsed = urlparse(target_url)
      if parsed.scheme not in ('http', 'https'):
          raise ValueError("Apenas protocolos HTTP e HTTPS são permitidos.")
      
      hostname = parsed.hostname
      if not hostname:
          raise ValueError("Hostname inválido.")
      
      # Bloqueio estrito de localhost e IPs privados/loopback
      try:
          resolved_ips = socket.getaddrinfo(hostname, None)
          for item in resolved_ips:
              ip_str = item[4][0]
              ip_obj = ipaddress.ip_address(ip_str)
              if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local:
                  raise ValueError(f"Acesso bloqueado ao endereço de rede privada/interna: {ip_str}")
      except socket.gaierror:
          raise ValueError("Falha ao resolver o domínio de destino.")
  ```

---

### 1.4 Endpoint Administrativo Aberto de Negação de Serviço (`GET /api/restart`)
- **Arquivo:** [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L630-L639) (Linhas 630–639)
- **Problema:** Qualquer requisição HTTP `GET /api/restart` dispara `os.execv`, reiniciando o interpretador Python e derrubando conexões e processamentos em andamento sem autenticação.
- **Sugestão de Correção:**
  ```python
  # server.py:630
  if self.path == '/api/restart':
      client_ip = self.client_address[0]
      # Permitir exclusivamente se originado de localhost estrito
      if client_ip not in ('127.0.0.1', '::1'):
          self.send_json_response(403, {"error": "Acesso não autorizado a comandos administrativos."})
          return
      
      # Exigir token administrativo de cabeçalho
      auth_header = self.headers.get('X-Admin-Token', '')
      expected_token = os.environ.get('EDITAL_ADMIN_TOKEN')
      if not expected_token or auth_header != expected_token:
          self.send_json_response(401, {"error": "Token administrativo ausente ou inválido."})
          return
          
      self.send_json_response(200, {"message": "Reiniciando servidor backend com autorização..."})
      # Executa restart...
  ```

---

### 1.5 Vazamento de Chave de API em Query Parameters (URL Access Logging)
- **Arquivo:** [`services/api.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/api.py#L413) (Linhas 413 e 330)
- **Problema:** A chave de API do Google Gemini é transmitida concatenada na URL (`...models/{model}:streamGenerateContent?key={api_key}`). A chave fica registrada em texto plano em logs de acesso de proxies, gateways corporativos e históricos de rede.
- **Sugestão de Correção:**
  ```python
  # services/api.py — Linhas 413-418
  # url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:streamGenerateContent?key={api_key}" # REMOVER
  url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:streamGenerateContent"
  headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": api_key  # Envio seguro por cabeçalho HTTP
  }
  ```

---

### 1.6 Vulnerabilidade de DoS e Loop Infinito no Parser de PDF (`pypdf`)
- **Arquivo:** [`requirements.txt`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/requirements.txt#L5) (Linha 5)
- **Problema:** A biblioteca `pypdf==6.13.3` possui vulnerabilidades ativas de **Loop Infinito e Esgotamento de CPU/Memória (CVE-2026-59935 e CVE-2026-59936)** ao processar fluxos de imagens ASCII85/ASCIIHex embutidas em editais.
- **Sugestão de Correção:**
  ```text
  # requirements.txt
  pypdf>=6.15.0
  ```
  Executar atualização no ambiente virtual:
  ```bash
  python -m pip install --upgrade "pypdf>=6.15.0"
  ```

---

### 1.7 Esgotamento de Memória por Payload Ilimitado (*Memory Flooding DoS*)
- **Arquivo:** [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L658) (Linhas 658, 724, 746, 800, 1933, 1955, 2080, 2273)
- **Problema:** Todos os métodos `do_POST` leem o corpo da requisição com `content_length = int(self.headers['Content-Length']); self.rfile.read(content_length)` sem validar um teto máximo. Um invasor enviando `Content-Length: 2147483648` (2 GB) causa esgotamento imediato de RAM e travamento do servidor.
- **Sugestão de Correção:**
  ```python
  # server.py — Início do método do_POST
  MAX_ALLOWED_PAYLOAD = 50 * 1024 * 1024  # Teto máximo de 50 MB

  def do_POST(self):
      raw_cl = self.headers.get('Content-Length')
      if not raw_cl:
          self.send_json_response(411, {"error": "Content-Length obrigatório."})
          return
      try:
          content_length = int(raw_cl)
      except ValueError:
          self.send_json_response(400, {"error": "Content-Length inválido."})
          return
          
      if content_length > MAX_ALLOWED_PAYLOAD:
          self.send_json_response(413, {"error": f"Payload muito grande. Máximo permitido: {MAX_ALLOWED_PAYLOAD // (1024*1024)} MB."})
          return
  ```

---

### 1.8 Ausência Total de Cabeçalhos de Segurança (CSP, CORS, X-Frame-Options)
- **Arquivo:** [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L650-L655) (Linhas 650–655)
- **Problema:** O servidor não envia nenhum cabeçalho HTTP de proteção. A ausência de CSP e CORS permite ataques de Clickjacking, CSRF contra localhost e injeções de script externo.
- **Sugestão de Correção:**
  ```python
  # server.py:650 — Substituição do método end_headers
  def end_headers(self):
      self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      self.send_header('Pragma', 'no-cache')
      self.send_header('Expires', '0')
      self.send_header('X-Content-Type-Options', 'nosniff')
      self.send_header('X-Frame-Options', 'DENY')
      self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
      self.send_header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()')
      self.send_header('Content-Security-Policy', (
          "default-src 'self'; "
          "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
          "font-src 'self' https://fonts.gstatic.com; "
          "img-src 'self' data: blob:; "
          "connect-src 'self' https://generativelanguage.googleapis.com http://localhost:11434; "
          "object-src 'none'; "
          "frame-ancestors 'none';"
      ))
      super().end_headers()
  ```

---

### 1.9 Injustiça de Corte de Prazo por Latência e Bug de Resolução de Microssegundos
- **Arquivo:** [`test_prazo_deadline_timezone.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_prazo_deadline_timezone.py#L23-L49) (Linhas 23–49)
- **Problema:**
  1. A data limite `"23:59:59"` é instanciada com `microsecond=0`. Qualquer requisição legítima que chegue entre `23:59:59.000001` e `23:59:59.999999` é considerada posterior ao prazo e recusada.
  2. Proponentes com conexões de alta latência (1,8s) que enviam a proposta às `23:59:58.500` são reprovados injustamente pelo servidor ao cruzar a meia-noite por 300ms de trânsito de rede.
- **Sugestão de Correção:**
  ```python
  # test_prazo_deadline_timezone.py / services/time_auditor.py
  class DeadlineTimezoneCalculator:
      GRACE_PERIOD_SECONDS = 120  # Janela de tolerância técnica oficial de rede (2 minutos)

      @staticmethod
      def parse_edital_deadline(date_str: str, time_str: str = "23:59:59", tz: timezone = FUSO_BRASILIA) -> datetime:
          ...
          # Fixar o teto no último microssegundo do segundo limite
          dt_naive = datetime(year, month, day, hour, minute, second, 999999)
          return dt_naive.replace(tzinfo=tz)

      @staticmethod
      def is_submission_eligible(server_receipt_dt: datetime, deadline_dt: datetime, allow_grace_period: bool = True) -> bool:
          sub_utc = server_receipt_dt.astimezone(timezone.utc)
          dead_utc = deadline_dt.astimezone(timezone.utc)
          if allow_grace_period:
              dead_utc += timedelta(seconds=DeadlineTimezoneCalculator.GRACE_PERIOD_SECONDS)
          return sub_utc <= dead_utc
  ```

---

# 2. Nível Importante (Alta Prioridade Pré-Lançamento / Should-Fix)

| # | Área | Problema Encontrado | Arquivo Afetado | Ação Recomendada |
| :-: | :--- | :--- | :--- | :--- |
| **2.1** | **Segurança Git** | Arquivo `.env` ausente do `.gitignore` | [`.gitignore`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/.gitignore) | Adicionar `.env`, `*.env`, `.env.*` para evitar commits acidentais de chaves de API. |
| **2.2** | **Dependência JS** | Prototype Pollution e ReDoS em SheetJS (`CVE-2023-30533` e `CVE-2024-22363`) | [`src/xlsx.full.min.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/xlsx.full.min.js) | Atualizar a biblioteca SheetJS para a versão `0.20.2+`. |
| **2.3** | **Dependência JS** | Directory Traversal em Mammoth.js (`CVE-2025-11849`) | [`index.html:1147`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L1147) | Atualizar CDN do Mammoth para `mammoth >= 1.11.0`. |
| **2.4** | **Upload de Arquivo** | Falta de validação de Magic Bytes (`%PDF-`, `PK\x03\x04`) | [`app.js:2074`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2074) | Verificar os primeiros 4 bytes do `ArrayBuffer` antes de repassar ao parser. |
| **2.5** | **Upload de Arquivo** | Ausência de limite de tamanho de arquivo no navegador | [`app.js:2066`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L2066) | Bloquear arquivos com `file.size > 35 * 1024 * 1024` com toast de aviso. |
| **2.6** | **Responsividade** | Quebra total de layout em telas mobile (< 768px) | [`styles.css`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/styles.css) | Implementar `@media (max-width: 768px)` com stack vertical e menu compacto. |
| **2.7** | **UX / Validação** | Clique em *"Analisar Edital"* vazio falha silenciosamente | [`app.js:1120`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L1120) | Emitir `showToast('Forneça o edital antes de auditar.', 'warning')`. |
| **2.8** | **Bug Visual** | Rótulos `undefined` nos cards de auditoria offline | [`src/controllers/aiController.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/aiController.js) | Mapear `meta.criterio || meta.name || id` no renderizador. |
| **2.9** | **DOM / HTML** | ID duplicado `#btn-goto-supervisor` | [`index.html:578,801`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L578) | Renomear o segundo botão para `#btn-goto-supervisor-alt`. |
| **2.10** | **Qualidade Python** | Cláusulas `except:` genéricas (bare except) | [`server.py:946,976,980,2422`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L946) | Substituir por `except Exception as e:` ou exceções tipadas. |
| **2.11** | **Código Morto JS** | 7 funções órfãs acumulando ~350 linhas de código legado | [`app.js:1563,1639,1865,2848,5135`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js#L1563) | Excluir funções obsoletas (`callGeminiForAuditoria`, etc.). |
| **2.12** | **Acessibilidade** | Falta de `aria-label` em botões de exclusão e contrastes WCAG | [`index.html`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html) | Adicionar `aria-label` nos botões de ícone e ajustar ratio de cor para 4.5:1. |

---

# 3. Nível Desejável (Melhorias Pós-Lançamento e Débito Técnico)

| # | Área | Oportunidade de Melhoria | Arquivos Associados | Benefício Esperado |
| :-: | :--- | :--- | :--- | :--- |
| **3.1** | **Arquitetura** | Decomposição do monolito [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py) (2.512 linhas) em submódulos | `services/generators/`, `services/routes/` | Modularidade, facilidade de manutenção e testes unitários isolados. |
| **3.2** | **Arquitetura** | Decomposição do monolito [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js) (8.196 linhas) | `src/views/`, `src/services/` | Eliminar dependência de variáveis globais no objeto `window`. |
| **3.3** | **Performance** | Carregamento assíncrono (Lazy Load) do `xlsx.full.min.js` (881 KB) | [`index.html:1148`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L1148) | Acelerar o First Contentful Paint (FCP) da página inicial em ~40%. |
| **3.4** | **Estrutura** | Reorganização de 22 scripts soltos no diretório raiz | Raiz do repositório | Mover testes para `tests/` e utilitários para `tools/`. |
| **3.5** | **Testes / CI** | Adicionar Pytest e CI/CD automatizado no GitHub Actions | `.github/workflows/ci.yml` | Garantir que nenhum PR quebre as suítes de elegibilidade e prazos. |
| **3.6** | **Testes** | Mocking de chamadas de IA nos testes manuais | [`test_live_full_flow.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/test_live_full_flow.py) | Execução 100% verde da suíte sem depender de chave Gemini remota. |
| **3.7** | **Persistência** | Adicionar índices secundários no IndexedDB (`AuditorDB_v1`) | [`src/controllers/auditorDB.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/controllers/auditorDB.js) | Otimizar buscas de histórico por categoria e título sem varredura linear. |
| **3.8** | **Código Morto** | Limpeza de 20 imports e variáveis Python não utilizadas | [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py), [`services/api.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/api.py) | Limpeza estática e redução de ruído de análise estática. |
| **3.9** | **Qualidade** | Refatorar 50 linhas com comandos encadeados por `;` no `server.py` | [`server.py:1536-1893`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py#L1536) | Criação de helper `apply_cell_style()` para formatação Excel. |
| **3.10** | **Idempotência** | Implementar cabeçalho `Idempotency-Key` no envio de propostas | [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js), [`server.py`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py) | Prevenir submissões duplicadas por cliques repetidos do usuário. |

---

# 4. Checklist Consolidado de Ações Pré-Lançamento

A lista abaixo deve ser executada e verificada em ordem cronológica antes da publicação oficial:

```markdown
- [ ] 1. SEGURANÇA E DADOS (BLOCO CRÍTICO)
  - [ ] 1.1 Atualizar pypdf para >= 6.15.0 no requirements.txt e ambiente .venv.
  - [ ] 1.2 Atualizar PDF.js para >= 4.10.38 e configurar isEvalSupported: false no app.js.
  - [ ] 1.3 Atualizar SheetJS (xlsx) e Mammoth.js para versões com patch.
  - [ ] 1.4 Refatorar POST /api/save-audit-report para salvar arquivos individuais em submissions/.
  - [ ] 1.5 Implementar filtro anti-SSRF com bloqueio de IPs privados em /api/fetch-url.
  - [ ] 1.6 Proteger GET /api/restart com restrição a 127.0.0.1 e token de autorização.
  - [ ] 1.7 Migrar chave do Gemini da Query String para o cabeçalho x-goog-api-key.
  - [ ] 1.8 Adicionar teto de 50 MB para Content-Length no do_POST do server.py.
  - [ ] 1.9 Configurar cabeçalhos CSP, CORS, nosniff e DENY no end_headers().
  - [ ] 1.10 Adicionar .env e *.env ao .gitignore.

- [ ] 2. CONFORMIDADE TEMPORAL E PRAZOS
  - [ ] 2.1 Ajustar parse_edital_deadline para incluir microsecond=999999.
  - [ ] 2.2 Incorporar janela de tolerância técnica (Grace Period) de 120s para latência de rede.
  - [ ] 2.3 Executar python test_prazo_deadline_timezone.py e validar 100% de sucesso.

- [ ] 3. FRONTEND, UX E ACESSIBILIDADE
  - [ ] 3.1 Adicionar validação com Toast quando usuário clicar em "Analisar Edital" sem documento.
  - [ ] 3.2 Corrigir mapeamento de rótulos undefined na aba de auditoria offline.
  - [ ] 3.3 Resolver ID duplicado #btn-goto-supervisor em index.html.
  - [ ] 3.4 Inserir validação de Magic Bytes e teto de 35 MB no upload de arquivos.
  - [ ] 3.5 Adicionar regras @media (max-width: 768px) no styles.css para visualização mobile.
  - [ ] 3.6 Adicionar aria-label em botões de exclusão e toggles.

- [ ] 4. LIMPEZA E ESTABILIDADE DE CÓDIGO
  - [ ] 4.1 Remover as 7 funções JS órfãs de app.js.
  - [ ] 4.2 Substituir cláusulas bare except por exceções tipadas no server.py.
  - [ ] 4.3 Mover os 14 arquivos test_*.py para a pasta tests/.

- [ ] 5. HOMOLOGAÇÃO E TESTE DE CARGA FINAL
  - [ ] 5.1 Executar python -X utf8 load_test_peak_simulation.py com 200 proponentes.
  - [ ] 5.2 Confirmar 200 arquivos íntegros e 0% de perda de submissões na pasta submissions/.
  - [ ] 5.3 Validar que todas as 17 suítes de teste automatizadas passam com sucesso.
```
