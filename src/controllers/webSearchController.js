/**
 * webSearchController.js — Controlador Especialista de Pesquisa Web em Tempo Real
 *
 * Responsável por:
 *  1. Construtor Dinâmico de Queries Específicas por Agente / Seção / Domínio (buildAgentQuery)
 *  2. Executor Assíncrono com timeout rigoroso via AbortController (executeRealWebSearch)
 *  3. Sanitização, parsing e formatação do contexto para injeção na LLM (formatWebContext)
 *  4. Resiliência e Fallback Seguro para Modo Offline
 */

(function (window) {
    'use strict';

    const WebSearchController = {
        name: "WebSearchController — Motor de Busca Web em Tempo Real",
        version: "2.0.0",

        /**
         * Mapeamento de termos e diretrizes de busca por domínio / agente
         */
        DOMAIN_SEARCH_PATTERNS: {
            orcamento: {
                keywords: "tabela salic minc orcamento valores referenciais mercado caches",
                focus: "tabela de preços Salic/MinC, limites de custos administrativos e valores médios de mercado para cachês"
            },
            acessibilidade: {
                keywords: "nbr 9050 acessibilidade cultural audiodescricao libras cotas pcd",
                focus: "norma ABNT NBR 9050, diretrizes de audiodescrição, Libras e cotas afirmativas em editais"
            },
            compliance: {
                keywords: "lei 14903 marco legal cultura sisgen ecad certidoes fgts cndt",
                focus: "Marco Legal da Cultura (Lei 14.903/2024), SisGen, Ecad e retenções tributárias (ISS/INSS/IRRF)"
            },
            metodologia: {
                keywords: "metodologia producao cultural pre producao execucao plano trabalho",
                focus: "estruturação de fases de produção cultural (pré, execução, pós) e plano de trabalho"
            },
            cronograma: {
                keywords: "cronograma producao cultural prazos marcos mensais prestacao contas",
                focus: "prazos operacionais, cronograma de execução e marcos de prestação de contas"
            },
            comunicacao: {
                keywords: "plano comunicacao divulgacao assessoria imprensa clipagem edital cultural",
                focus: "estratégias de comunicação, assessoria de imprensa, peças gráficas e métricas de clipagem"
            },
            publico: {
                keywords: "publico alvo democratizacao acesso vulnerabilidade social editais cultura",
                focus: "democratização de acesso, formação de público e perfil socioeconômico dos beneficiários"
            },
            contrapartida: {
                keywords: "contrapartida social oficinas gratuitas democratizacao edital cultura",
                focus: "contrapartidas sociais obrigatórias, oficinas formativas e legado para a comunidade"
            },
            ficha_tecnica: {
                keywords: "equipe tecnica curriculo diretor coordenador projeto cultural",
                focus: "composição de equipe técnica, funções essenciais e comprovação de capacidade técnica"
            },
            monitoramento: {
                keywords: "matriz logica indicadores avaliacao metas projeto cultural",
                focus: "indicadores quantitativos e qualitativos, matriz lógica e mensuração de impacto"
            },
            sustentabilidade: {
                keywords: "sustentabilidade ambiental gestao residuos esg evento cultural",
                focus: "práticas ESG, redução de impacto ambiental e gestão de resíduos em eventos culturais"
            },
            rider: {
                keywords: "rider tecnico sonorizacao iluminacao palco infraestrutura eventos",
                focus: "especificações técnicas de rider (sonorização, iluminação e infraestrutura cênica)"
            },
            justificativa: {
                keywords: "justificativa relevancia social impacto cultural desenvolvimento regional",
                focus: "justificativa de impacto cultural, aderência territorial e indicadores socioeconômicos"
            },
            objetivos: {
                keywords: "objetivos metas quantificaveis realizacao cultural fomento",
                focus: "formulação de objetivos gerais e metas específicas quantificáveis em projetos culturais"
            },
            auditor: {
                keywords: "tcu prestacao de contas editais cultura criterios avaliacao minc",
                focus: "jurisprudência do TCU e MinC, prestação de contas e réguas comparativas de avaliação"
            },
            supervisor: {
                keywords: "governanca prestacao contas conformidade fomento cultural edital",
                focus: "governança de projetos culturais, diretrizes do órgão concedente e conformidade integral"
            }
        },

        /**
         * Constrói uma query de pesquisa ultra-específica baseada no agente, no estado do workspace
         * e nos dados apurados pelo diagnóstico offline (Etapa 1).
         *
         * @param {string} agentKey - Identificador do agente/seção (ex: 'orcamento', 'acessibilidade', 'compliance')
         * @param {object} workspaceState - Estado do projeto e dados de capa/edital
         * @param {object} [offlineDiagnostic] - Diagnóstico offline opcional da Etapa 1
         * @returns {string} Query de busca otimizada
         */
        buildAgentQuery: function (agentKey, workspaceState, offlineDiagnostic = null) {
            const key = (agentKey || 'auditor').toLowerCase().trim();
            const pattern = this.DOMAIN_SEARCH_PATTERNS[key] || this.DOMAIN_SEARCH_PATTERNS.auditor;

            const cover = (workspaceState && workspaceState.cover) || {};
            const profile = (workspaceState && workspaceState.editalProfile) || {};

            // 1. Extrair entidade / fomento / instituição
            let fomento = profile.fomento || cover.institution || "";
            // Limpar expressões genéricas
            if (/instituição de fomento|edital geral|não definido|não especificada/i.test(fomento)) {
                fomento = "";
            }

            // 2. Extrair nome do edital de referência se disponível
            let editalName = workspaceState && workspaceState.editalRefName ? workspaceState.editalRefName : "";
            editalName = editalName.replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ").replace(/URL:\s*/i, "").trim();
            if (/edital de referência|arquivo|anexo/i.test(editalName)) {
                editalName = "";
            }

            // 3. Extrair tipologia da atividade
            let activityType = "";
            if (window.aiController && typeof window.aiController._inferActivityType === 'function') {
                activityType = window.aiController._inferActivityType(workspaceState.documentContent);
            }

            // 4. Incorporar vulnerabilidades da Etapa 1 (Offline) para enriquecer a query
            let diagnosticSpecifics = "";
            if (offlineDiagnostic) {
                if (key === 'orcamento' && offlineDiagnostic.budgetSummary) {
                    if (offlineDiagnostic.budgetSummary.adminPercent > 15) {
                        diagnosticSpecifics += " limite custos administrativos porcentagem maxima";
                    }
                }
                if (key === 'acessibilidade' && offlineDiagnostic.redAlerts) {
                    const hasAccessAlert = offlineDiagnostic.redAlerts.some(a => /libras|audiodescri/i.test(a.msg || ''));
                    if (hasAccessAlert) {
                        diagnosticSpecifics += " obrigatoriedade audiodescricao interprete libras";
                    }
                }
            }

            // 5. Montar query enxuta e focada
            const parts = [];

            // Adiciona fomento/edital se disponível
            if (fomento) parts.push(fomento);
            if (editalName && editalName !== fomento) parts.push(editalName.substring(0, 40));

            // Adiciona palavras-chave nucleares do domínio
            parts.push(pattern.keywords);

            // Adiciona tipologia e especificidades
            if (diagnosticSpecifics) parts.push(diagnosticSpecifics.trim());

            const fullQuery = parts.join(" ")
                .replace(/[^\w\s\u00C0-\u00FF]/g, " ")
                .replace(/\s+/g, " ")
                .trim();

            return fullQuery;
        },

        /**
         * Executa a busca real assíncrona contra o backend com AbortController (timeout de 6s).
         *
         * @param {string} query - Termo de busca completo
         * @param {object} options - Opções adicionais (timeoutMs, agentKey, maxResults)
         * @returns {Promise<{success: boolean, query: string, results: Array, contextText: string, source: string}>}
         */
        executeRealWebSearch: async function (query, options = {}) {
            const timeoutMs = options.timeoutMs || 6500;
            const agentKey = options.agentKey || 'geral';
            const maxResults = options.maxResults || 4;

            if (!query || !query.trim()) {
                console.warn('[WebSearchController] Query de busca vazia. Pulando pesquisa web.');
                return {
                    success: false,
                    query: "",
                    results: [],
                    contextText: "",
                    source: "offline_fallback"
                };
            }

            console.log(`[WebSearchController] 🌐 Disparando busca real para [${agentKey}]: "${query}" (Timeout: ${timeoutMs}ms)`);

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const startTime = Date.now();
                const response = await fetch('/api/search-web-editais', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Accept': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify({
                        query: query,
                        agent: agentKey
                    }),
                    signal: controller.signal
                });

                clearTimeout(timer);
                const elapsed = Date.now() - startTime;

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} ao consultar motor de busca.`);
                }

                const data = await response.json();
                const results = Array.isArray(data.results) ? data.results : [];

                if (results.length === 0) {
                    console.warn(`[WebSearchController] Pesquisa web não retornou links para "${query}" (${elapsed}ms).`);
                    return {
                        success: false,
                        query: query,
                        results: [],
                        contextText: "A pesquisa web não retornou resultados específicos para os termos consultados.",
                        source: "no_results"
                    };
                }

                console.log(`[WebSearchController] ✓ ${results.length} resultados capturados em ${elapsed}ms para [${agentKey}].`);

                // Formata o contexto denso
                const contextText = this.formatWebContext(results, agentKey, maxResults);

                return {
                    success: true,
                    query: query,
                    results: results.slice(0, maxResults),
                    contextText: contextText,
                    source: data.provider || "web_search"
                };

            } catch (err) {
                clearTimeout(timer);
                const isTimeout = err.name === 'AbortError';
                if (isTimeout) {
                    console.warn(`[WebSearchController] ⚠️ Timeout de ${timeoutMs}ms na pesquisa web para "${query}". Acionando fallback offline.`);
                } else {
                    console.warn(`[WebSearchController] ⚠️ Erro na pesquisa web: ${err.message}. Acionando fallback offline.`);
                }

                return {
                    success: false,
                    query: query,
                    results: [],
                    contextText: isTimeout
                        ? "[AVISO: A pesquisa web em tempo real atingiu o tempo limite; aplicando regras do banco local.]"
                        : `[AVISO: Pesquisa web indisponível (${err.message}); aplicando regras do banco local.]`,
                    source: "offline_fallback",
                    error: err.message
                };
            }
        },

        /**
         * Formata uma lista de resultados de busca em um bloco de texto Markdown denso e limpo
         * para injeção prioritária no prompt da LLM (limitado a ~2.000 caracteres).
         *
         * @param {Array} results - Lista de resultados retornados pelo backend
         * @param {string} agentKey - Identificador do agente
         * @param {number} maxResults - Quantidade máxima de itens a incluir
         * @returns {string} Texto formatado
         */
        formatWebContext: function (results, agentKey = "auditor", maxResults = 4) {
            if (!results || results.length === 0) return "";

            const pattern = this.DOMAIN_SEARCH_PATTERNS[agentKey.toLowerCase()] || this.DOMAIN_SEARCH_PATTERNS.auditor;
            let formatted = `[DADOS DE PESQUISA EM TEMPO REAL DA WEB — FOCO: ${pattern.focus.toUpperCase()}]:\n`;

            const chosen = results.slice(0, maxResults);
            chosen.forEach((r, idx) => {
                const title = (r.title || 'Referência').replace(/\s+/g, ' ').trim();
                const snippet = (r.snippet || '').replace(/\s+/g, ' ').trim();
                const url = r.url || '';

                formatted += `${idx + 1}. **${title}**\n`;
                if (url) formatted += `   - Fonte: ${url}\n`;
                if (snippet) formatted += `   - Trecho Extraído: "${snippet}"\n`;
                formatted += `\n`;
            });

            // Limite de segurança de 2.000 caracteres para evitar inflação do prompt
            if (formatted.length > 2200) {
                formatted = formatted.substring(0, 2200) + "\n... [DADOS DA WEB RESUMIDOS POR LIMITE DE DENSIDADE]\n";
            }

            return formatted.trim();
        }
    };

    window.webSearchController = WebSearchController;

})(window);
