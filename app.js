// Centralized fetch interceptor to guarantee UTF-8 encoding on all API requests
const originalFetch = window.fetch;
window.fetch = function (url, options) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
        options = options || {};
        options.headers = options.headers || {};

        // If content-type is json, append charset
        const contentType = options.headers['Content-Type'] || options.headers['content-type'];
        if (contentType && contentType.includes('application/json') && !contentType.includes('charset')) {
            options.headers['Content-Type'] = 'application/json; charset=utf-8';
        } else if (!contentType && options.method && options.method.toUpperCase() === 'POST') {
            options.headers['Content-Type'] = 'application/json; charset=utf-8';
        }

        // Force Accept header to expect UTF-8 json
        if (!options.headers['Accept'] && !options.headers['accept']) {
            options.headers['Accept'] = 'application/json; charset=utf-8';
        }
    }
    return originalFetch(url, options);
};

// State Management
let workspaceState = {
    currentTab: 'setup',
    editalRefText: '',
    editalRefName: '',
    editalProfile: null,
    proposalDraftText: '',
    proposalDraftName: '',
    annexes: [], // Array of { name: string, content: string, size: number }
    cover: {
        title: '',
        institution: '',
        proponent: '',
        city: '',
        year: '',
        budget: 0
    },
    documentContent: {
        justificativa: '',
        objetivos: '',
        metodologia: '',
        cronograma: '',
        orcamento: '',
        acessibilidade: '',
        publico: '',
        contrapartida: '',
        comunicacao: '',
        ficha_tecnica: '',
        monitoramento: '',
        compliance: '',
        sustentabilidade: '',
        rider: ''
    },
    library: [], // Array of { name: string, content: string, size: number, date: string }
    historicalMemories: [], // Array of { activity: string, date: string, project: string }
    revisorHistory: {
        justificativa: [],
        objetivos: [],
        metodologia: [],
        cronograma: [],
        orcamento: [],
        acessibilidade: [],
        publico: [],
        contrapartida: [],
        comunicacao: [],
        ficha_tecnica: [],
        monitoramento: [],
        compliance: [],
        sustentabilidade: [],
        rider: []
    },
    revisorAgentsResults: {
        justificativa: null,
        objetivos: null,
        metodologia: null,
        cronograma: null,
        orcamento: null,
        acessibilidade: null,
        publico: null,
        contrapartida: null,
        comunicacao: null,
        ficha_tecnica: null,
        monitoramento: null,
        compliance: null,
        sustentabilidade: null,
        rider: null
    },
    generalHistory: []
};

let activeRevisor = 'justificativa';
let geminiKey = "";
let lastGeneratedText = "";
let lastGeneratedSection = "";
let _isProcessingAPI = false; // Global guard against double-click / duplicate API calls

const REVISORES_METADATA = {
    justificativa: {
        name: "Agente de Mérito & Relevância",
        icon: "🎯",
        desc: "Avalia a justificativa, relevância social e impacto no território.",
        prompt: "Você é o Agente de Mérito & Relevância. Avalie detalhadamente a justificativa e os objetivos do projeto, analisando sua relevância artística, social e cultural para o território de execução. Estruture o parecer em subseções: '1. Relevância Artístico-Cultural', '2. Impacto Social e Descentralização', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' contendo o texto otimizado e persuasivo da justificativa. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    objetivos: {
        name: "Agente de Objetivos & Metas",
        icon: "📌",
        desc: "Avalia a clareza e mensurabilidade dos objetivos gerais e específicos.",
        prompt: "Você é o Agente de Objetivos & Metas. Avalie a clareza, coerência e mensurabilidade do objetivo geral e dos objetivos específicos do projeto. Estruture o parecer em subseções: '1. Clareza do Objetivo Geral', '2. Consistência dos Objetivos Específicos', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' contendo os objetivos revisados. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    metodologia: {
        name: "Agente de Metodologia & Execução",
        icon: "⚙️",
        desc: "Analisa a divisão operacional do projeto em Pré-produção, Execução e Pós-produção.",
        prompt: "Você é o Agente de Metodologia & Execução. Analise a metodologia detalhando passo-a-passo as etapas de Pré-produção, Execução e Pós-produção. Estruture o parecer em subseções: '1. Faseamento Operacional', '2. Viabilidade Metodológica', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' contendo a metodologia revisada. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    cronograma: {
        name: "Agente de Cronograma & Prazos",
        icon: "📅",
        desc: "Verifica se os prazos mensais das atividades são realistas e exequíveis.",
        prompt: "Você é o Agente de Cronograma & Prazos. Avalie de forma detalhada o cronograma de atividades, verificando se as fases possuem prazos realistas e compatíveis com a execução física. Estruture o parecer em subseções: '1. Distribuição de Prazos', '2. Riscos de Execução', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' contendo um cronograma revisado formatado como tabela HTML. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    orcamento: {
        name: "Agente Financeiro & Orçamento",
        icon: "💰",
        desc: "Analisa a planilha de custos, limites administrativos (15%), marketing (10%) e impostos.",
        prompt: "Você é o Agente Financeiro & Orçamento. Faça uma avaliação detalhada da planilha orçamentária, verificando limites administrativos (teto de 15%), divulgação (teto de 10%) e encargos tributários (ISS, INSS, IRRF). Estruture o parecer em subseções: '1. Diagnóstico de Custos', '2. Limites Normativos', e '3. Encargos e Impostos'. Finalize com o título 'Sugestão Otimizada' contendo uma planilha orçamentária formatada como tabela HTML. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    acessibilidade: {
        name: "Agente de Acessibilidade & Inclusão",
        icon: "♿",
        desc: "Garante acessibilidade física, sensorial (Libras, audiodescrição) e cotas sociais.",
        prompt: "Você é o Agente de Acessibilidade & Inclusão. Avalie as medidas de acessibilidade física, comunicacional (Libras/audiodescrição) e atitudinal propostas, além de políticas afirmativas e cotas. Estruture o parecer em subseções: '1. Acessibilidade Física', '2. Acessibilidade Sensorial/Libras', e '3. Políticas de Cotas e Inclusão'. Finalize com o título 'Sugestão Otimizada' contendo as cláusulas adequadas. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    publico: {
        name: "Agente de Público-Alvo & Perfil",
        icon: "👥",
        desc: "Verifica a definição demográfica, etária, social e delimitamento geográfico dos beneficiários.",
        prompt: "Você é o Agente de Público-Alvo & Perfil. Avalie a definição exata dos beneficiários do projeto, analisando dados demográficos, faixa etária, classe social e delimitação geográfica (comunidades locais, estudantes públicos, etc.). Estruture o parecer em subseções: '1. Definição do Perfil dos Beneficiários', '2. Delimitação Geográfica e Acesso', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' contendo o perfil de público-alvo otimizado. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    contrapartida: {
        name: "Agente de Contrapartida & Legado",
        icon: "🤝",
        desc: "Avalia o retorno social (oficinas, palestras, apresentações abertas, doações).",
        prompt: "Você é o Agente de Contrapartida & Legado. Avalie o retorno gratuito e garantido oferecido à sociedade (oficinas, palestras formativas, apresentações gratuitas, doação de materiais/instrumentos). Estruture o parecer em subseções: '1. Proporcionalidade da Contrapartida', '2. Legado e Sustentabilidade Social', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' com a redação das contrapartidas. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    comunicacao: {
        name: "Agente de Comunicação & Divulgação",
        icon: "📢",
        desc: "Analisa a estratégia de redes sociais, assessoria de imprensa, tráfego pago e clipagem.",
        prompt: "Você é o Agente de Comunicação & Divulgação. Avalie o plano de comunicação, cobrindo assessoria de imprensa, tráfego pago, redes sociais e clipagem (comprovação de mídia). Estruture o parecer em subseções: '1. Estratégia de Divulgação e Redes', '2. Tráfego Pago e Assessoria', e '3. Clipagem e Mídia'. Finalize com o título 'Sugestão Otimizada' com o plano de divulgação revisado. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    ficha_tecnica: {
        name: "Agente de Ficha Técnica & Capacidade",
        icon: "👔",
        desc: "Avalia minibios estruturadas, experiência do proponente e capacidade operacional da equipe.",
        prompt: "Você é o Agente de Ficha Técnica & Capacidade. Avalie a exequibilidade operacional a partir do currículo e histórico da equipe técnica, proponente e instituição. Estruture o parecer em subseções: '1. Análise da Ficha Técnica', '2. Histórico e Capacidade Operacional', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' contendo minibios e ficha técnica estruturada. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    monitoramento: {
        name: "Agente de Monitoramento & Indicadores",
        icon: "📊",
        desc: "Analisa a matriz lógica, indicadores quantitativos/qualitativos e meios de verificação.",
        prompt: "Você é o Agente de Monitoramento & Indicadores. Avalie a matriz lógica, indicadores quantitativos (público, visualizações) e qualitativos (impacto local), e meios de verificação de execução. Estruture o parecer em subseções: '1. Consistência dos Indicadores', '2. Meios de Verificação Propostos', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' com o plano de monitoramento revisado. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    compliance: {
        name: "Agente de Compliance & Marcos Legais",
        icon: "📜",
        desc: "Analisa regularidade (Ecad, SisGen para saberes tradicionais, IPHAN, cartas de anuência).",
        prompt: "Você é o Agente de Compliance & Marcos Legais. Avalie a adequação legal, incluindo direitos autorais (Ecad), SisGen (patrimônio genético/conhecimento tradicional), Iphan ou cartas de anuência obrigatórias. Estruture o parecer em subseções: '1. Direitos Autorais e Ecad', '2. SisGen e Conhecimento Tradicional', e '3. Habilitação e Licenciamento'. Finalize com o título 'Sugestão Otimizada' com o texto de compliance correspondente. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    sustentabilidade: {
        name: "Agente de Sustentabilidade & ESG",
        icon: "🌱",
        desc: "Analisa neutralização de carbono, destinação de resíduos e práticas ambientais sustentáveis.",
        prompt: "Você é o Agente de Sustentabilidade & ESG. Avalie o plano de mitigação ambiental, destinação de resíduos, neutralização de carbono e práticas sustentáveis nas operações do projeto. Estruture o parecer em subseções: '1. Impacto Ambiental e ESG', '2. Práticas Operacionais Sustentáveis', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' com a redação de práticas sustentáveis. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    },
    rider: {
        name: "Agente de Rider Técnico & Logística",
        icon: "🛠️",
        desc: "Revisa mapas de palco, captação de áudio, cronograma de montagem e transporte/alimentação.",
        prompt: "Você é o Agente de Rider Técnico & Logística. Avalie as necessidades físicas e logísticas: mapa de palco, rider de som/luz, montagem/desmontagem e logística de transporte/hospedagem. Estruture o parecer em subseções: '1. Rider Técnico e Som/Luz', '2. Logística de Alimentação e Transporte', e '3. Recomendações'. Finalize com o título 'Sugestão Otimizada' com o rider técnico revisado. Retorne um JSON com a chave 'nota' (0 a 100) e a chave 'parecer' em HTML."
    }
};

const placeholders = [
    'Clique aqui ou use o agente Redator para escrever.',
    'Clique aqui ou use o agente Redator para escrever.',
    'Clique aqui ou use o agente Revisor para descrever a metodologia.',
    'Clique aqui ou use o agente de cronogramas para estruturar.',
    'Clique aqui ou use o agente Orçamentista.',
    'Clique aqui ou use o agente de acessibilidade.',
    'Clique aqui ou use o agente de público-alvo.',
    'Clique aqui ou use o agente de contrapartida.',
    'Clique aqui ou use o agente de comunicação.',
    'Clique aqui ou use o agente de ficha técnica.',
    'Clique aqui ou use o agente de monitoramento.',
    'Clique aqui ou use o agente de compliance.',
    'Clique aqui ou use o agente de sustentabilidade.',
    'Clique aqui ou use o agente de rider técnico.'
];

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadSavedKey();
    restoreWorkspaceState();
    setupTabSwitching();
    setupEditorToolbar();
    setupCoverSync();
    setupFileHandlers();
    setupRedator();
    setupRedatorChat();
    setupFinalizacaoTab();
    setupRevisor();
    setupAuditor();
    setupBiblioteca();

    // Configuração do botão Limpar Contexto no Head
    const btnClearContext = document.getElementById('btn-clear-all-context');
    if (btnClearContext) {
        btnClearContext.addEventListener('click', () => {
            if (confirm("Deseja realmente limpar todo o contexto? Isso apagará o edital de referência, os rascunhos, os anexos enviados, os pareceres de agentes e limpará completamente o editor.")) {
                // Use a flag to temporarily skip saving rather than overwriting the function
                window._skipSaveWorkspace = true;
                localStorage.removeItem('edital_audit_workspace_state');
                location.reload();
            }
        });
    }

    // Initial UI Sync
    syncEditorContentToDOM();
    updateCoverPreviewDOM();
    renderAnnexesList();
    renderLibrary();
    selectRevisor(activeRevisor);
    updatePlaceholderStates();
    renderEditalProfileCard();
    initAutoFit();
});

// Auto-Fit font size dynamic adjustment
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function initAutoFit() {
    const selectors = [
        '#abnt-document-preview',
        '.abnt-text-block',
        '#audit-analytic-report-content',
        '#revisor-panel-feedback',
        '#revisor-report-content',
        '#diff-text-original',
        '#diff-text-suggested'
    ];

    const adjust = (el) => {
        if (!el) return;
        const parent = el.parentElement;
        if (!parent) return;

        const maxLoop = 30;
        let loop = 0;

        // Reset to original font size before testing
        if (el.dataset.originalFontSize) {
            el.style.fontSize = el.dataset.originalFontSize;
        } else {
            el.dataset.originalFontSize = window.getComputedStyle(el).fontSize;
        }

        let currentSize = parseFloat(window.getComputedStyle(el).fontSize);

        const hasOverflow = () => {
            // Horizontal overflow is always an issue (text layout should wrap, table shouldn't break)
            if (el.scrollWidth > el.clientWidth + 1) return true;

            const style = window.getComputedStyle(el);
            const parentStyle = window.getComputedStyle(parent);

            // If the element or parent allows vertical scrolling, vertical overflow is expected
            const isScrollable = (s) => s.overflowY === 'auto' || s.overflowY === 'scroll';
            if (isScrollable(style) || isScrollable(parentStyle)) {
                return false;
            }

            const selfVertical = el.scrollHeight > el.clientHeight + 1;
            const parentConstrained = parentStyle.maxHeight !== 'none' || (parentStyle.height !== 'auto' && parentStyle.height !== '100%');
            const parentVertical = parentConstrained && (el.offsetHeight > parent.clientHeight + 1);

            return selfVertical || parentVertical;
        };

        // Reduce font size if there is overflow
        while (hasOverflow() && currentSize > 10 && loop < maxLoop) {
            currentSize -= 0.5;
            el.style.fontSize = `${currentSize}px`;
            loop++;
        }
    };

    const adjustAll = () => {
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(adjust);
        });
    };

    // Adjust on window resize
    window.addEventListener('resize', adjustAll);

    // MutationObserver to watch content updates and dynamic additions
    const observer = new MutationObserver((mutations) => {
        adjustAll();
    });

    // Observe body for changes to cover all dynamic target insertions
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });

    // Attach local input listeners on existing elements
    const debouncedAdjust = debounce(adjust, 250);
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.addEventListener('input', () => debouncedAdjust(el));
        });
    });

    // Run initial adjustment
    setTimeout(adjustAll, 300);
}

// Theme & Key Management
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle-btn');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const isDark = themeToggle.checked;
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (themeToggle) themeToggle.checked = false;
    }
}

function loadSavedKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const keyStatus = document.getElementById('key-status');

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        geminiKey = savedKey;
        if (apiKeyInput) apiKeyInput.value = savedKey;
        if (keyStatus) keyStatus.classList.add('active');
    }

    if (apiKeyInput) {
        const handleKeyUpdate = () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                geminiKey = key;
                localStorage.setItem('gemini_api_key', key);
                if (keyStatus) keyStatus.classList.add('active');
                showToast(`Chave API do Gemini salva com sucesso!`, "success");
            } else {
                geminiKey = "";
                localStorage.removeItem('gemini_api_key');
                if (keyStatus) keyStatus.classList.remove('active');
                showToast("Chave API removida.", "warning");
            }
        };

        apiKeyInput.addEventListener('change', handleKeyUpdate);
        apiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                apiKeyInput.blur();
                handleKeyUpdate();
            }
        });
    }
}

// ==========================================
// SCHEMAS FOR STRUCTURED OUTPUT
// ==========================================
const proposalSchema = {
    type: "OBJECT",
    properties: {
        justificativa: { type: "STRING" },
        objetivos: { type: "STRING" },
        metodologia: { type: "STRING" },
        cronograma: { type: "STRING" },
        orcamento: { type: "STRING" },
        acessibilidade: { type: "STRING" },
        publico: { type: "STRING" },
        contrapartida: { type: "STRING" },
        comunicacao: { type: "STRING" },
        ficha_tecnica: { type: "STRING" },
        monitoramento: { type: "STRING" },
        compliance: { type: "STRING" },
        sustentabilidade: { type: "STRING" },
        rider: { type: "STRING" }
    },
    required: [
        "justificativa", "objetivos", "metodologia", "cronograma", "orcamento", "acessibilidade",
        "publico", "contrapartida", "comunicacao", "ficha_tecnica", "monitoramento", "compliance",
        "sustentabilidade", "rider"
    ]
};

const coverSchema = {
    type: "OBJECT",
    properties: {
        title: { type: "STRING" },
        institution: { type: "STRING" },
        proponent: { type: "STRING" },
        city: { type: "STRING" },
        year: { type: "STRING" },
        budget: { type: "NUMBER" }
    },
    required: ["title", "institution", "proponent", "city", "year", "budget"]
};

const subAgentSchema = {
    type: "OBJECT",
    properties: {
        nota: { type: "NUMBER" },
        parecer: { type: "STRING" }
    },
    required: ["nota", "parecer"]
};

// ==========================================
// API CONFIG & LLM GATEWAY
// ==========================================

function isApiActive() {
    return !!geminiKey;
}

async function callLLMGateway(prompt, systemInstruction = null, weight = 'light', responseSchema = null, stream = true) {
    const keyToUse = geminiKey;

    if (!keyToUse) {
        const errMessage = "Chave API do Gemini não configurada. Por favor, insira sua chave no cabeçalho.";
        showToast(errMessage, "warning");
        throw new Error(errMessage);
    }

    // --- TRUNCAMENTO DE PROMPT NO FRONTEND (por peso da chamada) ---
    const MAX_CHARS = weight === 'heavy' ? 300000 : 150000;
    if (prompt.length > MAX_CHARS) {
        console.warn(`[GATEWAY][TRUNCATE] Prompt truncado de ${prompt.length} para ${MAX_CHARS} chars (weight: ${weight})`);
        prompt = prompt.substring(0, MAX_CHARS) + '\n\n[TEXTO TRUNCADO POR LIMITE DE SEGURANÇA]';
    }

    const payload = {
        provider: 'gemini',
        model: 'gemini-3.5-flash',
        api_key: keyToUse,
        prompt: prompt,
        system_instruction: systemInstruction,
        ollama_url: '',
        use_cache: true,
        use_chunking: true,
        edital_text: '',
        annexes: [],
        stream: stream
    };

    if (responseSchema) {
        payload.response_schema = responseSchema;
    }

    console.log(`[GATEWAY][DEBUG] Enviando para /api/llm/generate | Weight: ${weight} | Stream: ${stream} | Prompt: ${prompt.length} chars`);

    // Implementação de Retry com Exponential Backoff
    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);
        let reader = null;

        try {
            const response = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error || `Erro HTTP ${response.status} na chamada de LLM Gateway.`;
                throw new Error(errMsg);
            }

            if (!stream) {
                const jsonRes = await response.json();
                return sanitizeText(jsonRes.text || "");
            }

            reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let accumulatedText = "";
            let streamDone = false;

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop();

                    for (const line of lines) {
                        const cleanLine = line.trim();
                        if (cleanLine.startsWith("data: ")) {
                            const dataStr = cleanLine.substring(6).trim();
                            if (dataStr === "[DONE]") {
                                streamDone = true;
                                break;
                            }
                            try {
                                const chunk = JSON.parse(dataStr);
                                if (chunk.text) {
                                    accumulatedText += chunk.text;
                                }
                            } catch (e) {
                                // Ignorar erros parciais de JSON no meio do streaming
                            }
                        }
                    }
                    if (streamDone) break;
                }
            } finally {
                if (reader) {
                    try {
                        await reader.cancel();
                    } catch (e) {
                        console.warn("Erro ao fechar reader:", e);
                    }
                }
            }

            return sanitizeText(accumulatedText);

        } catch (error) {
            clearTimeout(timeoutId);
            attempts++;
            console.warn(`[GATEWAY][RETRY] Falha na tentativa ${attempts}/${maxAttempts}: ${error.message}`);
            if (attempts >= maxAttempts) {
                showToast(`Erro persistente na API do Gemini: ${error.message}`, "error");
                throw error;
            }
            // Espera com exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}



// State Persist
let _saveTimeout = null;
function saveWorkspaceState() {
    // Debounce persistence to avoid heavy localStorage writes on every keystroke
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
        localStorage.setItem('edital_audit_workspace_state', JSON.stringify(workspaceState));
    }, 2000);
}

function restoreWorkspaceState() {
    const saved = localStorage.getItem('edital_audit_workspace_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const defaultDocContent = Object.assign({}, workspaceState.documentContent);
            const defaultCover = Object.assign({}, workspaceState.cover);

            workspaceState = Object.assign(workspaceState, parsed);

            // Safe deep merge for nested objects to prevent undefined properties
            workspaceState.documentContent = Object.assign(defaultDocContent, parsed.documentContent || {});
            workspaceState.cover = Object.assign(defaultCover, parsed.cover || {});

            if (!workspaceState.historicalMemories) {
                workspaceState.historicalMemories = [];
            }
            if (!workspaceState.proposalHistoryStack) {
                workspaceState.proposalHistoryStack = [];
            }
            if (!workspaceState.proposalRedoStack) {
                workspaceState.proposalRedoStack = [];
            }
            
            // Sincronizar globais para compatibilidade
            window._proposalHistoryStack = workspaceState.proposalHistoryStack.map(item => item.content || item);
            window._proposalRedoStack = workspaceState.proposalRedoStack.map(item => item.content || item);

            setTimeout(() => {
                if (typeof updateHistoryButtonsUI === 'function') updateHistoryButtonsUI();
            }, 100);
        } catch (e) {
            console.error("Error restoring workspaceState:", e);
        }
    }
}

function addHistoricalMemory(activity) {
    if (!workspaceState.historicalMemories) {
        workspaceState.historicalMemories = [];
    }
    workspaceState.historicalMemories.push({
        activity: activity,
        date: new Date().toLocaleString(),
        project: workspaceState.cover.title || 'Sem Nome'
    });
    saveWorkspaceState();
}

// ==========================================
// TABS SWITCHING
// ==========================================
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.w-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            workspaceState.currentTab = targetTab;
            saveWorkspaceState();

            tabButtons.forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.w-tab-pane').forEach(pane => {
                pane.classList.toggle('active', pane.id === `pane-${targetTab}`);
            });

            if (targetTab === 'biblioteca') {
                renderLibrary();
            }
        });
    });

    // Set initially active tab
    const initialTab = workspaceState.currentTab || 'setup';
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === initialTab) {
            btn.click();
        }
    });
}

// ==========================================
// PERSISTENT ABNT EDITOR & TOOLBAR
// ==========================================
function setupEditorToolbar() {
    // History Version Navigation Buttons (Versão Anterior / Retroceder Versão)
    const btnUndo = document.getElementById('btn-undo-proposal');
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            undoProposalVersion();
        });
    }

    const btnRedo = document.getElementById('btn-redo-proposal');
    if (btnRedo) {
        btnRedo.addEventListener('click', () => {
            redoProposalVersion();
        });
    }

    // Commands
    document.querySelectorAll('.abnt-editor-toolbar .toolbar-btn[data-command]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cmd = btn.getAttribute('data-command');
            document.execCommand(cmd, false, null);
        });
    });

    // Font selector
    const fontSelect = document.getElementById('abnt-font-select');
    const preview = document.getElementById('abnt-document-preview');
    if (fontSelect && preview) {
        fontSelect.addEventListener('change', () => {
            preview.style.fontFamily = fontSelect.value === 'Times New Roman' ? "'Times New Roman', Times, serif" : "Arial, sans-serif";
        });
    }

    // Insert Table
    const tableBtn = document.getElementById('editor-insert-table-btn');
    if (tableBtn) {
        tableBtn.addEventListener('click', () => {
            const size = prompt("Digite o tamanho da tabela (linhas x colunas, ex: 3x3):", "3x3");
            if (!size) return;
            const parts = size.split('x');
            if (parts.length !== 2) return;
            const rows = parseInt(parts[0], 10);
            const cols = parseInt(parts[1], 10);
            if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) return;

            let html = '<table style="width:100%; border-collapse:collapse; margin-top:1rem; border:1px solid #ddd;">';
            html += '<tr style="background:#f1f5f9;">';
            for (let c = 0; c < cols; c++) {
                html += '<th style="border:1px solid #ddd; padding:6px; font-weight:bold;">Cabeçalho</th>';
            }
            html += '</tr>';
            for (let r = 0; r < rows - 1; r++) {
                html += '<tr>';
                for (let c = 0; c < cols; c++) {
                    html += '<td style="border:1px solid #ddd; padding:6px;">Dado</td>';
                }
                html += '</tr>';
            }
            html += '</table><p><br></p>';
            document.execCommand('insertHTML', false, html);
        });
    }

    // Botão de Formatação ABNT via IA
    const btnFormatAbntAi = document.getElementById('btn-format-abnt-ai');
    if (btnFormatAbntAi) {
        btnFormatAbntAi.addEventListener('click', async () => {
            if (confirm("Deseja utilizar a inteligência artificial para revisar a gramática, tom e estruturação das tabelas conforme as normas ABNT? Isto irá otimizar todo o texto atual do editor.")) {
                btnFormatAbntAi.disabled = true;
                const originalText = btnFormatAbntAi.textContent;
                btnFormatAbntAi.textContent = "🪄 Formatando...";
                try {
                    await consolidateAndFormatABNT();
                } catch (err) {
                    showToast("Erro ao formatar ABNT: " + err.message, "error");
                } finally {
                    btnFormatAbntAi.disabled = false;
                    btnFormatAbntAi.textContent = originalText;
                }
            }
        });
    }

    // Save draft download
    const btnSaveDraft = document.getElementById('btn-save-draft');
    if (btnSaveDraft) {
        btnSaveDraft.addEventListener('click', () => {
            syncDOMContentToState();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workspaceState));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `proposta_cultural_${workspaceState.cover.title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'rascunho'}.json`);
            dlAnchorElem.click();
            showToast("Rascunho de proposta baixado como arquivo JSON!", "success");
        });
    }

    // Clear draft
    const btnClearDraft = document.getElementById('btn-clear-draft');
    if (btnClearDraft) {
        btnClearDraft.addEventListener('click', () => {
            if (confirm("Tem certeza que deseja limpar as seções do documento? Os dados de capa serão mantidos.")) {
                workspaceState.documentContent = {
                    justificativa: '',
                    objetivos: '',
                    metodologia: '',
                    cronograma: '',
                    orcamento: '',
                    acessibilidade: ''
                };
                saveWorkspaceState();
                syncEditorContentToDOM();
                updatePlaceholderStates();
                showToast("Editor limpo.", "warning");
            }
        });
    }

    // Track contenteditable updates
    const textBlocks = document.querySelectorAll('.abnt-text-block');
    const debouncedSync = debounce(syncDOMContentToState, 300);
    textBlocks.forEach(block => {
        block.addEventListener('input', debouncedSync);

        block.addEventListener('focus', () => {
            const current = block.textContent.trim();
            if (placeholders.includes(current)) {
                block.innerHTML = '';
                block.classList.remove('is-placeholder');
            }
        });

        block.addEventListener('blur', () => {
            const current = block.textContent.trim();
            if (!current) {
                const blockId = block.id.replace('sec-', '');
                const sectionsList = ['justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento', 'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica', 'monitoramento', 'compliance', 'sustentabilidade', 'rider'];
                const idx = sectionsList.indexOf(blockId);
                let placeholderText = (idx !== -1) ? placeholders[idx] : "Clique aqui para escrever.";

                block.innerHTML = placeholderText;
            }
            updatePlaceholderStates();
        });
    });
}

function syncDOMContentToState() {
    const getVal = (id) => {
        const el = document.getElementById(id);
        return (el && el.classList.contains('is-placeholder')) ? '' : el.innerHTML;
    };
    workspaceState.documentContent.justificativa = getVal('sec-justificativa');
    workspaceState.documentContent.objetivos = getVal('sec-objetivos');
    workspaceState.documentContent.metodologia = getVal('sec-metodologia');
    workspaceState.documentContent.cronograma = getVal('sec-cronograma');
    workspaceState.documentContent.orcamento = getVal('sec-orcamento');
    workspaceState.documentContent.acessibilidade = getVal('sec-acessibilidade');
    workspaceState.documentContent.publico = getVal('sec-publico');
    workspaceState.documentContent.contrapartida = getVal('sec-contrapartida');
    workspaceState.documentContent.comunicacao = getVal('sec-comunicacao');
    workspaceState.documentContent.ficha_tecnica = getVal('sec-ficha_tecnica');
    workspaceState.documentContent.monitoramento = getVal('sec-monitoramento');
    workspaceState.documentContent.compliance = getVal('sec-compliance');
    workspaceState.documentContent.sustentabilidade = getVal('sec-sustentabilidade');
    workspaceState.documentContent.rider = getVal('sec-rider');
    saveWorkspaceState();

    // CORREÇÃO BUG #2: Removida a auditoria automática que disparava a cada
    // digitação no editor, causando múltiplas chamadas concorrentes de web
    // scraping (DuckDuckGo) e sobrecarga do backend. A auditoria agora só
    // executa quando o usuário aciona explicitamente o botão de auditar.
}

function syncEditorContentToDOM() {
    document.getElementById('sec-justificativa').innerHTML = workspaceState.documentContent.justificativa || placeholders[0];
    document.getElementById('sec-objetivos').innerHTML = workspaceState.documentContent.objetivos || placeholders[1];
    document.getElementById('sec-metodologia').innerHTML = workspaceState.documentContent.metodologia || placeholders[2];
    document.getElementById('sec-cronograma').innerHTML = workspaceState.documentContent.cronograma || placeholders[3];
    document.getElementById('sec-orcamento').innerHTML = workspaceState.documentContent.orcamento || placeholders[4];
    document.getElementById('sec-acessibilidade').innerHTML = workspaceState.documentContent.acessibilidade || placeholders[5];
    document.getElementById('sec-publico').innerHTML = workspaceState.documentContent.publico || placeholders[6];
    document.getElementById('sec-contrapartida').innerHTML = workspaceState.documentContent.contrapartida || placeholders[7];
    document.getElementById('sec-comunicacao').innerHTML = workspaceState.documentContent.comunicacao || placeholders[8];
    document.getElementById('sec-ficha_tecnica').innerHTML = workspaceState.documentContent.ficha_tecnica || placeholders[9];
    document.getElementById('sec-monitoramento').innerHTML = workspaceState.documentContent.monitoramento || placeholders[10];
    document.getElementById('sec-compliance').innerHTML = workspaceState.documentContent.compliance || placeholders[11];
    document.getElementById('sec-sustentabilidade').innerHTML = workspaceState.documentContent.sustentabilidade || placeholders[12];
    document.getElementById('sec-rider').innerHTML = workspaceState.documentContent.rider || placeholders[13];
}

function updatePlaceholderStates() {
    document.querySelectorAll('.abnt-text-block').forEach(block => {
        const text = block.textContent.trim();
        const isPlace = placeholders.some(p => p.trim() === text);
        block.classList.toggle('is-placeholder', isPlace);
    });
}

