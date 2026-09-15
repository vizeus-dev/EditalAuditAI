---
tipo: inventario_tecnico
modulo: ferramentas_cli
script_principal: tools/orchestrator_loop.py
tags: [cli, automacao, loop-autonomo, tools, orchestrator]
---

# 🤖 Ferramentas CLI e Loop Autônomo de Auditoria

> O repositório possui uma suíte de ferramentas de linha de comando (`tools/`) para automação contínua de auditorias, testes de estresse e extração de documentos.

---

## 🛠️ Principais Ferramentas Disponíveis

### 1. `tools/orchestrator_loop.py` (O Loop Contínuo)
- **Localização:** `[tools/orchestrator_loop.py](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/tools/orchestrator_loop.py)`
- **Função:**
  - Executa uma bateria autônoma de verificações e diagnósticos.
  - Varre o repositório em busca de código morto, checa testes automatizados e gera relatórios consolidados em `docs/AUDIT-LOOP-LOG.md`.

### 2. `tools/load_test_peak_simulation.py` (Simulação de Picos de Acesso)
- **Localização:** `[tools/load_test_peak_simulation.py](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/tools/load_test_peak_simulation.py)`
- **Função:**
  - Simula cenários de pico de acessos concorrentes ao backend (ex: encerramento de inscrições com centenas de envios por minuto).
  - Mede tempo de resposta (latência média < 50ms para auditorias locais) e consumo de memória.

### 3. Scripts de Extração e Conversão de Documentos
- `tools/read_pdf.py` e `tools/read_docx.py`: Conversores de editais brutos para texto indexável.
- `tools/download_editais.py`: Utilitário para baixar lotes de editais abertos para testes de regressão.
- `tools/gen_sample_data.py`: Gerador de propostas e planilhas sintéticas para baterias de testes.

---

## 🚀 Atalhos de Inicialização da Aplicação
- **`iniciar_edital_audit.bat`:** Script em lote que sobe o servidor Python no ambiente virtual e abre o navegador na porta 8000.
- **`iniciar_edital_audit.vbs`:** Inicializador silencioso sem janela de prompt aberta.
- **`parar_edital_audit.bat`:** Encerra instâncias ativas do servidor com segurança.

---

## 🔗 Links Relacionados
- [[05 - Inventário Técnico e Código/Backend e Servicos Python|Backend e Serviços Python]]
- [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|Painel Geral (MOC)]]
