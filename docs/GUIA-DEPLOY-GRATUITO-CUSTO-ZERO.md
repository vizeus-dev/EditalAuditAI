# 🚀 Guia de Implantação Online em Servidores Gratuitos ($0/Mês)

Este guia orienta como colocar o **EditalAudit AI v3** no ar na web pública com **custo zero de hospedagem e tokens**, utilizando as melhores plataformas gratuitas da atualidade.

---

## 🏗️ Topologia da Arquitetura Custo Zero

```mermaid
graph LR
    User["Proponente Cultural / Licitante"] -->|HTTPS| CF["Cloudflare Pages / Vercel<br/>(Frontend React+Vite SPA)<br/>Custo: $0/mês | CDN Global"]
    
    CF -->|Dados & Rascunhos| IDB["IndexedDB Local-First<br/>(Armazenamento no Navegador)<br/>Custo: $0 | 100% LGPD"]
    CF -->|Inferência Local| WEBGPU["WebGPU In-Browser (WebLLM)<br/>(Llama 3.2 quantizado)<br/>Custo de Servidor: $0"]
    
    CF -->|API Requests & PDF| HF["Hugging Face Spaces / Render<br/>(Backend Python Modular)<br/>Custo: $0 | 2 vCPU + 16GB RAM"]
    
    HF -->|1º Fallback (15 RPM)| GEMINI["Google Gemini Flash<br/>(AI Studio Free Tier)"]
    HF -->|2º Fallback (30 RPM)| GROQ["Groq Cloud API<br/>(Llama 3.3 70B Free Tier)"]
```

---

## 1. Deploy do Frontend (Vercel ou Cloudflare Pages)

## 1. Deploy do Frontend (Vercel ou Cloudflare Pages)

### 📌 Escolha qual frontend você quer publicar:

#### Opção 1: O Portal Master Unificado (Raiz — `index.html` com os 3 Eixos, Pix e Supabase)
*Esta é a versão master completa com 8.338 linhas de regras, pareceristas M.U.S.A., licitações e concursos.*
1. Na Vercel, acesse as configurações do projeto (**Settings > General**).
2. Na seção **Build & Development Settings**:
   - **Framework Preset:** Selecione **`Other`**.
   - **Root Directory:** Deixe `./` (raiz).
   - **Build Command:** Ative o botão *Override* e deixe **EM BRANCO** (ou `echo "Static portal ready"`).
   - **Output Directory:** Ative o botão *Override* e deixe **EM BRANCO** (ou `.`).
   - **Install Command:** Ative o botão *Override* e deixe **EM BRANCO** (ou `echo "No install needed"`).
3. Salve e clique em **Redeploy**. A Vercel servirá o site instantaneamente sem tentar rodar `npm` nem Python!

#### Opção 2: A Aplicação React + Vite (Pasta `web/`)
1. Na Vercel, acesse **Settings > General**.
2. Na seção **Root Directory**:
   - Clique em **Edit**, selecione ou digite: **`web`** e salve.
3. Na seção **Build & Development Settings**:
   - **Framework Preset:** Selecione **`Vite`**.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Clique em **Redeploy**.

---

### Opção B: Cloudflare Pages (Sem limites de largura de banda)
1. No painel da Cloudflare, acesse **Compute (Workers) > Pages**.
2. Conecte o repositório e configure o **Root directory** conforme sua escolha (`./` para o portal master ou `web` para o React).
3. O deploy ocorre em segundos via rede de borda Anycast.

---

## 2. Deploy do Backend Python (Hugging Face Spaces)

O **Hugging Face Spaces** é atualmente o melhor serviço para hospedar backends Python gratuitamente:
- **Recursos Gratuitos:** 2 vCPUs dedicadas, **16 GB de memória RAM** e armazenamento local permanente.
- **Sem "Cold Sleep" Agressivo:** Mantém o serviço respondendo sem interrupções repentinas.