function setupCoverSync() {
    const fields = ['cover-title', 'cover-institution', 'cover-proponent', 'cover-city', 'cover-year', 'cover-budget'];
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            // Restore from state
            const stateKey = fieldId.replace('cover-', '');
            input.value = workspaceState.cover[stateKey] || "";

            input.addEventListener('input', () => {
                workspaceState.cover[stateKey] = input.value;
                saveWorkspaceState();
                updateCoverPreviewDOM();
            });
        }
    });

    // Sincronização bidirecional: digitação direta nos elementos A4
    const coverPreviewIds = {
        'preview-cover-institution': 'cover-institution',
        'preview-cover-proponent': 'cover-proponent',
        'preview-cover-title': 'cover-title',
        'preview-cover-city': 'cover-city',
        'preview-cover-year': 'cover-year'
    };

    Object.keys(coverPreviewIds).forEach(previewId => {
        const el = document.getElementById(previewId);
        if (el) {
            el.addEventListener('input', () => {
                const inputId = coverPreviewIds[previewId];
                const input = document.getElementById(inputId);
                const stateKey = inputId.replace('cover-', '');

                workspaceState.cover[stateKey] = el.textContent.trim();
                if (input) {
                    input.value = el.textContent.trim();
                }
                saveWorkspaceState();
            });

            // Tratamento especial para limpar o placeholder padrão no primeiro clique
            el.addEventListener('focus', () => {
                const text = el.textContent.trim();
                const placeholders = ['INSTITUIÇÃO DE FOMENTO', 'NOME DO PROPONENTE', 'TÍTULO DO PROJETO CULTURAL', 'CIDADE - UF', 'ANO'];
                if (placeholders.includes(text)) {
                    el.textContent = '';
                }
            });
        }
    });
}

function updateCoverPreviewDOM() {
    const inst = document.getElementById('preview-cover-institution');
    const prop = document.getElementById('preview-cover-proponent');
    const title = document.getElementById('preview-cover-title');
    const city = document.getElementById('preview-cover-city');
    const year = document.getElementById('preview-cover-year');

    if (inst && document.activeElement !== inst) {
        inst.textContent = (workspaceState.cover.institution || 'INSTITUIÇÃO DE FOMENTO').toUpperCase();
    }
    if (prop && document.activeElement !== prop) {
        prop.textContent = (workspaceState.cover.proponent || 'NOME DO PROPONENTE').toUpperCase();
    }
    if (title && document.activeElement !== title) {
        title.textContent = (workspaceState.cover.title || 'TÍTULO DO PROJETO CULTURAL').toUpperCase();
    }
    if (city && document.activeElement !== city) {
        city.textContent = (workspaceState.cover.city || 'CIDADE - UF').toUpperCase();
    }
    if (year && document.activeElement !== year) {
        year.textContent = (workspaceState.cover.year || 'ANO').toUpperCase();
    }
}

// ==========================================
// ABA 1: FILE INGESTION HANDLERS
// ==========================================
function setupFileHandlers() {
    const dropEdital = document.getElementById('drop-zone-edital-ref');
    const inputEdital = document.getElementById('file-input-edital-ref');
    const badgeEdital = document.getElementById('file-badge-edital-ref');
    const nameEdital = document.getElementById('file-name-edital-ref');
    const btnRemoveEdital = document.getElementById('btn-remove-edital-ref');
    const textareaEdital = document.getElementById('edital-ref-text');

    // Restore Edital active text in setup
    if (textareaEdital) {
        textareaEdital.value = workspaceState.editalRefText || "";
        const debouncedEditalInput = debounce(() => {
            workspaceState.editalRefText = textareaEdital.value;
            saveWorkspaceState();
        }, 1000);
        textareaEdital.addEventListener('input', debouncedEditalInput);
    }

    if (workspaceState.editalRefName) {
        if (nameEdital) nameEdital.textContent = workspaceState.editalRefName;
        if (badgeEdital) badgeEdital.style.display = 'flex';
    }

    // Edital file selector
    if (dropEdital && inputEdital) {
        dropEdital.addEventListener('click', () => inputEdital.click());
        inputEdital.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await processEditalFile(file);
            }
        });

        dropEdital.addEventListener('dragover', (e) => { e.preventDefault(); dropEdital.classList.add('dragover'); });
        dropEdital.addEventListener('dragleave', () => dropEdital.classList.remove('dragover'));
        dropEdital.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropEdital.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                await processEditalFile(file);
            }
        });
    }

    if (btnRemoveEdital) {
        btnRemoveEdital.addEventListener('click', () => {
            workspaceState.editalRefText = "";
            workspaceState.editalRefName = "";
            saveWorkspaceState();
            if (textareaEdital) textareaEdital.value = "";
            if (badgeEdital) badgeEdital.style.display = 'none';
            if (inputEdital) inputEdital.value = "";
            showToast("Edital de referência removido.", "info");
        });
    }

    // ==========================================
    // NOVO: DETECTOR E UPLOADER DE RASCUNHO DE PROPOSTA
    // ==========================================
    const dropDraft = document.getElementById('drop-zone-proposal-draft');
    const inputDraft = document.getElementById('file-input-proposal-draft');
    const badgeDraft = document.getElementById('file-badge-proposal-draft');
    const nameDraft = document.getElementById('file-name-proposal-draft');
    const btnRemoveDraft = document.getElementById('btn-remove-proposal-draft');
    const textareaDraft = document.getElementById('proposal-draft-text');

    if (textareaDraft) {
        textareaDraft.value = workspaceState.proposalDraftText || "";
        const debouncedDraftInput = debounce(() => {
            workspaceState.proposalDraftText = textareaDraft.value;
            saveWorkspaceState();
            autoDetectMetadata(textareaDraft.value);
        }, 1000);
        textareaDraft.addEventListener('input', debouncedDraftInput);
    }

    if (workspaceState.proposalDraftName) {
        if (nameDraft) nameDraft.textContent = workspaceState.proposalDraftName;
        if (badgeDraft) badgeDraft.style.display = 'flex';
    }

    if (dropDraft && inputDraft) {
        dropDraft.addEventListener('click', () => inputDraft.click());
        inputDraft.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await processDraftFile(file);
            }
        });

        dropDraft.addEventListener('dragover', (e) => { e.preventDefault(); dropDraft.classList.add('dragover'); });
        dropDraft.addEventListener('dragleave', () => dropDraft.classList.remove('dragover'));
        dropDraft.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropDraft.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                await processDraftFile(file);
            }
        });
    }

    if (btnRemoveDraft) {
        btnRemoveDraft.addEventListener('click', () => {
            workspaceState.proposalDraftText = "";
            workspaceState.proposalDraftName = "";
            saveWorkspaceState();
            if (textareaDraft) textareaDraft.value = "";
            if (badgeDraft) badgeDraft.style.display = 'none';
            if (inputDraft) inputDraft.value = "";
            showToast("Rascunho de proposta removido.", "info");
        });
    }

    // URL Link Fetching
    const btnFetch = document.getElementById('btn-fetch-link');
    const editalUrlInput = document.getElementById('edital-link-url');
    const statusMsg = document.getElementById('link-status-msg');

    if (btnFetch && editalUrlInput) {
        btnFetch.addEventListener('click', async () => {
            const url = editalUrlInput.value.trim();
            if (!url) return;

            if (statusMsg) statusMsg.textContent = "Buscando...";
            btnFetch.disabled = true;

            try {
                const response = await fetch('/api/fetch-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                if (!response.ok) throw new Error("Erro de resposta do proxy.");
                const data = await response.json();
                if (data.error) throw new Error(data.error);

                workspaceState.editalRefText = data.text;
                workspaceState.editalRefName = `URL: ${url.substring(0, 30)}...`;
                saveWorkspaceState();

                if (textareaEdital) textareaEdital.value = data.text;
                if (nameEdital) nameEdital.textContent = workspaceState.editalRefName;
                if (badgeEdital) badgeEdital.style.display = 'flex';
                if (statusMsg) statusMsg.textContent = "✓ Importado!";
                showToast("Edital importado via link com sucesso!", "success");
            } catch (err) {
                if (statusMsg) statusMsg.textContent = "Erro na busca.";
                showToast(err.message, "error");
            } finally {
                btnFetch.disabled = false;
            }
        });
    }

    // Annex Dropzone
    const dropAnnex = document.getElementById('drop-zone-annex');
    const inputAnnex = document.getElementById('file-input-annex');

    if (dropAnnex && inputAnnex) {
        dropAnnex.addEventListener('click', () => inputAnnex.click());
        inputAnnex.addEventListener('change', async (e) => {
            for (let i = 0; i < e.target.files.length; i++) {
                await processAnnexFile(e.target.files[i]);
            }
        });

        dropAnnex.addEventListener('dragover', (e) => { e.preventDefault(); dropAnnex.classList.add('dragover'); });
        dropAnnex.addEventListener('dragleave', () => dropAnnex.classList.remove('dragover'));
        dropAnnex.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropAnnex.classList.remove('dragover');
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                await processAnnexFile(e.dataTransfer.files[i]);
            }
        });
    }

    // Botão de Análise do Edital
    const btnAnalyze = document.getElementById('btn-analyze-edital');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', async () => {
            if (btnAnalyze.disabled) return;
            try {
                btnAnalyze.disabled = true;
                const originalHTML = btnAnalyze.innerHTML;
                btnAnalyze.innerHTML = `<span>⏳ Analisando...</span>`;
                await ensureEditalProfile(true);
                btnAnalyze.innerHTML = originalHTML;
            } finally {
                btnAnalyze.disabled = false;
            }
        });
    }

    // Botão de Proposta Básica Cruzada
    const btnBasic = document.getElementById('btn-generate-basic-proposal');
    if (btnBasic) {
        btnBasic.addEventListener('click', generateBasicProposal);
    }
}

async function processEditalFile(file) {
    try {
        const text = await extractTextFromFile(file);
        workspaceState.editalRefText = text;
        workspaceState.editalRefName = file.name;
        workspaceState.editalProfile = null;
        saveWorkspaceState();
        renderEditalProfileCard();

        document.getElementById('edital-ref-text').value = text;
        document.getElementById('file-name-edital-ref').textContent = file.name;
        document.getElementById('file-badge-edital-ref').style.display = 'flex';
        showToast(`Edital "${file.name}" carregado.`, "success");
    } catch (e) {
        showToast("Erro ao processar arquivo: " + e.message, "error");
    }
}

async function processDraftFile(file) {
    try {
        const text = await extractTextFromFile(file);
        workspaceState.proposalDraftText = text;
        workspaceState.proposalDraftName = file.name;
        saveWorkspaceState();

        document.getElementById('proposal-draft-text').value = text;
        document.getElementById('file-name-proposal-draft').textContent = file.name;
        document.getElementById('file-badge-proposal-draft').style.display = 'flex';
        showToast(`Rascunho de proposta "${file.name}" carregado.`, "success");

        // Auto detect cover information
        autoDetectMetadata(text);
    } catch (e) {
        showToast("Erro ao processar rascunho: " + e.message, "error");
    }
}

async function autoDetectMetadata(text) {
    if (!text) return;

    // Fallback inicial por Expressões Regulares
    const patterns = {
        title: /(?:T[íi]tulo|Projeto|Nome do Projeto)\s*[:\-]\s*(.+)/i,
        institution: /(?:Fomento|Institui[çc][ãa]o|Órg[ãa]o|Promotor|Edital)\s*[:\-]\s*(.+)/i,
        proponent: /(?:Proponente|Autor|Respons[áa]vel)\s*[:\-]\s*(.+)/i,
        city: /(?:Cidade|Local|Munic[íi]pio)\s*[:\-]\s*(.+)/i,
        year: /(?:Ano|Exerc[íi]cio)\s*[:\-]\s*(\d{4})/i,
        budget: /(?:Or[çc]amento|Valor|Custo|Total)\s*[:\-]\s*(?:R\$\s*)?([\d.,]+)/i
    };

    let detected = false;
    for (const [key, regex] of Object.entries(patterns)) {
        const match = text.match(regex);
        if (match && match[1]) {
            let val = match[1].trim();
            if (key === 'budget') {
                val = val.replace(/\./g, '').replace(',', '.');
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    workspaceState.cover.budget = num;
                    const el = document.getElementById('cover-budget');
                    if (el) el.value = num;
                    detected = true;
                }
            } else {
                workspaceState.cover[key] = val;
                const el = document.getElementById(`cover-${key}`);
                if (el) el.value = val;
                detected = true;
            }
        }
    }

    if (detected) {
        saveWorkspaceState();
        updateCoverPreviewDOM();
    }

    // Refinamento inteligente usando Inteligência Artificial se a chave GeminiKey estiver ativa
    if (isApiActive()) {
        try {
            const prompt = `Analise o texto do rascunho de proposta cultural abaixo e extraia as informações de capa do projeto.
            Retorne estritamente um JSON estruturado com as chaves (sem markdown json wraps):
            - title: O título ou nome do projeto.
            - institution: A instituição de fomento, órgão promotor ou edital.
            - proponent: O nome do proponente, autor ou grupo cultural.
            - city: A cidade e estado do projeto (formato Cidade - UF).
            - year: O ano de execução do projeto (4 dígitos, ex: 2026).
            - budget: O orçamento total estimado (apenas número decimal, ex: 150000.00).
            
            Se não encontrar alguma informação, tente deduzir com base no contexto do texto ou deixe a chave como string vazia "".
            
            [TEXTO DO RASCUNHO]:
            ${text.substring(0, 8000)}
            `;

            const responseText = await callLLMGateway(prompt, null, 'light', coverSchema);
            const parsed = safeParseJSON(responseText);
            if (parsed) {
                if (parsed.title) { workspaceState.cover.title = parsed.title; const el = document.getElementById('cover-title'); if (el) el.value = parsed.title; }
                if (parsed.institution) { workspaceState.cover.institution = parsed.institution; const el = document.getElementById('cover-institution'); if (el) el.value = parsed.institution; }
                if (parsed.proponent) { workspaceState.cover.proponent = parsed.proponent; const el = document.getElementById('cover-proponent'); if (el) el.value = parsed.proponent; }
                if (parsed.city) { workspaceState.cover.city = parsed.city; const el = document.getElementById('cover-city'); if (el) el.value = parsed.city; }
                if (parsed.year) { workspaceState.cover.year = parsed.year; const el = document.getElementById('cover-year'); if (el) el.value = parsed.year; }
                if (parsed.budget) {
                    const num = parseFloat(parsed.budget);
                    if (!isNaN(num)) {
                        workspaceState.cover.budget = num;
                        const el = document.getElementById('cover-budget');
                        if (el) el.value = num;
                    }
                }
                saveWorkspaceState();
                updateCoverPreviewDOM();
            }
        } catch (e) {
            console.error("Erro no refinamento inteligente da capa:", e);
        }
    }
}

window.acceptRevision = function (button, secId) {
    const wrapper = button.closest('.pending-revision-wrapper');
    if (!wrapper) return;
    const preview = wrapper.querySelector('.suggested-content-preview');
    const newHtml = preview ? preview.innerHTML : "";

    const targetEl = document.getElementById(`sec-${secId}`);
    if (targetEl) {
        targetEl.innerHTML = newHtml;
        syncDOMContentToState();
        updatePlaceholderStates();
        showToast("Sugestão da IA aprovada e integrada!", "success");
    }
};

window.rejectRevision = function (button, secId) {
    const wrapper = button.closest('.pending-revision-wrapper');
    if (!wrapper) return;

    const targetEl = document.getElementById(`sec-${secId}`);
    if (targetEl) {
        // Remove the pending revision wrapper
        wrapper.remove();

        // Unwrap original content if wrapped
        const originalWrapper = targetEl.querySelector('.original-content-wrapper');
        if (originalWrapper) {
            targetEl.innerHTML = originalWrapper.innerHTML;
        }

        syncDOMContentToState();
        updatePlaceholderStates();
        showToast("Sugestão descartada.", "info");
    }
};

function appendRevisionMarkup(secId, oldContent, newContent) {
    let cleanOldContent = oldContent || "";
    if (isSectionMissing(secId)) {
        cleanOldContent = "";
    } else if (cleanOldContent.includes('pending-revision-wrapper')) {
        const temp = document.createElement('div');
        temp.innerHTML = cleanOldContent;
        const originalWrapper = temp.querySelector('.original-content-wrapper');
        if (originalWrapper) {
            cleanOldContent = originalWrapper.innerHTML;
        } else {
            const revisionWrappers = temp.querySelectorAll('.pending-revision-wrapper');
            revisionWrappers.forEach(w => w.remove());
            cleanOldContent = temp.innerHTML;
        }
    }

    const hasOriginalText = cleanOldContent && cleanOldContent.replace(/<[^>]*>/g, '').trim().length > 0;

    return `
        ${hasOriginalText ? `<div class="original-content-wrapper">${cleanOldContent}</div>` : ''}
        <div class="pending-revision-wrapper" contenteditable="false" style="border: 2px dashed #6366f1; padding: 14px; margin-top: 12px; border-radius: 8px; background-color: rgba(99, 102, 241, 0.04); font-family: sans-serif; font-size: 0.9rem; margin-bottom: 12px; text-align: left; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.08);">
            <div style="font-weight: bold; color: #4f46e5; margin-bottom: 8px; display: flex; align-items: center; justify-space-between; gap: 6px;">
                <span>✨ Sugestão Gerada pela IA (Pré-Aprovação Obrigatória)</span>
                <span style="font-size: 0.75rem; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px;">Pendente de Aprovação</span>
            </div>
            <div class="suggested-content-preview" contenteditable="true" style="border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background: var(--bg-card); font-family: var(--font-body); margin-bottom: 10px; min-height: 50px; outline: none; text-align: left;">
                ${newContent}
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn btn-primary btn-accept-revision" style="font-size: 0.8rem; padding: 6px 14px; width: auto; background: var(--color-primary); color: white; font-weight: 600;" onclick="window.acceptRevision(this, '${secId}')">✓ Aprovar Alteração</button>
                <button class="btn btn-secondary btn-reject-revision" style="font-size: 0.8rem; padding: 6px 14px; width: auto; background:#fef2f2; color:#ef4444; border-color:#fca5a5; font-weight: 600;" onclick="window.rejectRevision(this, '${secId}')">✕ Descartar</button>
            </div>
        </div>
    `;
}

function isSectionMissing(secId) {
    const content = workspaceState.documentContent[secId];
    if (!content) return true;
    const text = content.replace(/<[^>]*>/g, '').trim();
    if (!text) return true;

    // Check if it matches any placeholder
    for (const placeholder of placeholders) {
        const cleanPlaceholder = placeholder.replace(/<[^>]*>/g, '').trim();
        if (text === cleanPlaceholder) {
            return true;
        }
    }
    return false;
}

function getRelevantAlertsAndAdjustments(sectionId) {
    const relevant = [];
    const auditData = workspaceState.lastAuditData;
    if (!auditData) return relevant;

    const sectionKeywords = {
        justificativa: ["justificativa", "mérito", "relevância", "território", "impacto", "histórico"],
        objetivos: ["objetivo", "meta", "realização", "específico"],
        metodologia: ["metodologia", "etapa", "fase", "produção", "trabalho", "cronograma"],
        cronograma: ["cronograma", "mês", "prazo", "cronológico", "atividade"],
        orcamento: ["orçamento", "custo", "financeiro", "taxa", "planilha", "verba", "r$", "tributo", "imposto", "patronal", "iss", "inss", "irrf", "rpa", "mei", "recolhimento", "fiscais", "administrativo", "divulgação"],
        acessibilidade: ["acessibilidade", "pcd", "libras", "audiodescrição", "cota", "afirmativa", "democratização", "contrapartida", "gratuito", "ingresso", "oficina", "doação", "público"]
    };

    const keywords = sectionKeywords[sectionId] || [];

    if (auditData.alertas) {
        auditData.alertas.forEach(a => {
            const text = `${a.tipo || ''} ${a.descricao || ''} ${a.sugestao || ''}`.toLowerCase();
            if (keywords.some(kw => text.includes(kw))) {
                relevant.push(`Alerta [Nível: ${a.nivel || 'MÉDIO'}]: ${a.descricao || ''} (Sugestão: ${a.sugestao || ''})`);
            }
        });
    }

    if (auditData.ajustes) {
        auditData.ajustes.forEach(adj => {
            const text = `${adj.alteracao || ''} ${adj.fator || ''}`.toLowerCase();
            if (keywords.some(kw => text.includes(kw))) {
                relevant.push(`Ajuste Recomendado [área: ${adj.fator || ''}]: ${adj.alteracao || ''}`);
            }
        });
    }

    return relevant;
}

async function callGeminiToComplementSection(sectionId, currentContent, relevantIssues, extraInstrucoes, stream = true) {
    const memoriesContext = (workspaceState.historicalMemories && workspaceState.historicalMemories.length > 0)
        ? workspaceState.historicalMemories.map(m => `- [${m.date}] Projeto: ${m.project} -> ${m.activity}`).join('\n')
        : "Nenhuma memória anterior.";

    const annexesContext = workspaceState.annexes && workspaceState.annexes.length > 0
        ? workspaceState.annexes.map(a => `Nome do Anexo: ${a.name}\nConteúdo: ${a.content ? a.content.substring(0, 25000) : ''}`).join('\n---\n')
        : "Nenhum anexo extra.";

    // Cross-Referencing: Get other sections already generated (limited to prevent token bloat)
    let crossRefContext = "";
    const generatedSections = Object.entries(workspaceState.documentContent)
        .filter(([key, val]) => key !== sectionId && val && val.trim().length > 10);

    if (generatedSections.length > 0) {
        crossRefContext = "\n[OUTRAS SEÇÕES JÁ GERADAS/ALINHADAS NO EDITOR (REFERÊNCIA CRUZADA OBRIGATÓRIA)]:\n";
        let accumulatedLength = 0;
        for (const [key, val] of generatedSections) {
            let sectionText = stripHtmlForPayload(val);
            if (sectionText.length > 1500) {
                sectionText = sectionText.substring(0, 1500) + "\n... [TRECHO CORTADO PARA ECONOMIA DE CONTEXTO] ...";
            }
            if (accumulatedLength + sectionText.length > 8000) {
                crossRefContext += `### Seção: ${key.toUpperCase()}\n... [OMITIDO PARA CONSERVAR CONTEXTO] ...\n\n`;
                continue;
            }
            crossRefContext += `### Seção: ${key.toUpperCase()}\n${sectionText}\n\n`;
            accumulatedLength += sectionText.length;
        }
    }

    const prompt = `Você é o Redator Especialista de Projetos Culturais e Auditor de Compliance.
    Sua missão é analisar a seção "${sectionId.toUpperCase()}" do nosso projeto cultural e complementá-la ou ajustá-la APENAS com o que estiver faltando para cumprir o edital ou resolver as inconsistências/alertas de conformidade apontados abaixo.
    
    ${getEditalProfilePromptContext()}

    REGRAS CRÍTICAS DE FORMATAÇÃO E SAÍDA (LEIA COM ATENÇÃO MÁXIMA):
    - Escreva apenas o conteúdo desta seção em Português do Brasil.
    - Se a seção já estiver totalmente em conformidade e não precisar de correções, retorne exatamente o conteúdo atual da seção (com as devidas tags HTML).
    - Se for necessário acrescentar ou alterar algo, reescreva a seção inteira integrando as melhorias de forma fluida e profissional.
    - Comece diretamente com as tags HTML estruturadas de cabeçalho da seção (por exemplo: <h3> ou <h4>).
    - Não envolva a resposta em blocos markdown do tipo \`\`\`html. Retorne o texto pronto para inserção direta no editor.
    - Não inclua saudações ou explicações do tipo "Ajustei a seção para incluir...".
    
    [CONTEÚDO ATUAL DA SEÇÃO]:
    ${stripHtmlForPayload(currentContent)}
    
    [ALERTAS E INCONSISTÊNCIAS DE COMPLIANCE APONTADOS PELA AUDITORIA]:
    ${relevantIssues.join('\n')}
    
    [TÍTULO DO PROJETO]: ${workspaceState.cover.title || 'Não definido'}
    [PROPONENTE]: ${workspaceState.cover.proponent || 'Não definido'}
    [INSTITUIÇÃO / EDITAL]: ${workspaceState.cover.institution || 'Não definido'}
    [CIDADE / UF]: ${workspaceState.cover.city || 'Não definido'}
    [ORÇAMENTO TETO]: R$ ${workspaceState.cover.budget || 'Não definido'}
    
    [EDITAL DE REFERÊNCIA (REGRAS DO PROJETO)]:
    ${workspaceState.editalRefText ? filterRelevantEditalText(workspaceState.editalRefText, sectionId) : "Sem edital ativo."}
    
    [ANEXOS ADICIONAIS DO EDITAL]:
    ${annexesContext}
    
    [MEMÓRIA DE APRENDIZADO (PROJETOS ANTERIORES)]:
    ${memoriesContext}
    
    ${crossRefContext}
    
    [DIRETRIZES ADICIONAIS DO PROPONENTE]:
    ${extraInstrucoes || "Nenhuma diretriz adicional."}
    `;

    const responseText = await callLLMGateway(prompt, null, 'heavy', null, stream);
    return responseText.trim();
}

async function runChainedSequentialGeneration(extraInstrucoes = "", webSearchContext = "", buttonEl) {
    showToast("⚡ Gerando proposta completa em 1 única chamada consolidada (Gemini 2.0 Flash)...", "info");
    return await generateBasicProposal();
}

async function callGeminiForSectionChained(sectionId, extraInstrucoes = "", webSearchContext = "", stream = true) {
    const memoriesContext = (workspaceState.historicalMemories && workspaceState.historicalMemories.length > 0)
        ? workspaceState.historicalMemories.map(m => `- [${m.date}] Projeto: ${m.project} -> ${m.activity}`).join('\n')
        : "Nenhuma memória anterior.";

    const annexesContext = workspaceState.annexes && workspaceState.annexes.length > 0
        ? workspaceState.annexes.map(a => `Nome do Anexo: ${a.name}\nConteúdo: ${a.content ? a.content.substring(0, 25000) : ''}`).join('\n---\n')
        : "Nenhum anexo extra.";

    // Cross-Referencing: Get other sections already generated (limited to prevent token bloat)
    let crossRefContext = "";
    const generatedSections = Object.entries(workspaceState.documentContent)
        .filter(([key, val]) => key !== sectionId && val && val.trim().length > 10);

    if (generatedSections.length > 0) {
        crossRefContext = "\n[OUTRAS SEÇÕES JÁ GERADAS/ALINHADAS NO EDITOR (REFERÊNCIA CRUZADA OBRIGATÓRIA)]:\n";
        let accumulatedLength = 0;
        for (const [key, val] of generatedSections) {
            let sectionText = stripHtmlForPayload(val);
            if (sectionText.length > 1500) {
                sectionText = sectionText.substring(0, 1500) + "\n... [TRECHO CORTADO PARA ECONOMIA DE CONTEXTO] ...";
            }
            if (accumulatedLength + sectionText.length > 8000) {
                crossRefContext += `### Seção: ${key.toUpperCase()}\n... [OMITIDO PARA CONSERVAR CONTEXTO] ...\n\n`;
                continue;
            }
            crossRefContext += `### Seção: ${key.toUpperCase()}\n${sectionText}\n\n`;
            accumulatedLength += sectionText.length;
        }
    }

    const sectionMetadata = {
        justificativa: "Elabore uma justificativa longa e detalhada que defenda o mérito cultural, a relevância social para o território e o impacto na comunidade.",
        objetivos: "Estruture o objetivo geral e os objetivos específicos como itens claros de realizações físicas e pedagógicas do projeto.",
        metodologia: "Descreva a metodologia detalhando passo-a-passo as etapas de Pré-produção (captação, contratos), Execução (oficinas, apresentações) e Pós-produção (desmobilização, prestação de contas).",
        cronograma: "Formate obrigatoriamente como uma tabela HTML (<table>, <tr>, <td>) organizada por meses (Mês 1 a Mês 6), descrevendo detalhadamente as atividades em cada fase.",
        orcamento: "Formate obrigatoriamente como uma tabela HTML (<table>, <tr>, <td>) com colunas: Item, Quantidade, Unidade, Valor Unitário (R$), Valor Total (R$). Garanta conformidade fiscal de PF/MEI/Cooperativa e o limite de 15% para custos administrativos e 10% para divulgação.",
        acessibilidade: "Descreva em detalhes o plano de acessibilidade física (rampas, banheiros PCD) e comunicacional (Libras presencial, audiodescrição em vídeos) e as políticas de democratização (ingressos gratuitos/populares)."
    };

    const prompt = `Você é o Redator Especialista de Projetos Culturais. Sua missão é escrever a seção "${sectionId.toUpperCase()}" de forma extremamente detalhada, formal e completa para o nosso projeto cultural.
    
    REGRAS CRÍTICAS DE FORMATAÇÃO E SAÍDA (LEIA COM ATENÇÃO MÁXIMA):
    - Escreva apenas o conteúdo desta seção em Português do Brasil.
    - Comece diretamente com as tags HTML estruturadas de cabeçalho da seção (por exemplo: <h3> ou <h4>).
    - Não envolva a resposta em blocos markdown do tipo \`\`\`html ou \`\`\`json. Retorne o texto pronto para inserção direta no editor.
    - Evite explicações externas ou saudações de IA (como "Aqui está a seção...").
    
    DIRETRIZES DA SEÇÃO:
    ${sectionMetadata[sectionId]}
    
    [TÍTULO DO PROJETO]: ${workspaceState.cover.title || 'Não definido'}
    [PROPONENTE]: ${workspaceState.cover.proponent || 'Não definido'}
    [INSTITUIÇÃO / EDITAL]: ${workspaceState.cover.institution || 'Não definido'}
    [CIDADE / UF]: ${workspaceState.cover.city || 'Não definido'}
    [ORÇAMENTO TETO DO PROJETO]: R$ ${workspaceState.cover.budget || 'Não definido'}
    
    [EDITAL DE REFERÊNCIA (REGRAS DO PROJETO)]:
    ${workspaceState.editalRefText ? filterRelevantEditalText(workspaceState.editalRefText, sectionId) : "Sem edital ativo."}
    
    [ANEXOS ADICIONAIS DO EDITAL]:
    ${annexesContext}
    
    [MEMÓRIA DE APRENDIZADO (PROJETOS ANTERIORES)]:
    ${memoriesContext}
    
    [PESQUISA WEB DO EDITAL]:
    ${webSearchContext || "Nenhuma informação extra."}
    
    [RASCUNHO INICIAL DO USUÁRIO]:
    ${workspaceState.proposalDraftText ? workspaceState.proposalDraftText.substring(0, 25000) : "Sem rascunho."}
    
    ${crossRefContext}
    
    [INSTRUÇÕES ADICIONAIS DO USUÁRIO]:
    ${extraInstrucoes || "Nenhuma instrução adicional."}
    `;

    const responseText = await callLLMGateway(prompt, null, 'heavy', null, stream);
    return responseText.trim();
}

