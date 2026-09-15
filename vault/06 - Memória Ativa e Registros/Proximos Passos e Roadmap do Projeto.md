---
tipo: roadmap
projeto: EditalAudit AI
status: planejado
data_criacao: 2026-09-12
versao_alvo: 3.1.0-hybrid
tags: [roadmap, proximos-passos, edital-audit, backend, regulatorio, memoria-ativa]
---

# 🚀 Próximos Passos e Roadmap Técnico — EditalAudit AI

> [!note] **Diretriz de Preservação**
> O design visual e a identidade do portal permanecem **estáveis e preservados** conforme construído. Todo o foco dos próximos passos é estritamente voltado para **regras de negócio, robustez de backend, compliance regulatório e confiabilidade da esteira de auditoria**.

---

## 🧭 Visão Geral do Estado Atual

- **Frontend:** Portal React + Vite em `web/` com interface consolidada, dark mode, responsividade testada, atalho de desktop operacional e build de 0 erros em 193ms.
- **Auditoria Local:** Motor determinístico offline em `src/controllers/localCrossEngine.js` e `web/src/engines/localCrossEngine.ts` validando rubricas, tetos e inconsistências financeiras.
- **Backend Híbrido:** Servidor Python (`server.py`) na porta 8085 com integração multi-provider (Gemini, Groq com LLaMA 3.3 70B, Ollama local e fallback atômico).
- **Confiabilidade:** Suíte de **107/107 testes automatizados aprovados (100%)** cobrindo fatiamento cirúrgico, extratores de documentos, resiliência de cache e conformidade de domínio.

---

## 📋 Frentes Técnicas dos Próximos Passos (Sem Redesign)

### 1. Conclusão e Enriquecimento do Passo 2 (Ingestão & Extração Offline)
- **Extração Cirúrgica de Editais:**
  - Otimizar o extrator offline de PDF/DOCX (`services/backend/handlers/` e `tests/test_document_extractor.py`) para tabelas complexas de certames culturais e de inovação.
  - Aperfeiçoar o algoritmo de fatiamento (`services/backend/handlers/chunker.py`) para manter a rastreabilidade exata dos números de artigos, cláusulas e itens de edital.
- **Auto-Preenchimento Estruturado na Folha A4:**
  - Mapeamento automático dos campos do edital extraído para as 14 seções ABNT do formulário sem necessidade de digitação manual.

### 2. Aperfeiçoamento da Inteligência Regulatória (14 Pareceristas M.U.S.A.)
- **Blindagem Jurídica:**
  - Refinamento das regras de conferência contra a **Lei 14.133/2021** (Nova Lei de Licitações) e **Lei 14.903/2024** (Marco Legal da Cultura).
  - Alinhamento estrito com os parâmetros do TCU para rubricas administrativas (limite de 15% conforme jurisprudência do TCU e Súmula 272).
- **RAG Semântico & Cache Local:**
  - Manter e expandir o `SemanticCache` em `server.py` com limite LRU seguro (50 itens) para economia de tokens e respostas instantâneas em editais recorrentes.
  - Enriquecimento dos prompts dos 14 pareceristas M.U.S.A. para gerar recomendações acionáveis que possam ser injetadas diretamente na proposta.

### 3. Fortalecimento da Central de Exportações
- **Compilador ABNT ReportLab (`pdf_handler.py`):**
  - Garantir padronização estrita de margens (3cm superior/esquerda, 2cm inferior/direita), fontes Times New Roman / Arial e sumário dinâmico paginado.
- **Planilhas Orçamentárias XLSX (`xlsx_handler.py`):**
  - Validação das fórmulas nativas de soma (`=SUM(...)`) e multiplicação (`=QTD*VALOR`), garantindo total compatibilidade com Microsoft Excel e LibreOffice Calc.
- **Exportação de Baralho Anki (`anki_handler.py`):**
  - Geração de flashcards objetivos para preparação do proponente para arguição oral perante a comissão julgadora.

### 4. Resiliência de Persistência & Modo Offline-First
- **Banco Híbrido (Supabase + IndexedDB):**
  - Sincronização em segundo plano via `web/src/engines/auditorDB.ts` com fallback transparente caso a conexão com a nuvem oscile.
  - Garantia de que 100% das operações de cálculo e validação continuem executando no cliente sem dependência de internet.

---

## 🛡️ Critérios de Aceite para as Próximas Entregas

1. **Zero Impacto no Design:** Nenhuma modificação nas classes CSS de layout ou nos componentes visuais já aprovados.
2. **100% de Testes Aprovados:** A suíte de testes (`.\.venv\Scripts\python.exe -m unittest discover tests`) deve permanecer com 107/107 aprovações (zero falhas, zero erros).
3. **Padrão Matt Pocock:** Tipagem estrita com TypeScript e Python Type Hints em todos os novos manipuladores de dados.
4. **Zero Git Push:** Operação estritamente local respeitando os guardrails do projeto.
