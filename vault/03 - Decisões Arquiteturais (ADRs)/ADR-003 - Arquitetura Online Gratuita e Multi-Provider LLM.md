---
tipo: adr
numero: "003"
status: aprovado
data: 2026-09-12
tags: [adr, online-hosting, custo-zero, multi-provider-llm, webgpu, react-vite, lgpd]
---

# 📜 ADR-003: Arquitetura Online Gratuita, Frontend React+Vite e Multi-Provider LLM

> [!abstract] **Resumo da Decisão**
> O EditalAudit AI estabelece a topologia de implantação pública em servidores com **custo zero ($0/mês)**, adota **React + Vite + TypeScript** no frontend, modulariza o backend Python em pacotes nativos (Padrão Ponytail) e institui uma arquitetura de IA em 4 camadas (Determinístico Local -> WebLLM In-Browser WebGPU -> Multi-Provider Gateway Free-Tier -> BYOK) para eliminar a dependência exclusiva de uma única API sem perder a autoridade semântica da IA generativa.

---

## 1. Contexto & Desafios Técnicos

1. **Meta de Publicação Online em Nuvem:** O sistema precisa estar disponível publicamente via web para proponentes culturais e licitantes, mas sem custos fixos iniciais de infraestrutura (alvo $0/mês).
2. **O Dilema da IA vs Regras Heurísticas:** Auditorias puramente offline/determinísticas (sem LLM) falham em avaliar coerência, viabilidade de plano de trabalho e riscos jurídicos subjetivos da Lei 14.133/2021 e 14.903/2024. A IA é indispensável.
3. **Risco de Dependência e Custos de Tokens:** Depender de um único provedor de IA com rate limits baixos ou cobrança em dólar inviabiliza um serviço público gratuito.
4. **Privacidade e LGPD:** Projetos contêm propostas orçamentárias confidenciais, dados de faturamento e documentos pessoais que não devem ficar expostos em banco de dados central sem controle estrito.

---

## 2. Decisão Arquitetural

### 2.1 Topologia de Hospedagem com Custo Zero ($0/mês)
- **Frontend SPA:** Hospedagem na **Vercel** ou **Cloudflare Pages** (distribuição estática global, SSL automático, free tier perpétuo).
- **Backend Python Modular:** Hospedagem no **Hugging Face Spaces (Docker/Python)** (2 vCPU, 16 GB de RAM gratuitos 24/7) ou **Render Web Service Free Tier**.
- **Persistência Local-First:** Os dados dos projetos residem no **IndexedDB** do navegador do usuário (`auditorDB.ts`). O backend opera em modo majoritariamente *stateless*.

### 2.2 Frontend: Migração para React + Vite + TypeScript
- Abandono do monólito `app.js` (7.816 linhas) em favor de uma SPA componentizada em `web/`.
- Tipagem estrutural estrita seguindo o Padrão Matt Pocock.
- Hooks reativos para consumo de streaming SSE dos pareceristas MUSA.

### 2.3 Resiliência de IA: Pirâmide Multi-Tier e Anti-Vendor Lock-in
- **Tier 0 (LocalCrossEngine):** Filtra dados brutos e cálculos matemáticos, poupando 90% dos tokens que iriam para a IA.
- **Tier 1 (In-Browser WebLLM / WebGPU):** Execução de modelos quantizados (Llama 3.2 1B/3B) direto no navegador do proponente via `@mlc-ai/web-llm` com zero custo de servidor.
- **Tier 2 (Multi-Provider Gateway com Tiers Gratuitos):**
  1. *Google Gemini 1.5/2.0 Flash* (15 requisições/min gratuitas no Google AI Studio).
  2. *Groq Cloud API* (Llama 3.3 70B com 30 requisições/min gratuitas a 500 tokens/s).
  3. *OpenRouter Free Models* (Fallback universal).
- **Tier 3 (BYOK - Bring Your Own Key):** Suporte a chave informada pelo proponente, armazenada estritamente no `localStorage`.
- **Tier 4 (Semantic Cache):** Cache de editais e cláusulas padrão para evitar chamadas redundantes.

---

## 3. Sabatina de Decisões Técnicas (Grill Me)

| Pergunta Crítica da Sabatina | Resposta & Justificativa Técnica |
| :--- | :--- |
| **"Por que não usar um backend FastAPI em vez da stdlib Python?"** | Manter o backend modular em `http.server` nativo (`services/backend/`) respeita o padrão `ponytail`, reduz o tempo de boot para milissegundos e consome menos de 40MB de RAM, perfeito para o limite de 512MB do Render Free. |
| **"Como garantir que o WebLLM não trave computadores fracos?"** | Detecção dinâmica de compatibilidade WebGPU no carregamento; se o dispositivo não tiver aceleração gráfica, o sistema roteia automaticamente para o Tier 2 (Gateway Gemini/Groq). |
| **"Como lidar com rate limit (HTTP 429) nos planos gratuitos?"** | O `LLMGateway` implementa rotação automática em cascata: se o Gemini atingir 15 RPM, a requisição migra instantaneamente para o Groq sem interrupção para o usuário. |

---

## 4. Consequências & Conformidade

- **Positivas:** Custo $0 de servidor; alta disponibilidade com fallback entre múltiplos provedores; experiência ultra-rápida; 100% aderência à LGPD.
- **Governança:** Preservação obrigatória dos 80 testes automatizados existentes no backend.