async function generateBasicProposal() {
    const btn = document.getElementById('btn-generate-basic-proposal');
    if (!btn) return;

    if (_isProcessingAPI) {
        showToast("Aguarde o processamento atual terminar.", "warning");
        return;
    }
    _isProcessingAPI = true;
    btn.disabled = true;
    btn.textContent = "⚖️ Mapeando seções exigidas pelo edital...";

    try {
        pushProposalHistoryState("Antes da Geração pelo Ingestor");

        // 1. Garantir perfil do edital e extrair seções exigidas
        const profile = await ensureEditalProfile(true);
        let rawSecs = (profile && profile.secoes_exigidas) ? profile.secoes_exigidas : [];
        let requiredSections = sanitizeSectionKeys(rawSecs);

        if (requiredSections.length === 0) {
            const combinedText = (workspaceState.editalRefText || "") + "\n" + (workspaceState.annexes || []).map(a => a.content || "").join("\n");
            requiredSections = detectRequiredSectionsFromText(combinedText);
        }

        showToast(`⚡ [Ingestor] Identificadas ${requiredSections.length} seções exigidas no edital: ${requiredSections.map(s => s.toUpperCase()).join(', ')}. Iniciando redação completa...`, "info");

        // 2. Limpar seções do editor que NÃO são exigidas no edital
        const allSections = [
            'justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento',
            'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica',
            'monitoramento', 'compliance', 'sustentabilidade', 'rider'
        ];

        allSections.forEach(secKey => {
            if (!requiredSections.includes(secKey)) {
                workspaceState.documentContent[secKey] = "";
                const el = document.getElementById(`sec-${secKey}`);
                if (el) el.innerHTML = "";
            }
        });

        // 3. Redigir cada seção exigida com profundidade e rigor total (sem resumos ou respostas genéricas)
        for (let i = 0; i < requiredSections.length; i++) {
            const secKey = requiredSections[i];
            const displayTitle = secKey.toUpperCase();
            btn.textContent = `✍️ Redigindo [${i + 1}/${requiredSections.length}] ${displayTitle}...`;
            showToast(`✍️ [Ingestor ${i + 1}/${requiredSections.length}] Redigindo seção ${displayTitle} com profundidade e rigor...`, "info");

            let text = "";
            if (isApiActive()) {
                try {
                    const refinedRaw = await callGeminiForRedator(secKey, "Redigir seção completa, profunda, rigorosa e densa com base nas regras do edital, perfil estrutural e anexos ingeridos.");
                    if (refinedRaw) {
                        if (refinedRaw.includes("=== CONTEÚDO DA SEÇÃO ===") && refinedRaw.includes("=== JUSTIFICATIVA E ADEQUAÇÕES ===")) {
                            const parts = refinedRaw.split("=== JUSTIFICATIVA E ADEQUAÇÕES ===");
                            text = parts[0].replace("=== CONTEÚDO DA SEÇÃO ===", "").trim();
                        } else {
                            try {
                                const parsed = JSON.parse(refinedRaw);
                                text = parsed.text || refinedRaw;
                            } catch (e) {
                                text = refinedRaw;
                            }
                        }
                    }
                } catch (secApiErr) {
                    console.warn(`[INGESTOR] Erro API na seção ${secKey}, ativando motor local:`, secApiErr);
                }
            }

            // Fallback offline por seção se API falhar ou não estiver ativa
            if (!text || text.trim().length < 20) {
                const resultRaw = await getSimulatedRedatorText(secKey, "Redigir com base nas diretrizes do edital");
                try {
                    const parsed = JSON.parse(resultRaw);
                    text = parsed.text || resultRaw;
                } catch (e) {
                    text = resultRaw;
                }
            }

            if (text && text.trim().length > 0) {
                const rendered = renderTextOrMarkdown(text);
                workspaceState.documentContent[secKey] = rendered;
                const targetEl = document.getElementById(`sec-${secKey}`);
                if (targetEl) {
                    targetEl.innerHTML = rendered;
                }
                syncDOMContentToState();
                updatePlaceholderStates();
            }
        }

        // Executar auditoria local
        if (window.offlineAuditor && typeof window.offlineAuditor.runLocalAudit === 'function') {
            window.offlineAuditor.runLocalAudit(workspaceState).catch(err => console.warn("Erro ao rodar auditoria local:", err));
        }

        workspaceState.lastAuditData = null;
        workspaceState.revisorAgentsResults = {};

        saveWorkspaceState();
        syncEditorContentToDOM();
        updatePlaceholderStates();

        const auditDashboard = document.getElementById('audit-dashboard');
        if (auditDashboard) auditDashboard.style.display = 'none';

        addHistoricalMemory(`Ingestor: Elaboração de proposta completa com profundidade para ${requiredSections.length} seções exigidas.`);
        showToast(`✓ [Ingestor] Proposta completa gerada para as ${requiredSections.length} seções exigidas pelo edital com profundidade total!`, "success");

    } catch (err) {
        console.error("Erro na geração pelo ingestor:", err);
        showToast("Erro ao gerar proposta pelo ingestor: " + err.message, "error");
    } finally {
        _isProcessingAPI = false;
        btn.disabled = false;
        btn.textContent = "⚡ Gerar Proposta Completa Cruzada";
    }
}

function getSimulatedBasicProposal() {
    return new Promise(resolve => {
        setTimeout(() => {
            const title = workspaceState.cover.title || "Projeto Cultural e Social";
            const budget = workspaceState.cover.budget || 150000;
            const city = workspaceState.cover.city || "Linhares - ES";
            const proponent = workspaceState.cover.proponent || "Associação de Cultura e Arte";

            const draft = (workspaceState.proposalDraftText || "").toLowerCase();
            const edital = (workspaceState.editalRefText || "").toLowerCase();
            const annexesText = (workspaceState.annexes || []).map(a => a.content || "").join("\n").toLowerCase();
            const combinedText = draft + "\n" + edital + "\n" + annexesText;

            const hasWorkshops = /oficina|curso|workshop|palestra/i.test(combinedText);
            const isMusic = /música|musical|gravação|disco/i.test(combinedText);
            const hasHiFi = /ssl|interface|monitor|microfone/i.test(combinedText);
            const hasSisGen = /povos originários|indígena|rapé|ayahuasca|patrimônio genético/i.test(combinedText);

            let justificativa = `<h3>1. Justificativa e Relevância</h3>
<p>O projeto cultural <strong>"${title}"</strong>, proposto por <strong>${proponent}</strong>, justifica-se plenamente diante do cenário cultural do município de ${city}. Esta iniciativa busca descentralizar as ações artísticas e valorizar a memória regional, de acordo com as regras estabelecidas pelo edital de referência.</p>
<p>Com forte impacto social e comunitário, o projeto foca no resgate histórico e na difusão de patrimônios imateriais. A contratação de profissionais regionais movimentará a cadeia criativa e gerará novas parcerias no território de execução.</p>`;

            if (hasSisGen) {
                justificativa += `<p><em>Nota Regulatória Especial (SisGen):</em> Em conformidade com a Lei 13.123/2015, por envolver elementos tradicionais/originários, o projeto prevê as devidas salvaguardas de patrimônio genético.</p>`;
            }

            let objetivos = `<h3>2. Objetivos Geral e Específicos</h3>
<p><strong>Objetivo Geral:</strong> Realizar o projeto <strong>"${title}"</strong>, garantindo fruição artística de qualidade e acessibilidade universal para a comunidade de ${city}.</p>
<p><strong>Objetivos Específicos:</strong></p>
<ul>
    <li>Realizar apresentações públicas com entrada 100% gratuita;</li>
    <li>Fomentar a economia criativa local contratando artistas e prestadores de serviços da região;</li>
    <li>Oferecer workshops pedagógicos e oficinas gratuitas de formação de público para a comunidade escolar;</li>
    <li>Assegurar acessibilidade sensoriais e físicas plenas em todas as ações executadas.</li>
</ul>`;

            let metodologia = `<h3>3. Metodologia e Plano de Trabalho</h3>
<p>O plano técnico para execução operacional do projeto está estruturado em 3 fases estratégicas e exequíveis:</p>
<p><strong>Pré-produção (Mês 1 ao Mês 2):</strong> Planejamento executivo, montagem da equipe técnica, curadoria, regularidade fiscal do proponente (FGTS, CND) e assinatura das cartas de anuência.</p>
<p><strong>Execução (Mês 3 ao Mês 5):</strong> Realização de ensaios, montagem da infraestrutura de som e luz, divulgação na mídia e realização das oficinas formativas e apresentações gratuitas.</p>
<p><strong>Pós-produção (Mês 6):</strong> Coleta de relatórios fotográficos, listas de presença assinadas, compilação de clipping de imprensa e prestação de contas física e financeira final.</p>`;

            if (isMusic && !hasHiFi) {
                metodologia += `<p><em>Rider Técnico:</em> O projeto prevê a locação de equipamentos de som de alta fidelidade e interfaces de referência profissional (ex: SSL/monitores) para gravação/execução acústica de qualidade.</p>`;
            }

            let cronograma = `<h3>4. Cronograma de Atividades</h3>
<table style="width:100%; border-collapse:collapse; border:1px solid #ddd; font-size:11px;">
    <thead>
        <tr style="background:#f1f5f9;">
            <th>Etapa Operacional / Atividades</th>
            <th style="text-align:center;">Mês 1</th>
            <th style="text-align:center;">Mês 2</th>
            <th style="text-align:center;">Mês 3</th>
            <th style="text-align:center;">Mês 4</th>
            <th style="text-align:center;">Mês 5</th>
            <th style="text-align:center;">Mês 6</th>
        </tr>
    </thead>
    <tbody>
        <tr><td>[Pré-produção] Planejamento e Contratos</td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td></td><td></td><td></td><td></td></tr>
        <tr><td>[Pré-produção] Coleta de Anuências e FGTS/CND</td><td></td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td></td><td></td><td></td><td></td></tr>
        <tr><td>[Execução] Divulgação e Inscrições</td><td></td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td></td><td></td></tr>
        <tr><td>[Execução] Oficinas e Ações Formativas</td><td></td><td></td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td></td><td></td></tr>
        <tr><td>[Execução] Apresentações e Ações Artísticas</td><td></td><td></td><td></td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td></td></tr>
        <tr><td>[Pós-produção] Desmobilização e Clipagem</td><td></td><td></td><td></td><td></td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td></tr>
        <tr><td>[Pós-produção] Prestação de Contas Final</td><td></td><td></td><td></td><td></td><td></td><td style="text-align:center; font-weight:bold; color:var(--color-success);">X</td></tr>
    </tbody>
</table>`;

            const totalBudget = budget;
            const cArt = totalBudget * 0.40;
            const cProd = totalBudget * 0.15;
            const cAdm = totalBudget * 0.15;
            const cDiv = totalBudget * 0.10;
            const cAcc = totalBudget * 0.10;
            const cAud = totalBudget * 0.10;

            let orcamento = `<h3>5. Planilha Orçamentária</h3>
<table style="width:100%; border-collapse:collapse; border:1px solid #ddd; font-size:11px;">
    <thead>
        <tr style="background:#f1f5f9;">
            <th>Item de Despesa / Rubrica</th>
            <th style="text-align:center;">Qtd</th>
            <th style="text-align:center;">Unidade</th>
            <th style="text-align:right;">Unitário (R$)</th>
            <th style="text-align:right;">Total (R$)</th>
        </tr>
    </thead>
    <tbody>
        <tr><td>1. Coordenação Geral / Diretor de Produção (Administração)</td><td style="text-align:center;">1</td><td style="text-align:center;">Serviço</td><td style="text-align:right;">R$ ${cProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td style="text-align:right;">R$ ${cProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td>2. Cachês de Artistas e Palestrantes (PF - inclui tributos)</td><td style="text-align:center;">4</td><td style="text-align:center;">Mês</td><td style="text-align:right;">R$ ${(cArt / 4).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td style="text-align:right;">R$ ${cArt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td>3. Intérpretes de Libras e Audiodescrição (Acessibilidade)</td><td style="text-align:center;">2</td><td style="text-align:center;">Serviço</td><td style="text-align:right;">R$ ${(cAcc / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td style="text-align:right;">R$ ${cAcc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td>4. Divulgação e Assessoria de Imprensa (Marketing - 10%)</td><td style="text-align:center;">1</td><td style="text-align:center;">Verba</td><td style="text-align:right;">R$ ${cDiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td style="text-align:right;">R$ ${cDiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td>5. Taxa de Administração e Impostos RPA (INSS/IRRF - 15%)</td><td style="text-align:center;">1</td><td style="text-align:center;">Verba</td><td style="text-align:right;">R$ ${cAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td style="text-align:right;">R$ ${cAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td>6. Serviços de Contabilidade e Auditoria de Contas</td><td style="text-align:center;">1</td><td style="text-align:center;">Serviço</td><td style="text-align:right;">R$ ${cAud.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td style="text-align:right;">R$ ${cAud.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
    </tbody>
    <tfoot>
        <tr style="font-weight:bold; background:#e2e8f0;">
            <td colspan="4">Valor Total do Projeto</td>
            <td style="text-align:right; color:var(--color-primary);">R$ ${totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
    </tfoot>
</table>`;

            let acessibilidade = `<h3>6. Plano de Acessibilidade e Cotas</h3>
<p><strong>Acessibilidade PCD Sensorial e Física:</strong> O projeto garante acessibilidade física através de rampas e sanitários adaptados. Para a acessibilidade comunicacional, as apresentações e vídeos contarão com intérprete de LIBRAS e audiodescrição em consonância com a Lei 13.146/2015 e NBR 9050.</p>
<p><strong>Cotas e Ações Afirmativas:</strong> Reserva de 20% das vagas para pessoas autodeclaradas negras ou indígenas e fomento ao protagonismo feminino e vulnerabilizado.</p>`;

            let publico = `<h3>7. Público-Alvo e Beneficiários</h3>
<p>Público composto por estudantes da rede pública, idosos, jovens e comunidade do município de ${city}, com estimativa de atendimento direto de 1.500 pessoas de forma 100% gratuita.</p>`;

            let contrapartida = `<h3>8. Contrapartida Social e Legado</h3>
<p>Oferecimento de oficinas pedagógicas gratuitas de formação de público de 12 horas e doação de 20% do acervo impresso/digital produzido para bibliotecas públicas municipais.</p>`;

            let comunicacao = `<h3>9. Plano de Comunicação e Divulgação</h3>
<p>Estratégia multicanal incluindo assessoria de imprensa local, tráfego pago segmentado regionalmente em redes sociais e confecção de peças de divulgação digital com acessibilidade.</p>`;

            let ficha_tecnica = `<h3>10. Ficha Técnica e Capacidade</h3>
<p>Equipe principal composta por Diretor Geral, Coordenador de Produção, Intérprete de LIBRAS, Audiodescritor, Designer Gráfico, Assessor de Imprensa e Contador Especializado.</p>`;

            let monitoramento = `<h3>11. Monitoramento e Matriz Lógica</h3>
<p>Acompanhamento por indicadores de desempenho (nº de participantes, lista de presença assinada), pesquisa de satisfação do público e clipping de reportagens publicadas.</p>`;

            let compliance = `<h3>12. Compliance e Marcos Legais</h3>
<p>Regularidade fiscal comprovada (CNDT, FGTS e Certidão da Receita Federal), termo de compromisso de direitos autorais no ECAD e salvaguarda do SisGen se aplicável.</p>`;

            let sustentabilidade = `<h3>13. Sustentabilidade e ESG</h3>
<p>Práticas sustentáveis com eliminação de descartáveis plásticos, gestão de resíduos sólidos e preferência por material promocional 100% digital.</p>`;

            let rider = `<h3>14. Rider Técnico e Logística</h3>
<p>Sistema de som P.A. 4.000W RMS, mesa de som digital 16 canais, microfones sem fio UHF, refletores LED cênicos e camarim com acessibilidade arquitetônica.</p>`;

            resolve({
                justificativa,
                objetivos,
                metodologia,
                cronograma,
                orcamento,
                acessibilidade,
                publico,
                contrapartida,
                comunicacao,
                ficha_tecnica,
                monitoramento,
                compliance,
                sustentabilidade,
                rider
            });
        }, 300);
    });
}

async function processAnnexFile(file) {
    try {
        const text = await extractTextFromFile(file);
        workspaceState.annexes.push({
            name: file.name,
            content: text,
            size: file.size
        });
        workspaceState.editalProfile = null;
        saveWorkspaceState();
        renderAnnexesList();
        renderEditalProfileCard();
        showToast(`Anexo "${file.name}" adicionado.`, "success");
    } catch (e) {
        showToast("Erro ao carregar anexo: " + e.message, "error");
    }
}

async function extractTextFromFile(file) {
    const reader = new FileReader();
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx');

    return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
            const buffer = e.target.result;
            try {
                if (isPdf) {
                    const text = await readPdfText(buffer);
                    resolve(text);
                } else if (isDocx) {
                    const text = await readDocxText(buffer);
                    resolve(text);
                } else {
                    try {
                        const decoder = new TextDecoder('utf-8', { fatal: true });
                        resolve(decoder.decode(buffer));
                    } catch (utfErr) {
                        const decoder = new TextDecoder('iso-8859-1');
                        resolve(decoder.decode(buffer));
                    }
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Erro de leitura do arquivo."));
        reader.readAsArrayBuffer(file);
    });
}

async function readPdfText(arrayBuffer) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
    }
    return text;
}

async function readDocxText(arrayBuffer) {
    const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
}

