/**
 * aiController.js — Controlador de IA Mestre
 *
 * Princípio: "Backend Leve, Prompt Pesado"
 *
 * Este controlador substitui o orchestratorController.js e as 8 Skills locais.
 * Sua única responsabilidade é:
 *   1. Coletar o estado do workspace (edital, proposta, orçamento, anexos)
 *   2. Concatenar tudo em um documento Markdown limpo e estruturado
 *   3. Enviar para o Gemini com um System Prompt denso de 14 agentes
 *   4. Retornar o resultado estruturado no formato que o app.js espera
 *
 * NÃO faz nenhuma análise de regras de negócio em JavaScript.
 * NÃO calcula percentuais, NÃO busca keywords, NÃO pré-valida nada.
 * O Gemini é o cérebro — este arquivo é apenas o mensageiro.
 */
window.aiController = {

    name: "Controlador de IA — Modo Híbrido & Offline-First (Gemini + IndexedDB)",

    sanitizeHTML: function (dirtyHtml) {
        if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
        return dirtyHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<\/?(html|head|body|title)[^>]*>/gi, '')
            .replace(/\s*on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
            .replace(/href\s*=\s*["']?javascript:[^"'>]+/gi, 'href="#"')
            .trim();
    },

    extractRelevantContext: function (fullText, sectionType) {
        if (!fullText) return "";

        const keywordMap = {
            justificativa: /(justificativa|relevância|histórico|proponente|objeto|cultural|social)/i,
            objetivos: /(objetivo|meta|público|beneficiário|alcance|fim|finalidade)/i,
            metodologia: /(metodologia|plano de trabalho|fases|etapas|execução|desenvolvimento)/i,
            cronograma: /(cronograma|prazo|mês|meses|fases|etapa|duração)/i,
            orcamento: /(orçamento|custo|teto|limite|administrativo|rubrica|planilha|r\$|preço|valor|despesa)/i,
            acessibilidade: /(acessibilidade|pcd|libras|audiodescrição|rampa|braille|legenda|deficiência)/i,
            publico: /(público|beneficiário|faixa etária|gratuito|acesso|comunidade)/i,
            contrapartida: /(contrapartida|legado|doação|oficina|palestra|social|retorno)/i,
            comunicacao: /(comunicação|divulgação|assessoria|mídia|peças|marca|propaganda)/i,
            ficha_tecnica: /(ficha técnica|currículo|equipe|função|experiência)/i,
            monitoramento: /(monitoramento|indicador|avaliação|pesquisa|relatório|matriz)/i,
            compliance: /(compliance|direito|certidão|regularidade|fgts|cnd|cndt|receita|lei|legal)/i,
            sustentabilidade: /(sustentabilidade|esg|resíduo|carbono|ecológico|meio ambiente)/i,
            rider: /(rider|palco|som|luz|montagem|logística|transporte|hospedagem|técnico)/i
        };

        const regex = keywordMap[sectionType] || /(edital|regra|norma|requisito)/i;
        const lines = fullText.split('\n');
        const matchedChunks = [];
        let totalLength = 0;
        let currentChunk = "";

        for (let i = 0; i < lines.length; i++) {
            currentChunk += lines[i] + "\n";
            if (lines[i].trim() === "" || i === lines.length - 1) {
                if (regex.test(currentChunk)) {
                    if (totalLength + currentChunk.length <= 4000) {
                        matchedChunks.push(currentChunk.trim());
                        totalLength += currentChunk.length;
                    } else {
                        const remaining = 4000 - totalLength;
                        if (remaining > 50) {
                            matchedChunks.push(currentChunk.substring(0, remaining).trim() + "...");
                        }
                        break;
                    }
                }
                currentChunk = "";
            }
        }

        if (matchedChunks.length === 0) {
            return fullText.substring(0, 4000);
        }

        return matchedChunks.join("\n\n");
    },

    // =====================================================================
    // SYSTEM PROMPT — Modo Híbrido (Validador Final sobre Pré-Auditoria Local)
    // =====================================================================
    SYSTEM_PROMPT: `Você é uma banca avaliadora técnica composta por 14 especialistas em projetos culturais financiados por editais públicos e privados (Lei Rouanet, Natura, Petrobras, Itaú, IN MinC).

Sua missão é atuar como VALIDADOR FINAL sobre a pré-auditoria offline gerada pelo motor local do aplicativo (IndexedDB).
Você deve analisar SIMULTANEAMENTE todos os documentos fornecidos — Edital de Referência, Proposta Cultural, Planilha Orçamentária e o Laudo de Pré-Auditoria Local — e produzir o laudo técnico definitivo em 14 dimensões de compliance.

**DIRETRIZ DE VALIDAÇÃO HÍBRIDA:**
- O motor de inferência local já calculou valores orçamentários brutos, checou certidões e verificou termos de acessibilidade e cotas.
- Revise esse pré-relatório e concentre sua capacidade analítica em adicionar pareceres qualitativos densos, refinamentos estratégicos e insights profundos de banca.

**REGRAS CRÍTICAS DE ANÁLISE:**
- Faça cruzamento real entre as regras do Edital e os dados da Proposta. Cite trechos quando relevante.
- Calcule percentuais financeiros a partir dos valores brutos da planilha, não estime.
- O parecer de cada agente deve ser escrito em HTML estruturado (h4, p, ul, li, strong, table), contendo um diagnóstico claro e uma seção "Sugestão Otimizada" ao final.

**CRITÉRIO RIGOROSO DE NOTAS E PENALIDADES:**
- Nota Técnica ("nota_tecnica"): soma ponderada dos 14 quesitos (máximo 100 pontos).
- Nota de Priorização ("nota_priorizacao"): de 0 a 30 baseada nos 7 critérios de priorização do edital (Anexo 8).
- Nota Final ("nota_final"): soma matemática exata de "nota_tecnica" + "nota_priorizacao" (máximo 130 pontos).`,

    // =====================================================================
    // SCHEMA DE RESPOSTA ESTRUTURADA
    // =====================================================================
    RESPONSE_SCHEMA: {
        type: "OBJECT",
        properties: {
            relatorio_geral: { type: "STRING" },
            nota_final: { type: "NUMBER" },
            nota_tecnica: { type: "NUMBER" },
            nota_priorizacao: { type: "NUMBER" },
            total_orcamento: { type: "NUMBER" },
            custos_administrativos_percentual: { type: "NUMBER" },
            agentes: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING" },
                        nota: { type: "NUMBER" },
                        parecer: { type: "STRING" },
                        erros: { type: "ARRAY", items: { type: "STRING" } },
                        recomendacoes: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["id", "nota", "parecer", "erros", "recomendacoes"]
                }
            },
            alertas: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        tipo: { type: "STRING" },
                        descricao: { type: "STRING" },
                        sugestao: { type: "STRING" },
                        nivel: { type: "STRING" }
                    }
                }
            },
            ajustes: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        alteracao: { type: "STRING" },
                        fator: { type: "STRING" }
                    }
                }
            }
        },
        required: ["relatorio_geral", "nota_final", "nota_tecnica", "nota_priorizacao", "total_orcamento", "custos_administrativos_percentual", "agentes", "alertas", "ajustes"]
    },

    // =====================================================================
    // CONCATENAÇÃO DE CONTEXTO — Payload Bruto em Markdown
    // =====================================================================
    buildMarkdownPayload: function (workspaceState, localAuditResult, webSearchContext = "") {
        const cover = workspaceState.cover || {};
        const doc = workspaceState.documentContent || {};
        const editalText = workspaceState.editalRefText || "Nenhum edital de referência fornecido.";
        const draftText = workspaceState.proposalDraftText || "";
        const annexes = workspaceState.annexes || [];

        const MAX_DRAFT = 25000;

        const docSections = [
            doc.justificativa ? `### 1. Justificativa e Relevância\n${doc.justificativa}` : '',
            doc.objetivos ? `### 2. Objetivos\n${doc.objetivos}` : '',
            doc.metodologia ? `### 3. Metodologia\n${doc.metodologia}` : '',
            doc.cronograma ? `### 4. Cronograma\n${doc.cronograma}` : '',
            doc.orcamento ? `### 5. Planilha Orçamentária\n${doc.orcamento}` : '',
            doc.acessibilidade ? `### 6. Acessibilidade e Cotas\n${doc.acessibilidade}` : '',
            doc.publico ? `### 7. Público-Alvo\n${doc.publico}` : '',
            doc.contrapartida ? `### 8. Contrapartida Social\n${doc.contrapartida}` : '',
            doc.comunicacao ? `### 9. Plano de Comunicação\n${doc.comunicacao}` : '',
            doc.ficha_tecnica ? `### 10. Ficha Técnica\n${doc.ficha_tecnica}` : '',
            doc.monitoramento ? `### 11. Plano de Monitoramento\n${doc.monitoramento}` : '',
            doc.compliance ? `### 12. Compliance e Direitos\n${doc.compliance}` : '',
            doc.sustentabilidade ? `### 13. Plano de Sustentabilidade\n${doc.sustentabilidade}` : '',
            doc.rider ? `### 14. Rider Técnico\n${doc.rider}` : ''
        ].filter(Boolean).join('\n\n');

        let annexesSection = "Nenhum anexo extra fornecido.";
        if (annexes.length > 0) {
            annexesSection = annexes.map((a, i) => {
                return `- **ANEXO ${i + 1}:** ${a.name} (${((a.size || 0) / 1024).toFixed(1)} KB)`;
            }).join('\n');
        }

        let localAuditBlock = "";
        if (localAuditResult) {
            localAuditBlock = `
## ETAPA 1: PRÉ-AUDITORIA LOCAL REALIZADA (BASE INDEXEDDB)
- **Nota Simulada Preliminar:** ${localAuditResult.nota_final} / 130 pts (Técnica: ${localAuditResult.nota_tecnica}, Priorização: ${localAuditResult.nota_priorizacao})
- **Percentual Administrativo Calculado:** ${localAuditResult.custos_administrativos_percentual}%
- **Alertas Preliminares Identificados:** ${localAuditResult.alertas ? localAuditResult.alertas.length : 0} alertas
---
`;
        }

        let webSearchBlock = "";
        if (webSearchContext && webSearchContext.trim()) {
            webSearchBlock = `
## ETAPA 2: PESQUISA ONLINE LEVE DE REGRAS E DIRETRIZES
${webSearchContext}
---
`;
        }

        const payload = `# CONTEXTO COMPLETO DO PROJETO PARA AUDITORIA HÍBRIDA (PIPELINE 3 ETAPAS)

---

## DADOS DE CAPA DO PROJETO

- **Título:** ${cover.title || 'Não informado'}
- **Instituição de Fomento / Edital:** ${cover.institution || 'Não informado'}
- **Proponente:** ${cover.proponent || 'Não informado'}
- **Cidade / UF:** ${cover.city || 'Não informado'}
- **Ano de Execução:** ${cover.year || 'Não informado'}
- **Orçamento Total Declarado:** R$ ${(cover.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

---
${localAuditBlock}
${webSearchBlock}

## PROPOSTA CULTURAL (Editor Atual — Seções ABNT)

${docSections || "Nenhuma seção redigida no editor ainda."}

---

## ANEXOS EXTRAS DO EDITAL

${annexesSection}

---

**INSTRUÇÃO FINAL E DIRETRIZES DO RELATÓRIO GERAL (HTML):**
Revise e valide o pré-relatório local da Etapa 1 e as diretrizes da pesquisa online da Etapa 2. Gere na chave "relatorio_geral" o laudo definitivo em HTML.`;

        console.log(`[AI-CONTROLLER] Payload Híbrido 3 Etapas construído: ${payload.length} chars`);
        return payload;
    },

    // =====================================================================
    // FUNÇÃO PRINCIPAL — runAudit (Pipeline de 3 Etapas Sequenciais)
    // =====================================================================
    runAudit: async function (workspaceState) {
        // --- ETAPA 1: Cruzamento de Dados Offline (IndexedDB + OfflineAuditor) ---
        console.log('[AI-CONTROLLER] [ETAPA 1] Iniciando cruzamento offline...');
        let localAuditResult = null;
        if (window.offlineAuditor && typeof window.offlineAuditor.runLocalAudit === 'function') {
            try {
                localAuditResult = await window.offlineAuditor.runLocalAudit(workspaceState);
            } catch (errLocal) {
                console.warn('[AI-CONTROLLER] Falha na pré-auditoria offline:', errLocal);
            }
        }

        if (typeof showToast === 'function') {
            showToast("⚡ Etapa 1: Cruzamento offline concluído (IndexedDB).", "info");
        }

        // --- ETAPA 2: Pesquisa Online Leve (Sem consumir API de LLM) ---
        console.log('[AI-CONTROLLER] [ETAPA 2] Iniciando pesquisa online leve...');
        let webSearchContext = "";
        let searchQuery = "";
        if (workspaceState.cover && workspaceState.cover.institution) searchQuery += workspaceState.cover.institution;
        if (workspaceState.editalRefName) {
            const cleanName = workspaceState.editalRefName.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ");
            searchQuery += " " + cleanName;
        }
        searchQuery = searchQuery.trim();

        if (searchQuery) {
            try {
                const searchRes = await fetch('/api/search-web-editais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery + " regras cotas limites custos" })
                });
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.results && searchData.results.length > 0) {
                        webSearchContext = "DIRETRIZES ENCONTRADAS NA PESQUISA LEVE:\n";
                        searchData.results.slice(0, 3).forEach(r => {
                            webSearchContext += `- ${r.title}: ${r.snippet}\n`;
                        });
                        if (typeof showToast === 'function') {
                            showToast("🌐 Etapa 2: Pesquisa online de regras concluída.", "info");
                        }
                    }
                }
            } catch (searchErr) {
                console.warn('[AI-CONTROLLER] Pesquisa online leve ignorada:', searchErr);
            }
        }

        const keyToUse = window.geminiKey || localStorage.getItem('gemini_api_key');

        // --- MODO OFFLINE (Parar na Etapa 1/2 se sem API Key) ---
        if (!keyToUse) {
            console.log('[AI-CONTROLLER] Nenhuma chave API. Concluindo no nível Etapa 1/2.');
            if (typeof showToast === 'function') {
                showToast("⚡ Auditoria concluída autonomamente via IndexedDB + Pesquisa Leve!", "success");
            }
            if (!localAuditResult) {
                throw new Error("Não foi possível gerar a auditoria offline. Verifique os dados do projeto.");
            }
            return this._transformToAppFormat(localAuditResult, workspaceState);
        }

        // --- ETAPA 3: Refino e Validação Final via API LLM (Gemini) ---
        console.log('[AI-CONTROLLER] [ETAPA 3] Disparando refino via API Gemini...');
        if (!workspaceState.editalProfile && workspaceState.editalRefText && typeof window.ensureEditalProfile === 'function') {
            await window.ensureEditalProfile().catch(() => { });
        }

        const auditDashboard = document.getElementById('audit-dashboard');
        const analyticCard = document.getElementById('audit-analytic-report-card');
        const analyticContent = document.getElementById('audit-analytic-report-content');

        if (auditDashboard) auditDashboard.style.display = 'block';
        if (analyticCard) analyticCard.style.display = 'block';
        if (analyticContent) {
            analyticContent.innerHTML = '<div class="loading-spinner">🤖 Etapa 3: Gemini validando pré-relatório local + pesquisa web...<br><small>Os dados estruturados do IndexedDB foram enviados para refino final.</small></div>';
        }

        const prompt = this.buildMarkdownPayload(workspaceState, localAuditResult, webSearchContext);

        // --- Pre-processamento local do Edital em paralelo ---
        const agentIds = ['justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento', 'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica', 'monitoramento', 'compliance', 'sustentabilidade', 'rider'];

        const extractionPromises = agentIds.map(async (id) => {
            const context = this.extractRelevantContext(workspaceState.editalRefText || '', id);
            return `### REGRAS DO EDITAL PARA ${id.toUpperCase()}:\n${context}`;
        });

        const extractedSections = await Promise.all(extractionPromises);
        const optimizedEditalText = extractedSections.join('\n\n');

        // --- Montar payload para o backend ---
        const requestPayload = {
            provider: 'gemini',
            api_key: keyToUse,
            prompt: prompt,
            system_instruction: this.SYSTEM_PROMPT,
            stream: false,
            response_schema: this.RESPONSE_SCHEMA,
            use_cache: true,
            use_chunking: true,
            edital_text: optimizedEditalText,
            annexes: (workspaceState.annexes || []).map(a => ({
                name: a.name,
                content: a.content || ''
            }))
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        let response;
        try {
            response = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.warn('[AI-CONTROLLER] Erro ou timeout na chamada da API. Ativando fallback offline nativo:', fetchErr);
            if (typeof showToast === 'function') {
                showToast("⚠️ API indisponível/timeout: Exibindo laudo pré-auditado localmente (Offline).", "warning");
            }
            if (localAuditResult) {
                return this._transformToAppFormat(localAuditResult, workspaceState);
            }
            throw fetchErr;
        }

        if (!response.ok) {
            console.warn(`[AI-CONTROLLER] Resposta HTTP ${response.status} da API. Usando laudo pré-auditado offline.`);
            if (typeof showToast === 'function') {
                showToast("⚠️ Falha na API: Exibindo auditoria pré-processada offline.", "warning");
            }
            if (localAuditResult) {
                return this._transformToAppFormat(localAuditResult, workspaceState);
            }
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Erro HTTP ${response.status}`);
        }

        const responseData = await response.json();
        let accumulatedText = responseData.text || "";
        console.log(`[AI-CONTROLLER] Resposta recebida: ${accumulatedText.length} chars`);

        // --- ETAPA 0: Strip de markdown code fences (```json, ```html, etc.) ---
        accumulatedText = accumulatedText.replace(/^\s*```[a-zA-Z]*\s*\r?\n/gm, '').replace(/\r?\n\s*```\s*$/gm, '').trim();

        let finalJson = {};

        const allAgentIds = ['justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento', 'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica', 'monitoramento', 'compliance', 'sustentabilidade', 'rider'];

        // --- ETAPA 0.5: Detectar se a resposta é HTML puro (não JSON) ---
        if (accumulatedText.trim().startsWith('<')) {
            console.warn("[AI-CONTROLLER] Resposta veio como HTML puro. Construindo JSON de fallback a partir do HTML.");
            finalJson = {
                relatorio_geral: accumulatedText,
                nota_final: 75,
                total_orcamento: workspaceState.cover.budget || 0,
                custos_administrativos_percentual: 0,
                agentes: allAgentIds.map(id => ({
                    id,
                    nota: 75,
                    parecer: accumulatedText,
                    erros: ['Resposta não estruturada — o modelo retornou HTML livre em vez de JSON.'],
                    recomendacoes: ['Executar nova auditoria para obter análise individualizada por agente.']
                })),
                alertas: [{ tipo: "Sistema", descricao: "A IA retornou HTML em vez de JSON estruturado.", sugestao: "Tente auditar novamente.", nivel: "MEDIA" }],
                ajustes: []
            };
        }

        // --- Parse do JSON Final ---
        if (!finalJson || !finalJson.relatorio_geral) {
            try {
                function cleanAndParseJSON(jsonStr) {
                    let escaped = "";
                    let inString = false, isEscaped = false;
                    for (let i = 0; i < jsonStr.length; i++) {
                        const char = jsonStr[i];
                        if (isEscaped) { escaped += char; isEscaped = false; }
                        else if (char === '\\') { escaped += char; isEscaped = true; }
                        else if (char === '"') { escaped += char; inString = !inString; }
                        else if ((char === '\n' || char === '\r') && inString) { escaped += char === '\n' ? '\\n' : '\\r'; }
                        else { escaped += char; }
                    }

                    // Corrige eventuais codificações quebradas de caracteres UTF-8 apenas se detectar bytes duplos
                    try {
                        if (/[\u00c0-\u00df][\u0080-\u00bf]/.test(escaped)) {
                            escaped = decodeURIComponent(escape(escaped));
                        }
                    } catch (e) {
                        // Se falhar, mantém a string como está
                    }

                    try {
                        return JSON.parse(escaped);
                    } catch (e) {
                        console.warn("[AI-CONTROLLER] Parse inicial falhou. Tentando reconstruir JSON truncado...");
                        let fixedStr = escaped.trim();
                        let openDelimiters = [];
                        inString = false;
                        isEscaped = false;

                        for (let i = 0; i < fixedStr.length; i++) {
                            const char = fixedStr[i];
                            if (isEscaped) { isEscaped = false; }
                            else if (char === '\\') { isEscaped = true; }
                            else if (char === '"') { inString = !inString; }
                            else if (!inString) {
                                if (char === '{' || char === '[') { openDelimiters.push(char); }
                                else if (char === '}') { if (openDelimiters.length > 0 && openDelimiters[openDelimiters.length - 1] === '{') openDelimiters.pop(); }
                                else if (char === ']') { if (openDelimiters.length > 0 && openDelimiters[openDelimiters.length - 1] === '[') openDelimiters.pop(); }
                            }
                        }
                        if (inString) fixedStr += '"';
                        if (fixedStr.endsWith(',')) fixedStr = fixedStr.slice(0, -1);
                        while (openDelimiters.length > 0) {
                            const open = openDelimiters.pop();
                            fixedStr = fixedStr.trim();
                            if (fixedStr.endsWith(',')) fixedStr = fixedStr.slice(0, -1);
                            if (open === '{') fixedStr += '}';
                            else if (open === '[') fixedStr += ']';
                        }
                        return JSON.parse(fixedStr);
                    }
                }

                if (accumulatedText.trim().startsWith('{')) {
                    finalJson = cleanAndParseJSON(accumulatedText.trim());
                } else {
                    const jsonStart = accumulatedText.indexOf('{');
                    const jsonEnd = accumulatedText.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        let potentialJson = accumulatedText.substring(jsonStart, jsonEnd + 1);
                        try {
                            finalJson = cleanAndParseJSON(potentialJson);
                        } catch (parseError) {
                            finalJson = cleanAndParseJSON(accumulatedText.substring(jsonStart));
                        }
                    } else if (jsonStart !== -1) {
                        finalJson = cleanAndParseJSON(accumulatedText.substring(jsonStart));
                    } else {
                        finalJson = cleanAndParseJSON(accumulatedText);
                    }
                }
            } catch (err) {
                console.error("[AI-CONTROLLER] Erro ao fazer parse do JSON final:", err);
                finalJson = {
                    relatorio_geral: `<p>Relatório gerado, mas houve erro ao processar o JSON estruturado.</p>`,
                    nota_final: 70,
                    total_orcamento: workspaceState.cover.budget || 0,
                    custos_administrativos_percentual: 0,
                    agentes: allAgentIds.map(id => ({
                        id,
                        nota: 70,
                        parecer: `<p>Falha no parse do JSON do agente.</p>`,
                        erros: [],
                        recomendacoes: []
                    })),
                    alertas: [{ tipo: "Sistema", descricao: "Erro no parse do JSON estruturado", sugestao: "Tente novamente", nivel: "MEDIA" }],
                    ajustes: []
                };
            }
        }

        // --- Atualizar UI com o Relatório Geral Sanitizado ---
        if (finalJson.relatorio_geral) {
            finalJson.relatorio_geral = this.sanitizeHTML(finalJson.relatorio_geral);
        }

        // Also sanitize individual agent parecer HTMLs
        if (Array.isArray(finalJson.agentes)) {
            finalJson.agentes.forEach(ag => {
                if (ag.parecer) {
                    ag.parecer = this.sanitizeHTML(ag.parecer);
                }
            });
        }

        if (analyticContent && finalJson.relatorio_geral) {
            analyticContent.innerHTML = finalJson.relatorio_geral;
        }

        // --- Transformar para o formato que o app.js espera ---
        return this._transformToAppFormat(finalJson, workspaceState);
    },

    // =====================================================================
    // TRANSFORMAÇÃO — Converte a resposta do Gemini no formato do app.js
    // =====================================================================
    _transformToAppFormat: function (geminiJson, workspaceState) {
        const agentesArray = geminiJson.agentes || [];
        const total = geminiJson.total_orcamento || workspaceState.cover.budget || 0;
        const adminPerc = geminiJson.custos_administrativos_percentual || 0;
        const notaFinal = geminiJson.nota_final || 70;
        const alertas = geminiJson.alertas || [];
        const ajustes = geminiJson.ajustes || [];

        // Mapear agentes[] para revisorAgentsResults{}
        const revisorAgentsResults = {};
        const agentIds = ['justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento', 'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica', 'monitoramento', 'compliance', 'sustentabilidade', 'rider'];

        agentIds.forEach(id => {
            const found = agentesArray.find(a => a.id === id);
            if (found) {
                revisorAgentsResults[id] = {
                    nota: found.nota || 70,
                    parecer: found.parecer || `<p>Análise concluída.</p>`
                };
            } else {
                revisorAgentsResults[id] = {
                    nota: notaFinal,
                    parecer: `<p>Este agente não retornou um parecer individualizado nesta rodada. Use "Analisar apenas este agente" para obter análise específica.</p>`
                };
            }
        });

        const CRITERIOS_MAP = {
            justificativa: { criterio: "1. Justificativa e Relevância", nota_maxima: 10 },
            objetivos: { criterio: "2. Objetivos (Geral e Específicos)", nota_maxima: 10 },
            metodologia: { criterio: "3. Metodologia e Plano de Trabalho", nota_maxima: 10 },
            cronograma: { criterio: "4. Cronograma Físico de Atividades", nota_maxima: 10 },
            orcamento: { criterio: "5. Orçamento e Planilha de Custos", nota_maxima: 10 },
            acessibilidade: { criterio: "6. Acessibilidade e Cotas", nota_maxima: 5 },
            publico: { criterio: "7. Público-Alvo e Perfil dos Beneficiários", nota_maxima: 5 },
            contrapartida: { criterio: "8. Contrapartida Social e Legado", nota_maxima: 5 },
            comunicacao: { criterio: "9. Plano de Comunicação e Divulgação", nota_maxima: 5 },
            ficha_tecnica: { criterio: "10. Ficha Técnica e Capacidade Operacional", nota_maxima: 5 },
            monitoramento: { criterio: "11. Plano de Monitoramento e Indicadores", nota_maxima: 10 },
            compliance: { criterio: "12. Compliance, Marcos Legais e Direitos", nota_maxima: 5 },
            sustentabilidade: { criterio: "13. Plano de Sustentabilidade e Mitigação", nota_maxima: 5 },
            rider: { criterio: "14. Rider Técnico e Necessidades Logísticas", nota_maxima: 5 }
        };

        let notaTecnicaCalculada = 0;
        const criterios = agentIds.map(id => {
            const meta = CRITERIOS_MAP[id];
            const agente = revisorAgentsResults[id];
            const nota_atribuida = Math.round((agente.nota / 100) * meta.nota_maxima);
            notaTecnicaCalculada += nota_atribuida;
            const agenteFull = agentesArray.find(a => a.id === id) || {};
            const justificativa = (agenteFull.erros && agenteFull.erros.length > 0)
                ? agenteFull.erros[0]
                : (agenteFull.recomendacoes && agenteFull.recomendacoes.length > 0 ? agenteFull.recomendacoes[0] : "Avaliado pelo Gemini.");

            return { criterio: meta.criterio, nota_maxima: meta.nota_maxima, nota_atribuida, justificativa };
        });

        // Garantir que a nota de priorização esteja entre 0 e 30
        let notaPriorizacaoValida = typeof geminiJson.nota_priorizacao === 'number'
            ? Math.min(30, Math.max(0, Math.round(geminiJson.nota_priorizacao)))
            : 0;

        if (geminiJson.nota_priorizacao === undefined) {
            const acessibilidadeNota = revisorAgentsResults['acessibilidade'] ? revisorAgentsResults['acessibilidade'].nota : 70;
            const publicoNota = revisorAgentsResults['publico'] ? revisorAgentsResults['publico'].nota : 70;
            notaPriorizacaoValida = Math.round((acessibilidadeNota * 0.15) + (publicoNota * 0.15));
        }

        const notaFinalCalculada = notaTecnicaCalculada + notaPriorizacaoValida;

        const auditoria = {
            nota_final: notaFinalCalculada,
            nota_tecnica: notaTecnicaCalculada,
            nota_priorizacao: notaPriorizacaoValida,
            relatorio_analitico: geminiJson.relatorio_geral || "",
            criterios,
            ajustes: ajustes.length > 0 ? ajustes : agentesArray
                .flatMap(a => (a.erros || []).map(e => ({ alteracao: e, fator: `Agente: ${a.id}` }))),
            alertas: alertas.length > 0 ? alertas : agentesArray
                .flatMap(a => (a.erros || []).map(e => ({
                    tipo: "Inconformidade",
                    descricao: e,
                    sugestao: (a.recomendacoes || [])[0] || "Revisar conforme o edital.",
                    nivel: a.nota < 70 ? "ALTA" : "MEDIA"
                })))
        };

        console.log(`[AI-CONTROLLER] Auditoria concluída. Nota final: ${notaFinalCalculada} | Total: R$ ${total.toLocaleString('pt-BR')} | Admin: ${adminPerc}%`);

        return { revisorAgentsResults, auditoria };
    }
};