### Passo a Passo no Hugging Face:
1. Crie uma conta em [huggingface.co](https://huggingface.co).
2. Clique em **New Space** > Selecione **Docker** (Blank) ou **Gradio/Streamlit**.
3. No arquivo `Dockerfile` na raiz do Space:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   EXPOSE 7860
   ENV PORT=7860
   CMD ["python", "server.py"]
   ```
4. Em **Settings > Variables and secrets**, configure suas chaves gratuitas:
   - `GEMINI_API_KEY`: Sua chave gratuita do [Google AI Studio](https://aistudio.google.com/).
   - `GROQ_API_KEY`: Sua chave gratuita do [Groq Console](https://console.groq.com/).
   - `EDITAL_ADMIN_TOKEN`: Um token secreto gerado por você para comandos de reinicialização remota.
5. Seu backend responderá publicamente em `https://<seu-usuario>-<seu-space>.hf.space`.

---

## 3. Configuração de Inteligência Artificial sem Custos (FinOps)

O EditalAudit AI foi blindado para **nunca depender de uma API paga**:

1. **Cota Comunitária do Servidor:**
   - O backend utiliza o **Google Gemini 1.5/2.0 Flash** (15 requisições por minuto gratuitas) como provedor primário.
   - Caso o limite de 15 RPM seja atingido, o `LLMGateway` redireciona **automaticamente em cascata** para a **Groq Cloud** (Llama 3.3 70B com 30 requisições por minuto gratuitas a 500 tokens/s).
2. **BYOK (Bring Your Own Key):**
   - Se sua plataforma atender centenas de usuários simultâneos, os proponentes podem clicar no botão **"🔑 BYOK / Chaves"** no cabeçalho e colar sua própria chave gratuita.
   - A chave fica salva no `localStorage` / `IndexedDB` do navegador do usuário e é transmitida via cabeçalho `X-User-API-Key`.
3. **WebGPU Local (Custo $0 no Servidor):**
   - Usuários com navegadores modernos (Chrome/Edge/Brave com aceleração por hardware) rodam o modelo Llama 3.2 diretamente na placa gráfica do próprio dispositivo, consumindo zero processamento do seu servidor.

---

## 4. Configuração de Pagamento Pix Pay-Per-Use (Asaas)

Para cobrar R$ 9,90 por análise avulsa sem pagar mensalidade de gateway:

1. Crie uma conta gratuita no [Asaas](https://www.asaas.com/) (Pessoa Física ou Jurídica).
2. Em **Configurações de Conta > Integrações**, gere sua chave de API:
   - Variável de ambiente no Hugging Face / Render: `ASAAS_API_KEY=<sua-chave>`
3. Em **Webhooks para Cobranças**, cadastre o endpoint do backend:
   - **URL do Webhook:** `https://<seu-backend-url>/api/pix/webhook`
   - **Eventos:** `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`.
4. Assim que o usuário efetua o Pix no portal, o Asaas notifica o backend e os créditos são liberados na tela em menos de 2 segundos.

---

## 5. Atendimento Agêntico no Portal (Typebot Web Widget)

Para acolher visitantes e qualificar dúvidas de proponentes com custo R$ 0:

1. Crie uma conta no [Typebot.io](https://typebot.io) (Plano Free: 200 conversas/mês).
2. Crie um fluxo de onboarding acolhedor:
   - Pergunta: "Qual edital você deseja auditar?" (Lei Paulo Gustavo, PNAB, Rouanet, Licitação 14.133).
   - Coleta de Telefone WhatsApp para suporte.
   - Envio de Webhook para o n8n (`tools/n8n_workflows/whatsapp_evolution_agent.json`).
3. Embuta o script leve do Typebot antes de fechar a tag `</body>` no seu frontend:
   ```html
   <script type="module">
     import Typebot from 'https://cdn.jsdelivr.net/npm/@typebot.io/js@0.3/dist/web.js';
     Typebot.initBubble({
       typebot: "editalaudit-onboarding",
       apiHost: "https://typebot.io",
       theme: { button: { backgroundColor: "#2563eb" } }
     });
   </script>
   ```

---

## 6. Automação WhatsApp via Evolution API Gratuita (Render / Hugging Face)

Para permitir que o n8n responda automaticamente no WhatsApp do proponente sem pagar mensalidade:

1. Suba uma instância gratuita da [Evolution API](https://github.com/EvolutionAPI/evolution-api) no Render ou Hugging Face Spaces (Docker).
2. Conecte seu número de atendimento escaneando o QR Code pelo WhatsApp Web.
3. Importe o arquivo [`tools/n8n_workflows/whatsapp_evolution_agent.json`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/tools/n8n_workflows/whatsapp_evolution_agent.json) no seu n8n.
4. Configure as variáveis de ambiente no n8n:
   - `EVOLUTION_API_URL`: URL da sua Evolution API.
   - `EVOLUTION_API_KEY`: Token de autorização configurado no Docker.
   - `EVOLUTION_INSTANCE_NAME`: Nome da instância criada (ex: `editalaudit`).
   - `GEMINI_API_KEY`: Sua chave gratuita do Google AI Studio.
5. Pronto! Quando um lead preencher o Typebot ou se cadastrar no portal, o agente de IA formula a resposta e envia diretamente no WhatsApp do proponente.