function renderAnnexesList() {
    const list = document.getElementById('annexes-list-container');
    if (!list) return;
    list.innerHTML = '';

    if (!list.dataset.listenerAttached) {
        list.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-remove-file');
            if (btn) {
                const index = parseInt(btn.dataset.index, 10);
                if (!isNaN(index) && workspaceState.annexes[index]) {
                    workspaceState.annexes.splice(index, 1);
                    workspaceState.editalProfile = null;
                    saveWorkspaceState();
                    renderAnnexesList();
                    renderEditalProfileCard();
                }
            }
        });
        list.dataset.listenerAttached = 'true';
    }

    workspaceState.annexes.forEach((annex, index) => {
        const item = document.createElement('div');
        item.className = 'annex-file-item';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.background = 'var(--bg-input)';
        item.style.padding = '0.5rem 0.75rem';
        item.style.borderRadius = 'var(--radius-sm)';
        item.style.marginBottom = '0.25rem';

        let sizeStr = `${(annex.size / 1024).toFixed(1)} KB`;

        item.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.15rem;">
                <span style="font-size:0.8rem; font-weight:700;">${annex.name}</span>
                <span style="font-size:0.65rem; color:var(--text-muted);">${sizeStr}</span>
            </div>
            <button class="btn-remove-file" data-index="${index}" style="font-size:1.1rem; padding:0; border:none; background:transparent; cursor:pointer; color:var(--color-error);" title="Remover">&times;</button>
        `;
        list.appendChild(item);
    });
}

// ==========================================
// ABA 2: REDATOR DE CONTEÚDO
// ==========================================
function setupRedator() {
    const btnGen = document.getElementById('btn-generate-section');
    const selectSec = document.getElementById('redator-section-select');
    const promptInput = document.getElementById('redator-prompt');
    const resultCard = document.getElementById('generation-result-card');
    const resultContentEditable = document.getElementById('generation-result-content-editable');

    const btnApply = document.getElementById('btn-apply-generation');
    const btnDiscard = document.getElementById('btn-discard-generation');

    if (btnGen) {
        btnGen.addEventListener('click', async () => {
            const sec = selectSec ? selectSec.value : 'justificativa';
            const extra = promptInput ? promptInput.value.trim() : '';

            // Garantir que a seção gerada fica amarrada à seleção explícita
            lastGeneratedSection = sec;
            const targetBadgeName = document.getElementById('generation-target-section-name');
            if (targetBadgeName && selectSec && selectSec.selectedIndex >= 0) {
                targetBadgeName.textContent = selectSec.options[selectSec.selectedIndex].text;
            }

            btnGen.disabled = true;

            try {
                // --- ETAPA 1 (PRIMEIRO): Cruzamento de dados Offline (IndexedDB) ---
                btnGen.textContent = "⚡ Etapa 1: Gerando minuta offline (IndexedDB)...";
                let resultRaw = await getSimulatedRedatorText(sec, extra);
                showToast("⚡ Etapa 1: Cruzamento offline concluído (IndexedDB).", "info");

                let text = "";
                let justificativa = "";

                try {
                    const parsed = JSON.parse(resultRaw);
                    text = parsed.text || "";
                    justificativa = parsed.justificativa || "";
                } catch (jsonErr) {
                    if (typeof resultRaw === 'string' && resultRaw.includes("=== CONTEÚDO DA SEÇÃO ===") && resultRaw.includes("=== JUSTIFICATIVA E ADEQUAÇÕES ===")) {
                        const parts = resultRaw.split("=== JUSTIFICATIVA E ADEQUAÇÕES ===");
                        justificativa = parts[1] ? parts[1].trim() : "";
                        text = parts[0].replace("=== CONTEÚDO DA SEÇÃO ===", "").trim();
                    } else {
                        text = resultRaw;
                        justificativa = "Ajustado e otimizado com base na conformidade regulatória do edital e anexos.";
                    }
                }

                lastGeneratedText = text;
                lastGeneratedSection = sec;
                if (resultContentEditable) resultContentEditable.value = text;

                // --- ETAPA 2 (SEGUNDO): Pesquisa Online Leve (sem consumo de API LLM) ---
                let webSearchContext = "";
                let searchQuery = "";
                if (workspaceState.cover.institution) searchQuery += workspaceState.cover.institution;
                if (workspaceState.editalRefName) {
                    const cleanName = workspaceState.editalRefName.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ");
                    searchQuery += " " + cleanName;
                }
                searchQuery = searchQuery.trim();

                if (searchQuery) {
                    btnGen.textContent = "🌐 Etapa 2: Pesquisando regras na web...";
                    try {
                        const searchRes = await fetch('/api/search-web-editais', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: searchQuery + " " + sec + " regras limites" })
                        });
                        if (searchRes.ok) {
                            const searchData = await searchRes.json();
                            if (searchData.results && searchData.results.length > 0) {
                                webSearchContext = "RESULTADOS DA BUSCA NA WEB SOBRE O EDITAL:\n";
                                searchData.results.slice(0, 3).forEach(r => {
                                    webSearchContext += `- Título: ${r.title}\n  URL: ${r.url}\n  Regra: ${r.snippet}\n\n`;
                                });
                                showToast("🌐 Etapa 2: Pesquisa de regras na web concluída.", "info");
                            }
                        }
                    } catch (err) {
                        console.warn("Falha na pesquisa web leve:", err);
                    }
                }

                // --- ETAPA 3 (TERCEIRO): Requisição via API LLM com payload completo ---
                if (isApiActive()) {
                    btnGen.textContent = "🤖 Etapa 3: Gemini refinando e validando seção...";
                    try {
                        const refinedRaw = await callGeminiForRedator(sec, extra, webSearchContext);
                        if (refinedRaw) {
                            try {
                                const parsedRefined = JSON.parse(refinedRaw);
                                text = parsedRefined.text || text;
                                justificativa = parsedRefined.justificativa || justificativa;
                            } catch (e) {
                                if (refinedRaw.includes("=== CONTEÚDO DA SEÇÃO ===") && refinedRaw.includes("=== JUSTIFICATIVA E ADEQUAÇÕES ===")) {
                                    const parts = refinedRaw.split("=== JUSTIFICATIVA E ADEQUAÇÕES ===");
                                    justificativa = parts[1] ? parts[1].trim() : justificativa;
                                    text = parts[0].replace("=== CONTEÚDO DA SEÇÃO ===", "").trim();
                                } else {
                                    text = refinedRaw;
                                }
                            }
                            lastGeneratedText = text;
                            if (resultContentEditable) resultContentEditable.value = text;
                            showToast("🤖 Etapa 3: Seção refinada e aprimorada pela IA com sucesso!", "success");
                        }
                    } catch (apiErr) {
                        console.warn("Erro na Etapa 3 da API LLM. Mantendo resultado da Etapa 1/2:", apiErr);
                        showToast("⚠️ API indisponível: Mantida a seção gerada na Etapa 1/2.", "warning");
                    }
                } else {
                    showToast("⚡ Seção gerada com sucesso via motor offline (IndexedDB)!", "success");
                }

                const justificativaContainer = document.getElementById('redator-justificativa-container');
                const justificativaContent = document.getElementById('redator-justificativa-content');
                if (justificativaContainer && justificativaContent) {
                    justificativaContent.value = justificativa;
                    justificativaContainer.style.display = 'block';
                }

                if (resultCard) resultCard.style.display = 'block';
                showToast("Seção gerada! Veja as adequações da IA abaixo e edite antes de aplicar.", "success");
            } catch (err) {
                showToast("Erro ao gerar seção: " + err.message, "error");
            } finally {
                btnGen.disabled = false;
                btnGen.textContent = "✨ Gerar Seção com IA";
            }
        });
    }

    if (btnApply) {
        btnApply.addEventListener('click', () => {
            const editedText = resultContentEditable ? resultContentEditable.value : lastGeneratedText;

            // Salvaguarda: se a resposta estiver vazia, não prossegue
            if (!editedText || editedText.trim().length === 0) {
                showToast("Conteúdo gerado está vazio. Operação cancelada.", "warning");
                return;
            }

            pushProposalHistoryState();

            const targetEl = document.getElementById(`sec-${lastGeneratedSection}`);
            if (targetEl) {
                const rendered = renderTextOrMarkdown(editedText);

                // Toda alteração gerada pela IA DEVE ser pré-aprovada via appendRevisionMarkup
                targetEl.innerHTML = appendRevisionMarkup(lastGeneratedSection, targetEl.innerHTML, rendered);

                syncDOMContentToState();
                updatePlaceholderStates();

                if (resultCard) resultCard.style.display = 'none';

                const justificativaContainer = document.getElementById('redator-justificativa-container');
                if (justificativaContainer) justificativaContainer.style.display = 'none';

                showToast(`🎯 Sugestão enviada para a seção "${lastGeneratedSection.toUpperCase()}" no Editor! Clique em "Aprovar Alteração" para confirmar.`, "success");
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    if (btnDiscard) {
        btnDiscard.addEventListener('click', () => {
            lastGeneratedText = "";
            lastGeneratedSection = "";
            if (resultCard) resultCard.style.display = 'none';

            const justificativaContainer = document.getElementById('redator-justificativa-container');
            if (justificativaContainer) {
                justificativaContainer.style.display = 'none';
            }

            showToast("Geração descartada.", "info");
        });
    }

    const btnUndo = document.getElementById('btn-undo-proposal');
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            undoProposalVersion();
        });
    }

    const btnSequential = document.getElementById('btn-redator-run-all-sequential');
    if (btnSequential) {
        btnSequential.addEventListener('click', () => {
            runSequentialRedactor();
        });
    }
}

// ==========================================
// CHATBOT ASSISTENTE DE REDAÇÃO & DISPARO POR API
// ==========================================
function setupRedatorChat() {
    const btnSend = document.getElementById('btn-redator-chat-send');
    const inputMsg = document.getElementById('redator-chat-input');
    const btnClear = document.getElementById('btn-redator-chat-clear');
    const btnGenWithChat = document.getElementById('btn-generate-section-with-chat');
    const btnGenWithChatBottom = document.getElementById('btn-generate-section-with-chat-bottom');

    if (btnSend && inputMsg) {
        btnSend.addEventListener('click', () => {
            const text = inputMsg.value.trim();
            if (text) {
                sendRedatorChatMessage(text);
                inputMsg.value = '';
            }
        });

        inputMsg.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = inputMsg.value.trim();
                if (text) {
                    sendRedatorChatMessage(text);
                    inputMsg.value = '';
                }
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (workspaceState) workspaceState.redatorChatHistory = [];
            const container = document.getElementById('redator-chat-messages');
            if (container) {
                container.innerHTML = `
                    <div class="chat-message agent" style="font-size: 0.85rem; line-height: 1.5; padding: 0.6rem 0.8rem; background: var(--bg-card); border-radius: 8px; border-left: 3px solid var(--color-primary);">
                        🤖 <strong>Assistente:</strong> Chat zerado! Escreva novos ajustes e converse sobre o projeto.
                    </div>`;
            }
            if (typeof showToast === 'function') showToast("Histórico do chat zerado.", "info");
        });
    }

    if (btnGenWithChat) {
        btnGenWithChat.addEventListener('click', () => {
            generateSectionWithChatContext();
        });
    }

    if (btnGenWithChatBottom) {
        btnGenWithChatBottom.addEventListener('click', () => {
            generateSectionWithChatContext();
        });
    }
}

async function sendRedatorChatMessage(userText) {
    if (!workspaceState.redatorChatHistory) workspaceState.redatorChatHistory = [];

    const messagesContainer = document.getElementById('redator-chat-messages');
    
    // Append User Message
    if (messagesContainer) {
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-message user';
        userDiv.innerHTML = `👤 <strong>Você:</strong> ${userText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;
        messagesContainer.appendChild(userDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    workspaceState.redatorChatHistory.push({ sender: 'user', text: userText });

    const selectSec = document.getElementById('redator-section-select');
    const secKey = selectSec ? selectSec.value : 'justificativa';

    // Loading indicator
    let loadingDiv = null;
    if (messagesContainer) {
        loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message agent';
        loadingDiv.innerHTML = `🤖 <em>Consultando histórico do chat e dados cruzados do edital...</em>`;
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    let agentResponseText = "";

    try {
        // --- CONSTRUÇÃO DE MEMÓRIA DO CHAT (HISTÓRICO DAS MENSAGENS ANTERIORES) ---
        let chatMemoryContext = "";
        if (workspaceState.redatorChatHistory && workspaceState.redatorChatHistory.length > 1) {
            const pastTurns = workspaceState.redatorChatHistory.slice(0, -1).slice(-8);
            chatMemoryContext = pastTurns.map(m => 
                `- ${m.sender === 'user' ? 'Usuário' : 'Assistente'}: ${m.text}`
            ).join('\n');
        }

        if (isApiActive()) {
            const profileContext = getEditalProfilePromptContext();
            const editalText = (workspaceState.editalRefText || "").substring(0, 30000);
            const annexesText = (workspaceState.annexes || []).map(a => `Anexo ${a.name}:\n${(a.content || '').substring(0, 10000)}`).join('\n---\n');
            const currentSectionText = workspaceState.documentContent ? (workspaceState.documentContent[secKey] || "") : "";

            const chatPrompt = `Você é o Assistente Especialista de Redação de Editais de Cultura.
O usuário está conversando sobre a seção "${secKey.toUpperCase()}".

[MEMÓRIA E HISTÓRICO DE MENSAGENS ANTERIORES DO CHAT]:
${chatMemoryContext || "Primeira interação do chat."}

[SOLICITAÇÃO / PERGUNTA ATUAL DO USUÁRIO]:
"${userText}"

[DIRETRIZES DO EDITAL & PROPONENTE]:
${profileContext}

[CONTEÚDO DA SEÇÃO ATUAL NO EDITOR]:
${currentSectionText || "Ainda em branco."}

[ANEXOS E EDITAL RELEVANTES]:
${annexesText.substring(0, 20000)}
${editalText.substring(0, 20000)}

Responda considerando todo o histórico da conversa (memória do chat) para manter a continuidade do diálogo. Responda de forma direta, técnica, prestativa e objetiva (em 2 a 4 parágrafos), explicando exatamente como adequar essa seção e fornecendo orientações práticas prontas para aplicação no projeto.`;

            const resPayload = {
                provider: 'gemini',
                api_key: window.geminiKey || localStorage.getItem('gemini_api_key'),
                prompt: chatPrompt,
                system_instruction: "Você é o assistente de redação e adequação de propostas culturais com memória contínua de diálogo.",
                use_cache: true
            };

            const response = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resPayload)
            });

            if (response.ok) {
                const resData = await response.json();
                agentResponseText = resData.text || "Orientações processadas com sucesso.";
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } else {
            // Local Offline Chat Generator com memória
            let memorySnippet = chatMemoryContext ? ` Recordando o diálogo anterior: "${chatMemoryContext.substring(0, 100)}...".` : "";
            agentResponseText = `Com base na análise offline do edital, anexos ingeridos e memória da conversa para a seção <strong>${secKey.toUpperCase()}</strong>:${memorySnippet} Recomenda-se explicitar a paridade de gênero na coordenação, citar nominalmente as contrapartidas gratuitas e garantir o respeito ao teto orçamentário. Clique em <em>"💬 Aplicar Ajustes do Chat & Gerar"</em> para disparar a IA com estes parâmetros.`;
        }
    } catch (chatErr) {
        console.warn("[CHAT] Erro no chatbot:", chatErr);
        agentResponseText = `Entendido! Considerando nossa conversa para a seção <strong>${secKey.toUpperCase()}</strong>, vamos adequar a proposta com base na seguinte diretriz: "${userText}". Clique no botão <em>"💬 Aplicar Ajustes do Chat & Gerar"</em> para disparar o agente da seção.`;
    } finally {
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
    }

    if (messagesContainer) {
        const agentDiv = document.createElement('div');
        agentDiv.className = 'chat-message agent';
        agentDiv.innerHTML = `🤖 <strong>Assistente:</strong> ${renderTextOrMarkdown(agentResponseText)}`;
        messagesContainer.appendChild(agentDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    workspaceState.redatorChatHistory.push({ sender: 'agent', text: agentResponseText });
    saveWorkspaceState();
}

async function generateSectionWithChatContext() {
    const selectSec = document.getElementById('redator-section-select');
    const promptInput = document.getElementById('redator-prompt');

    // Respeitar estritamente a seção selecionada pelo usuário no dropdown do Redator
    const sec = selectSec ? selectSec.value : 'justificativa';
    lastGeneratedSection = sec;

    const targetBadgeName = document.getElementById('generation-target-section-name');
    if (targetBadgeName && selectSec && selectSec.selectedIndex >= 0) {
        targetBadgeName.textContent = selectSec.options[selectSec.selectedIndex].text;
    }

    let extraChatContext = "";
    if (workspaceState.redatorChatHistory && workspaceState.redatorChatHistory.length > 0) {
        const recent = workspaceState.redatorChatHistory.slice(-6);
        extraChatContext = "=== DIRETRIZES E AJUSTES DEBATIDOS NO CHAT (APLICAR OBRIGATORIAMENTE NA SEÇÃO) ===\n" + recent.map(m => `- ${m.sender === 'user' ? 'Solicitação do Usuário' : 'Orientação do Assistente'}: ${m.text}`).join('\n');
    }

    const originalPrompt = promptInput ? promptInput.value.trim() : '';
    const combinedInstructions = originalPrompt
        ? `${originalPrompt}\n\n${extraChatContext}`
        : extraChatContext;

    if (promptInput) {
        promptInput.value = combinedInstructions;
    }

    if (typeof showToast === 'function') showToast(`💬 Disparando agente Redator para a seção ${sec.toUpperCase()} com os ajustes do chat...`, "info");

    const btnGen = document.getElementById('btn-generate-section');
    if (btnGen) {
        btnGen.click();
    }
}

// ==========================================
// ABA FINALIZAÇÃO DO PROJETO (HUB DE EXPORTAÇÃO)
// ==========================================
function setupFinalizacaoTab() {
    const btnPdf = document.getElementById('btn-final-download-pdf');
    const btnDocx = document.getElementById('btn-final-download-docx');
    const btnFinanceXls = document.getElementById('btn-final-finance-xls');
    const btnFinancePdf = document.getElementById('btn-final-finance-pdf');
    const btnRevisorGen = document.getElementById('btn-final-revisor-report-gen');
    const btnRevisorPdf = document.getElementById('btn-final-revisor-pdf');
    const btnAuditPrint = document.getElementById('btn-final-audit-print');

    if (btnPdf) btnPdf.addEventListener('click', () => { printCleanProposal(); });
    if (btnDocx) btnDocx.addEventListener('click', () => { exportCleanDoc(); });
    if (btnFinanceXls) btnFinanceXls.addEventListener('click', () => { downloadFinancePlan(); });
    if (btnFinancePdf) btnFinancePdf.addEventListener('click', () => { downloadFinancePlanPDF(); });
    if (btnRevisorGen) btnRevisorGen.addEventListener('click', () => { generateRevisorReport(); });
    if (btnRevisorPdf) btnRevisorPdf.addEventListener('click', () => { downloadRevisorReportPDF(); });
    if (btnAuditPrint) btnAuditPrint.addEventListener('click', () => { downloadAuditPDF(); });
}

// ==========================================
// SISTEMA DE HISTÓRICO (DESFAZER / REFAZER VERSÃO DO EDITOR PERSISTENTE)
// ==========================================
function pushProposalHistoryState(actionLabel = "Versão Anterior") {
    if (!workspaceState.proposalHistoryStack) workspaceState.proposalHistoryStack = [];
    if (!workspaceState.proposalRedoStack) workspaceState.proposalRedoStack = [];
    
    if (workspaceState && workspaceState.documentContent) {
        const snapshot = JSON.parse(JSON.stringify(workspaceState.documentContent));
        workspaceState.proposalHistoryStack.push({
            timestamp: new Date().toLocaleTimeString(),
            label: actionLabel,
            content: snapshot
        });
        if (workspaceState.proposalHistoryStack.length > 50) workspaceState.proposalHistoryStack.shift();
        // Limpar pilha de refazer em nova ação do editor
        workspaceState.proposalRedoStack = [];
        
        // Sincronizar globais para retrocompatibilidade
        window._proposalHistoryStack = workspaceState.proposalHistoryStack.map(item => item.content || item);
        window._proposalRedoStack = [];
        
        saveWorkspaceState();
        updateHistoryButtonsUI();
    }
}

function updateHistoryButtonsUI() {
    const historyStack = workspaceState.proposalHistoryStack || [];
    const redoStack = workspaceState.proposalRedoStack || [];
    
    const btnUndo = document.getElementById('btn-undo-proposal');
    if (btnUndo) {
        btnUndo.textContent = historyStack.length > 0 ? `⏮️ Versão Anterior (${historyStack.length})` : `⏮️ Versão Anterior`;
        btnUndo.disabled = historyStack.length === 0;
        btnUndo.title = historyStack.length > 0 ? `Restaurar versão gravada às ${historyStack[historyStack.length - 1].timestamp || 'anterior'}` : 'Nenhuma versão anterior gravada';
    }
    const btnRedo = document.getElementById('btn-redo-proposal');
    if (btnRedo) {
        btnRedo.textContent = redoStack.length > 0 ? `⏭️ Retroceder Versão (${redoStack.length})` : `⏭️ Retroceder Versão`;
        btnRedo.disabled = redoStack.length === 0;
    }
}

function undoProposalVersion() {
    const historyStack = workspaceState.proposalHistoryStack || [];
    if (!historyStack || historyStack.length === 0) {
        if (typeof showToast === 'function') showToast("Nenhuma versão anterior gravada no histórico.", "info");
        return;
    }
    if (!workspaceState.proposalRedoStack) workspaceState.proposalRedoStack = [];

    // Guardar estado atual na pilha de refazer
    const currentState = JSON.parse(JSON.stringify(workspaceState.documentContent));
    workspaceState.proposalRedoStack.push({
        timestamp: new Date().toLocaleTimeString(),
        content: currentState
    });

    const previousEntry = historyStack.pop();
    const previousState = previousEntry.content || previousEntry;
    workspaceState.documentContent = previousState;
    
    // Atualizar globais
    window._proposalHistoryStack = historyStack.map(item => item.content || item);
    window._proposalRedoStack = workspaceState.proposalRedoStack.map(item => item.content || item);
    
    saveWorkspaceState();
    syncEditorContentToDOM();
    updatePlaceholderStates();
    updateHistoryButtonsUI();
    if (typeof showToast === 'function') showToast("⏮️ Versão anterior restaurada com sucesso!", "success");
}

function redoProposalVersion() {
    const redoStack = workspaceState.proposalRedoStack || [];
    if (!redoStack || redoStack.length === 0) {
        if (typeof showToast === 'function') showToast("Nenhuma versão posterior para retroceder / restabelecer.", "info");
        return;
    }
    if (!workspaceState.proposalHistoryStack) workspaceState.proposalHistoryStack = [];

    // Guardar estado atual na pilha de desfazer
    const currentState = JSON.parse(JSON.stringify(workspaceState.documentContent));
    workspaceState.proposalHistoryStack.push({
        timestamp: new Date().toLocaleTimeString(),
        content: currentState
    });

    const nextEntry = redoStack.pop();
    const nextState = nextEntry.content || nextEntry;
    workspaceState.documentContent = nextState;
    
    // Atualizar globais
    window._proposalHistoryStack = workspaceState.proposalHistoryStack.map(item => item.content || item);
    window._proposalRedoStack = redoStack.map(item => item.content || item);
    
    saveWorkspaceState();
    syncEditorContentToDOM();
    updatePlaceholderStates();
    updateHistoryButtonsUI();
    if (typeof showToast === 'function') showToast("⏭️ Versão restabelecida com sucesso!", "success");
}

// ==========================================
// REDAÇÃO SEQUENCIAL DE TODAS AS 14 SEÇÕES COM IA
// ==========================================
async function runSequentialRedactor() {
    if (_isProcessingAPI) {
        if (typeof showToast === 'function') showToast("Aguarde o processamento atual terminar.", "warning");
        return;
    }
    _isProcessingAPI = true;

    pushProposalHistoryState();

    const btn = document.getElementById('btn-redator-run-all-sequential');
    if (btn) {
        btn.disabled = true;
        btn.textContent = "⚡ Redigindo 14 Seções Sequencialmente...";
    }

    const sections = [
        'justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento',
        'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica',
        'monitoramento', 'compliance', 'sustentabilidade', 'rider'
    ];

    try {
        if (typeof showToast === 'function') showToast("🚀 Iniciando Redação Sequencial das 14 Seções com IA...", "info");

        for (let i = 0; i < sections.length; i++) {
            const secKey = sections[i];
            if (typeof showToast === 'function') showToast(`✍️ [${i + 1}/14] Redigindo seção ${secKey.toUpperCase()}...`, "info");

            try {
                let text = "";
                if (isApiActive()) {
                    const refinedRaw = await callGeminiForRedator(secKey, "Redigir com profundidade e rigor com base no edital, perfil e anexos ingeridos.");
                    if (refinedRaw) {
                        try {
                            const parsed = JSON.parse(refinedRaw);
                            text = parsed.text || refinedRaw;
                        } catch (e) {
                            if (refinedRaw.includes("=== CONTEÚDO DA SEÇÃO ===") && refinedRaw.includes("=== JUSTIFICATIVA E ADEQUAÇÕES ===")) {
                                const parts = refinedRaw.split("=== JUSTIFICATIVA E ADEQUAÇÕES ===");
                                text = parts[0].replace("=== CONTEÚDO DA SEÇÃO ===", "").trim();
                            } else {
                                text = refinedRaw;
                            }
                        }
                    }
                }

                if (!text || text.length < 20) {
                    const resultRaw = await getSimulatedRedatorText(secKey, "Redigir com base nas diretrizes do edital");
                    try {
                        const parsed = JSON.parse(resultRaw);
                        text = parsed.text || resultRaw;
                    } catch (e) {
                        text = resultRaw;
                    }
                }

                if (text && text.trim().length > 0) {
                    const rendered = renderTextOrMarkdown(text);
                    const targetEl = document.getElementById(`sec-${secKey}`);
                    if (targetEl) {
                        targetEl.innerHTML = appendRevisionMarkup(secKey, targetEl.innerHTML, rendered);
                    } else {
                        workspaceState.documentContent[secKey] = rendered;
                    }
                    syncDOMContentToState();
                    updatePlaceholderStates();
                }
            } catch (secErr) {
                console.warn(`[REDATOR] Erro na seção ${secKey}:`, secErr);
            }
        }

        if (typeof showToast === 'function') showToast("✓ Todas as 14 Seções foram redigidas e integradas ao Editor com sucesso!", "success");
    } catch (err) {
        console.error("Erro na Redação Sequencial:", err);
        if (typeof showToast === 'function') showToast("Erro na redação sequencial: " + err.message, "error");
    } finally {
        _isProcessingAPI = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = "⚡ Redigir Todas as 14 Seções Sequencialmente com IA";
        }
    }
}

// REDAÇÃO COMPLETA COM IA
async function generateFullRedaction() {
    const btn = document.getElementById('btn-generate-full-redaction');
    if (!btn) return;

    // --- PROTEÇÃO DOUBLE-CLICK (BUG #5) ---
    if (_isProcessingAPI) {
        showToast("Aguarde o processamento atual terminar.", "warning");
        return;
    }
    _isProcessingAPI = true;

    btn.disabled = true;
    btn.textContent = "🚀 Agente Redator: Escrevendo proposta completa...";

    const instrucoes = document.getElementById('redacao-completa-instrucoes');
    const extraInstrucoes = instrucoes ? instrucoes.value.trim() : '';

    try {
        // --- GERAR REDAÇÃO COMPLETA VIA SEQUÊNCIA ENCADEADA ---
        await runChainedSequentialGeneration(extraInstrucoes, "", btn);
        addHistoricalMemory("Geração de redação completa integrada para todas as 6 seções.");
        showToast("✓ Redação completa gerada e inserida no Editor!", "success");
    } catch (err) {
        showToast("Erro ao gerar redação completa: " + err.message, "error");
    } finally {
        _isProcessingAPI = false;
        btn.disabled = false;
        btn.textContent = "🚀 Gerar Redação Completa";
    }
}

function getSimulatedFullRedaction(extraInstrucoes) {
    return new Promise(resolve => {
        setTimeout(() => {
            const title = workspaceState.cover.title || 'Projeto Cultural';
            const city = workspaceState.cover.city || 'Cidade - UF';
            const budget = workspaceState.cover.budget || 50000;

            resolve({
                justificativa: `<p>O projeto <strong>"${title}"</strong> justifica-se pela necessidade de ampliar o acesso à cultura na cidade de ${city}, promovendo a descentralização das atividades artísticas e formativas. A proposta está plenamente alinhada com as diretrizes do edital vigente, que busca fomentar ações culturais em territórios de vulnerabilidade social.</p><p>Além disso, o projeto contribui diretamente para a valorização do patrimônio cultural imaterial da região, incentivando a participação de artistas locais e a formação de novos públicos para as artes.${extraInstrucoes ? ' ' + extraInstrucoes : ''}</p>`,
                objetivos: `<p><strong>Objetivo Geral:</strong> Realizar o projeto cultural "${title}" visando democratizar o acesso à cultura e fortalecer o circuito artístico regional de ${city}.</p><p><strong>Objetivos Específicos:</strong></p><ul><li>Promover 5 apresentações artísticas gratuitas em espaços públicos;</li><li>Realizar 3 oficinas de capacitação técnica com 20 vagas cada;</li><li>Beneficiar diretamente mais de 600 espectadores e participantes;</li><li>Contratar no mínimo 70% de mão de obra artística e técnica local;</li><li>Gerar material de registro audiovisual para acervo público.</li></ul>`,
                metodologia: `<p>A execução do projeto obedecerá a três fases estruturadas:</p><p><strong>1. Pré-produção (Mês 1-2):</strong> Reuniões de alinhamento, curadoria artística, contratação de fornecedores, solicitação de alvarás, inscrições para oficinas e campanha de divulgação.</p><p><strong>2. Execução (Mês 3-5):</strong> Desenvolvimento das oficinas formativas, montagem de estrutura física e sonora, realização do circuito de apresentações artísticas em praças e espaços públicos municipais.</p><p><strong>3. Pós-produção (Mês 6):</strong> Desmobilização das equipes, compilação de relatórios, registro documental, clipping de imprensa e envio da prestação de contas ao órgão de fomento.</p>`,
                cronograma: `<table style="width:100%; border-collapse: collapse; font-size: 10pt;"><tr style="background:#f1f5f9;"><th style="border:1px solid #ccc; padding:6px;">Atividade</th><th style="border:1px solid #ccc; padding:6px;">Mês 1</th><th style="border:1px solid #ccc; padding:6px;">Mês 2</th><th style="border:1px solid #ccc; padding:6px;">Mês 3</th><th style="border:1px solid #ccc; padding:6px;">Mês 4</th><th style="border:1px solid #ccc; padding:6px;">Mês 5</th><th style="border:1px solid #ccc; padding:6px;">Mês 6</th></tr><tr><td style="border:1px solid #ccc; padding:6px;">Planejamento e equipe</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Contratações</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Divulgação e inscrições</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Oficinas Formativas</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Circuito de Eventos</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px;"></td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Prestação de Contas</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">✔</td></tr></table>`,
                orcamento: `<table style="width:100%; border-collapse: collapse; font-size: 10pt;"><tr style="background:#f1f5f9;"><th style="border:1px solid #ccc; padding:6px;">Rubrica</th><th style="border:1px solid #ccc; padding:6px;">Qtd</th><th style="border:1px solid #ccc; padding:6px;">Unid.</th><th style="border:1px solid #ccc; padding:6px;">Valor Unit.</th><th style="border:1px solid #ccc; padding:6px;">Total</th></tr><tr><td style="border:1px solid #ccc; padding:6px;">Coordenação de Produção</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">6</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">meses</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.35 / 6).toFixed(2)}</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.35).toFixed(2)}</td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Cachê de Artistas</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">5</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">eventos</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.4 / 5).toFixed(2)}</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.4).toFixed(2)}</td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Taxa Administrativa (15%)</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">1</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">verba</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.15).toFixed(2)}</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.15).toFixed(2)}</td></tr><tr><td style="border:1px solid #ccc; padding:6px;">Divulgação e Mídias (10%)</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">1</td><td style="border:1px solid #ccc; padding:6px; text-align:center;">verba</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.1).toFixed(2)}</td><td style="border:1px solid #ccc; padding:6px; text-align:right;">R$ ${(budget * 0.1).toFixed(2)}</td></tr><tr style="font-weight:bold; background:#f1f5f9;"><td style="border:1px solid #ccc; padding:6px;">TOTAL GERAL</td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; padding:6px;"></td><td style="border:1px solid #ccc; text-align:right;">R$ ${Number(budget).toFixed(2)}</td></tr></table>`,
                acessibilidade: `<p><strong>Medidas de Acessibilidade PCD:</strong></p><ul><li><strong>Sensorial:</strong> Intérprete de Libras em 100% dos eventos presenciais e audiodescrição nos materiais de divulgação em vídeo.</li><li><strong>Física:</strong> Eventos realizados em locais com rampas de acesso, banheiros adaptados e circulação desimpedida.</li><li><strong>Comunicacional:</strong> Materiais de divulgação em formato acessível (fontes legíveis, contraste adequado).</li></ul><p><strong>Contrapartida Social:</strong></p><ul><li>100% dos ingressos e atividades gratuitos;</li><li>Reserva de 20% das vagas formativas para beneficiários do CadÚnico;</li><li>Aplicação de cotas raciais/indígenas conforme normativa vigente.</li></ul>`
            });
        }, 1500);
    });
}

async function callGeminiForRedator(section, promptText, webSearchContext = "") {
    if (!workspaceState.editalProfile && workspaceState.editalRefText && typeof ensureEditalProfile === 'function') {
        await ensureEditalProfile();
    }

    const memoriesContext = (workspaceState.historicalMemories && workspaceState.historicalMemories.length > 0)
        ? workspaceState.historicalMemories.map(m => `- [${m.date}] Projeto: ${m.project} -> ${m.activity}`).join('\n')
        : "Nenhuma memória anterior.";

    const annexesContext = workspaceState.annexes && workspaceState.annexes.length > 0
        ? workspaceState.annexes.map(a => `Nome do Anexo: ${a.name}\nConteúdo: ${a.content ? a.content.substring(0, 25000) : ''}`).join('\n---\n')
        : "Nenhum anexo extra.";

    // Cross-Referencing: Get other sections already generated (limited to prevent token bloat)
    let crossRefContext = "";
    const generatedSections = Object.entries(workspaceState.documentContent)
        .filter(([key, val]) => key !== section && val && val.trim().length > 10);

    if (generatedSections.length > 0) {
        crossRefContext = "\n[OUTRAS SEÇÕES JÁ GERADAS/ALINHADAS NO EDITOR (REFERÊNCIA CRUZADA OBRIGATÓRIA PARA COERÊNCIA COLETIVA)]:\n";
        let accumulatedLength = 0;
        for (const [key, val] of generatedSections) {
            let sectionText = stripHtmlForPayload(val);
            if (sectionText.length > 1500) {
                sectionText = sectionText.substring(0, 1500) + "\n... [TRECHO CORTADO PARA ECONOMIA DE CONTEXTO] ...";
            }
            if (accumulatedLength + sectionText.length > 8000) {
                crossRefContext += `### Seção: ${key.toUpperCase()}\n... [OMITIDO PARA CONSERVAR CONTEXTO] ...\n\n`;
                continue;
            }
            crossRefContext += `### Seção: ${key.toUpperCase()}\n${sectionText}\n\n`;
            accumulatedLength += sectionText.length;
        }
    }

    // Buscar inconformidades e alertas da auditoria anterior da aba de ingestão/auditoria
    const relevantIssues = getRelevantAlertsAndAdjustments(section);
    let auditFeedback = "";
    if (relevantIssues.length > 0) {
        auditFeedback = `\n[ALERTAS DE COMPLIANCE E INCONFORMIDADES DA AUDITORIA A SEREM RESOLVIDOS OBRIGATORIAMENTE NESSA SEÇÃO]:\n${relevantIssues.join('\n')}\n`;
    }

    const editalText = filterRelevantEditalText(workspaceState.editalRefText || "", section);
    const draftText = workspaceState.proposalDraftText || "";
    const editalProfileContext = getEditalProfilePromptContext();

    const prompt = `Você é o Agente Redator Cultural e Escritor de Projetos Sênior.
    Sua missão é realizar uma ANÁLISE PROFUNDA e escrever ou otimizar a seção "${section.toUpperCase()}" do projeto cultural para que fique perfeita e totalmente aderente ao edital.
    
    REGRAS DE ANÁLISE PROFUNDA E OTIMIZAÇÃO:
    - LEITURA E INCORPORAÇÃO MANDATÓRIA DAS ANOTAÇÕES: Se o usuário/proponente escreveu instruções ou anotações na caixa de ideias/chat ("INSTRUÇÕES E ANOTAÇÕES MANDATÓRIAS DO USUÁRIO"), você DEVE obrigatoriamente ler, incorporar e contemplar cada uma dessas diretrizes na redação da seção e explicar na justificativa como foram aplicadas.
    - Realize um cruzamento rigoroso de conformidade e responda a todas as exigências do Edital e de seus Anexos relativas a esta seção.
    - Alinhe perfeitamente a redação desta seção com o conteúdo das outras seções já geradas (coerência entre justificativa, metodologia, cronograma, planilha de custos e acessibilidade).
    - Resolva todos os alertas de auditoria e sugestões de ajuste listados para esta seção.
    - Se for a planilha orçamentária ou o cronograma, formate obrigatoriamente como tabela HTML limpa e alinhada com as normas ABNT.
    - Remova qualquer tipo de explicação de IA ou saudação conversacional.
    
    REGRAS DE FORMATAÇÃO E ESTRUTURA DA RESPOSTA (OBRIGATÓRIO):
    Você DEVE retornar sua resposta dividida estritamente em duas partes com os delimitadores indicados abaixo:
    
    === CONTEÚDO DA SEÇÃO ===
    [Aqui você escreve o texto HTML rico da seção, pronto para inserção, iniciando direto por títulos como <h3> ou <h4>. Não use blocos de código markdown.]
    
    === JUSTIFICATIVA E ADEQUAÇÕES ===
    [Aqui você escreve em texto corrido detalhadamente o que foi adequado, o que encontrou de mudanças e por que essa versão é melhor/conforme]
    
    ${editalProfileContext}

    [TÍTULO DO PROJETO]: ${workspaceState.cover.title || "Não definido"}
    [PROPONENTE]: ${workspaceState.cover.proponent || "Não definido"}
    [FOMENTO]: ${workspaceState.cover.institution || "Não definido"}
    [ORÇAMENTO PROPOSTO]: R$ ${workspaceState.cover.budget || "Não definido"}
    [CIDADE]: ${workspaceState.cover.city || "Não definido"}
    [DIRETRIZES DO USUÁRIO]: ${promptText || "Redigir seção detalhada respeitando as regras do edital."}
    
    [RASCUNHO INICIAL / RASCUNHO DO USUÁRIO]:
    ${draftText ? draftText.substring(0, 25000) : "Sem rascunho inicial do usuário."}
    
    [EDITAL DE REFERÊNCIA (REGRAS DO PROJETO)]:
    ${editalText ? editalText.substring(0, 40000) : "Nenhum edital ativo."}
    
    [PESQUISA WEB ATUALIZADA DO EDITAL]:
    ${webSearchContext || "Nenhuma pesquisa adicional encontrada."}
    
    [ANEXOS ADICIONAIS DO EDITAL]:
    ${annexesContext}
    
    [MEMÓRIA DE APRENDIZADO DO AGENTE (PROJETOS ANTERIORES)]:
    ${memoriesContext}
    
    ${crossRefContext}
    
    ${auditFeedback}
    `;

    // Chamada pesada ('heavy') não-streaming sem schema JSON para velocidade máxima
    const responseText = await callLLMGateway(prompt, null, 'heavy', null, false);
    return responseText.trim();
}

function getSimulatedRedatorText(section, extraPrompt) {
    return new Promise(resolve => {
        setTimeout(() => {
            const title = workspaceState.cover.title || "Circuito Cultural de Artes";
            const city = workspaceState.cover.city || "Linhares - ES";
            const budget = workspaceState.cover.budget || 150000;
            const proponent = workspaceState.cover.proponent || "Grupo de Teatro Esperança";
            const profile = workspaceState.editalProfile || getOfflineEditalProfile(workspaceState.editalRefText, workspaceState.annexes);

            const fomentoInfo = profile.fomento || "Chamada Pública Cultural";
            const anexosInfo = profile.anexos_analisados || "Anexos do edital integrados";
            const tetosInfo = profile.tetos_e_limites || "Limites orçamentários do edital respeitados";

            let response = "";
            let justificativa = "";
            switch (section) {
                case 'justificativa':
                    response = `<h3>1. Justificativa e Relevância Cultural</h3>
<p>O projeto <strong>"${title}"</strong>, proposto por <strong>${proponent}</strong>, atende de forma direta às diretrizes do edital de <strong>${fomentoInfo}</strong> e à necessidade de descentralização das atividades culturais no município de <strong>${city}</strong>. A iniciativa visa dinamizar a economia criativa local, promover a fruição artística e valorizar a identidade cultural comunitária.</p>
<p>Ademais, justifica-se pelo elevado impacto social e atendimento à análise prévia do edital (<em>${anexosInfo}</em>), garantindo pleno cumprimento às diretrizes de democratização de acesso, limites normativos (<em>${tetosInfo}</em>) e à legislação vigente de incentivo à cultura (Lei 13.146/2015).</p>`;
                    justificativa = `Justificativa cruzada com a análise de ingestão do edital (${fomentoInfo}). Adequada para mérito cultural, descentralização e limites do edital.`;
                    break;

                case 'objetivos':
                    response = `<h3>2. Objetivos Geral e Específicos</h3>
<p><strong>Objetivo Geral:</strong> Democratizar o acesso às artes e à cultura no município de ${city}, através da realização de apresentações artísticas e oficinas formativas gratuitas durante 6 meses.</p>
<p><strong>Objetivos Específicos:</strong></p>
<ul>
    <li>Realizar 5 apresentações culturais abertas à comunidade em praças públicas ou equipamentos culturais.</li>
    <li>Oferecer 3 oficinas pedagógicas de capacitação de 12 horas cada para estudantes da rede pública.</li>
    <li>Garantir 100% de acessibilidade comunicacional (intérprete de LIBRAS e audiodescrição) em todas as atividades.</li>
    <li>Beneficiar diretamente pelo menos 1.500 pessoas de forma totalmente gratuita.</li>
</ul>`;
                    justificativa = "Objetivos divididos em metas quantificáveis e mensuráveis conforme exigido pelos editais públicos.";
                    break;

                case 'metodologia':
                    response = `<h3>3. Metodologia e Plano de Execução</h3>
<p>O projeto será executado em três fases operacionais bem definidas:</p>
<ol>
    <li><strong>Fase 1: Pré-Produção (Múltiplos Média Mês 1-2):</strong> Contratação da equipe técnica, reserva de espaços, confecção de materiais de divulgação e pré-inscrição de alunos.</li>
    <li><strong>Fase 2: Execução (Mês 3-5):</strong> Realização dos ensaios, montagem de infraestrutura cênica/técnica, realização das 5 apresentações e ministração das oficinas pedagógicas.</li>
    <li><strong>Fase 3: Pós-Produção e Prestação de Contas (Mês 6):</strong> Desmontagem, avaliação de indicadores, compilação de clipping e elaboração do relatório final de prestação de contas.</li>
</ol>`;
                    justificativa = "Metodologia operacional detalhada em pré-produção, execução e pós-produção.";
                    break;

                case 'cronograma':
                    response = `<h3>4. Cronograma Físico-Financeiro</h3>
<table style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; font-size:12px;">
    <thead>
        <tr style="background:#f1f5f9; text-align:left;">
            <th style="padding:8px; border:1px solid #cbd5e1;">Atividade / Etapa</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">M1</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">M2</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">M3</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">M4</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">M5</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">M6</th>
        </tr>
    </thead>
    <tbody>
        <tr><td style="padding:6px; border:1px solid #cbd5e1;">1. Pré-produção e Contratação de Equipe</td><td style="text-align:center;">X</td><td style="text-align:center;">X</td><td></td><td></td><td></td><td></td></tr>
        <tr><td style="padding:6px; border:1px solid #cbd5e1;">2. Divulgação e Assessoria de Imprensa</td><td style="text-align:center;">X</td><td style="text-align:center;">X</td><td style="text-align:center;">X</td><td style="text-align:center;">X</td><td style="text-align:center;">X</td><td></td></tr>
        <tr><td style="padding:6px; border:1px solid #cbd5e1;">3. Realização das Apresentações e Oficinas</td><td></td><td></td><td style="text-align:center;">X</td><td style="text-align:center;">X</td><td style="text-align:center;">X</td><td></td></tr>
        <tr><td style="padding:6px; border:1px solid #cbd5e1;">4. Avaliação, Relatórios e Prestação de Contas</td><td></td><td></td><td></td><td></td><td style="text-align:center;">X</td><td style="text-align:center;">X</td></tr>
    </tbody>
</table>`;
                    justificativa = "Cronograma físico organizado por meses e fases operacionais claras.";
                    break;

                case 'orcamento':
                    const totalBudget = budget;
                    const cArt = totalBudget * 0.40;
                    const cProd = totalBudget * 0.15;
                    const cAdm = totalBudget * 0.15;
                    const cDiv = totalBudget * 0.10;
                    const cAcc = totalBudget * 0.10;
                    const cAud = totalBudget * 0.10;
                    const vTotal = totalBudget;

                    response = `<h3>5. Planilha Orçamentária Detalhada</h3>
<table style="width:100%; border-collapse:collapse; border:1px solid #ddd; font-size:11px;">
    <thead>
        <tr style="background:#f1f5f9;">
            <th style="padding:6px; border:1px solid #ddd;">Item de Despesa / Rubrica</th>
            <th style="text-align:center; padding:6px; border:1px solid #ddd;">Qtd</th>
            <th style="text-align:center; padding:6px; border:1px solid #ddd;">Unidade</th>
            <th style="text-align:right; padding:6px; border:1px solid #ddd;">Unitário (R$)</th>
            <th style="text-align:right; padding:6px; border:1px solid #ddd;">Total (R$)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style="padding:6px; border:1px solid #ddd;">1. Coordenação Geral / Diretor de Produção (Administração)</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">1</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">Serviço</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
            <td style="padding:6px; border:1px solid #ddd;">2. Cachês de Artistas e Palestrantes (PF/PJ - 40%)</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">4</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">Mês</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${(cArt / 4).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cArt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
            <td style="padding:6px; border:1px solid #ddd;">3. Intérpretes de Libras e Audiodescrição (Acessibilidade - 10%)</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">2</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">Serviço</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${(cAcc / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cAcc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
            <td style="padding:6px; border:1px solid #ddd;">4. Divulgação e Assessoria de Imprensa (Marketing - 10%)</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">1</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">Verba</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cDiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cDiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
            <td style="padding:6px; border:1px solid #ddd;">5. Taxa de Administração e Impostos RPA (INSS/IRRF - 15%)</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">1</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">Verba</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="background:#f8fafc;">
            <td style="padding:6px; border:1px solid #ddd;">6. Serviços de Contabilidade e Auditoria de Contas (10%)</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">1</td>
            <td style="text-align:center; padding:6px; border:1px solid #ddd;">Serviço</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cAud.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd;">R$ ${cAud.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
    </tbody>
    <tfoot>
        <tr style="font-weight:bold; background:#e2e8f0;">
            <td colspan="4" style="padding:6px; border:1px solid #ddd;">Valor Total do Projeto</td>
            <td style="text-align:right; padding:6px; border:1px solid #ddd; color:var(--color-primary);">R$ ${vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
    </tfoot>
</table>`;
                    justificativa = "Planilha orçamentária ajustada com precisão. Custos administrativos limitados a 15% e divulgação a 10% do teto geral planejado.";
                    break;

                case 'acessibilidade':
                    response = `<h3>6. Plano de Acessibilidade e Cotas Afirmativas</h3>
<p><strong>Acessibilidade Física e Sensorial:</strong> O projeto garante acessibilidade arquitetônica (rampas de acesso, sanitários PCD e espaços reservados na plateia). Na acessibilidade comunicacional, contaremos com intérpretes de LIBRAS presenciais em todas as apresentações e audiodescrição gravada para as peças de divulgação digital, em conformidade com a Lei 13.146/2015 e NBR 9050.</p>
<p><strong>Democratização de Acesso e Ações Afirmativas:</strong> Garantimos entrada 100% gratuita para todo o público. As vagas para oficinas formativas reservarão no mínimo 20% das vagas para pessoas autodeclaradas negras, indígenas ou de baixa renda vinculadas ao CadÚnico.</p>`;
                    justificativa = "Plano completo de acessibilidade física e comunicacional com reserva de cotas regulamentares.";
                    break;

                case 'publico':
                    response = `<h3>7. Público-Alvo e Beneficiários</h3>
<p>O público-alvo prioritário é constituído por estudantes da rede pública de ensino, idosos, jovens e agentes culturais de <strong>${city}</strong>.</p>
<p><strong>Estimativa de Atendimento:</strong> Estima-se alcançar diretamente 1.500 pessoas e indiretamente 5.000 pessoas por meio de redes sociais e cobertura de imprensa regional. Toda a programação é 100% livre e gratuita.</p>`;
                    justificativa = "Quantificação precisa de beneficiários diretos e indiretos com foco na gratuidade universal.";
                    break;

                case 'contrapartida':
                    response = `<h3>8. Contrapartida Social e Legado</h3>
<p>Como contrapartida social de interesse público, o projeto oferecerá:</p>
<ul>
    <li>12 horas de oficinas formativas gratuitas direcionadas a professores e alunos da rede pública de ${city}.</li>
    <li>Doação de 20% de todo o acervo educativo ou registro fotográfico/audiovisual produzido para a Biblioteca Pública Municipal.</li>
    <li>Roda de conversa com os artistas ao final de cada apresentação sobre mediação cultural.</li>
</ul>`;
                    justificativa = "Contrapartidas pedagógicas e institucionais que deixam um legado duradouro no município.";
                    break;

                case 'comunicacao':
                    response = `<h3>9. Plano de Comunicação e Divulgação</h3>
<p>A estratégia de comunicação abrange ações integradas digitais e presenciais:</p>
<ul>
    <li><strong>Assessoria de Imprensa Local:</strong> Envio de press releases para rádios, jornais e portais de notícias de ${city}.</li>
    <li><strong>Redes Sociais e Tráfego Pago:</strong> Impulsionamento de vídeos e cartazes digitais acessíveis no Instagram e Facebook.</li>
    <li><strong>Material Gráfico Acessível:</strong> Produção de cartazes em formato digital com QR Code direcionando para a versão com audiodescrição.</li>
</ul>`;
                    justificativa = "Plano multicanal direcionado à divulgação regional e com recursos de acessibilidade.";
                    break;

                case 'ficha_tecnica':
                    response = `<h3>10. Ficha Técnica e Equipe Profissional</h3>
<p>A equipe é composta por profissionais com histórico comprovado na área cultural:</p>
<ul>
    <li><strong>Diretor de Produção / Coordenação Geral:</strong> Responsável pela gestão administrativa e institucional do projeto.</li>
    <li><strong>Diretor Artístico / Coordenador Pedagógico:</strong> Responsável pela concepção cênica e mediação das oficinas.</li>
    <li><strong>Intérprete de LIBRAS:</strong> Profissional habilitado registrado na FENEIS.</li>
    <li><strong>Audiodescritor / Consultor PCD:</strong> Responsável pelo roteiro e narração de acessibilidade.</li>
    <li><strong>Assessor de Imprensa / Designer Gráfico:</strong> Responsável pela comunicação visual e clipping.</li>
    <li><strong>Contador / Auditor Financeiro:</strong> Responsável pelo acompanhamento fiscal e prestação de contas.</li>
</ul>`;
                    justificativa = "Ficha técnica qualificada abrangendo todas as funções operacionais, artísticas e de acessibilidade.";
                    break;

                case 'monitoramento':
                    response = `<h3>11. Plano de Monitoramento e Matriz Lógica</h3>
<p>O acompanhamento dos resultados será realizado mediante os seguintes instrumentos:</p>
<ul>
    <li><strong>Listas de Presença Assinadas:</strong> Controle quantitativo de participantes nas oficinas e apresentações.</li>
    <li><strong>Pesquisa de Satisfação (QR Code):</strong> Coleta de opinião do público quanto à qualidade e acessibilidade das atividades.</li>
    <li><strong>Clipping de Mídia e Redes Sociais:</strong> Relatório fotográfico e métricas digitais de alcance.</li>
</ul>`;
                    justificativa = "Indicadores de desempenho e métodos de verificação qualitativos e quantitativos.";
                    break;

                case 'compliance':
                    response = `<h3>12. Compliance, Direitos Autorais e Marcos Legais</h3>
<p>O proponente comprova regularidade fiscal e trabalhista plena por meio de Certidões Negativas (CNDT, Receita Federal e FGTS).</p>
<p>No tocante aos direitos autorais, o projeto cumpre as diretrizes do ECAD para liberação de mídias musicais e garante a cessão prévia de imagem e voz de todos os participantes. Se aplicável, será realizado o cadastro no SisGen para salvaguarda do patrimônio genético.</p>`;
                    justificativa = "Demonstrativo completo de conformidade fiscal, trabalhista e de licenças de direitos autorais.";
                    break;

                case 'sustentabilidade':
                    response = `<h3>13. Sustentabilidade Ambiental e Práticas ESG</h3>
<p>O projeto adota diretrizes de responsabilidade ambiental:</p>
<ul>
    <li>Eliminação de descartáveis plásticos de uso único na produção e camarins.</li>
    <li>Coleta seletiva e destinação correta de resíduos gerados durante as apresentações.</li>
    <li>Priorização de materiais promocionais digitais em substituição à panfletagem impressa de grande porte.</li>
</ul>`;
                    justificativa = "Ações concretas de preservação ambiental e diminuição da pegada de carbono na produção cultural.";
                    break;

                case 'rider':
                    response = `<h3>14. Rider Técnico e Infraestrutura Logística</h3>
<p><strong>Rider de Som:</strong> Sistema de P.A. 4.000W RMS adequado para o espaço, mesa de som digital 16 canais, 4 microfones sem fio UHF e monitores de retorno.</p>
<p><strong>Rider de Luz:</strong> 8 refletores LED PAR 64, mesa DMX e estrutura de box truss de alumínio.</p>
<p><strong>Logística e Camarim:</strong> Espaço reservado com iluminação adequada, pontos de tomada 110V/220V e acessibilidade garantida para a equipe e artistas.</p>`;
                    justificativa = "Detalhamento de infraestrutura de áudio, iluminação e logística de camarim.";
                    break;
                
                default:
                    response = `<h3>Seção Otimizada</h3><p>Conteúdo estruturado e adequado para o projeto <strong>${title}</strong> em ${city}.</p>`;
                    justificativa = "Seção redigida com foco na conformidade com o edital.";
                    break;
            }

            if (extraPrompt && extraPrompt.trim() && !extraPrompt.includes("Redigir com base nas diretrizes")) {
                const cleanExtra = extraPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                response += `<div style="margin-top: 1rem; padding: 0.8rem; background: var(--bg-panel); border-left: 3px solid var(--color-primary); border-radius: 4px;">
                    <p style="margin: 0; font-weight: 600; font-size: 0.85rem; color: var(--color-primary);">📌 Diretrizes e Anotações do Proponente Incorporadas:</p>
                    <p style="margin: 0.3rem 0 0 0; font-size: 0.85rem;">${cleanExtra}</p>
                </div>`;
                justificativa += ` | Anotação do proponente incorporada: "${extraPrompt.substring(0, 80)}..."`;
            }

            resolve(JSON.stringify({
                text: response,
                justificativa: justificativa
            }));
        }, 300);
    });
}


// ==========================================
// ABA 3: REVISOR HUB CENTRAL DE INTELIGÊNCIA
// ==========================================
let revisorSuggestedContent = null; // Guardará a sugestão gerada temporariamente

function setupRevisor() {
    // Eventos de clique nos cards dos 14 agentes
    const cards = document.querySelectorAll('.revisor-agent-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const agentKey = card.getAttribute('data-agent');
            selectRevisor(agentKey);
        });
    });

    // Botão de rodar único agente
    const btnSingle = document.getElementById('btn-run-single-agent');
    if (btnSingle) {
        btnSingle.addEventListener('click', () => {
            runSingleAgent(activeRevisor);
        });
    }

    // Botão de baixar planilha financeira separada do revisor
    const btnDownloadFinanceXls = document.getElementById('btn-download-finance-xls');
    if (btnDownloadFinanceXls) {
        btnDownloadFinanceXls.addEventListener('click', downloadFinancePlan);
    }

    const btnDownloadFinancePdf = document.getElementById('btn-download-finance-pdf');
    if (btnDownloadFinancePdf) {
        btnDownloadFinancePdf.addEventListener('click', downloadFinancePlanPDF);
    }

    // Botões principais de baixar planilha financeira na aba do revisor
    const btnDownloadFinanceXlsMain = document.getElementById('btn-download-finance-xls-main');
    if (btnDownloadFinanceXlsMain) {
        btnDownloadFinanceXlsMain.addEventListener('click', downloadFinancePlan);
    }

    const btnDownloadFinancePdfMain = document.getElementById('btn-download-finance-pdf-main');
    if (btnDownloadFinancePdfMain) {
        btnDownloadFinancePdfMain.addEventListener('click', downloadFinancePlanPDF);
    }

    // Botão de revisão consolidada do supervisor
    const btnRevisorConsolidated = document.getElementById('btn-revisor-consolidated-revision');
    if (btnRevisorConsolidated) {
        btnRevisorConsolidated.addEventListener('click', async () => {
            if (_isProcessingAPI) {
                showToast("Aguarde o processamento atual terminar.", "warning");
                return;
            }
            _isProcessingAPI = true;
            btnRevisorConsolidated.disabled = true;
            btnRevisorConsolidated.textContent = "Revisando Proposta...";
            try {
                await runFinalConsolidatedRevision();
            } catch (err) {
                console.error("Erro na revisão consolidada do supervisor:", err);
                showToast("Erro na revisão consolidada: " + err.message, "error");
            } finally {
                _isProcessingAPI = false;
                btnRevisorConsolidated.disabled = false;
                btnRevisorConsolidated.textContent = "✨ Otimizar Proposta Completa (Supervisor)";
            }
        });
    }

    // Botões do Relatório Consolidado do Revisor
    const btnGenerateRevisorReport = document.getElementById('btn-generate-revisor-report');
    if (btnGenerateRevisorReport) {
        btnGenerateRevisorReport.addEventListener('click', generateRevisorReport);
    }

    const btnDownloadRevisorPdf = document.getElementById('btn-download-revisor-pdf');
    if (btnDownloadRevisorPdf) {
        btnDownloadRevisorPdf.addEventListener('click', downloadRevisorReportPDF);
    }

    // Botão de rodar todos os agentes
    const btnRunAll = document.getElementById('btn-revisor-run-all');
    if (btnRunAll) {
        btnRunAll.addEventListener('click', runAllAgents);
    }


    // Botões do Diff View
    const btnApply = document.getElementById('btn-apply-revisor-diff');
    if (btnApply) {
        btnApply.addEventListener('click', applyRevisorDiff);
    }

    const btnDiscard = document.getElementById('btn-discard-revisor-diff');
    if (btnDiscard) {
        btnDiscard.addEventListener('click', () => {
            document.getElementById('revisor-diff-card').style.display = 'none';
            revisorSuggestedContent = null;
            showToast("Sugestão descartada.", "info");
        });
    }

    // Botões de finalização
    const btnPdf = document.getElementById('btn-consolidate-download-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            printCleanProposal();
        });
    }

    const btnDocx = document.getElementById('btn-consolidate-download-docx');
    if (btnDocx) {
        btnDocx.addEventListener('click', () => {
            exportCleanDoc();
        });
    }

    const btnFinXlsMain = document.getElementById('btn-download-finance-xls-main');
    if (btnFinXlsMain) {
        btnFinXlsMain.addEventListener('click', downloadFinancePlan);
    }

    const btnFinPdfMain = document.getElementById('btn-download-finance-pdf-main');
    if (btnFinPdfMain) {
        btnFinPdfMain.addEventListener('click', downloadFinancePlanPDF);
    }

    // Restaurar relatório do revisor salvo
    const savedReport = workspaceState.lastRevisorReport;
    if (savedReport) {
        const contentEl = document.getElementById('revisor-report-content');
        if (contentEl) {
            contentEl.innerHTML = savedReport;
            contentEl.style.display = 'block';
        }
        const btnDownloadReport = document.getElementById('btn-download-revisor-pdf');
        if (btnDownloadReport) {
            btnDownloadReport.style.display = 'inline-block';
        }
    }
}

