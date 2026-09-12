# APRENDIZADOS CONTÍNUOS & EXTRAÇÃO DE PADRÕES (/ECC-CONTINUOUS-LEARNING)

**Projeto:** EditalAudit AI  
**Data:** Setembro de 2026  
**Status:** HOMOLOGADO

---

## 1. Padrões de Engenharia Extraídos para a Base de Conhecimento

### Padrão 1: "Dual-Engine Híbrido: Determinístico Offline com Síntese LLM Desacoplada"
- **Contexto:** Plataformas que realizam auditoria regulatória e fiscal não podem depender da disponibilidade de APIs remotas nem aceitar cálculos aproximados ou alucinações matemáticas da LLM.
- **Implementação:** Toda a matemática e regras normativas são executadas em JavaScript local (`LocalCrossEngine.js`) e serviços nativos Python (`time_auditor.py`). A IA atua estritamente no polimento textual e síntese de pareceres via SSE.
- **Impacto:** Sistema opera com 100% de disponibilidade mesmo sem internet e com custos de tokens mínimos (FinOps).

### Padrão 2: "Grace Period e Resolução Temporal com Microssegundos em Prazos Fiscais"
- **Contexto:** Prazos de editais encerram no último segundo do dia (ex: 23:59:59). Truncar microssegundos pode rejeitar uma submissão válida. Latência de rede TCP/IP de 1 a 2 minutos pode gerar desclassificação injusta.
- **Implementação:** `DeadlineTimezoneCalculator` define `microsecond=999999` e adiciona `GRACE_PERIOD_SECONDS = 120` convertido em UTC, suportando fusos de Brasília, Manaus, Acre e Noronha.
- **Impacto:** Eliminação definitiva de perdas de prazo por jitter de rede e inconsistência de fusos.

### Padrão 3: "Blindagem Anti-SSRF em Dois Níveis com Resolução de DNS"
- **Contexto:** Endpoints de proxy que baixam editais (`/api/fetch-url`) são alvos primários de ataques SSRF contra redes internas (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`) e metadados de nuvem (`169.254.169.254`).
- **Implementação:** `validate_safe_url` resolve o DNS antecipadamente via `socket.getaddrinfo` e valida o objeto `ipaddress.ip_address`, bloqueando qualquer IP privado, reservado, link-local ou de loopback.
- **Impacto:** Risco zero de exfiltração de metadados em ambientes AWS/GCP e proteção integral da máquina local.

### Padrão 4: "Guardrail de Git Rígido e Local-First"
- **Contexto:** Necessidade de executar loops incessantes de testes, auditoria e geração de artefatos sem poluir o histórico do Git ou disparar push para o repositório remoto.
- **Implementação:** O motor `tools/orchestrator_loop.py` e os subagentes operam estritamente sobre arquivos e logs locais, mantendo o repositório sincronizado apenas localmente.
