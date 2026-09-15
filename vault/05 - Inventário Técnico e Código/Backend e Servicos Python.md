---
tipo: inventario_tecnico
modulo: backend
linguagem: Python 3.12
servidor: server.py
tags: [backend, python, fastapi, services, api]
---

# 🐍 Backend e Serviços Python

> O backend do **EditalAudit AI** é leve, modular e desacoplado, seguindo estritamente a filosofia Ponytail (sem frameworks pesados como LangChain; apenas o essencial para máxima velocidade e estabilidade).

---

## 📁 Principais Arquivos e Responsabilidades

### 1. `server.py` (Servidor HTTP Local)
- **Localização:** `[server.py](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/server.py)`
- **Porta:** `8000` (http://localhost:8000)
- **Funcionalidades:**
  - Serve a interface web estática (`index.html`, `styles.css`, `src/`).
  - Rotas de exportação de relatórios em PDF profissional via **ReportLab**.
  - Rotas de conversão e processamento de editais em PDF e DOCX.
  - Proxy seguro para chamadas à API do Google Gemini quando necessário.

### 2. `services/time_auditor.py` (Auditoria de Fusos e Prazos)
- **Localização:** `[services/time_auditor.py](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/time_auditor.py)`
- **Regras:**
  - Conversão precisa entre os 4 fusos horários do Brasil: Brasília (`America/Sao_Paulo` UTC-3), Manaus (`America/Manaus` UTC-4), Rio Branco (`America/Rio_Branco` UTC-5) e Fernando de Noronha (`America/Noronha` UTC-2).
  - Tolerância de 120 segundos (*Grace Period*) para absorver latência de rede sem prejudicar o licitante.

### 3. `services/api.py` (Integração RAG e Cache Semântico)
- **Localização:** `[services/api.py](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/services/api.py)`
- **Regras:**
  - Motor de busca semântica e BM25 nativo (menos de 300 linhas, sem dependências externas).
  - Cache semântico local que armazena pareceres frequentes em memória/disco, reduzindo custos de API a quase zero em consultas repetidas.
  - Implementação do padrão `learned-resilient-db-timeouts`: chamadas com timeout estrito e fallback automático.

---

## 🔒 Segurança no Backend
- **Anti-SSRF:** Bloqueio de requisições a endereços internos ou IPs de metadados (`169.254.169.254`).
- **Validação de Entrada:** Proteção contra Path Traversal no download de anexos.
- **Sanitização:** Tratamento estrito de parâmetros para evitar injeção em comandos do sistema.

---

## 🔗 Links Relacionados
- [[05 - Inventário Técnico e Código/Frontend e LocalCrossEngine JS|Frontend e LocalCrossEngine JS]]
- [[05 - Inventário Técnico e Código/Suite de Testes e Metricas de Confiabilidade|Suíte de Testes]]
- [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|Painel Geral (MOC)]]