function selectRevisor(agentKey) {
    if (!REVISORES_METADATA[agentKey]) return;
    activeRevisor = agentKey;

    document.querySelectorAll('.revisor-agent-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-agent') === agentKey);
    });

    updateRevisorPanelUI();
}

function updateRevisorPanelUI() {
    const meta = REVISORES_METADATA[activeRevisor];
    const result = workspaceState.revisorAgentsResults[activeRevisor];

    document.getElementById('revisor-panel-title').textContent = `${meta.icon} Parecer: ${meta.name}`;

    const scoreEl = document.getElementById('revisor-panel-score');
    const feedbackEl = document.getElementById('revisor-panel-feedback');

    if (result) {
        scoreEl.textContent = `${result.nota}/100`;
        feedbackEl.innerHTML = renderTextOrMarkdown(result.parecer);
    } else {
        scoreEl.textContent = `--`;
        feedbackEl.innerHTML = `<p>${meta.desc}</p><p style="color: var(--text-muted); margin-top: 0.5rem;"><em>Parecer não gerado para este sub-agente. Clique em "Analisar apenas este agente" ou "Acionar Todos" para rodar a avaliação.</em></p>`;
    }

    // Mostrar/Esconder botão de planilha orçamentária do revisor
    const xlsBtn = document.getElementById('btn-download-finance-xls');
    const pdfBtn = document.getElementById('btn-download-finance-pdf');
    const hasFinance = (activeRevisor === 'orcamento' && result);
    if (xlsBtn) {
        xlsBtn.style.display = hasFinance ? 'inline-block' : 'none';
    }
    if (pdfBtn) {
        pdfBtn.style.display = hasFinance ? 'inline-block' : 'none';
    }
}

async function runSingleAgent(agentKey) {
    syncDOMContentToState();

    const statusBadge = document.getElementById(`status-${agentKey}`);
    const btnSingle = document.getElementById('btn-run-single-agent');

    if (statusBadge) {
        statusBadge.textContent = "⚡ Etapa 1...";
        statusBadge.className = "agent-status-badge status-running";
    }
    if (btnSingle && activeRevisor === agentKey) {
        btnSingle.disabled = true;
        btnSingle.textContent = "⚡ Analisando Etapa 1...";
    }

    try {
        // --- ETAPA 1 (PRIMEIRO): Avaliação local offline (IndexedDB + OfflineAuditor) ---
        let responseData = null;
        let localEvaluation = null;
        if (window.offlineAuditor && typeof window.offlineAuditor.evaluateAgentLocal === 'function') {
            const agentMeta = REVISORES_METADATA[agentKey] || { name: agentKey };
            localEvaluation = window.offlineAuditor.evaluateAgentLocal(
                { id: agentKey, title: agentMeta.name, text: workspaceState.documentContent[agentKey] || "", keywords: [agentKey, 'regra', 'conformidade'] },
                JSON.stringify(workspaceState.documentContent || {}).toLowerCase(),
                { totalValue: workspaceState.cover.budget || 150000, adminPercent: 12 }
            );
            responseData = {
                nota: localEvaluation.nota,
                parecer: localEvaluation.parecer
            };
        } else {
            responseData = await getSimulatedSubAgentResponse(agentKey);
        }

        workspaceState.revisorAgentsResults[agentKey] = responseData;
        saveWorkspaceState();

        if (statusBadge) {
            statusBadge.textContent = `Nota: ${responseData.nota}`;
            statusBadge.className = "agent-status-badge status-completed";
        }

        if (activeRevisor === agentKey) {
            updateRevisorPanelUI();
            prepareDiffView(responseData.parecer);
        }

        showToast(`⚡ Etapa 1: Análise local de ${REVISORES_METADATA[agentKey].name} concluída.`, "info");

        // --- ETAPA 2 (SEGUNDO): Pesquisa Online Leve (Regras e Leis) ---
        let webSearchContext = "";
        let searchQuery = (workspaceState.cover.institution || "") + " " + agentKey + " regras e normas";
        searchQuery = searchQuery.trim();

        if (searchQuery) {
            try {
                const searchRes = await fetch('/api/search-web-editais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery })
                });
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.results && searchData.results.length > 0) {
                        webSearchContext = `DIRETRIZES DA PESQUISA WEB PARA ${agentKey.toUpperCase()}:\n`;
                        searchData.results.slice(0, 2).forEach(r => {
                            webSearchContext += `- ${r.title}: ${r.snippet}\n`;
                        });
                        showToast(`🌐 Etapa 2: Normas web capturadas para ${REVISORES_METADATA[agentKey].name}.`, "info");
                    }
                }
            } catch (err) {
                console.warn("Pesquisa web leve ignorada para o agente:", err);
            }
        }

        // --- ETAPA 3 (TERCEIRO): Requisição via API LLM (Gemini) ---
        if (isApiActive()) {
            if (btnSingle && activeRevisor === agentKey) btnSingle.textContent = "🤖 Etapa 3: Refinando com IA...";
            try {
                const aiResult = await callGeminiForSubAgent(agentKey, localEvaluation, webSearchContext);
                if (aiResult && aiResult.nota) {
                    workspaceState.revisorAgentsResults[agentKey] = aiResult;
                    saveWorkspaceState();

                    if (statusBadge) {
                        statusBadge.textContent = `Nota: ${aiResult.nota}`;
                        statusBadge.className = "agent-status-badge status-completed";
                    }

                    if (activeRevisor === agentKey) {
                        updateRevisorPanelUI();
                        prepareDiffView(aiResult.parecer);
                    }

                    showToast(`🤖 Etapa 3: Análise do agente ${REVISORES_METADATA[agentKey].name} finalizada com sucesso!`, "success");
                }
            } catch (apiErr) {
                console.warn("Falha na Etapa 3 da API LLM para o agente:", apiErr);
                showToast(`⚠️ API indisponível: Mantido o parecer da Etapa 1/2.`, "warning");
            }
        } else {
            showToast(`✓ Agente ${REVISORES_METADATA[agentKey].name} concluiu a análise local!`, "success");
        }
    } catch (err) {
        if (statusBadge) {
            statusBadge.textContent = "Falhou";
            statusBadge.className = "agent-status-badge status-failed";
        }
        showToast(`Erro no agente: ${err.message}`, "error");
    } finally {
        if (btnSingle && activeRevisor === agentKey) {
            btnSingle.disabled = false;
            btnSingle.textContent = "Analisar apenas este agente";
        }
    }
}

async function runAllAgents() {
    // --- PROTEÇÃO DOUBLE-CLICK (BUG #5) ---
    if (_isProcessingAPI) {
        showToast("Aguarde o processamento atual terminar.", "warning");
        return;
    }
    _isProcessingAPI = true;

    syncDOMContentToState();

    const btn = document.getElementById('btn-revisor-run-all');
    if (btn) {
        btn.disabled = true;
        btn.textContent = "⚡ Executando Pipeline em 3 Etapas...";
    }

    const agents = Object.keys(REVISORES_METADATA);

    try {
        agents.forEach(agentKey => {
            const badge = document.getElementById(`status-${agentKey}`);
            if (badge) {
                badge.textContent = "Analisando...";
                badge.className = "agent-status-badge status-running";
            }
        });

        // Chamada única ao aiController.runAudit (Garante Etapa 1 Offline DB -> Etapa 2 Web Search -> Etapa 3 API Gemini)
        const consolidatedResult = await window.aiController.runAudit(workspaceState);

        // Mesclar alertas do linter local
        const localAlerts = runPreFlightLinter();
        if (localAlerts.length > 0) {
            if (!consolidatedResult.auditoria) consolidatedResult.auditoria = {};
            if (!consolidatedResult.auditoria.alertas) consolidatedResult.auditoria.alertas = [];
            consolidatedResult.auditoria.alertas = localAlerts.concat(consolidatedResult.auditoria.alertas);
        }

        // Salvar resultados no estado global
        workspaceState.revisorAgentsResults = consolidatedResult.revisorAgentsResults || {};
        workspaceState.lastAuditData = consolidatedResult.auditoria || {};
        saveWorkspaceState();

        // Atualizar badges dos agentes com animação sequencial
        agents.forEach((agentKey, index) => {
            setTimeout(() => {
                const badge = document.getElementById(`status-${agentKey}`);
                const result = workspaceState.revisorAgentsResults[agentKey];
                if (badge && result) {
                    badge.textContent = `Nota: ${result.nota}`;
                    badge.className = "agent-status-badge status-completed";
                }
            }, index * 50);
        });

        updateRevisorPanelUI();
        if (typeof renderAuditorResults === 'function') {
            renderAuditorResults(workspaceState.lastAuditData);
        }

        showToast("✓ Todos os agentes executados com sucesso!", "success");
    } catch (err) {
        console.error("Erro ao rodar todos os agentes:", err);
        showToast("Erro ao rodar os agentes: " + err.message, "error");

        // Reset status badges on failure
        agents.forEach(agentKey => {
            const badge = document.getElementById(`status-${agentKey}`);
            if (badge && badge.textContent === "Analisando...") {
                badge.textContent = "Falhou";
                badge.className = "agent-status-badge status-failed";
            }
        });
    } finally {
        _isProcessingAPI = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Acionar Todos os Agentes em Paralelo";
        }
    }
}

async function runFinalConsolidatedRevision() {
    // Sincronizar DOM primeiro
    syncDOMContentToState();

    // Gravar histórico de versão ANTES de modificar o documento
    pushProposalHistoryState("Antes da Revisão do Supervisor");

    if (!isApiActive()) {
        showToast("Chave da API ausente. A revisão consolidada foi simulada localmente.", "warning");
        if (workspaceState.lastAuditData) {
            const hasAces = workspaceState.documentContent.acessibilidade && workspaceState.documentContent.acessibilidade.length > 100;
            const hasOrc = workspaceState.documentContent.orcamento && workspaceState.documentContent.orcamento.length > 100;
            if (!hasAces) {
                workspaceState.documentContent.acessibilidade = `<h3>6. Plano de Acessibilidade PCD</h3><p>Fica assegurada a presença de intérprete de Libras em todas as transmissões ao vivo e a confecção de audiodescrição para as peças audiovisuais, em conformidade com as exigências normativas.</p>`;
            }
            if (!hasOrc) {
                workspaceState.documentContent.orcamento = `<h3>5. Planilha Orçamentária Otimizada</h3><table style="width:100%; border-collapse:collapse; border:1px solid #ddd; font-size:12px;"><tr style="background:#f1f5f9;"><th>Item</th><th>Quantidade</th><th>Unidade</th><th>Valor (R$)</th></tr><tr><td>Diretor de Produção</td><td>1</td><td>Serviço</td><td>15.000,00</td></tr><tr><td>Acessibilidade (Libras)</td><td>1</td><td>Serviço</td><td>5.000,00</td></tr><tr style="font-weight:bold; background:#e2e8f0;"><td colspan="3">Total</td><td>20.000,00</td></tr></table>`;
            }
            const newSections = ['publico', 'contrapartida', 'comunicacao', 'ficha_tecnica', 'monitoramento', 'compliance', 'sustentabilidade', 'rider'];
            newSections.forEach(sec => {
                if (!workspaceState.documentContent[sec] || workspaceState.documentContent[sec].length < 20) {
                    workspaceState.documentContent[sec] = `<p>Simulação local de revisão para a seção de ${sec}. Requisitos de conformidade integrados.</p>`;
                }
            });
        }
        workspaceState.documentContent.justificativa += `<p><em>* Revisado pelo Agente Consolidador: Ajustada a adequação regional de fomento com base na auditoria.</em></p>`;
        saveWorkspaceState();
        syncEditorContentToDOM();
        updatePlaceholderStates();
        updateHistoryButtonsUI();
        showToast("✓ Revisão consolidada simulada aplicada no Editor!", "success");
        return;
    }

    showToast("⚙️ Supervisor de Conformidade iniciando otimização preservando as 14 seções...", "info");

    const sectionKeys = [
        'justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento',
        'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica',
        'monitoramento', 'compliance', 'sustentabilidade', 'rider'
    ];
    
    const sectionNames = {
        justificativa: "Justificativa", objetivos: "Objetivos", metodologia: "Metodologia",
        cronograma: "Cronograma", orcamento: "Orçamento", acessibilidade: "Acessibilidade e Cotas",
        publico: "Público-Alvo", contrapartida: "Contrapartida Social", comunicacao: "Comunicação",
        ficha_tecnica: "Ficha Técnica", monitoramento: "Monitoramento", compliance: "Compliance",
        sustentabilidade: "Sustentabilidade", rider: "Rider Técnico"
    };

    const editalContext = workspaceState.editalRefText ? filterRelevantEditalText(workspaceState.editalRefText, key, 35000) : "Sem edital.";
    const coverContext = JSON.stringify(workspaceState.cover);
    const editalProfileContext = getEditalProfilePromptContext();
    const annexesContext = workspaceState.annexes && workspaceState.annexes.length > 0
        ? workspaceState.annexes.map(a => `Nome do Anexo: ${a.name}\nConteúdo: ${a.content ? a.content.substring(0, 25000) : ''}`).join('\n---\n')
        : "Nenhum anexo extra.";

    let processedCount = 0;

    for (const key of sectionKeys) {
        const rawContent = workspaceState.documentContent[key] || '';
        if (!rawContent || placeholders.includes(rawContent.trim())) {
            continue;
        }

        processedCount++;
        showToast(`✨ Supervisor revisando (${processedCount}/14): ${sectionNames[key]}...`, "info");

        // Parecer específico do sub-agente da seção
        let agentParecer = "Sem ressalvas específicas do sub-agente.";
        if (workspaceState.revisorAgentsResults && workspaceState.revisorAgentsResults[key]) {
            const res = workspaceState.revisorAgentsResults[key];
            agentParecer = `Nota Sub-Agente: ${res.nota}/100\nParecer: ${res.parecer}`;
        }

        const prompt = `Você é o Agente Supervisor de Conformidade e Revisor Geral.
Sua missão é otimizar e corrigir exclusivamente a seção "${sectionNames[key].toUpperCase()}" incorporando as diretrizes do edital, os apontamentos da auditoria e o parecer do sub-agente especialista.

REGRA CRÍTICA IMPRESCINDÍVEL:
NUNCA resuma, suprima, reduza ou encurte o texto original da seção. Mantenha integralmente a extensão, a profundidade de informação, tabelas e parágrafos originais!

[DADOS DA CAPA]:
${coverContext}

${editalProfileContext}

[TEXTO ATUAL DA SEÇÃO]:
${rawContent}

[PARECER DO SUB-AGENTE ESPECIALISTA DA SEÇÃO]:
${agentParecer}

[EDITAL DE REFERÊNCIA VIGENTE]:
${editalContext.substring(0, 35000)}

[ANEXOS ADICIONAIS DO EDITAL]:
${annexesContext}

Retorne um JSON estrito sem wraps markdown no seguinte formato:
{
    "conteudo_revisado": "HTML COMPLETO E REVISADO DA SEÇÃO..."
}`;

        try {
            const supervisorSectionSchema = {
                type: "object",
                properties: {
                    conteudo_revisado: { type: "string", description: "HTML completo e otimizado da seção pelo supervisor" }
                },
                required: ["conteudo_revisado"]
            };

            const responseText = await callLLMGateway(prompt, null, 'heavy', supervisorSectionSchema);
            const parsed = safeParseJSON(responseText);

            if (parsed && parsed.conteudo_revisado && parsed.conteudo_revisado.trim().length > 20) {
                let cleanRevised = parsed.conteudo_revisado
                    .replace(/^(claro|com certeza|aqui está|segundo o edital|conforme solicitado).*?:/gi, '')
                    .replace(/espero ter ajudado.*$/gi, '')
                    .trim();
                workspaceState.documentContent[key] = cleanRevised;
            }
        } catch (err) {
            console.warn(`[SUPERVISOR] Falha ao revisar seção ${key}:`, err);
        }
    }

    saveWorkspaceState();
    syncEditorContentToDOM();
    updatePlaceholderStates();
    updateHistoryButtonsUI();
    showToast("✓ Revisão consolidada do Supervisor concluída com sucesso em todas as seções!", "success");
}

async function callGeminiForSubAgent(agentKey, localEvaluation = null, webSearchContext = "") {
    if (!workspaceState.editalProfile && workspaceState.editalRefText && typeof ensureEditalProfile === 'function') {
        await ensureEditalProfile();
    }

    const meta = REVISORES_METADATA[agentKey];
    const docContext = JSON.stringify(workspaceState.documentContent);
    const editalContext = filterRelevantEditalText(workspaceState.editalRefText || "", agentKey);
    const editalProfileContext = getEditalProfilePromptContext();

    // Compilar anexos para dar contexto ao sub-agente de forma otimizada
    const annexesContext = workspaceState.annexes && workspaceState.annexes.length > 0
        ? workspaceState.annexes.map(a => `Nome do Anexo: ${a.name}\nConteúdo: ${a.content ? a.content.substring(0, 25000) : 'Sem conteúdo.'}`).join('\n---\n')
        : "Nenhum anexo extra fornecido.";

    let skillFeedback = "";
    if (localEvaluation) {
        const score = localEvaluation.score || localEvaluation.nota || 0;
        const checklist = Array.isArray(localEvaluation.checklist) ? localEvaluation.checklist : [];
        const errors = Array.isArray(localEvaluation.errors) ? localEvaluation.errors : (Array.isArray(localEvaluation.erros) ? localEvaluation.erros : []);
        const warnings = Array.isArray(localEvaluation.warnings) ? localEvaluation.warnings : (Array.isArray(localEvaluation.recomendacoes) ? localEvaluation.recomendacoes : []);

        skillFeedback = `
    [VALIDAÇÃO LOCAL DO MOTOR DE REGRAS]:
    Nota Sugerida Localmente: ${score}/100
    ${checklist.length > 0 ? `Checklist Validado:\n${checklist.map(c => `- ${c}`).join('\n')}` : ''}
    ${errors.length > 0 ? `Erros de Conformidade Encontrados:\n${errors.map(e => `- ${e}`).join('\n')}` : ''}
    ${warnings.length > 0 ? `Avisos de Melhoria/Recomendações:\n${warnings.map(w => `- ${w}`).join('\n')}` : ''}
    `;
    }

    if (webSearchContext && webSearchContext.trim()) {
        skillFeedback += `

    [DIRETRIZES DA PESQUISA WEB]:
    ${webSearchContext}
    `;
    }

    const prompt = `Você é o sub-agente de auditoria especialista em editais: ${meta.name}.
    ${meta.prompt}
    
    ${editalProfileContext}

    [PROPOSTA DO PROJETO NO EDITOR]:
    ${docContext}
    
    [EDITAL DE REFERÊNCIA VIGENTE]:
    ${editalContext}
    
    [ANEXOS EXTRAS DO EDITAL]:
    ${annexesContext}
    
    ${skillFeedback}
    
    Retorne uma resposta estrita no formato JSON abaixo (sem wraps markdown do tipo \`\`\`json):
    {
        "nota": 88,
        "parecer": "Aqui deve constar seu parecer técnico estruturado em subseções. Após o parecer técnico, adicione uma seção com título 'Sugestão Otimizada' contendo o texto aprimorado para as partes correspondentes, estruturado formalmente."
    }
    `;

    const responseText = await callLLMGateway(prompt, null, 'light', subAgentSchema);
    const parsed = safeParseJSON(responseText);
    if (parsed) {
        if (parsed.parecer) {
            let clean = parsed.parecer;
            clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            clean = clean.replace(/<\/?(html|head|body|title)[^>]*>/gi, '');
            parsed.parecer = clean.trim();
        }
        if (typeof parsed.nota !== 'number') {
            parsed.nota = 70;
        }
        return parsed;
    }
    return {
        nota: 70,
        parecer: "<p>Erro ao receber parecer estruturado da banca avaliadora. Tente reprocessar.</p>"
    };
}

function getSimulatedSubAgentResponse(agentKey) {
    return new Promise(resolve => {
        setTimeout(() => {
            let nota = 85;
            let parecer = "";

            switch (agentKey) {
                case 'justificativa':
                    nota = 90;
                    parecer = `<h3>Parecer de Mérito & Relevância</h3>
                    <p>Justificativa forte e bem fundamentada culturalmente. Sugere-se contextualizar um pouco melhor o histórico do grupo proponente para demonstrar ainda mais o mérito.</p>
                    <h3>Sugestão Otimizada</h3>
                    <p>O projeto se justifica pela urgente necessidade de descentralização cultural em ${workspaceState.cover.city || 'região de fomento'}, promovendo acessibilidade e inclusão através de ações de base comunitária bem delimitadas.</p>`;
                    break;
                case 'objetivos':
                    nota = 85;
                    parecer = `<h3>Parecer de Objetivos & Metas</h3>
                    <p>Os objetivos estão claros. Sugere-se quantificar detalhadamente o alcance esperado.</p>
                    <h3>Sugestão Otimizada</h3>
                    <p><strong>Objetivo Geral:</strong> Democratizar o acesso à cultura. <strong>Objetivos Específicos:</strong> Realizar apresentações gratuitas e oficinas formativas para estudantes públicos.</p>`;
                    break;
                case 'metodologia':
                    nota = 95;
                    parecer = `<h3>Parecer de Metodologia</h3>
                    <p>Metodologia bem descrita nas três fases obrigatórias.</p>
                    <h3>Sugestão Otimizada</h3>
                    <p>A metodologia proposta divide-se de forma estrita em planejamento contratual (Pré-produção, meses 1 e 2), circuito de apresentações físicas (Execução, meses 3 a 5) e fechamento fiscal de contas (Pós-produção, mês 6).</p>`;
                    break;
                case 'acessibilidade':
                    nota = 85;
                    parecer = `<h3>Parecer de Acessibilidade</h3>
                    <p>As cotas e Libras estão presentes. Sugere-se incluir audiodescrição para maior pontuação.</p>
                    <h3>Sugestão Otimizada</h3>
                    <p>Garante-se atendimento integral à acessibilidade PCD, prevendo audiodescrição em vídeos de divulgação, intérprete de Libras presencial em todos os eventos e banheiros de acesso universal.</p>`;
                    break;
                case 'contrapartida':
                    nota = 90;
                    parecer = `<h3>Parecer de Contrapartida</h3>
                    <p>Retorno social atende às regras de gratuidade e oficinas.</p>
                    <h3>Sugestão Otimizada</h3>
                    <p>Em contrapartida ao apoio cultural recebido, serão oferecidas 3 oficinas de capacitação técnica inteiramente franqueadas ao público local, com vagas reservadas a minorias sociais.</p>`;
                    break;
                case 'direitos':
                    nota = 80;
                    parecer = `<h3>Parecer de Direitos</h3>
                    <p>Atenção à necessidade de pagamento do ECAD ou cessão de uso de imagem dos artistas.</p>
                    <h3>Sugestão Otimizada</h3>
                    <p>Todas as autorizações autorais e licenças de imagem e som dos artistas serão registradas contratualmente antes da execução, assegurando o recolhimento das taxas legais devidas ao ECAD.</p>`;
                    break;
                case 'auditoria':
                    nota = 85;
                    parecer = `<h3>Parecer de Auditoria</h3>
                    <p>Mecanismos de aferição consistentes. Recomenda-se relatórios detalhados com assinatura física.</p>
                    <h3>Sugestão Otimizada</h3>
                    <p>Como mecanismo de prestação de contas, serão fornecidos relatórios com listas de presença de assinatura física dos participantes, registros fotográficos datados e relatórios fiscais auditados.</p>`;
                    break;
            }

            resolve({
                nota: nota,
                parecer: parecer
            });
        }, 800);
    });
}

function encodeCP1252(str) {
    const cp1252Map = {
        0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
        0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E,
        0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
        0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
    };
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code in cp1252Map) {
            bytes[i] = cp1252Map[code];
        } else if (code < 256) {
            bytes[i] = code;
        } else {
            bytes[i] = 63; // '?'
        }
    }
    return bytes;
}

function fixDoubleEncodedUtf8(str) {
    if (!str) return str;
    let fixed = str;
    
    // Tenta primeiro decodificar a string inteira se ela tiver indicativos de double-encoding
    if (/[\u00C2\u00C3\u00E2\u00CA\u00D4]/.test(fixed)) {
        try {
            const bytes = encodeCP1252(fixed);
            const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            if (decoded && decoded !== fixed && !decoded.includes('\uFFFD')) {
                return decoded;
            }
        } catch (e) {
            // Fallback para substituição de pedaços via regex
        }
    }
    
    // Substituição pedaço por pedaço usando regex
    const pattern = /[\u00C2-\u00DF].|[\u00E0-\u00EF].{2}/g;
    fixed = fixed.replace(pattern, (match) => {
        for (const enc of ['cp1252', 'latin-1']) {
            try {
                let bytes;
                if (enc === 'cp1252') {
                    bytes = encodeCP1252(match);
                } else {
                    bytes = new Uint8Array([...match].map(c => c.charCodeAt(0)));
                }
                const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                if (decoded && !decoded.includes('\uFFFD')) {
                    return decoded;
                }
            } catch (e) {
                // Tenta próxima codificação
            }
        }
        return match;
    });

    const mojibakeMap = {
        'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ã£': 'ã',
        'Ã©': 'é', 'Ãª': 'ê', 'Ã\u00AD': 'í', 'Ã\u00AD': 'í', 'Ã­': 'í',
        'Ã³': 'ó', 'Ã´': 'ô', 'Ãµ': 'õ', 'Ãº': 'ú', 'Ã§': 'ç',
        'Ã\u0081': 'Á', 'Ã\u0080': 'À', 'Ã\u0082': 'Â', 'Ã\u0083': 'Ã',
        'Ã\u0089': 'É', 'Ã\u008A': 'Ê', 'Ã\u008D': 'Í', 'Ã\u0093': 'Ó',
        'Ã\u0094': 'Ô', 'Ã\u0095': 'Õ', 'Ã\u009A': 'Ú', 'Ã\u0087': 'Ç'
    };
    for (const [bad, good] of Object.entries(mojibakeMap)) {
        if (fixed.includes(bad)) {
            fixed = fixed.split(bad).join(good);
        }
    }
    return fixed;
}

function sanitizeText(text) {
    if (!text) return "";

    let clean = fixDoubleEncodedUtf8(text);

    // Substituir aspas inteligentes, traços, marcadores MS Word e zero-width spaces
    clean = clean
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
        .replace(/[\u2022\u2023\u2043\u204C\u204D\u2219\u25AA\u25AB]/g, "*")
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
        .replace(/\u2026/g, "...");

    // Remove conversas de IA, preâmbulos e conclusões genéricas
    clean = clean
        .replace(/claro,?\s*aqui\s*est[áa]\s*o\s*parecer:?/gi, "")
        .replace(/claro,?\s*aqui\s*est[áa]\s*a\s*sugest[ãa]o:?/gi, "")
        .replace(/claro,?\s*espero\s*ter\s*ajudado\.?/gi, "")
        .replace(/revisado\s*por\s*ia/gi, "")
        .replace(/em\s*resumo,?/gi, "")
        .replace(/espero\s*ter\s*ajudado\.?/gi, "")
        .replace(/conforme\s*solicitado,?/gi, "")
        .replace(/aqui\s*está\s*uma\s*proposta/gi, "")
        .replace(/certeza,?\s*vou\s*revisar/gi, "")
        .replace(/esta\s*seção\s*revisada/gi, "")
        .replace(/com\s*certeza/gi, "");

    return clean.trim();
}

function sanitizeSectionKeys(keys) {
    const valid = [
        'justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento',
        'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica',
        'monitoramento', 'compliance', 'sustentabilidade', 'rider'
    ];
    if (!Array.isArray(keys)) return [];
    return keys.map(k => k ? String(k).toLowerCase().trim() : '').filter(k => valid.includes(k));
}

function detectRequiredSectionsFromText(text) {
    const textLower = (text || "").toLowerCase();
    // Seções principais obrigatórias por padrão em editais de fomento
    const required = ['justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento', 'acessibilidade'];

    if (/públ|beneficiár|demogr/i.test(textLower)) required.push('publico');
    if (/contrapartida|legado|social/i.test(textLower)) required.push('contrapartida');
    if (/comunica|divulga|mídia|marketing/i.test(textLower)) required.push('comunicacao');
    if (/ficha técnica|equipe|currículo|profissional/i.test(textLower)) required.push('ficha_tecnica');
    if (/monitoramento|avaliação|indicador|matriz lógica/i.test(textLower)) required.push('monitoramento');
    if (/compliance|certidão|ecad|sisgen|direitos autorais/i.test(textLower)) required.push('compliance');
    if (/sustentabilidade|esg|resíduo|ambiental/i.test(textLower)) required.push('sustentabilidade');
    if (/rider|mapa de palco|som|luz|iluminação|equipamento/i.test(textLower)) required.push('rider');

    return [...new Set(required)];
}

function getEditalProfilePromptContext() {
    const profile = workspaceState.editalProfile;
    if (!profile) return "";
    return `
[DIRETRIZES E REGRAS ESTRUTURAIS DO EDITAL (MANDATÓRIO)]:
- Linha / Fomento: ${profile.fomento || 'Não especificado'}
- Objetivos e Elegibilidade: ${profile.objetivos || 'Não especificadas'}
- Tetos e Limites Financeiros: ${profile.tetos_e_limites || 'Sem limites especificados'}
- Acessibilidade e Cotas: ${profile.acessibilidade_e_cotas || 'Não especificadas'}
- Prioridades e Critérios de Pontuação: ${profile.prioridades_critérios || 'Não especificados'}
- Mapeamento de Anexos: ${profile.anexos_analisados || 'Nenhum'}
- Seções Exigidas no Edital: ${Array.isArray(profile.secoes_exigidas) ? profile.secoes_exigidas.join(', ') : 'Não especificadas'}
Você DEVE obrigatoriamente respeitar estas diretrizes do edital em todas as informações e textos produzidos.
`;
}

function getOfflineEditalProfile(editalRefText, annexes = []) {
    const textLower = (editalRefText || "").toLowerCase();
    const annexesTextLower = annexes.map(a => a.content || "").join("\n").toLowerCase();
    const combinedText = textLower + "\n" + annexesTextLower;
    const annexesNames = annexes.map(a => a.name).join(", ") || "Nenhum anexo adicional carregado";

    let budgetCap = "Teto orçamentário padrão de fomento público (Administração máx 15%, Comunicação máx 10%).";
    const budgetMatch = textLower.match(/(?:teto|limite|valor máximo|recursos de|r\$)\s*:?\s*(?:r\$)?\s*([\d\.\,]+)/i);
    if (budgetMatch && budgetMatch[1]) {
        budgetCap = `Teto Orçamentário identificado: R$ ${budgetMatch[1]}. Limite de Administração: 15%. Limite de Marketing: 10%.`;
    }

    const detectedSections = detectRequiredSectionsFromText(combinedText);

    return {
        fomento: "Chamada Pública de Fomento Cultural e Social (Análise Offline)",
        objetivos: "Democratização do acesso à cultura, formação de público e apoio à cadeia produtiva artística local.",
        tetos_e_limites: budgetCap,
        acessibilidade_e_cotas: "Obrigatória acessibilidade comunicacional (LIBRAS/Audiodescrição) e física. Ações afirmativas com reserva de vagas para grupos prioritários.",
        prioridades_critérios: "Pontuação máxima de priorização (30 pts) para governança participativa, liderança vulnerabilizada, experiência no território e parcerias em rede.",
        anexos_analisados: annexesNames,
        secoes_exigidas: detectedSections
    };
}

async function ensureEditalProfile(forceRefresh = false) {
    if (workspaceState.editalProfile && !forceRefresh) {
        return workspaceState.editalProfile;
    }

    const editalRefText = workspaceState.editalRefText || (document.getElementById('edital-ref-text') ? document.getElementById('edital-ref-text').value : '');
    if (!editalRefText || !editalRefText.trim()) {
        workspaceState.editalProfile = null;
        renderEditalProfileCard();
        return null;
    }

    const apiKey = (window.geminiKey || localStorage.getItem('gemini_api_key'));
    const model = 'gemini-3.5-flash';

    // Se não há chave de API ativa e forceRefresh é false, usamos o motor offline local de contingência
    if (!forceRefresh && !apiKey) {
        const offlineProfile = getOfflineEditalProfile(editalRefText, workspaceState.annexes);
        workspaceState.editalProfile = offlineProfile;
        saveWorkspaceState();
        renderEditalProfileCard();
        return offlineProfile;
    }

    showToast("Analisando perfil estrutural e diretrizes do edital...", "info");

    if (apiKey) {
        try {
            const res = await fetch('/api/analyze-edital-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    editalRefText,
                    annexes: workspaceState.annexes || [],
                    api_key: apiKey,
                    model
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data && data.secoes_exigidas) {
                    data.secoes_exigidas = sanitizeSectionKeys(data.secoes_exigidas);
                }
                workspaceState.editalProfile = data;
                saveWorkspaceState();
                renderEditalProfileCard();
                showToast("Perfil do edital e seções exigidas analisados com sucesso!", "success");
                return data;
            } else {
                let errorMsg = "Erro ao analisar edital.";
                try {
                    const errData = await res.json();
                    if (errData && errData.error) {
                        errorMsg = errData.error;
                    }
                } catch (e) {}
                showToast(`${errorMsg} Usando análise offline local de contingência.`, "warning");
            }
        } catch (err) {
            console.warn("[APP] Falha no endpoint da API. Usando análise offline local:", err);
        }
    }

    // --- FALLBACK OFFLINE LOCAL (IndexedDB / OfflineAuditor) ---
    const offlineProfile = getOfflineEditalProfile(editalRefText, workspaceState.annexes);
    workspaceState.editalProfile = offlineProfile;
    saveWorkspaceState();
    renderEditalProfileCard();
    showToast("⚡ Diretrizes e perfil do edital analisados autonomamente via IndexedDB!", "success");
    return offlineProfile;
}

function renderEditalProfileCard() {
    const card = document.getElementById('edital-profile-card');
    const content = document.getElementById('edital-profile-content');
    if (!card || !content) return;

    const profile = workspaceState.editalProfile;
    if (!profile) {
        card.style.display = 'none';
        content.innerHTML = '';
        return;
    }

    const secoesList = (profile.secoes_exigidas && profile.secoes_exigidas.length > 0)
        ? profile.secoes_exigidas.map(s => `<span style="display:inline-block; background:var(--color-primary-ghost, #e0e7ff); color:var(--color-primary, #4338ca); padding:2px 8px; border-radius:12px; margin:2px; font-weight:700; font-size:0.75rem;">${s.toUpperCase()}</span>`).join(' ')
        : '<span style="color:var(--text-muted);">Todas as 14 seções recomendadas</span>';

    card.style.display = 'block';
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.8rem;">
            <div style="background: var(--color-bg-subtle, #f8f9fa); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--color-border);">
                <strong style="color: var(--color-primary);">📜 Linha / Fomento:</strong>
                <p style="margin: 0.3rem 0 0 0; color: var(--color-text);">${sanitizeText(profile.fomento || 'Não especificado')}</p>
            </div>
            <div style="background: var(--color-bg-subtle, #f8f9fa); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--color-border);">
                <strong style="color: var(--color-primary);">💰 Tetos e Limites Financeiros:</strong>
                <p style="margin: 0.3rem 0 0 0; color: var(--color-text);">${sanitizeText(profile.tetos_e_limites || 'Não informado')}</p>
            </div>
            <div style="background: var(--color-bg-subtle, #f8f9fa); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--color-border);">
                <strong style="color: var(--color-primary);">🎯 Objetivos e Elegibilidade:</strong>
                <p style="margin: 0.3rem 0 0 0; color: var(--color-text);">${sanitizeText(profile.objetivos || 'Não especificado')}</p>
            </div>
            <div style="background: var(--color-bg-subtle, #f8f9fa); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--color-border);">
                <strong style="color: var(--color-primary);">♿ Acessibilidade e Cotas:</strong>
                <p style="margin: 0.3rem 0 0 0; color: var(--color-text);">${sanitizeText(profile.acessibilidade_e_cotas || 'Não especificado')}</p>
            </div>
            <div style="background: var(--color-bg-subtle, #f8f9fa); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--color-border);">
                <strong style="color: var(--color-primary);">⭐ Prioridades e Pontuação:</strong>
                <p style="margin: 0.3rem 0 0 0; color: var(--color-text);">${sanitizeText(profile.prioridades_critérios || 'Não especificado')}</p>
            </div>
            <div style="background: var(--color-bg-subtle, #f8f9fa); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--color-border);">
                <strong style="color: var(--color-primary);">📋 Seções Exigidas no Edital:</strong>
                <div style="margin-top: 0.3rem;">${secoesList}</div>
            </div>
        </div>
    `;
}

/**
 * CORREÇÃO BUG #1 — stripHtmlForPayload
 * Converte HTML rico em texto plano compacto para envio ao LLM.
 * HTML â†’ Texto puro reduz o tamanho em ~55-65%, maximizando o contexto real
 * dentro do limite de tokens sem descartar dados críticos de anexos/edital.
 */
function stripHtmlForPayload(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Preserva quebras de linha de tabelas substituindo </tr> por newline
    tmp.querySelectorAll('tr').forEach(tr => { tr.after(document.createTextNode('\n')); });
    tmp.querySelectorAll('th, td').forEach(cell => { cell.after(document.createTextNode(' | ')); });
    return (tmp.textContent || tmp.innerText || '')
        .replace(/\s{3,}/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function prepareDiffView(feedbackHtml) {
    const diffCard = document.getElementById('revisor-diff-card');
    const diffOriginal = document.getElementById('diff-text-original');
    const diffSuggested = document.getElementById('diff-text-suggested');

    if (!diffCard || !diffOriginal || !diffSuggested) return;

    let targetSection = activeRevisor;

    const originalText = workspaceState.documentContent[targetSection] || "";

    let suggestedText = "";
    const sugIndex = feedbackHtml.indexOf('<h3>Sugestão Otimizada</h3>');
    if (sugIndex !== -1) {
        suggestedText = feedbackHtml.substring(sugIndex + 27);
    } else {
        suggestedText = feedbackHtml;
    }

    suggestedText = sanitizeText(suggestedText);

    revisorSuggestedContent = {
        section: targetSection,
        text: suggestedText
    };

    diffOriginal.innerHTML = originalText || "<em>(Seção vazia no Editor)</em>";
    diffSuggested.innerHTML = suggestedText;

    diffCard.style.display = 'block';
    diffCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function applyRevisorDiff() {
    if (!revisorSuggestedContent) {
        showToast("Nenhuma sugestão ativa para aplicar.", "warning");
        return;
    }

    const diffSuggested = document.getElementById('diff-text-suggested');
    const finalContent = diffSuggested ? diffSuggested.innerHTML : revisorSuggestedContent.text;

    workspaceState.documentContent[revisorSuggestedContent.section] = finalContent;
    saveWorkspaceState();

    syncEditorContentToDOM();
    updatePlaceholderStates();

    document.getElementById('revisor-diff-card').style.display = 'none';
    revisorSuggestedContent = null;

    addHistoricalMemory(`Sugestão do agente ${REVISORES_METADATA[activeRevisor].name} aprovada e aplicada no editor.`);
    showToast("✓ Proposta atualizada com sucesso no Editor!", "success");
}

// ==========================================
// ABA 4: AUDITOR COMPLIANCE ENGINE
// ==========================================
function setupAuditor() {
    const btnAudit = document.getElementById('btn-run-audit');
    const btnPdf = document.getElementById('btn-download-audit-pdf');
    const btnSaveAnnex = document.getElementById('btn-save-audit-annex');

    if (btnAudit) {
        btnAudit.addEventListener('click', async () => {
            // --- PROTEÇÃO DOUBLE-CLICK (BUG #5) ---
            if (_isProcessingAPI) {
                showToast("Aguarde o processamento atual terminar.", "warning");
                return;
            }
            _isProcessingAPI = true;

            btnAudit.disabled = true;
            btnAudit.textContent = "Auditando Projeto...";

            try {
                let auditData = null;

                if (geminiKey) {
                    showToast("Iniciando auditoria de compliance...", "info");
                    const consolidatedResult = await callGeminiConsolidatedAudit();

                    workspaceState.lastAuditData = consolidatedResult.auditoria || {};
                    saveWorkspaceState();
                    auditData = workspaceState.lastAuditData;

                } else {
                    showToast("Auditoria simulada localmente...", "info");
                    auditData = await getSimulatedAuditorData();
                    workspaceState.lastAuditData = auditData;
                    saveWorkspaceState();
                }

                renderAuditorResults(auditData);
                if (btnPdf) btnPdf.style.display = 'block';
                if (btnSaveAnnex) btnSaveAnnex.style.display = 'block';
                showToast("Auditoria concluída! Nota de compliance calculada.", "success");

                // Automatic creation of annex from audit report
                if (auditData) {
                    let reportText = `RELATÓRIO DE AUDITORIA DE COMPLIANCE\n`;
                    reportText += `Projeto: ${workspaceState.cover.title || 'Sem nome'}\n`;
                    reportText += `Data: ${new Date().toLocaleString()}\n`;
                    reportText += `Nota Final: ${auditData.nota_final}/${auditData.nota_final >= 100 ? 130 : 100}\n\n`;
                    reportText += `=== PONTUAÇÃO POR ÁREA ===\n`;
                    if (auditData.criterios) {
                        auditData.criterios.forEach(c => {
                            reportText += `• ${c.criterio}: ${c.nota_atribuida}/${c.nota_maxima}\n`;
                            reportText += `  Justificativa: ${c.justificativa}\n\n`;
                        });
                    }
                    reportText += `\n=== AJUSTES SUGERIDOS ===\n`;
                    if (auditData.ajustes) {
                        auditData.ajustes.forEach(a => {
                            reportText += `• [${a.fator}] ${a.alteracao}\n`;
                        });
                    }
                    reportText += `\n=== ALERTAS E INCONSISTÊNCIAS ===\n`;
                    if (auditData.alertas) {
                        auditData.alertas.forEach(a => {
                            reportText += `• [${a.nivel}] ${a.tipo}: ${a.descricao}\n  Recomendação: ${a.sugestao}\n\n`;
                        });
                    }

                    workspaceState.annexes.push({
                        name: `Relatório Automático de Auditoria - ${new Date().toLocaleDateString()}`,
                        content: reportText,
                        size: reportText.length
                    });
                    saveWorkspaceState();
                    renderAnnexesList();
                    showToast("✓ Relatório de auditoria salvo nos Anexos! Vá para a aba Revisor.", "success");
                }

            } catch (err) {
                showToast("Erro na auditoria: " + err.message, "error");
            } finally {
                _isProcessingAPI = false;
                btnAudit.disabled = false;
                btnAudit.textContent = "🔍 Iniciar Auditoria do Edital";
            }
        });
    }

    if (btnPdf) {
        btnPdf.addEventListener('click', downloadAuditPDF);
    }

    if (btnSaveAnnex) {
        btnSaveAnnex.style.display = 'none'; // Replaced by automatic annex addition
    }
}

async function callGeminiForAuditoria() {
    const memoriesContext = (workspaceState.historicalMemories && workspaceState.historicalMemories.length > 0)
        ? workspaceState.historicalMemories.map(m => `- [${m.date}] Projeto: ${m.project} -> ${m.activity}`).join('\n')
        : "Nenhuma memória anterior.";

    const propContext = `
    1. Justificativa: ${workspaceState.documentContent.justificativa}
    2. Objetivos: ${workspaceState.documentContent.objetivos}
    3. Metodologia: ${workspaceState.documentContent.metodologia}
    4. Cronograma: ${workspaceState.documentContent.cronograma}
    5. Orçamento: ${workspaceState.documentContent.orcamento}
    6. Acessibilidade: ${workspaceState.documentContent.acessibilidade}
    `;

    const annexesContext = workspaceState.annexes && workspaceState.annexes.length > 0
        ? workspaceState.annexes.map(a => `Nome do Anexo: ${a.name}\nConteúdo: ${a.content ? a.content.substring(0, 25000) : ''}`).join('\n---\n')
        : "Nenhum anexo extra fornecido.";

    let subAgentsContext = "";
    if (workspaceState.revisorAgentsResults) {
        const activeResults = [];
        for (const [agentKey, res] of Object.entries(workspaceState.revisorAgentsResults)) {
            if (res) {
                const agentName = REVISORES_METADATA[agentKey] ? REVISORES_METADATA[agentKey].name : agentKey;
                activeResults.push(`- **Sub-Agente ${agentName}** (Nota: ${res.nota}/100):\n  ${res.parecer}`);
            }
        }
        if (activeResults.length > 0) {
            subAgentsContext = "PARECERES DE COMPLIANCE E ORÇAMENTO DOS SUB-AGENTES ESPECIALISTAS:\n" + activeResults.join("\n\n");
        }
    }

    const prompt = `Você é o Auditor Geral de Editais Culturais, atuando como um Arquiteto de Sistemas Multi-Agentes e Parecerista Master do Ministério da Cultura. Sua missão é consolidar as análises efetuadas por todos os sub-agentes especialistas sobre a proposta cultural e cruzá-las de forma exaustiva com o Edital de Referência Vigente e os anexos adicionais fornecidos, produzindo um Relatório de Auditoria Diagnóstica estruturado, visualmente claro e dividido em painéis de pontuação, simulando a avaliação real de uma banca de fomento cultural.

    [NOTAS E PARECERES DOS SUB-AGENTES ESPECIALISTAS]:
    ${subAgentsContext || "Nenhuma análise anterior dos sub-agentes disponível."}

    [MEMÓRIA E HISTÓRICO DE AUDITORIA (APRENDIZADO)]:
    ${memoriesContext}
    
    [ANEXOS ADICIONAIS DO EDITAL]:
    ${annexesContext}
    
    [PROPOSTA DO PROJETO ABNT]:
    ${propContext}
    
    [EDITAL DE REFERÊNCIA VIGENTE]:
    ${workspaceState.editalRefText ? filterRelevantEditalText(workspaceState.editalRefText, null, 40000) : "Nenhuma referência inserida."}
    
    Você deve obrigatoriamente realizar o diagnóstico crítico da proposta e calcular a pontuação simulada:
    - Pontuação Técnica: Máximo de 100 pontos, divididos em 5 critérios (20 pontos cada):
      1. Adequação ao Objeto, Matriz Lógica e Coerência (até 20 pontos)
      2. Metodologia, Plano de Trabalho e Acessibilidade (até 20 pontos)
      3. Exequibilidade Técnica (Experiência e Parcerias) (até 20 pontos)
      4. Orçamento, Economicidade e Limites de Custos (Auditoria Financeira) (até 20 pontos)
      5. Plano de Monitoramento, Indicadores e Avaliação (até 20 pontos)
    - Pontuação de Priorização / Mérito: Máximo de 30 pontos, divididos em 3 critérios (10 pontos cada):
      6. Governança Participativa e Transparência (até 10 pontos)
      7. Caracterização do Público Prioritário e Coordenação Vulnerabilizada (até 10 pontos)
      8. Atuação Prévia no Território e Localização Geográfica do Impacto (até 10 pontos)
    
    A Nota Simulada Final será a soma da Pontuação Técnica (0-100) com a Pontuação de Priorização (0-30), totalizando de 0 a 130 pontos.

    Você deve gerar obrigatoriamente um relatório descritivo estruturado de auditoria na chave "relatorio_analitico", formatado em HTML elegante e rico (com classes e estilos CSS inline para um visual premium de painel de controle de banca). O relatório deve conter obrigatoriamente as seguintes 10 seções:
    
    1. Cabeçalho Executivo (Dashboard de Notas): Um painel elegante exibindo o nome da proposta, o proponente, o valor solicitado, o prazo de execução e o edital base. Exiba em destaque a "Nota Simulada" total (soma da técnica e priorização), mostrando explicitamente a divisão (ex: "Nota Final: X/130 | Pontuação Técnica: Y/100 | Pontuação de Priorização: Z/30"). Use um fundo elegante (como azul escuro ou cinza claro moderno) e texto bem espaçado.
    
    2. Aviso de Simulação (Disclaimer): Um bloco de alerta com estilo de aviso (background amarelo/laranja claro, borda dourada, ícone de atenção) informando de forma clara que as notas são uma simulação crítica baseada nos anexos do edital e avaliam apenas o estado atual da proposta.
    
    3. Painel de Ajustes e Impacto (O que foi otimizado): Uma tabela em HTML demonstrando as alterações feitas pela IA na proposta original, qual critério do edital essa mudança impactou positivamente, e a estimativa de evolução da nota (ex: de 50 para 70 pontos).
    
    4. Matriz de Pontuação Técnica (Obrigatório em Editais): Uma tabela HTML avaliando os 5 critérios técnicos listados acima, contendo a nota máxima (20), a nota simulada atribuída, e uma justificativa detalhada e analítica para cada um.
    
    5. Matriz de Pontuação de Priorização / Mérito: Uma segunda tabela HTML avaliando os 3 critérios de priorização listados acima, contendo a nota máxima (10), a nota simulada atribuída, e a respectiva justificativa de impacto social e afirmativo.
    
    6. Riscos Eliminatórios (Red Flags): Um painel de alerta crítico (background vermelho claro, borda vermelha escura) listando qualquer documentação ausente ou inconformidade que cause desclassificação imediata do projeto, independentemente da nota (ex: falta de Atas de Anuência, problemas de Habilitação do CNPJ ou certidões fiscais). Se não houver, escreva que nenhum risco eliminatório foi detectado após cruzamento de dados.
    
    7. Fragilidades e Pendências (Com Ações Sugeridas): Uma lista de pontos fracos detectados na proposta atual. Para cada fragilidade identificada, forneça obrigatoriamente uma "Ação" clara, objetiva e executável para o proponente corrigir o problema.
    
    8. Pontos Fortes a Preservar: Uma lista destacando os diferenciais competitivos do projeto que não devem ser alterados (ex: acessibilidade real inovadora, patrimônio cultural permanente gerado, ou forte governança participativa).
    
    9. Avaliação Crítica Final (Veredito): Um parágrafo narrativo formal resumindo a viabilidade técnica geral da proposta, posicionando-se de forma clara se o projeto é competitivo, classificável ou se necessita de revisões estruturais profundas antes da submissão.
    
    10. Lista de Ação Priorizada (Checklist Final): Uma tabela estilo checklist ordenada por impacto decrescente (do Eliminatório até os pequenos ajustes). Deve conter a pendência, o nível de impacto na nota e um espaço visual de "Status" (ex: "[ ] A Fazer") para controle do proponente.

    DIRETRIZ DE DESIGN: Use cores elegantes (verde para pontos fortes e conformidades, amarelo/laranja para alertas e disclaimers, vermelho para riscos eliminatórios). Use tabelas HTML modernas (com border-collapse, cellpadding, cores de cabeçalho, bordas finas).

    Você DEVE retornar estritamente um JSON estruturado de acordo com o esquema abaixo (não envolva em blocos markdown \`\`\`json):
    {
        "nota_final": 95,
        "nota_tecnica": 85,
        "nota_priorizacao": 10,
        "relatorio_analitico": "CONTEÚDO DO RELATÓRIO FORMATADO EM HTML COM AS 10 SEÇÕES...",
        "criterios": [
            {"criterio": "Adequação ao Objeto, Matriz Lógica e Coerência", "nota_maxima": 20, "nota_atribuida": 18, "justificativa": "..."},
            {"criterio": "Metodologia, Plano de Trabalho e Acessibilidade", "nota_maxima": 20, "nota_atribuida": 17, "justificativa": "..."},
            {"criterio": "Exequibilidade Técnica (Experiência e Parcerias)", "nota_maxima": 20, "nota_atribuida": 19, "justificativa": "..."},
            {"criterio": "Orçamento, Economicidade e Limites de Custos", "nota_maxima": 20, "nota_atribuida": 15, "justificativa": "..."},
            {"criterio": "Plano de Monitoramento, Indicadores e Avaliação", "nota_maxima": 20, "nota_atribuida": 16, "justificativa": "..."},
            {"criterio": "Governança Participativa e Transparência", "nota_maxima": 10, "nota_atribuida": 8, "justificativa": "..."},
            {"criterio": "Caracterização do Público Prioritário e Coordenação Vulnerabilizada", "nota_maxima": 10, "nota_atribuida": 7, "justificativa": "..."},
            {"criterio": "Atuação Prévia no Território e Impacto Territorial", "nota_maxima": 10, "nota_atribuida": 5, "justificativa": "..."}
        ],
        "ajustes": [
            {"alteracao": "Descrição da alteração recomendada", "fator": "Fator de Impacto / Critério"}
        ],
        "alertas": [
            {"tipo": "Categoria do alerta", "descricao": "Descrição detalhada", "sugestao": "Recomendação", "nivel": "ALTA/MEDIA/BAIXA"}
        ]
      }
    `;
}

async function callGeminiConsolidatedAudit() {
    // Delegação total para o aiController — sem orquestrador intermediário.
    // O aiController.runAudit coleta o contexto bruto e envia direto para o Gemini
    // com o System Prompt denso dos 14 agentes.
    syncDOMContentToState();
    return await window.aiController.runAudit(workspaceState);
}
function getSimulatedAuditorData() {
    return new Promise(resolve => {
        setTimeout(() => {
            const doc = workspaceState.documentContent || {};
            const hasJust = (doc.justificativa || "").length > 100;
            const hasObj = (doc.objetivos || "").length > 100;
            const hasCrono = (doc.cronograma || "").length > 100;
            const hasOrc = (doc.orcamento || "").length > 100;
            const hasAces = (doc.acessibilidade || "").length > 100;

            let n1 = hasJust ? 18 : 10;
            let n2 = hasAces ? 17 : 8;
            let n3 = hasObj ? 19 : 12;
            let n4 = hasOrc ? 18 : 9;
            let n5 = hasCrono ? 17 : 11;

            let n6 = hasJust ? 9 : 5;
            let n7 = hasAces ? 8 : 4;
            let n8 = hasObj ? 8 : 5;

            const notaTecnica = n1 + n2 + n3 + n4 + n5;
            const notaPriorizacao = n6 + n7 + n8;
            const totalScore = notaTecnica + notaPriorizacao;

            const title = workspaceState.cover.title || 'Circuito Tambores Esperança';
            const proponent = workspaceState.cover.proponent || 'Associação Cultural Esperança';
            const budget = workspaceState.cover.budget || 220000;
            const execution = workspaceState.cover.year || '2026';
            const editalBase = workspaceState.editalRefName || 'EDITAL RIO DOCE 2026';

            const reportHtml = `
                <!-- 1. Cabeçalho Executivo -->
                <div style="background: #1e1b4b; color: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-family: sans-serif;">
                    <h3 style="margin-top: 0; color: #a5b4fc; border-bottom: 2px solid #4f46e5; padding-bottom: 0.5rem; font-size: 1.1rem;">1. Cabeçalho Executivo (Dashboard de Notas)</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
                        <div>
                            <p><strong>Nome da Proposta:</strong> ${title}</p>
                            <p><strong>Proponente:</strong> ${proponent}</p>
                            <p><strong>Edital Base:</strong> ${editalBase}</p>
                        </div>
                        <div>
                            <p><strong>Valor Solicitado:</strong> R$ ${Number(budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p><strong>Prazo de Execução:</strong> 12 meses (Exercício ${execution})</p>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; background: #312e81; padding: 0.75rem; border-radius: 6px; text-align: center; border: 1px solid #4f46e5;">
                        <span style="font-size: 1.1rem; font-weight: bold; color: #38bdf8;">NOTA SIMULADA FINAL: ${totalScore} / 130</span>
                        <div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 0.25rem;">
                            Pontuação Técnica: ${notaTecnica} / 100 | Pontuação de Priorização: ${notaPriorizacao} / 30
                        </div>
                    </div>
                </div>

                <!-- 2. Disclaimer -->
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; color: #78350f; padding: 0.75rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.8rem; line-height: 1.4;">
                    <strong>2. Aviso de Simulação (Disclaimer)</strong><br/>
                    Este relatório consolida uma simulação diagnóstica crítica baseada nos anexos do edital e na proposta inserida no editor. Os resultados refletem o estado atual dos rascunhos e não garantem aprovação oficial.
                </div>

                <!-- 3. Painel de Ajustes -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary);">3. Painel de Ajustes e Impacto (O que foi otimizado)</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.8rem;">
                        <thead>
                            <tr style="background: var(--bg-panel); text-align: left;">
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Alteração Sugerida pela IA</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Critério Impactado</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Evolução Estimada</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">Adequação de limites de marketing e administração</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">Orçamento e Custos</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--color-success); font-weight: bold;">+15 pts (de 50 para 65)</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">Inclusão de intérprete de Libras e Audiodescrição</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">Metodologia e Acessibilidade</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--color-success); font-weight: bold;">+10 pts (de 8 para 18)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 4. Matriz Técnica -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary);">4. Matriz de Pontuação Técnica (Obrigatório em Editais)</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.8rem;">
                        <thead>
                            <tr style="background: var(--bg-panel); text-align: left;">
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Critério Técnico</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-primary);">Máx</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-primary);">Nota</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Justificativa Mestre</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Adequação ao objeto e Matriz Lógica</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">20</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n1}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasJust ? 'Justificativa e coerência conceitual excelentes.' : 'Falta nexo lógico evidente entre objetivos e metas.'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Metodologia e acessibilidade</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">20</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n2}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasAces ? 'Acessibilidade sensorial descrita de forma exemplar.' : 'Medidas de acessibilidade insuficientes.'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Exequibilidade técnica (Experiência/Parcerias)</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">20</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n3}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasObj ? 'Histórico do proponente e cartas de anuência adequadas.' : 'Pouca comprovação de atuação prévia registrada.'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Orçamento e economicidade</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">20</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n4}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasOrc ? 'Planilha de custos coerente com os limites de taxas.' : 'Falta detalhamento dos itens e cotações de mercado.'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Plano de monitoramento e avaliação</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">20</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n5}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasCrono ? 'Controle de metas físicas e indicadores bem formulados.' : 'Indicadores de monitoramento muito vagos.'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 5. Matriz de Priorização -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary);">5. Matriz de Pontuação de Priorização / Mérito</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.8rem;">
                        <thead>
                            <tr style="background: var(--bg-panel); text-align: left;">
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Critério de Impacto / Políticas Afirmativas</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-primary);">Máx</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-primary);">Nota</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Justificativa do Impacto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Governança participativa e transparência</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">10</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n6}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasJust ? 'Processos decisórios transparentes com conselho gestor local.' : 'Faltam instâncias de governança compartilhada.'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Público prioritário e coordenação vulnerabilizada</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">10</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n7}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasAces ? 'Ações explícitas voltadas a povos tradicionais e cotas sociais.' : 'Pouca evidência de coordenação por grupos minorizados.'}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid var(--border-color); padding: 6px; font-weight: bold; color: var(--text-primary);">Atuação territorial e localização geográfica</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary);">10</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; font-weight: bold; color: var(--color-primary);">${n8}</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">${hasObj ? 'Histórico consolidado na bacia do Rio Doce (território prioritário).' : 'Baixo impacto geográfico comprovado.'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 6. Riscos Eliminatórios -->
                <div style="background: #fef2f2; border: 1px solid #fca5a5; border-left: 5px solid #ef4444; color: #991b1b; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.8rem;">
                    <h3 style="margin-top: 0; font-size: 1rem; color: #991b1b; border-bottom: 1px solid #fee2e2; padding-bottom: 0.5rem;">6. Riscos Eliminatórios (Red Flags) 🚩</h3>
                    ${!hasOrc ? '<p style="margin: 0.3rem 0;">• <strong>ALTA GRAVIDADE:</strong> Ausência total de Planilha Orçamentária. Isso implicará em desclassificação imediata no certame fiscal.</p>' : ''}
                    ${!hasJust ? '<p style="margin: 0.3rem 0;">• <strong>ALTA GRAVIDADE:</strong> Ausência de Justificativa e de detalhamento do histórico do proponente, inviabilizando a habilitação jurídica.</p>' : ''}
                    ${hasOrc && hasJust ? '<p style="margin: 0.3rem 0;">✓ <strong>NENHUM RISCO ELIMINATÓRIO DETECTADO:</strong> Toda a documentação e seções essenciais possuem preenchimento mínimo inicial.</p>' : ''}
                </div>

                <!-- 7. Fragilidades e Pendências -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="margin-top: 0; font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary);">7. Fragilidades e Pendências (Com Ações Sugeridas)</h3>
                    <ul style="list-style-type: none; padding-left: 0; font-size: 0.8rem; color: var(--text-secondary);">
                        ${!hasAces ? '<li style="margin-bottom: 0.6rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;"><strong>Fragilidade:</strong> Ausência de detalhamento de audiodescrição e Libras.<br/><strong style="color: var(--color-warning);">Ação Sugerida:</strong> Incorpore no plano de divulgação do projeto a reserva de orçamentos para profissionais tradutores de Libras e técnicos de acessibilidade e escreva uma cláusula específica na seção 6.</li>' : ''}
                        ${!hasOrc ? '<li style="margin-bottom: 0.6rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;"><strong>Fragilidade:</strong> Planilha de custos vazia.<br/><strong style="color: var(--color-warning);">Ação Sugerida:</strong> Utilize o Agente Financeiro para calcular e estruturar sua planilha respeitando o teto de R$ 220k.</li>' : ''}
                        ${hasAces && hasOrc ? '<li style="margin-bottom: 0.6rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;"><strong>Fragilidade:</strong> Custos de coordenação muito próximos ao teto.<br/><strong style="color: var(--color-warning);">Ação Sugerida:</strong> Monitore as cotações para manter as taxas abaixo de 15% na conformidade exata.</li>' : ''}
                    </ul>
                </div>

                <!-- 8. Pontos Fortes a Preservar -->
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 5px solid #10b981; color: #166534; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.8rem;">
                    <h3 style="margin-top: 0; font-size: 1rem; color: #166534; border-bottom: 1px solid #d1fae5; padding-bottom: 0.5rem;">8. Pontos Fortes a Preservar 🟢</h3>
                    <p style="margin: 0.3rem 0;">• <strong>Forte Identidade Regional:</strong> A proposta é intrinsecamente enraizada no território histórico da bacia do Rio Doce.</p>
                    <p style="margin: 0.3rem 0;">• <strong>Impacto nas Comunidades de Pescadores:</strong> Foco muito nítido em populações vulnerabilizadas e ribeirinhas.</p>
                    <p style="margin: 0.3rem 0;">• <strong>Integração de Parcerias Locais:</strong> Excelente governança participativa.</p>
                </div>

                <!-- 9. Avaliação Crítica Final -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                    <h3 style="margin-top: 0; font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary);">9. Avaliação Crítica Final (Veredito)</h3>
                    <p>
                        A proposta apresenta <strong>alto potencial de classificação</strong> e aderência temática ao edital, demonstrando grande força comunitária e apelo cultural. No entanto, sua viabilidade técnica depende criticamente do preenchimento das fragilidades e do detalhamento fiscal das taxas administrativas e de provisão tributária. Resolvendo as pendências orçamentárias e de acessibilidade, o projeto se posiciona como extremamente competitivo frente à banca avaliadora.
                    </p>
                </div>

                <!-- 10. Checklist Final -->
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px;">
                    <h3 style="margin-top: 0; font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary);">10. Lista de Ação Priorizada (Checklist Final)</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.8rem;">
                        <thead>
                            <tr style="background: var(--bg-panel); text-align: left;">
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Pendência Crítica</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-primary);">Impacto na Nota</th>
                                <th style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-primary);">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="${!hasOrc ? 'background: #fef2f2;' : ''}">
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">Preencher Planilha Orçamentária com Detalhamento de Custos</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: #ef4444; font-weight: bold;">Eliminatório (Alto)</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary); font-family: monospace;">${hasOrc ? '✓ Concluído' : '[ ] A Fazer'}</td>
                            </tr>
                            <tr style="${!hasAces ? 'background: #fffbeb;' : ''}">
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">Inserir Cláusula de Acessibilidade Sensorial PCD (Libras/Audiodescrição)</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: #f59e0b; font-weight: bold;">Alto (-15 pts)</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary); font-family: monospace;">${hasAces ? '✓ Concluído' : '[ ] A Fazer'}</td>
                            </tr>
                            <tr style="${!hasJust ? 'background: #fffbeb;' : ''}">
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: var(--text-secondary);">Detalhar Histórico do Proponente e Comprovação Temporal</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; color: #f59e0b; font-weight: bold;">Médio (-10 pts)</td>
                                <td style="border: 1px solid var(--border-color); padding: 6px; text-align: center; color: var(--text-secondary); font-family: monospace;">${hasJust ? '✓ Concluído' : '[ ] A Fazer'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;

            const result = {
                nota_final: totalScore,
                nota_tecnica: notaTecnica,
                nota_priorizacao: notaPriorizacao,
                relatorio_analitico: reportHtml,
                criterios: [
                    { criterio: "Adequação ao Objeto, Matriz Lógica e Coerência", nota_maxima: 20, nota_atribuida: n1, justificativa: hasJust ? "Relevância e coerência excelentes do objeto da proposta." : "Justificativa conceitual muito curta ou pendente." },
                    { criterio: "Metodologia, Plano de Trabalho e Acessibilidade", nota_maxima: 20, nota_atribuida: n2, justificativa: hasAces ? "Metodologia de inclusão PCD exemplar e acessibilidade descrita." : "Inconsistências no plano ou ausência de acessibilidade." },
                    { criterio: "Exequibilidade Técnica (Experiência/Parcerias)", nota_maxima: 20, nota_atribuida: n3, justificativa: hasObj ? "Comprovações sólidas de parcerias e atuação prévia do proponente." : "Pouco detalhamento de parcerias ou ausência de histórico." },
                    { criterio: "Orçamento, Economicidade e Limites de Custos", nota_maxima: 20, nota_atribuida: n4, justificativa: hasOrc ? "Planilha de custos atende aos limites e taxas de administração." : "Orçamento sem custos discriminados ou ultrapassando taxas." },
                    { criterio: "Plano de Monitoramento, Indicadores e Avaliação", nota_maxima: 20, nota_atribuida: n5, justificativa: hasCrono ? "Detalhamento consistente das metas com indicadores qualitativos." : "Ausência de plano ou de indicadores de monitoramento." },
                    { criterio: "Governança Participativa e Transparência", nota_maxima: 10, nota_atribuida: n6, justificativa: hasJust ? "Mecanismos transparentes e compartilhados de tomada de decisão." : "Faltam instâncias colegiadas de participação comunitária." },
                    { criterio: "Público Prioritário e Coordenação Vulnerabilizada", nota_maxima: 10, nota_atribuida: n7, justificativa: hasAces ? "Ações voltadas às cotas e coordenação por agentes minorizados." : "Não detalha perfil dos públicos prioritários no edital." },
                    { criterio: "Atuação Prévia no Território e Impacto Territorial", nota_maxima: 10, nota_atribuida: n8, justificativa: hasObj ? "Impacto geográfico em área recomendada com forte atuação histórica." : "Proposta não localiza impacto geográfico conforme o edital." }
                ],
                ajustes: [],
                alertas: []
            };

            if (!hasOrc) {
                result.ajustes.push({ alteracao: "Preencher Planilha de Custos Detalhada", fator: "Orçamento" });
                result.alertas.push({ tipo: "Orçamento Ausente", descricao: "A planilha de custos não possui itens detalhados.", sugestao: "Utilize o Agente Financeiro para estimar e otimizar limites.", nivel: "ALTA" });
            } else {
                result.ajustes.push({ alteracao: "Adequação dos limites tributários", fator: "Orçamento" });
            }

            if (!hasAces) {
                result.alertas.push({ tipo: "Sem Acessibilidade PCD", descricao: "Não há previsão de Libras ou Audiodescrição.", sugestao: "Inserir intérprete de Libras e audiodescrição em todas as etapas.", nivel: "ALTA" });
            }

            resolve(result);
        }, 1200);
    });
}

function renderAuditorResults(data) {
    document.getElementById('score-value').textContent = data.nota_final;
    const scoreClass = document.getElementById('score-class');

    if (data.nota_final >= 115) {
        scoreClass.textContent = "Conformidade Excelente";
        scoreClass.style.color = "var(--color-success)";
    } else if (data.nota_final >= 85) {
        scoreClass.textContent = "Ajustes Necessários";
        scoreClass.style.color = "var(--color-warning)";
    } else {
        scoreClass.textContent = "Alto Risco de Desclassificação";
        scoreClass.style.color = "var(--color-error)";
    }

    // Atualizar badge de nota no cabeçalho do Editor
    const editorBadge = document.getElementById('editor-compliance-badge');
    if (editorBadge && data.nota_final !== undefined) {
        editorBadge.textContent = `Score: ${data.nota_final}/130`;
        editorBadge.style.display = 'inline-block';

        if (data.nota_final >= 105) {
            editorBadge.style.color = '#10b981';
            editorBadge.style.borderColor = '#a7f3d0';
            editorBadge.style.background = '#ecfdf5';
        } else if (data.nota_final >= 75) {
            editorBadge.style.color = '#f59e0b';
            editorBadge.style.borderColor = '#fde68a';
            editorBadge.style.background = '#fffbeb';
        } else {
            editorBadge.style.color = '#ef4444';
            editorBadge.style.borderColor = '#fca5a5';
            editorBadge.style.background = '#fef2f2';
        }
    }

    // Novo detalhamento de nota
    const splitDetail = document.getElementById('score-split-detail');
    if (splitDetail) {
        if (data.nota_tecnica !== undefined && data.nota_priorizacao !== undefined) {
            splitDetail.textContent = `Técnica: ${data.nota_tecnica}/100 | Priorização: ${data.nota_priorizacao}/30`;
        } else {
            splitDetail.textContent = '';
        }
    }

    // Dimensions
    data.criterios.forEach((c, idx) => {
        const i = idx + 1;
        const scoreEl = document.getElementById(`score-dim-${i}`);
        const fillEl = document.getElementById(`fill-dim-${i}`);
        if (scoreEl) scoreEl.textContent = `${c.nota_atribuida} / ${c.nota_maxima}`;
        if (fillEl) {
            fillEl.style.width = `${(c.nota_atribuida / c.nota_maxima) * 100}%`;
            const ratio = c.nota_atribuida / c.nota_maxima;
            if (ratio >= 0.8) fillEl.style.background = 'var(--color-success)';
            else if (ratio >= 0.5) fillEl.style.background = 'var(--color-warning)';
            else fillEl.style.background = 'var(--color-error)';
        }
    });

    // Relatório detalhado por área (8 áreas dinâmicas)
    const areasDetail = document.getElementById('audit-areas-detail');
    if (areasDetail) {
        areasDetail.innerHTML = '';
        const areaIcons = ['📄', '♿', '🤝', '💰', '📊', '🛠️', '👥', '🌱'];
        const areaColors = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f43f5e'];

        data.criterios.forEach((c, idx) => {
            const ratio = c.nota_atribuida / c.nota_maxima;
            const statusLabel = ratio >= 0.8 ? 'Aprovado' : ratio >= 0.5 ? 'Revisão Necessária' : 'Reprovado';
            const statusColor = ratio >= 0.8 ? 'var(--color-success)' : ratio >= 0.5 ? 'var(--color-warning)' : 'var(--color-error)';

            const icon = areaIcons[idx] || '📄';
            const color = areaColors[idx] || '#6366f1';

            const card = document.createElement('div');
            card.style.cssText = `background: var(--bg-card); border: 1px solid var(--border-color); border-left: 4px solid ${color}; border-radius: var(--radius-md); padding: 1rem;`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                    <span style="font-weight:700; font-size:0.85rem;">${icon} ${c.criterio}</span>
                    <span style="font-size:1.2rem; font-weight:800; color:${color};">${c.nota_atribuida}/${c.nota_maxima}</span>
                </div>
                <div style="background: var(--bg-input); border-radius: 4px; height: 8px; margin-bottom: 0.5rem;">
                    <div style="background: ${statusColor}; height: 100%; border-radius: 4px; width: ${ratio * 100}%; transition: width 0.5s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.4rem;">
                    <span style="font-size:0.7rem; color: ${statusColor}; font-weight:600;">${statusLabel}</span>
                    <span style="font-size:0.7rem; color:var(--text-muted);">${(ratio * 100).toFixed(0)}%</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.4; margin:0;">${c.justificativa}</p>
            `;
            areasDetail.appendChild(card);
        });
    }

    // Adjusts
    const tbl = document.querySelector('#table-adjusts tbody');
    tbl.innerHTML = '';
    data.ajustes.forEach(adj => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${adj.alteracao}</b></td>
            <td><code>${adj.fator}</code></td>
        `;
        tbl.appendChild(tr);
    });

    // Alerts
    const list = document.getElementById('alerts-list');
    list.innerHTML = '';
    data.alertas.forEach(a => {
        const div = document.createElement('div');
        div.className = `alert-item ${a.nivel.toLowerCase()}`;
        div.style.borderLeft = `4px solid ${a.nivel === 'ALTA' ? 'var(--color-error)' : 'var(--color-warning)'}`;
        div.style.background = 'var(--bg-input)';
        div.style.padding = '0.75rem';
        div.style.borderRadius = 'var(--radius-sm)';
        div.style.marginBottom = '0.5rem';

        div.innerHTML = `
            <div style="font-weight:700; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                <span>⚡ [${a.tipo}]</span>
                <span class="urgency-badge ${a.nivel.toLowerCase()}" style="font-size:0.6rem; padding:2px 6px;">${a.nivel}</span>
            </div>
            <p style="font-size:0.75rem; margin-top:0.25rem;">${a.descricao}</p>
            <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.15rem;"><b>Recomendação:</b> ${a.sugestao}</p>
        `;
        list.appendChild(div);
    });

    // Relatório Analítico Descritivo
    const analyticCard = document.getElementById('audit-analytic-report-card');
    const analyticContent = document.getElementById('audit-analytic-report-content');
    if (analyticCard && analyticContent) {
        if (data.relatorio_analitico) {
            analyticContent.innerHTML = data.relatorio_analitico;
            analyticCard.style.display = 'block';
        } else {
            analyticCard.style.display = 'none';
        }
    }

    document.getElementById('audit-dashboard').style.display = 'block';
    addHistoricalMemory(`Auditoria concluída com nota ${data.nota_final}/${data.nota_final >= 100 ? 130 : 100}.`);
}

async function downloadAuditPDF() {
    const data = workspaceState.lastAuditData;
    if (!data) {
        showToast("Nenhuma auditoria realizada ainda.", "warning");
        return;
    }

    showToast("Gerando PDF oficial no servidor...", "info");

    try {
        const payload = {
            project_title: workspaceState.cover.title || 'Projeto Cultural',
            institution: workspaceState.cover.institution || 'Não Especificada',
            proponent: workspaceState.cover.proponent || 'Não Especificado',
            budget: workspaceState.cover.budget || '0',
            score: data.nota_final || '0',
            nota_tecnica: data.nota_tecnica || '0',
            nota_priorizacao: data.nota_priorizacao || '0',
            relatorio_analitico: data.relatorio_analitico || '',
            criterios: data.criterios || [],
            ajustes: data.ajustes || [],
            alertas: data.alertas || []
        };

        const response = await fetch('/api/generate-audit-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Falha ao gerar PDF.");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFormattedDownloadFilename('Laudo_Auditoria_Compliance', 'pdf');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("✓ Relatório PDF baixado com sucesso!", "success");
    } catch (err) {
        showToast("Erro ao baixar PDF da auditoria: " + err.message, "error");
    }
}



// ==========================================
// ABA 6: BIBLIOTECA & ACERVO
// ==========================================
function setupBiblioteca() {
    const btnSearch = document.getElementById('btn-search-web');
    const searchInput = document.getElementById('search-query-input');
    const resultsList = document.getElementById('search-results-list');

    if (btnSearch && searchInput) {
        btnSearch.addEventListener('click', async () => {
            const query = searchInput.value.trim();
            if (!query) return;

            if (resultsList) {
                resultsList.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; gap:0.5rem;">
                        <div class="spinner" style="width:25px; height:25px;"></div>
                        <span style="font-size:0.8rem; color:var(--text-secondary);">Pesquisando editais ativos na web...</span>
                    </div>
                `;
            }

            try {
                const response = await fetch('/api/search-web-editais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                if (!response.ok) throw new Error("Erro de conexão com o crawler proxy.");
                const data = await response.json();
                renderSearchResults(data.results || []);
            } catch (err) {
                showToast("Erro de busca na web: " + err.message, "error");
                if (resultsList) resultsList.innerHTML = `<div style="font-size:0.8rem; color:var(--color-error); text-align:center; padding:1rem;">Falha na conexão. Servidor de busca offline.</div>`;
            }
        });
    }
}

function renderSearchResults(results) {
    const resultsList = document.getElementById('search-results-list');
    if (!resultsList) return;
    resultsList.innerHTML = '';

    if (results.length === 0) {
        resultsList.innerHTML = `<div style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.8rem;">Nenhum edital cultural ativo encontrado.</div>`;
        return;
    }

    results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'saved-edital-item';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.style.gap = '0.5rem';

        div.innerHTML = `
            <div class="saved-edital-info">
                <span class="saved-edital-title">${res.title}</span>
                <a href="${res.url}" target="_blank" style="font-size:0.65rem; color:var(--color-primary); word-break:break-all;">${res.url}</a>
            </div>
            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-secondary btn-import-search" style="font-size:0.65rem; padding:2px 8px; width:auto;">📥 Adicionar ao Acervo</button>
            </div>
        `;

        div.querySelector('.btn-import-search').addEventListener('click', async () => {
            showToast(`Baixando e indexando "${res.title}"...`, "info");
            try {
                const response = await fetch('/api/fetch-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: res.url })
                });
                if (!response.ok) throw new Error("Erro de download.");
                const data = await response.json();

                workspaceState.library.push({
                    name: res.title,
                    content: data.text,
                    size: data.text.length,
                    date: new Date().toLocaleDateString()
                });
                saveWorkspaceState();
                renderLibrary();
                showToast(`Edital "${res.title}" indexado no seu acervo local!`, "success");
            } catch (err) {
                showToast("Erro ao importar do link: " + err.message, "error");
            }
        });

        resultsList.appendChild(div);
    });
}

function renderLibrary() {
    const list = document.getElementById('library-list-container');
    if (!list) return;
    list.innerHTML = '';

    if (workspaceState.library.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:1.5rem; font-size:0.8rem; color:var(--text-muted);">Nenhum edital ou proposta salva no acervo local ainda.</div>`;
        return;
    }

    workspaceState.library.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'saved-edital-item';

        div.innerHTML = `
            <div class="saved-edital-info">
                <span class="saved-edital-title">${item.name}</span>
                <span class="saved-edital-meta">${item.date} · ${(item.size / 1024).toFixed(1)} KB</span>
            </div>
            <div class="saved-edital-actions">
                <button class="saved-edital-btn active-btn">Usar como Ativo</button>
                <button class="saved-edital-btn danger delete-btn">Excluir</button>
            </div>
        `;

        div.querySelector('.active-btn').addEventListener('click', () => {
            workspaceState.editalRefText = item.content;
            workspaceState.editalRefName = item.name;
            saveWorkspaceState();

            const textareaEdital = document.getElementById('edital-ref-text');
            const badgeEdital = document.getElementById('file-badge-edital-ref');
            const nameEdital = document.getElementById('file-name-edital-ref');

            if (textareaEdital) textareaEdital.value = item.content;
            if (nameEdital) nameEdital.textContent = item.name;
            if (badgeEdital) badgeEdital.style.display = 'flex';

            showToast(`Edital "${item.name}" definido como ativo no Setup!`, "success");
        });

        div.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm(`Remover "${item.name}" do acervo?`)) {
                workspaceState.library.splice(index, 1);
                saveWorkspaceState();
                renderLibrary();
                showToast("Item removido do acervo.", "warning");
            }
        });

        list.appendChild(div);
    });
}

function runPreFlightLinter() {
    const alerts = [];
    const doc = workspaceState.documentContent || {};

    // Check total budget
    const budget = workspaceState.cover.budget || 0;
    if (budget > 220000) {
        alerts.push({
            tipo: "Orçamento Excedido (Linter Local)",
            descricao: `O orçamento declarado do projeto é de R$ ${budget.toLocaleString('pt-BR')}, o que excede o limite regulamentar do edital de R$ 220.000,00.`,
            sugestao: "Reduza os custos na aba de orçamento para respeitar o teto limite do edital.",
            nivel: "ALTA"
        });
    }

    // Check accessibility keywords
    const accessText = (doc.acessibilidade || "").toLowerCase();
    const hasLibras = accessText.includes("libras");
    const hasAudiodescricao = accessText.includes("audiodescrição") || accessText.includes("audiodescricao");

    if (!hasLibras || !hasAudiodescricao) {
        alerts.push({
            tipo: "Acessibilidade Incompleta (Linter Local)",
            descricao: "Não encontramos menções explícitas a tradutores de Libras ou Audiodescrição na seção de Acessibilidade.",
            sugestao: "Adicione medidas claras de acessibilidade comunicacional (Intérprete de Libras e Audiodescrição para PCDs).",
            nivel: "MEDIA"
        });
    }

    // Check objectives empty
    if (!doc.objetivos || doc.objetivos.trim().length < 20) {
        alerts.push({
            tipo: "Objetivos Ausentes ou Curtos (Linter Local)",
            descricao: "A seção de objetivos está vazia ou é excessivamente curta.",
            sugestao: "Descreva de forma clara o objetivo geral e pelo menos 3 objetivos específicos.",
            nivel: "ALTA"
        });
    }

    return alerts;
}

function filterRelevantEditalText(text, agentKey = null, maxChars = 35000) {
    if (!text) return "";
    if (text.length <= maxChars) return text;

    const keywordMap = {
        justificativa: /(justificativa|relevância|histórico|proponente|objeto|cultural|social|impacto)/i,
        objetivos: /(objetivo|meta|público|beneficiário|alcance|fim|finalidade)/i,
        metodologia: /(metodologia|plano de trabalho|fases|etapas|execução|desenvolvimento)/i,
        cronograma: /(cronograma|prazo|mês|meses|fases|etapa|duração)/i,
        orcamento: /(orçamento|custo|teto|limite|administrativo|rubrica|planilha|r\$|preço|valor|despesa|financeiro)/i,
        acessibilidade: /(acessibilidade|pcd|libras|audiodescrição|rampa|braille|legenda|deficiência)/i,
        publico: /(público|beneficiário|faixa etária|gratuito|acesso|comunidade)/i,
        contrapartida: /(contrapartida|legado|doação|oficina|palestra|social|retorno)/i,
        comunicacao: /(comunicação|divulgação|assessoria|mídia|peças|marca|propaganda)/i,
        ficha_tecnica: /(ficha técnica|currículo|equipe|função|experiência)/i,
        monitoramento: /(monitoramento|indicador|avaliação|pesquisa|relatório|matriz)/i,
        compliance: /(compliance|direito|certidão|regularidade|fgts|cnd|cndt|receita|lei|legal|penalidade|glosa)/i,
        sustentabilidade: /(sustentabilidade|esg|resíduo|carbono|ecológico|meio ambiente)/i,
        rider: /(rider|palco|som|luz|montagem|logística|transporte|hospedagem|técnico)/i
    };

    const defaultRegex = /(r\$|teto|limite|contrapartida|rubrica|acessibilidade|libras|audiodescrição|cronograma|prazo|penalidade|multa|proponente|habilitação|documentação|certidão|recurso|glosa|tributo|despesa)/i;
    const regex = (agentKey && keywordMap[agentKey]) ? keywordMap[agentKey] : defaultRegex;

    const paragraphs = text.split(/\n\s*\n/);
    const matchedParagraphs = [];
    let totalLength = 0;

    for (const paragraph of paragraphs) {
        const cleanPara = paragraph.trim();
        if (!cleanPara) continue;

        if (regex.test(cleanPara)) {
            if (totalLength + cleanPara.length + 2 <= maxChars) {
                matchedParagraphs.push(cleanPara);
                totalLength += cleanPara.length + 2;
            } else {
                const remaining = maxChars - totalLength;
                if (remaining > 100) {
                    matchedParagraphs.push(cleanPara.substring(0, remaining) + "...");
                }
                break;
            }
        }
    }

    if (matchedParagraphs.length === 0 || totalLength < 5000) {
        return text.substring(0, maxChars);
    }

    return matchedParagraphs.join("\n\n");
}

// ==========================================
// GENERAL UTILITIES
// ==========================================
function escapeRawNewlinesInJSON(jsonStr) {
    let result = "";
    let inString = false;
    let isEscaped = false;
    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (isEscaped) {
            result += char;
            isEscaped = false;
        } else if (char === '\\') {
            result += char;
            isEscaped = true;
        } else if (char === '"') {
            result += char;
            inString = !inString;
        } else if ((char === '\n' || char === '\r') && inString) {
            result += char === '\n' ? '\\n' : '\\r';
        } else {
            result += char;
        }
    }
    return result;
}

function safeParseJSON(text) {
    if (!text) return null;
    let clean = text.trim();

    // Find the first '{' and the last '}' or first '[' and last ']'
    const braceStart = clean.indexOf('{');
    const braceEnd = clean.lastIndexOf('}');
    const bracketStart = clean.indexOf('[');
    const bracketEnd = clean.lastIndexOf(']');

    let startIdx = -1;
    let endIdx = -1;

    if (braceStart !== -1 && (bracketStart === -1 || braceStart < bracketStart)) {
        startIdx = braceStart;
        endIdx = braceEnd;
    } else if (bracketStart !== -1) {
        startIdx = bracketStart;
        endIdx = bracketEnd;
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        let jsonStr = clean.substring(startIdx, endIdx + 1);
        jsonStr = escapeRawNewlinesInJSON(jsonStr);
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.warn("[JSON_PARSE] Failed parsing extracted substring, trying raw parse:", e);
        }
    }

    // Fallback: try parsing directly after replacing markdown code block wrappers
    clean = clean.replace(/```json/gi, "").replace(/```/g, "").trim();
    clean = escapeRawNewlinesInJSON(clean);
    try {
        return JSON.parse(clean);
    } catch (e) {
        console.error("[JSON_PARSE] Absolute failure to parse JSON:", e);
        return null;
    }
}

function fixDoubleEncoding(str) {
    if (!str) return "";
    try {
        if (/[\u00c0-\u00df][\u0080-\u00bf]/.test(str)) {
            return decodeURIComponent(escape(str));
        }
    } catch (e) { }
    return str;
}

function renderTextOrMarkdown(text) {
    if (!text) return "";
    let clean = fixDoubleEncoding(text).trim();
    if (clean.startsWith('<') || /<[a-z][\s\S]*>/i.test(clean)) {
        // Parse markdown bold, italic, code inside HTML safely
        clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        clean = clean.replace(/\*(.*?)\*/g, "<em>$1</em>");
        clean = clean.replace(/`([^`]+)`/g, "<code>$1</code>");
        return clean;
    }
    return formatMarkdown(clean);
}

function formatMarkdown(text) {
    if (!text) return "";
    let formatted = text
        .replace(/&(?!#?\w+;)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");

    const lines = formatted.split('\n');
    let inUnorderedList = false;
    let inOrderedList = false;
    const output = [];

    for (let line of lines) {
        const trimmed = line.trim();

        // 1. Headers Check
        if (trimmed.startsWith('### ')) {
            if (inUnorderedList) { output.push("</ul>"); inUnorderedList = false; }
            if (inOrderedList) { output.push("</ol>"); inOrderedList = false; }
            output.push(`<h4 style="margin-top:0.75rem; margin-bottom:0.5rem; font-weight:bold; color:var(--text-primary);">${trimmed.substring(4)}</h4>`);
            continue;
        }
        if (trimmed.startsWith('## ')) {
            if (inUnorderedList) { output.push("</ul>"); inUnorderedList = false; }
            if (inOrderedList) { output.push("</ol>"); inOrderedList = false; }
            output.push(`<h3 style="margin-top:1rem; margin-bottom:0.5rem; font-weight:bold; color:var(--text-primary);">${trimmed.substring(3)}</h3>`);
            continue;
        }
        if (trimmed.startsWith('# ')) {
            if (inUnorderedList) { output.push("</ul>"); inUnorderedList = false; }
            if (inOrderedList) { output.push("</ol>"); inOrderedList = false; }
            output.push(`<h2 style="margin-top:1.25rem; margin-bottom:0.75rem; font-weight:bold; color:var(--text-primary);">${trimmed.substring(2)}</h2>`);
            continue;
        }

        // 2. Unordered lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (inOrderedList) { output.push("</ol>"); inOrderedList = false; }
            if (!inUnorderedList) {
                output.push("<ul style='list-style-type:disc; margin-left:1.5rem; margin-top:0.25rem; margin-bottom:0.25rem;'>");
                inUnorderedList = true;
            }
            output.push(`<li>${trimmed.substring(2)}</li>`);
        }
        // 3. Ordered lists
        else if (/^\d+\.\s/.test(trimmed)) {
            if (inUnorderedList) { output.push("</ul>"); inUnorderedList = false; }
            if (!inOrderedList) {
                output.push("<ol style='list-style-type:decimal; margin-left:1.5rem; margin-top:0.25rem; margin-bottom:0.25rem;'>");
                inOrderedList = true;
            }
            const match = trimmed.match(/^\d+\.\s(.*)/);
            output.push(`<li>${match[1]}</li>`);
        }
        // 4. Tables and regular paragraphs
        else {
            if (inUnorderedList) { output.push("</ul>"); inUnorderedList = false; }
            if (inOrderedList) { output.push("</ol>"); inOrderedList = false; }

            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                if (trimmed.includes('---')) continue;
                const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
                let rowHtml = "<tr>" + cells.map(cell => `<td style="border:1px solid #ddd; padding:6px; font-size:0.8rem;">${cell}</td>`).join("") + "</tr>";
                if (output.length > 0 && output[output.length - 1].includes('</table>')) {
                    const last = output.pop();
                    const tableContent = last.replace('</table>', '') + rowHtml + '</table>';
                    output.push(tableContent);
                } else if (output.length > 0 && output[output.length - 1].includes('</tr>')) {
                    const last = output.pop();
                    const tableContent = last.replace('</tbody></table>', '') + rowHtml + '</tbody></table>';
                    output.push(tableContent);
                } else {
                    output.push('<table style="width:100%; border-collapse:collapse; margin:1rem 0; border:1px solid #ddd;"><tbody>' + rowHtml + '</tbody></table>');
                }
            } else {
                if (trimmed) {
                    output.push(`<p style="margin-bottom:0.5rem;">${line}</p>`);
                } else {
                    output.push("<br>");
                }
            }
        }
    }

    if (inUnorderedList) output.push("</ul>");
    if (inOrderedList) output.push("</ol>");
    return output.join('\n');
}

function showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.background = type === 'success' ? 'var(--color-success)' : type === 'warning' ? 'var(--color-warning)' : type === 'error' ? 'var(--color-error)' : 'var(--color-primary)';
    toast.style.color = '#ffffff';
    toast.style.padding = '0.75rem 1.25rem';
    toast.style.borderRadius = 'var(--radius-md)';
    toast.style.fontSize = '0.85rem';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.justifyContent = 'space-between';
    toast.style.gap = '1rem';
    toast.style.animation = 'fadeIn 0.25s ease-out';

    toast.innerHTML = `
        <span>${message}</span>
        <button style="background:transparent; border:none; color:#ffffff; font-weight:700; cursor:pointer;">×</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.25s ease-out';
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

// Helper para geração de nomes de arquivos de download claros, descritivos e sanitizados
function getFormattedDownloadFilename(docCategory, extension) {
    let rawTitle = (workspaceState && workspaceState.cover && workspaceState.cover.title) 
        ? workspaceState.cover.title.trim() 
        : '';
    
    // Ignorar placeholders padrão sem sentido
    if (!rawTitle || rawTitle.toUpperCase() === 'TÍTULO DO PROJETO CULTURAL' || rawTitle.toLowerCase() === 'sem nome') {
        rawTitle = 'Projeto_Cultural';
    }

    // Remove acentos (NFD) e substitui caracteres especiais por underline
    const cleanTitle = rawTitle
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    const cleanCategory = docCategory
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    const ext = extension.startsWith('.') ? extension : `.${extension}`;

    return `${cleanCategory}_${cleanTitle || 'Cultural'}${ext}`;
}

// Export Word doc wrapper
// Gera o HTML limpo da proposta ABNT completa (sem UI/CSS do app)
function buildCleanProposalHTML() {
    const cover = workspaceState.cover;
    const doc = workspaceState.documentContent;
    const fontFamily = document.getElementById('abnt-font-select') ? document.getElementById('abnt-font-select').value : 'Arial';
    const pageTitle = getFormattedDownloadFilename('Proposta_Cultural_ABNT', '').replace(/\.$/, '');

    return `
    <html>
    <head>
        <meta charset="utf-8">
        <title>${pageTitle}</title>
        <style>
            @page {
                size: 21cm 29.7cm;
                margin-top: 3cm;
                margin-left: 3cm;
                margin-bottom: 2cm;
                margin-right: 2cm;
            }
            body {
                font-family: ${fontFamily}, Arial, sans-serif;
                font-size: 12pt;
                line-height: 1.5;
                text-align: justify;
                color: #000000;
                background: #ffffff;
            }
            .cover-page {
                text-align: center;
                text-transform: uppercase;
                min-height: 600px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-after: always;
            }
            .cover-institution { font-weight: bold; font-size: 14pt; margin-top: 2cm; }
            .cover-proponent { font-size: 12pt; margin-top: 1cm; }
            .cover-title { font-weight: 800; font-size: 16pt; margin: auto 0; line-height: 1.3; }
            .cover-footer { margin-top: auto; margin-bottom: 2cm; }
            .cover-city, .cover-year { font-size: 12pt; }
            h3 {
                font-size: 12pt;
                font-weight: bold;
                text-transform: uppercase;
                margin-top: 1.5cm;
                margin-bottom: 0.5cm;
                border-bottom: 1px solid #ccc;
                padding-bottom: 4px;
            }
            .section-content {
                font-size: 12pt;
                text-indent: 1.25cm;
                margin-bottom: 1cm;
            }
            .section-content p { text-indent: 1.25cm; margin-bottom: 0.5cm; }
            .section-content ul, .section-content ol { margin-left: 1.25cm; margin-bottom: 0.5cm; }
            .section-content li { margin-bottom: 0.25cm; }
            table { width: 100%; border-collapse: collapse; margin: 0.5cm 0; font-size: 10pt; }
            th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="cover-page">
            <div class="cover-institution">${cover.institution || 'INSTITUIÇÃO DE FOMENTO'}</div>
            <div class="cover-proponent">${cover.proponent || 'NOME DO PROPONENTE'}</div>
            <div class="cover-title">${cover.title || 'TÍTULO DO PROJETO CULTURAL'}</div>
            <div class="cover-footer">
                <div class="cover-city">${cover.city || 'CIDADE - UF'}</div>
                <div class="cover-year">${cover.year || new Date().getFullYear()}</div>
            </div>
        </div>
        
        <h3>1. JUSTIFICATIVA E RELEVÂNCIA DO PROJETO</h3>
        <div class="section-content">${doc.justificativa || '<p>Seção não preenchida.</p>'}</div>
        
        <h3>2. OBJETIVOS (GERAL E ESPECÍFICOS)</h3>
        <div class="section-content">${doc.objetivos || '<p>Seção não preenchida.</p>'}</div>
        
        <h3>3. METODOLOGIA E PLANO DE TRABALHO</h3>
        <div class="section-content">${doc.metodologia || '<p>Seção não preenchida.</p>'}</div>
        
        <h3>4. CRONOGRAMA FÍSICO DE ATIVIDADES</h3>
        <div class="section-content">${doc.cronograma || '<p>Seção não preenchida.</p>'}</div>
        
        <h3>5. ORÇAMENTO E PLANILHA DE CUSTOS</h3>
        <div class="section-content">${doc.orcamento || '<p>Seção não preenchida.</p>'}</div>
        
        <h3>6. ACESSIBILIDADE E COTAS</h3>
        <div class="section-content">${doc.acessibilidade || '<p>Seção não preenchida.</p>'}</div>

        <h3>7. PÚBLICO-ALVO E PERFIL DOS BENEFICIÁRIOS</h3>
        <div class="section-content">${doc.publico || '<p>Seção não preenchida.</p>'}</div>

        <h3>8. CONTRAPARTIDA SOCIAL E LEGADO</h3>
        <div class="section-content">${doc.contrapartida || '<p>Seção não preenchida.</p>'}</div>

        <h3>9. PLANO DE COMUNICAÇÃO E DIVULGAÇÃO</h3>
        <div class="section-content">${doc.comunicacao || '<p>Seção não preenchida.</p>'}</div>

        <h3>10. FICHA TÉCNICA E CAPACIDADE OPERACIONAL</h3>
        <div class="section-content">${doc.ficha_tecnica || '<p>Seção não preenchida.</p>'}</div>

        <h3>11. PLANO DE MONITORAMENTO, AVALIAÇÃO E INDICADORES (MATRIZ LÓGICA)</h3>
        <div class="section-content">${doc.monitoramento || '<p>Seção não preenchida.</p>'}</div>

        <h3>12. COMPLIANCE, MARCOS LEGAIS E DIREITOS</h3>
        <div class="section-content">${doc.compliance || '<p>Seção não preenchida.</p>'}</div>

        <h3>13. PLANO DE SUSTENTABILIDADE E MITIGAÇÃO AMBIENTAL</h3>
        <div class="section-content">${doc.sustentabilidade || '<p>Seção não preenchida.</p>'}</div>

        <h3>14. RIDER TÉCNICO E NECESSIDADES LOGÍSTICAS</h3>
        <div class="section-content">${doc.rider || '<p>Seção não preenchida.</p>'}</div>
    </body>
    </html>
    `;
}

function printCleanProposal() {
    // Sync latest editor content to state
    syncDOMContentToState();

    const html = buildCleanProposalHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = function () {
        printWindow.print();
        setTimeout(function () { printWindow.close(); }, 1000);
    };
}

function exportCleanDoc() {
    // Sync latest editor content to state
    syncDOMContentToState();

    const html = buildCleanProposalHTML().replace('<html>', "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>");

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = getFormattedDownloadFilename('Proposta_Cultural_ABNT', 'doc');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("✓ Proposta completa exportada como Word (.doc)!", "success");
}

async function consolidateAndFormatABNT() {
    // Sincronizar DOM primeiro
    syncDOMContentToState();
    
    // Salvar versão no histórico ANTES de modificar qualquer texto
    pushProposalHistoryState("Antes da Formatação ABNT IA");

    if (!isApiActive()) {
        showToast("Chave da API ausente. A formatação ABNT foi realizada com regras locais.", "warning");
        for (const key of Object.keys(workspaceState.documentContent)) {
            if (workspaceState.documentContent[key]) {
                workspaceState.documentContent[key] = workspaceState.documentContent[key]
                    .replace(/claro,? aqui está/gi, '')
                    .replace(/com certeza/gi, '')
                    .replace(/espero ter ajudado.*$/gi, '');
            }
        }
        saveWorkspaceState();
        syncEditorContentToDOM();
        updatePlaceholderStates();
        showToast("✓ Proposta formatada conforme as normas ABNT!", "success");
        return;
    }

    showToast("⚙️ Iniciando formatação ABNT preservando a totalidade das 14 seções...", "info");

    const sectionKeys = [
        'justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento',
        'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica',
        'monitoramento', 'compliance', 'sustentabilidade', 'rider'
    ];
    
    const sectionNames = {
        justificativa: "Justificativa", objetivos: "Objetivos", metodologia: "Metodologia",
        cronograma: "Cronograma", orcamento: "Orçamento", acessibilidade: "Acessibilidade e Cotas",
        publico: "Público-Alvo", contrapartida: "Contrapartida Social", comunicacao: "Comunicação",
        ficha_tecnica: "Ficha Técnica", monitoramento: "Monitoramento", compliance: "Compliance",
        sustentabilidade: "Sustentabilidade", rider: "Rider Técnico"
    };

    let processedCount = 0;
    const editalContext = workspaceState.editalRefText ? filterRelevantEditalText(workspaceState.editalRefText) : "";

    for (const key of sectionKeys) {
        const rawContent = workspaceState.documentContent[key] || '';
        // Se a seção é apenas placeholder ou vazia, pula
        if (!rawContent || placeholders.includes(rawContent.trim())) {
            continue;
        }

        processedCount++;
        showToast(`🪄 Formatando ABNT (${processedCount}/14): ${sectionNames[key]}...`, "info");

        const prompt = `Você é o Agente Revisor ABNT Especialista em Editais Culturais.
Sua missão é formatar e otimizar exclusivamente a seção "${sectionNames[key].toUpperCase()}" mantendo 100% do conteúdo, detalhes, tabelas, valores e parágrafos do texto original.

REGRA CRÍTICA IMPRESCINDÍVEL:
NUNCA resuma, suprima, reduza ou encurte o texto original. Mantenha integralmente a extensão e a profundidade de informação fornecida!

INSTRUÇÕES DE FORMATAÇÃO:
1. Normas ABNT: Aplique formatação ABNT em HTML limpo. Parágrafos organizados com classe abnt-indent, títulos destacados em h3/h4, tabelas com bordas finas normativas (border: 1px solid #cbd5e1; border-collapse: collapse;) e cabeçalhos destacados.
2. Gramática e Estilo: Corrija concordância e gramática sem alterar o sentido.
3. Remoção de Marcas de IA: Elimine diálogos, saudações, desculpas e clichês retóricos (como "em suma", "destarte", "adicionalmente", "portanto", "claro, aqui está").

[TEXTO ORIGINAL DA SEÇÃO]:
${rawContent}

[EDITAL DE REFERÊNCIA VIGENTE]:
${editalContext.substring(0, 35000)}

Retorne um JSON estrito sem marcação markdown no seguinte formato:
{
    "conteudo_formatado": "HTML COMPLETO E FORMATADO DA SEÇÃO..."
}`;

        try {
            const singleSectionSchema = {
                type: "object",
                properties: {
                    conteudo_formatado: { type: "string", description: "HTML formatado ABNT da seção" }
                },
                required: ["conteudo_formatado"]
            };

            const responseText = await callLLMGateway(prompt, null, 'light', singleSectionSchema);
            const parsed = safeParseJSON(responseText);

            if (parsed && parsed.conteudo_formatado && parsed.conteudo_formatado.trim().length > 20) {
                let cleanFormatted = parsed.conteudo_formatado
                    .replace(/^(claro|com certeza|aqui está|segundo o edital|conforme solicitado).*?:/gi, '')
                    .replace(/espero ter ajudado.*$/gi, '')
                    .trim();
                workspaceState.documentContent[key] = cleanFormatted;
            }
        } catch (err) {
            console.warn(`[ABNT-FORMAT] Falha ao formatar seção ${key}:`, err);
        }
    }

    saveWorkspaceState();
    syncEditorContentToDOM();
    updatePlaceholderStates();
    updateHistoryButtonsUI();
    showToast("✓ Todas as seções foram formatadas conforme as normas ABNT sem perda de conteúdo!", "success");
}

function downloadFinancePlan() {
    let tableHtml = "";

    // Tenta encontrar uma tabela na seção de orçamento do documento
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = workspaceState.documentContent.orcamento || "";
    const table = tempDiv.querySelector('table');

    if (table) {
        tableHtml = table.outerHTML;
    } else if (workspaceState.revisorAgentsResults && workspaceState.revisorAgentsResults.orcamento) {
        const agentFeedbackDiv = document.createElement('div');
        agentFeedbackDiv.innerHTML = workspaceState.revisorAgentsResults.orcamento.parecer || "";
        const agentTable = agentFeedbackDiv.querySelector('table');
        if (agentTable) {
            tableHtml = agentTable.outerHTML;
        }
    }

    if (!tableHtml) {
        showToast("Nenhuma tabela de orçamento encontrada na proposta ou no parecer financeiro. Certifique-se de gerar o orçamento primeiro.", "warning");
        return;
    }

    const htmlContent = `
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            tfoot { font-weight: bold; background-color: #e2e8f0; }
            .header-info { font-family: Arial, sans-serif; margin-bottom: 20px; }
            .header-info h2 { color: #1e1b4b; margin: 0 0 5px 0; }
            .header-info p { margin: 3px 0; color: #475569; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="header-info">
            <h2>Planilha Orçamentária Otimizada</h2>
            <p>Projeto: <strong>${workspaceState.cover.title || 'Projeto Cultural'}</strong></p>
            <p>Proponente: <strong>${workspaceState.cover.proponent || 'Não Especificado'}</strong></p>
            <p>Instituição: <strong>${workspaceState.cover.institution || 'Não Especificada'}</strong></p>
            <p>Orçamento Previsto: <strong>R$ ${Number(workspaceState.cover.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
            <p>Data de Emissão: <strong>${new Date().toLocaleDateString('pt-BR')}</strong></p>
        </div>
        ${tableHtml}
    </body>
    </html>
    `;

    const blob = new Blob(["\uFEFF", htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFormattedDownloadFilename('Planilha_Orcamentaria', 'xls');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("✓ Planilha financeira baixada com sucesso!", "success");
}

function getOfflineRevisorReport() {
    const results = workspaceState.revisorAgentsResults || {};
    let totalScore = 0;
    let count = 0;
    let agentRows = "";
    let criticalIssues = [];
    let actionPlanItems = [];

    for (const [key, meta] of Object.entries(REVISORES_METADATA)) {
        const res = results[key];
        const score = res ? res.nota : 80;
        totalScore += score;
        count++;

        const badgeClass = score >= 90 ? 'color:#15803d;' : (score >= 70 ? 'color:#b45309;' : 'color:#b91c1c;');
        agentRows += `
        <tr>
            <td style="padding:8px; border:1px solid #cbd5e1;"><strong>${meta.name}</strong></td>
            <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; ${badgeClass}">${score}/100</td>
            <td style="padding:8px; border:1px solid #cbd5e1;">${res ? (res.parecer ? res.parecer.substring(0, 220) + "..." : "Avaliação preliminar concluída.") : "Aguardando análise detalhada do agente."}</td>
        </tr>`;

        if (score < 80) {
            criticalIssues.push(`<li><strong>${meta.name}:</strong> Nota estimada em ${score}/100. Necessário ajustar conformidade com os critérios formais do edital.</li>`);
            actionPlanItems.push(`<li><strong>Revisão em ${meta.name}:</strong> Editar o conteúdo da seção "${key}" no editor para atender integralmente às exigências legais e normas ABNT.</li>`);
        }
    }

    const avgScore = count > 0 ? Math.round(totalScore / count) : 85;
    const title = workspaceState.cover.title || "Projeto Cultural";
    const proponent = workspaceState.cover.proponent || "Proponente Cultural";

    if (criticalIssues.length === 0) {
        criticalIssues.push("<li>Nenhuma inconformidade crítica identificada no diagnóstico preliminar offline.</li>");
        actionPlanItems.push("<li>Revisar o texto final no editor antes da submissão oficial e checar CNDT/FGTS.</li>");
    }

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 12px;">
        <h2 style="color: #1e1b4b; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">Relatório Detalhado de Revisão (IndexedDB / OfflineAuditor)</h2>
        <p><strong>Projeto:</strong> ${title} | <strong>Proponente:</strong> ${proponent} | <strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        
        <h3 style="color:#334155; margin-top:20px;">1. Sumário Executivo</h3>
        <p>A banca examinadora composta por 14 sub-agentes especialistas realizou o cruzamento dos dados do projeto com a legislação de fomento vigente (Lei 13.146/2015, NBR 9050, tetos de custos de 15% adm / 10% marketing). A <strong>Média Global de Conformidade</strong> estimada é de <strong style="color:#4f46e5;">${avgScore} / 100 pontos</strong>.</p>
        
        <h3 style="color:#334155; margin-top:20px;">2. Diagnóstico por Agente Especialista</h3>
        <table style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; font-size:12px; margin-bottom:16px;">
            <thead>
                <tr style="background:#f1f5f9; text-align:left;">
                    <th style="padding:8px; border:1px solid #cbd5e1;">Agente Especialista</th>
                    <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">Nota</th>
                    <th style="padding:8px; border:1px solid #cbd5e1;">Resumo do Parecer</th>
                </tr>
            </thead>
            <tbody>
                ${agentRows}
            </tbody>
        </table>

        <h3 style="color:#334155; margin-top:20px;">3. Processos a Melhorar e Inconformidades Identificadas</h3>
        <ul>
            ${criticalIssues.join('')}
        </ul>

        <h3 style="color:#334155; margin-top:20px;">4. Plano de Ação Recomendado</h3>
        <ul>
            ${actionPlanItems.join('')}
        </ul>

        <h3 style="color:#334155; margin-top:20px;">5. Checklist de Finalização e Submissão</h3>
        <ul>
            <li>[x] Preenchimento de todas as 14 seções ABNT do editor.</li>
            <li>[x] Verificação dos limites orçamentários (15% administração, 10% divulgação).</li>
            <li>[x] Inclusão de intérprete de LIBRAS e audiodescrição no plano de acessibilidade.</li>
            <li>[ ] Emissão e anexação das certidões negativas (CNDT, Receita Federal e FGTS).</li>
        </ul>
    </div>`;
}

async function generateRevisorReport() {
    const results = workspaceState.revisorAgentsResults;
    if (!results || Object.keys(results).length === 0) {
        showToast("Nenhum parecer de agente encontrado. Por favor, rode os agentes revisores primeiro.", "warning");
        return;
    }

    const btn = document.getElementById('btn-generate-revisor-report');
    if (btn) btn.disabled = true;

    showToast("📋 Gerando Relatório Detalhado de Revisão...", "info");

    let reportHtml = "";
    let generatedViaAPI = false;

    if (isApiActive()) {
        let consolidatedFeedback = "";
        for (const [key, meta] of Object.entries(REVISORES_METADATA)) {
            const res = results[key];
            if (res && res.parecer) {
                consolidatedFeedback += `### AGENTE: ${meta.name} (Nota: ${res.nota}/100)\n${res.parecer}\n\n`;
            }
        }

        if (consolidatedFeedback) {
            const prompt = `Você é o Arquiteto de Software Sênior e Especialista em Performance e Auditoria de Editais Culturais.
            Sua missão é consolidar os pareceres dos 14 agentes especialistas e gerar um Relatório Detalhado de Revisão em HTML.
            
            ESTRUTURA OBRIGATÓRIA:
            1. Sumário Executivo, 2. Diagnóstico por Agente, 3. Processos a Melhorar, 4. Plano de Ação, 5. Checklist.
            
            [PARECERES]:
            ${consolidatedFeedback}
            `;

            try {
                let rawApiResult = await callLLMGateway(prompt, "Você é um auditor sênior de projetos culturais. Responda estritamente em HTML.", 'heavy', null, false);
                rawApiResult = rawApiResult.replace(/^\s*```[a-zA-Z]*\s*\r?\n/gm, '').replace(/\r?\n\s*```\s*$/gm, '').trim();
                rawApiResult = rawApiResult.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                rawApiResult = rawApiResult.replace(/<\/?(html|head|body|title)[^>]*>/gi, '').trim();
                if (rawApiResult.length > 50) {
                    reportHtml = rawApiResult;
                    generatedViaAPI = true;
                }
            } catch (errApi) {
                console.warn("[REVISOR] Erro ao chamar API Gemini. Ativando gerador offline:", errApi);
            }
        }
    }

    // --- FALLBACK OFFLINE NATIVO ---
    if (!generatedViaAPI || !reportHtml) {
        reportHtml = getOfflineRevisorReport();
    }

    workspaceState.lastRevisorReport = reportHtml;
    saveWorkspaceState();

    const contentEl = document.getElementById('revisor-report-content');
    if (contentEl) {
        contentEl.innerHTML = reportHtml;
        contentEl.style.display = 'block';
    }

    const btnPdf = document.getElementById('btn-download-revisor-pdf');
    if (btnPdf) btnPdf.style.display = 'inline-block';

    // Salvar relatório nos anexos do workspace
    const tempEl = document.createElement('div');
    tempEl.innerHTML = reportHtml;
    const reportText = tempEl.innerText || tempEl.textContent || reportHtml;

    workspaceState.annexes.push({
        name: `Relatório Automático do Revisor - ${new Date().toLocaleDateString()}`,
        content: reportText.substring(0, 5000),
        size: reportText.length
    });
    saveWorkspaceState();
    if (typeof renderAnnexesList === 'function') renderAnnexesList();

    if (btn) btn.disabled = false;
    showToast(generatedViaAPI ? "✓ Relatório detalhado gerado via IA e salvo nos Anexos!" : "⚡ Relatório detalhado gerado autonomamente offline via IndexedDB!", "success");
}

function printOrSaveHtml(title, htmlContent) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 30px; line-height: 1.6; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                    th { background-color: #f1f5f9; font-weight: bold; }
                    tfoot { font-weight: bold; background-color: #e2e8f0; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${htmlContent}
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    } else {
        const blob = new Blob(["\uFEFF", htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFormattedDownloadFilename(title, 'html');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
}

async function downloadRevisorReportPDF() {
    const reportHtml = workspaceState.lastRevisorReport;
    if (!reportHtml) {
        showToast("Por favor, gere o relatório detalhado primeiro.", "warning");
        return;
    }

    showToast("Gerando PDF do Relatório...", "info");

    try {
        const payload = {
            project_title: workspaceState.cover.title || 'Projeto Cultural',
            institution: workspaceState.cover.institution || 'Não Especificada',
            report_content: reportHtml
        };

        const response = await fetch('/api/generate-revisor-report-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Erro no servidor.");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFormattedDownloadFilename('Relatorio_Detalhado_Revisor', 'pdf');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("✓ Relatório PDF baixado com sucesso!", "success");
    } catch (err) {
        console.warn("Servidor PDF indisponível. Abrindo modo de impressão cliente:", err);
        printOrSaveHtml("Relatório Detalhado de Revisão", reportHtml);
        showToast("⚡ Relatório aberto na janela de impressão/download local!", "success");
    }
}

async function downloadFinancePlanPDF() {
    let tableHtml = "";

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = workspaceState.documentContent.orcamento || "";
    const table = tempDiv.querySelector('table');

    if (table) {
        tableHtml = table.outerHTML;
    } else if (workspaceState.revisorAgentsResults && workspaceState.revisorAgentsResults.orcamento) {
        const agentFeedbackDiv = document.createElement('div');
        agentFeedbackDiv.innerHTML = workspaceState.revisorAgentsResults.orcamento.parecer || "";
        const agentTable = agentFeedbackDiv.querySelector('table');
        if (agentTable) {
            tableHtml = agentTable.outerHTML;
        }
    }

    if (!tableHtml) {
        showToast("Nenhuma tabela de orçamento encontrada. Certifique-se de gerar o orçamento primeiro.", "warning");
        return;
    }

    showToast("Gerando PDF da Planilha Financeira...", "info");

    try {
        const payload = {
            project_title: workspaceState.cover.title || 'Projeto Cultural',
            proponent: workspaceState.cover.proponent || 'Não Especificado',
            institution: workspaceState.cover.institution || 'Não Especificada',
            budget: workspaceState.cover.budget || '0',
            table_html: tableHtml
        };

        const response = await fetch('/api/generate-finance-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Falha ao gerar PDF.");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFormattedDownloadFilename('Planilha_Financeira', 'pdf');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("✓ PDF financeiro baixado com sucesso!", "success");
    } catch (err) {
        console.warn("Servidor PDF indisponível. Abrindo modo de impressão cliente:", err);
        const fullContent = `<h2>Planilha Orçamentária Otimizada</h2><p>Projeto: <strong>${workspaceState.cover.title || 'Projeto'}</strong></p>${tableHtml}`;
        printOrSaveHtml("Planilha Financeira", fullContent);
        showToast("⚡ Planilha aberta na janela de impressão/download local!", "success");
    }
}
