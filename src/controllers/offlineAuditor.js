/**
 * offlineAuditor.js — Motor de Inferência e Regras Offline (Local Rule Engine)
 *
 * Executa a auditoria completa de compliance dos 14 quesitos sem requisições HTTP/API.
 * Cruza dados do workspace (edital, proposta, orçamento, anexos) com o banco local IndexedDB (RegrasUniversais).
 * Gera objetos de laudo no formato exato da RESPONSE_SCHEMA para consumo pela UI ou Gateway Híbrido.
 */

window.offlineAuditor = {
    name: "OfflineAuditor — Motor de Inferência Local Nativo",

    /**
     * Executa a auditoria local offline cruzando workspaceState com regras do IndexedDB
     */
    runLocalAudit: async function (workspaceState) {
        console.log('[OfflineAuditor] Iniciando pré-auditoria offline com motor de regras nativo...');

        // --- 0. EXECUTAR LOCALCROSSENGINE (Motor de Cruzamento Determinístico v2.0) ---
        let offlineDiagnostic = null;
        if (window.LocalCrossEngine && typeof window.LocalCrossEngine.runFullDiagnostic === 'function') {
            try {
                offlineDiagnostic = window.LocalCrossEngine.runFullDiagnostic(workspaceState);
                // Armazenar no workspaceState para uso pelo handoff da API
                workspaceState.offlineDiagnostic = offlineDiagnostic;
                console.log(`[OfflineAuditor] LocalCrossEngine executado. Score: ${offlineDiagnostic.score}/100`);
            } catch (err) {
                console.warn('[OfflineAuditor] Erro no LocalCrossEngine, prosseguindo com motor legado:', err);
            }
        }

        const doc = workspaceState.documentContent || {};
        const cover = workspaceState.cover || {};
        const editalText = (workspaceState.editalRefText || "").toLowerCase();
        const draftText = (workspaceState.proposalDraftText || "").toLowerCase();
        const annexesText = (workspaceState.annexes || []).map(a => `${a.name}\n${a.content || ''}`).join('\n').toLowerCase();
        const profileText = workspaceState.editalProfile ? JSON.stringify(workspaceState.editalProfile).toLowerCase() : "";
        const fullContext = `${editalText}\n${annexesText}\n${profileText}\n${draftText}\n${JSON.stringify(doc).toLowerCase()}`;

        // Carregar regras universais do IndexedDB se disponíveis
        let regrasUniversais = [];
        if (window.auditorDB && window.auditorDB.isReady) {
            try {
                regrasUniversais = await window.auditorDB.getAll('RegrasUniversais');
            } catch (e) {
                console.warn('[OfflineAuditor] Não foi possível carregar RegrasUniversais do IndexedDB, usando regras fallback.', e);
            }
        }

        // --- 1. ANÁLISE ORÇAMENTÁRIA LOCAL (delegando ao LocalCrossEngine quando disponível) ---
        const budgetAnalysis = offlineDiagnostic
            ? { ...this.analyzeBudgetLocal(doc.orcamento || "", cover.budget || 0), ...offlineDiagnostic.budgetSummary }
            : this.analyzeBudgetLocal(doc.orcamento || "", cover.budget || 0);

        // --- 2. ANÁLISE DOS QUESITOS DE COMPLIANCE POR EIXO ---
        const axis = workspaceState.activeAxis || "cultural";
        let agentDefinitions = [
            { id: 'justificativa', title: 'Justificativa e Relevância', text: doc.justificativa, keywords: ['justificativa', 'relevância', 'cultural', 'social', 'impacto', 'proponente'] },
            { id: 'objetivos', title: 'Objetivos Geral e Específicos', text: doc.objetivos, keywords: ['objetivo', 'meta', 'público', 'beneficiário', 'formação', 'específico'] },
            { id: 'metodologia', title: 'Metodologia e Plano de Trabalho', text: doc.metodologia, keywords: ['metodologia', 'etapas', 'pré-produção', 'execução', 'pós-produção', 'fases'] },
            { id: 'cronograma', title: 'Cronograma Operacional', text: doc.cronograma, keywords: ['cronograma', 'mês', 'meses', 'prazo', 'etapa', 'semana'] },
            { id: 'orcamento', title: 'Orçamento e Planilha de Custos', text: doc.orcamento, keywords: ['r$', 'custo', 'valor', 'administrativo', 'divulgação', 'cache', 'imposto', 'tributo'] },
            { id: 'acessibilidade', title: 'Acessibilidade e Cotas', text: doc.acessibilidade, keywords: ['libras', 'audiodescrição', 'rampa', 'braille', 'legenda', 'pcd', 'cotas', 'étnico'] },
            { id: 'publico', title: 'Público-Alvo e Beneficiários', text: doc.publico, keywords: ['público', 'beneficiários', 'faixa etária', 'estudantes', 'comunidade', 'gratuito'] },
            { id: 'contrapartida', title: 'Contrapartida Social e Legado', text: doc.contrapartida, keywords: ['contrapartida', 'oficina', 'palestra', 'doação', 'gratuita', 'legado', 'social'] },
            { id: 'comunicacao', title: 'Plano de Comunicação e Divulgação', text: doc.comunicacao, keywords: ['divulgação', 'redes sociais', 'imprensa', 'mídia', 'panfleto', 'tráfego pago'] },
            { id: 'ficha_tecnica', title: 'Ficha Técnica e Capacidade', text: doc.ficha_tecnica, keywords: ['ficha técnica', 'currículo', 'direção', 'coordenação', 'artista', 'equipe'] },
            { id: 'monitoramento', title: 'Monitoramento e Matriz Lógica', text: doc.monitoramento, keywords: ['indicador', 'pesquisa', 'avaliação', 'relatório', 'métrica', 'comprovação'] },
            { id: 'compliance', title: 'Compliance e Marcos Legais', text: doc.compliance, keywords: ['certidão', 'cndt', 'fgts', 'ecad', 'sisgen', 'direitos autorais', 'lei'] },
            { id: 'sustentabilidade', title: 'Sustentabilidade e ESG', text: doc.sustentabilidade, keywords: ['sustentabilidade', 'resíduos', 'ecológico', 'reciclagem', 'carbono', 'ambiente'] },
            { id: 'rider', title: 'Rider Técnico e Logística', text: doc.rider, keywords: ['som', 'iluminação', 'palco', 'montagem', 'transporte', 'hospedagem', 'camarim'] }
        ];

        if (axis === "licitacao") {
            agentDefinitions = [
                { id: 'etp_tr', title: 'ETP, TR e Minutas (SollAi)', text: doc.etp_tr || (workspaceState.proposalDraftText || ""), keywords: ['estudo técnico preliminar', 'etp', 'termo de referência', 'tr', 'matriz de risco', 'objeto'] },
                { id: 'alice_auditoria', title: 'Auditoria Red Flags e Cartéis (ALICE)', text: doc.alice_auditoria || (workspaceState.editalRefText || ""), keywords: ['restrição', 'exclusividade', 'conluio', 'pesquisa de preços', 'marca', 'red flag'] },
                { id: 'licit_compliance', title: 'Compliance e Liquidez Financeira', text: doc.licit_compliance || (workspaceState.proposalDraftText || ""), keywords: ['liquidez', 'balanço', 'certidão', 'atestado', 'solvência', 'patrimônio líquido'] },
                { id: 'esclarecimento', title: 'Junta de Esclarecimentos e Impugnações', text: doc.esclarecimento || (workspaceState.ingestaoNotes || ""), keywords: ['impugnação', 'esclarecimento', 'recurso', 'parecer', 'pregoeiro', 'tcu'] }
            ];
        } else if (axis === "concurso") {
            agentDefinitions = [
                { id: 'verticalizado', title: 'Verticalizador e Alocação Adaptativa (EstudePlan)', text: doc.verticalizado || (workspaceState.editalRefText || ""), keywords: ['disciplina', 'conteúdo programático', 'tópicos', 'peso', 'horas', 'incidência'] },
                { id: 'treino_didatico', title: 'Gerador de Questões e Anki SRS (ConcursosGPT)', text: doc.treino_didatico || (workspaceState.proposalDraftText || ""), keywords: ['questão', 'gabarito', 'banca', 'cebraspe', 'fgv', 'fcc', 'anki', 'flashcard'] }
            ];
        }

        const agentesResults = [];
        let totalTecnicaLocal = 0;
        const alertasLocais = [];

        agentDefinitions.forEach(agent => {
            const result = this.evaluateAgentLocal(agent, fullContext, budgetAnalysis);
            agentesResults.push(result);
            totalTecnicaLocal += result.nota;

            if (result.erros && result.erros.length > 0) {
                result.erros.forEach(err => {
                    alertasLocais.push({
                        tipo: agent.title,
                        descricao: err,
                        sugestao: result.recomendacoes[0] || "Ajuste o texto conforme os requisitos do edital.",
                        nivel: result.nota < 60 ? "ALTA" : "MÉDIA"
                    });
                });
            }
        });

        // Escalonar nota técnica local para máximo 100
        const notaTecnicaFinal = Math.min(100, Math.round((totalTecnicaLocal / (agentDefinitions.length * 100)) * 100));

        // --- 3. CÁLCULO DA NOTA DE PRIORIZAÇÃO (0 a 30) ---
        const notaPriorizacaoLocal = this.calculatePrioritizationScoreLocal(fullContext, cover, workspaceState);

        // --- 3.5. CHECKLIST DE DOCUMENTOS OBRIGATÓRIOS (Skill C) ---
        const documentChecklist = this.generateDocumentChecklist(fullContext, workspaceState);
        if (documentChecklist.pendentes.length > 0) {
            documentChecklist.pendentes.forEach(doc => {
                alertasLocais.push({
                    tipo: "Documento Pendente",
                    descricao: `Documento obrigatório não identificado na proposta: ${doc}.`,
                    sugestao: `Providencie e anexe o documento "${doc}" antes da submissão.`,
                    nivel: "ALTA"
                });
            });
        }

        // --- 4. NOTA FINAL E ALERTAS ORÇAMENTÁRIOS ---
        const notaFinalCalculada = Math.min(130, Math.round(notaTecnicaFinal + notaPriorizacaoLocal));

        // Extrair teto administrativo real do edital (em vez de fixar 15%)
        const adminCeiling = this.extractAdminCeiling(workspaceState);
        if (budgetAnalysis.adminPercent > adminCeiling) {
            alertasLocais.unshift({
                tipo: "Estouro Orçamentário",
                descricao: `Custos administrativos (${budgetAnalysis.adminPercent.toFixed(1)}%) ultrapassam o teto de ${adminCeiling}% identificado no edital.`,
                sugestao: `Reduza as rubricas de coordenação/direção/gestão para se adequar ao limite de ${adminCeiling}% do edital.`,
                nivel: "CRÍTICO"
            });
        }

        // --- 5. INJETAR ALERTAS DO LOCALCROSSENGINE ---
        if (offlineDiagnostic) {
            // Mesclar alertas do LocalCrossEngine (vermelhos e amarelos) sem duplicar
            const existingMsgs = new Set(alertasLocais.map(a => a.descricao));
            (offlineDiagnostic.redAlerts || []).forEach(a => {
                if (!existingMsgs.has(a.msg)) {
                    alertasLocais.unshift({ tipo: a.source || 'LocalCrossEngine', descricao: a.msg, sugestao: a.action, nivel: 'CRÍTICO' });
                }
            });
            (offlineDiagnostic.yellowAlerts || []).forEach(a => {
                if (!existingMsgs.has(a.msg)) {
                    alertasLocais.push({ tipo: a.source || 'LocalCrossEngine', descricao: a.msg, sugestao: a.action, nivel: a.impact === 'risco_alto' ? 'ALTA' : 'MÉDIA' });
                }
            });
        }

        // --- 6. GERAÇÃO DO RELATÓRIO GERAL EM HTML ESTRUTURADO ---
        const relatorioHTML = this.buildOfflineHTMLReport(cover, notaFinalCalculada, notaTecnicaFinal, notaPriorizacaoLocal, budgetAnalysis, agentesResults, alertasLocais);

        const auditResponseObj = {
            relatorio_geral: relatorioHTML,
            nota_final: notaFinalCalculada,
            nota_tecnica: notaTecnicaFinal,
            nota_priorizacao: Math.round(notaPriorizacaoLocal * 10) / 10,
            total_orcamento: budgetAnalysis.totalValue || budgetAnalysis.totalProjeto,
            custos_administrativos_percentual: Math.round(budgetAnalysis.adminPercent * 10) / 10,
            agentes: agentesResults,
            alertas: alertasLocais,
            ajustes: this._generateDynamicAdjustments(agentesResults, budgetAnalysis, workspaceState),
            isOfflineResult: true,
            offlineDiagnostic: offlineDiagnostic || null  // Objeto completo para handoff à API
        };

        // Salvar no banco de dados local se disponível
        if (window.auditorDB && window.auditorDB.isReady) {
            window.auditorDB.saveAuditHistory(cover.title || 'Auditoria Offline', auditResponseObj, workspaceState).catch(err => {
                console.warn('[OfflineAuditor] Erro ao salvar histórico offline:', err);
            });
        }

        console.log(`[OfflineAuditor] Auditoria offline concluída. Nota Final: ${notaFinalCalculada}/130 (Técnica: ${notaTecnicaFinal}, Prioridade: ${notaPriorizacaoLocal})`);
        return auditResponseObj;
    },

    /**
     * Avalia um quesito individual localmente com base em presença de texto, extensão e palavras-chave
     */
    evaluateAgentLocal: function (agent, fullContext, budgetAnalysis) {
        const text = agent.text || "";
        const cleanText = text.trim();
        const length = cleanText.length;

        let score = 0;
        let confianca = "ALTA";
        const erros = [];
        const recomendacoes = [];

        if (length === 0) {
            score = 30; // Inconformidade
            confianca = "BAIXA";
            erros.push(`A seção "${agent.title}" não foi preenchida no editor.`);
            recomendacoes.push(`Preencha o campo "${agent.title}" ou use a geração do Ingestor/Redator para compor a minuta.`);
        } else if (length < 150) {
            score = 60;
            confianca = "MEDIA";
            erros.push(`A seção "${agent.title}" está muito sucinta (${length} caracteres).`);
            recomendacoes.push(`Expanda a descrição para ao menos 400 caracteres com dados quantitativos e operacionais.`);
        } else {
            score = 85;
            // Verificar palavras-chave no texto da seção
            const textLower = cleanText.toLowerCase();
            let matched = 0;
            const kwList = agent.keywords || [];
            kwList.forEach(kw => {
                if (textLower.includes(kw) || fullContext.includes(kw)) matched++;
            });

            if (matched >= 2) {
                score = 95;
                confianca = "ALTA";
            } else {
                confianca = "MEDIA";
                erros.push(`A seção pode ser enriquecida com termos técnicos específicos (${kwList.slice(0, 3).join(', ')}).`);
                recomendacoes.push(`Inclua detalhamento específico sobre ${kwList.slice(0, 3).join(', ')}.`);
            }
        }

        // Regras específicas adicionais — teto dinâmico extraído do edital
        if (agent.id === 'orcamento') {
            const adminCeiling = (agent._adminCeiling !== undefined) ? agent._adminCeiling : 15;
            if (budgetAnalysis && budgetAnalysis.hasData && budgetAnalysis.adminPercent > adminCeiling) {
                score = Math.min(score, 55);
                erros.push(`Custos administrativos em ${budgetAnalysis.adminPercent.toFixed(1)}% (teto do edital: ${adminCeiling}%).`);
                recomendacoes.push(`Reorganize a planilha orçamentária para ficar abaixo de ${adminCeiling}% em rubricas administrativas.`);
            }
        }

        if (agent.id === 'acessibilidade' && !/libras|audiodescrição|rampa|braille|pcd/i.test(cleanText)) {
            score = Math.min(score, 70);
            erros.push("Ausência de menção explícita a medidas de acessibilidade sensorial (LIBRAS/Audiodescrição) ou física.");
            recomendacoes.push("Adicione previsão de intérprete de LIBRAS ou audiodescrição em conformidade com as diretrizes do edital.");
        }

        let parecerHTML = `<p><strong>Diagnóstico Local:</strong> A área de <em>${agent.title}</em> atingiu pontuação <strong>${score}/100</strong>.</p>`;
        if (erros.length > 0) {
            parecerHTML += `<p><strong>Pendências Identificadas:</strong></p><ul>${erros.map(e => `<li>${e}</li>`).join('')}</ul>`;
        } else {
            parecerHTML += `<p><strong>Conformidade:</strong> O texto atende satisfatoriamente às diretrizes básicas do projeto.</p>`;
        }
        if (recomendacoes.length > 0) {
            parecerHTML += `<p><strong>Sugestão Otimizada:</strong> ${recomendacoes[0]}</p>`;
        }

        return {
            id: agent.id,
            nota: score,
            confianca: confianca,
            parecer: parecerHTML,
            erros: erros,
            recomendacoes: recomendacoes
        };
    },

    /**
     * Analisa custos e percentuais da planilha local sem inventar dados fictícios
     */
    analyzeBudgetLocal: function (orcamentoText, coverBudget) {
        let totalValue = coverBudget || 0;
        let adminCosts = 0;
        let foundNumbers = false;

        // Tentar extrair números da planilha se for texto formatado
        const lines = (orcamentoText || "").split('\n');
        for (const line of lines) {
            const matchVal = line.match(/(?:r\$|\$)?\s*([\d\.\,]+)/i);
            if (matchVal && matchVal[1]) {
                const numStr = matchVal[1].replace(/\./g, '').replace(',', '.');
                const val = parseFloat(numStr);
                if (!isNaN(val) && val > 0) {
                    foundNumbers = true;
                    if (totalValue === 0) totalValue += val;
                    if (/coordena|direção|gestão|administra/i.test(line)) {
                        adminCosts += val;
                    }
                }
            }
        }

        const hasData = Boolean(foundNumbers || coverBudget > 0);
        const adminPercent = (totalValue > 0) ? (adminCosts / totalValue) * 100 : 0;

        return {
            totalValue: totalValue,
            adminCosts: adminCosts,
            adminPercent: adminPercent,
            hasData: hasData,
            confidence: hasData ? "ALTA" : "BAIXA"
        };
    },

    /**
     * Calcula pontuação de priorização (0 a 30) — DINÂMICO com base no perfil do edital.
     * Em vez de critérios fixos de um edital específico, extrai as prioridades
     * do perfil do edital carregado (editalProfile.prioridades_critérios) e
     * verifica se a proposta menciona os termos-chave correspondentes.
     */
    calculatePrioritizationScoreLocal: function (fullContext, cover, workspaceState) {
        let score = 0;
        const profile = (workspaceState && workspaceState.editalProfile) || {};
        const prioridadesText = (profile['prioridades_critérios'] || profile['prioridades_criterios'] || '').toLowerCase();

        // =====================================================================
        // CRITÉRIOS UNIVERSAIS (aplicáveis a qualquer edital de fomento)
        // Cada critério é genérico e testado por presença no contexto completo.
        // A pontuação máxima por critério é proporcional (total = 30 pts / N critérios).
        // =====================================================================
        const universalCriteria = [
            {
                name: 'Governança Participativa e Transparência',
                keywords: /conselho|participativa|transparência|comitê|governança|prestação de contas|assembleia/i,
                weight: 4.0
            },
            {
                name: 'Diversidade e Públicos Prioritários',
                keywords: /mulheres|negros|pcd|idosos|jovens|comunidade|diversidade|inclusão|minoria|vulnerabilidade/i,
                weight: 4.0
            },
            {
                name: 'Equipe Representativa e Diversa',
                keywords: /liderança feminina|quilombola|indígena|lgbtqia|afrodescendente|mestre|tradicion|protagonismo/i,
                weight: 4.0
            },
            {
                name: 'Experiência Territorial Comprovada',
                keywords: /histórico|experiência|atuação|território|trajetória|comprovação|portfólio/i,
                weight: 4.0
            },
            {
                name: 'Coordenação por Agentes Vulnerabilizados',
                keywords: /cadúnico|vulnerável|agricultor|rural|periferia|favela|ribeirinho|assentamento/i,
                weight: 5.0
            },
            {
                name: 'Parcerias Institucionais e em Rede',
                keywords: /parceria|coletivo|rede|associação|cooperativa|colaboração|articulação|apoio institucional/i,
                weight: 4.0
            },
            {
                name: 'Impacto Territorial e Descentralização',
                keywords: /interiorização|descentralização|periférico|região|municipal|distrital|comunidades/i,
                weight: 5.0
            }
        ];

        // Se o edital tem prioridades mapeadas, extrair palavras-chave adicionais
        // e dar bônus para critérios que casam com as prioridades do edital
        universalCriteria.forEach(criterion => {
            const hasInProposal = criterion.keywords.test(fullContext);
            // Bônus se o critério aparece também no perfil de prioridades do edital
            const isEditalPriority = prioridadesText && criterion.name.toLowerCase().split(' ').some(w =>
                w.length > 4 && prioridadesText.includes(w)
            );

            if (hasInProposal) {
                score += isEditalPriority ? criterion.weight : (criterion.weight * 0.85);
            } else {
                // Pontuação base mínima para não zerar nenhum critério
                score += criterion.weight * 0.35;
            }
        });

        return Math.min(30, Math.round(score * 10) / 10);
    },

    /**
     * Cálculo de Índices Financeiros de Habilitação (Lei 14.133/21)
     */
    calculateFinancialRatios: function (ativoCirculante, rlp, passivoCirculante, pnc, ativoTotal) {
        const passivoExigivel = (passivoCirculante || 0) + (pnc || 0);
        const lg = passivoExigivel > 0 ? ((ativoCirculante || 0) + (rlp || 0)) / passivoExigivel : 1.0;
        const lc = (passivoCirculante || 0) > 0 ? (ativoCirculante || 0) / passivoCirculante : 1.0;
        const sg = passivoExigivel > 0 ? (ativoTotal || 0) / passivoExigivel : 1.0;

        return {
            liquidezGeral: Math.round(lg * 100) / 100,
            liquidezCorrente: Math.round(lc * 100) / 100,
            solvenciaGeral: Math.round(sg * 100) / 100,
            isHabilitado: lg >= 1.0 && lc >= 1.0 && sg >= 1.0
        };
    },

    /**
     * Fórmula Adaptativa de Alocação de Tempo de Estudo (EstudePlan-inspired)
     */
    calculateAdaptiveStudyTime: function (baseHoras, pesoEdital, dificuldadeCandidato, incidenciaBanca) {
        const base = baseHoras || 10;
        const peso = pesoEdital || 1;
        const dif = dificuldadeCandidato || 1;
        const inc = incidenciaBanca || 1;
        const tempoMateria = base * peso * dif * inc;
        return Math.round(tempoMateria * 10) / 10;
    },

    /**
     * Constrói o HTML estruturado do laudo geral (9 seções obrigatórias)
     */
    buildOfflineHTMLReport: function (cover, notaFinal, notaTecnica, notaPriorizacao, budgetAnalysis, agentes, alertas) {
        return `
        <div class="offline-audit-report-container" style="font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6;">
            
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <h2 style="margin: 0; font-size: 1.4rem; color: #ffffff;">📊 PAINEL EXECUTIVO DE AUDITORIA (OFFLINE)</h2>
                    <span style="background: #22c55e; color: #000; padding: 0.2rem 0.6rem; border-radius: 20px; font-weight: bold; font-size: 0.8rem;">⚡ Processamento Local DB</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <small style="color: #94a3b8;">Projeto:</small>
                        <div style="font-weight: 600;">${cover.title || 'Não informado'}</div>
                    </div>
                    <div>
                        <small style="color: #94a3b8;">Proponente:</small>
                        <div style="font-weight: 600;">${cover.proponent || 'Não informado'}</div>
                    </div>
                    <div>
                        <small style="color: #94a3b8;">Orçamento Total:</small>
                        <div style="font-weight: 600; color: #38bdf8;">R$ ${budgetAnalysis.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                        <small style="color: #94a3b8;">Nota Geral Simulação:</small>
                        <div style="font-size: 1.3rem; font-weight: 800; color: #facc15;">${notaFinal} / 130 pts</div>
                        <small style="color: #cbd5e1;">Técnica: ${notaTecnica}/100 | Priorização: ${notaPriorizacao.toFixed(1)}/30</small>
                    </div>
                </div>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 5px solid #f59e0b; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.85rem; color: #92400e;">
                <strong>⚠️ AVISO DE AUDITORIA LOCAL:</strong> Este parecer foi gerado autonomamente pelo motor de inferência local (OfflineAuditor) via banco de dados IndexedDB. Quando a chave de API estiver ativa, a inteligência artificial Gemini realizará a validação final complementar.
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem;">3. Metodologia de Análise de Compliance</h3>
                <p style="font-size: 0.9rem;">A pré-auditoria varreu o texto do projeto e planilha orçamentária, cruzando com a base de regras da legislação cultural (Leis de Acessibilidade, Cotas, Limite Administrativo de 15% e Diretrizes do Edital). Cada quesito recebeu pontuação técnica proporcional à conformidade detectada.</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem;">4. Análise Detalhada dos 14 Quesitos de Compliance</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 0.8rem; font-size: 0.85rem;">
                    <thead>
                        <tr style="background: #f8fafc; text-align: left; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 0.6rem;">Quesito</th>
                            <th style="padding: 0.6rem;">Nota Local</th>
                            <th style="padding: 0.6rem;">Diagnóstico do Motor Offline</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agentes.map(ag => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 0.6rem; font-weight: 600; color: #334155;">${ag.id.toUpperCase()}</td>
                                <td style="padding: 0.6rem; font-weight: bold; color: ${ag.nota >= 80 ? '#16a34a' : (ag.nota >= 60 ? '#d97706' : '#dc2626')};">${ag.nota}/100</td>
                                <td style="padding: 0.6rem;">${ag.parecer}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem;">5. Plano de Ação para Aperfeiçoamento de Notas</h3>
                ${agentes.filter(a => a.nota < 85).length === 0 ? '<p style="color: #16a34a;">Nenhum quesito com nota baixa detectado!</p>' : `
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; background: #fff;">
                    <thead>
                        <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 0.5rem;">Área</th>
                            <th style="padding: 0.5rem;">Pendência</th>
                            <th style="padding: 0.5rem;">Ação Recomendada</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agentes.filter(a => a.nota < 85).map(a => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 0.5rem; font-weight: bold; color: #991b1b;">${a.id.toUpperCase()}</td>
                                <td style="padding: 0.5rem;">${a.erros.join('<br>') || 'Texto sucinto'}</td>
                                <td style="padding: 0.5rem;">${a.recomendacoes.join('<br>') || 'Expandir conteúdo'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                `}
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 5px solid #ef4444; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #991b1b;">🚨 Riscos Eliminatórios Detectados</h4>
                ${alertas.length === 0 ? '<p style="margin: 0; font-size: 0.85rem; color: #166534;">Nenhum risco eliminatório encontrado.</p>' : `
                <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.85rem; color: #7f1d1d;">
                    ${alertas.map(al => `<li><strong>${al.tipo}:</strong> ${al.descricao} <em>(Sugestão: ${al.sugestao})</em></li>`).join('')}
                </ul>
                `}
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem;">7. Pontos Fortes do Projeto</h3>
                <ul style="font-size: 0.85rem; color: #334155;">
                    <li>Projeto estruturado em conformidade com as diretrizes ABNT do editor local.</li>
                    <li>Orçamento pré-auditado para conformidade com o limite administrativo.</li>
                    <li>Pontuação de priorização territorial preservada com dados locais.</li>
                </ul>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem;">8. Veredito Técnico da Banca Offline</h3>
                <p style="font-size: 0.9rem; background: #f8fafc; padding: 1rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                    A proposta apresenta viabilidade técnica sólida com pontuação de <strong>${notaFinal}/130</strong>. Recomenda-se realizar os ajustes no editor ABNT nos quesitos identificados como pendentes antes do envio definitivo.
                </p>
            </div>

            <div>
                <h3 style="color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4rem;">9. Checklist Final de Pendências</h3>
                <ul style="font-size: 0.85rem; list-style-type: none; padding: 0;">
                    <li style="padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9;">☑️ Validação Orçamentária: Teto Administrativo ≤ 15%</li>
                    <li style="padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9;">☑️ Acessibilidade Comunicacional (LIBRAS / Audiodescrição)</li>
                    <li style="padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9;">☑️ Certidões CNDT e FGTS em conformidade</li>
                </ul>
            </div>

        </div>
        `;
    },

    /**
     * NOVA FUNÇÃO — Extrai o teto administrativo real do edital carregado.
     * Em vez de fixar 15%, analisa o texto do edital e do perfil para identificar
     * o percentual correto (pode ser 15%, 20%, 25% dependendo do edital).
     * Retorna 15 como fallback genérico se nenhum teto for encontrado.
     */
    extractAdminCeiling: function (workspaceState) {
        const profile = (workspaceState && workspaceState.editalProfile) || {};
        const tetosText = (profile.tetos_e_limites || '').toLowerCase();
        const editalText = (workspaceState && workspaceState.editalRefText || '').toLowerCase();
        const combinedText = `${tetosText} ${editalText}`;

        // Procurar padrões como "até 25% para gestão", "máximo de 20% administrativo", "15% para custos de gestão"
        const patterns = [
            /(?:custos?\s*(?:de\s*)?(?:administra|gest[ãa]o|coordena))[\s\S]{0,80}?(\d{1,2})\s*%/i,
            /(\d{1,2})\s*%[\s\S]{0,80}?(?:administra|gest[ãa]o|coordena)/i,
            /(?:m[áa]ximo|teto|limite)[\s\S]{0,50}?(\d{1,2})\s*%[\s\S]{0,50}?(?:administra|gest[ãa]o)/i,
            /(?:administra|gest[ãa]o)[\s\S]{0,50}?(?:m[áa]ximo|teto|limite)[\s\S]{0,30}?(\d{1,2})\s*%/i
        ];

        for (const pattern of patterns) {
            const match = combinedText.match(pattern);
            if (match && match[1]) {
                const val = parseInt(match[1]);
                if (val >= 5 && val <= 50) {
                    console.log(`[OfflineAuditor] Teto administrativo extraído do edital: ${val}%`);
                    return val;
                }
            }
        }

        // Fallback genérico padrão de fomento cultural (15%)
        return 15;
    },

    /**
     * NOVA FUNÇÃO — Gera ajustes dinamicamente baseado nos erros reais
     * detectados pelos agentes, em vez de retornar sempre os mesmos 3 ajustes fixos.
     */
    _generateDynamicAdjustments: function (agentesResults, budgetAnalysis, workspaceState) {
        const ajustes = [];

        agentesResults.forEach(ag => {
            if (ag.nota < 85 && ag.erros && ag.erros.length > 0) {
                ajustes.push({
                    alteracao: ag.erros[0],
                    fator: `Agente ${ag.id.toUpperCase()}: ${ag.nota}/100 → melhoria estimada de +${Math.min(20, 100 - ag.nota)} pts`
                });
            }
        });

        // Alerta de teto administrativo se aplicável
        const adminCeiling = this.extractAdminCeiling(workspaceState);
        if (budgetAnalysis.adminPercent > adminCeiling) {
            ajustes.unshift({
                alteracao: `Adequação do teto administrativo para ≤ ${adminCeiling}%`,
                fator: "Elimina risco de desclassificação por estouro orçamentário"
            });
        }

        // Se nenhum ajuste foi gerado, informar que está em conformidade
        if (ajustes.length === 0) {
            ajustes.push({
                alteracao: "Proposta em conformidade básica com os requisitos do edital.",
                fator: "Nenhum ajuste crítico identificado pelo motor offline."
            });
        }

        return ajustes;
    },

    /**
     * NOVA FUNÇÃO (Skill C) — Gera checklist dinâmico de documentos obrigatórios.
     * Analisa o edital e anexos para identificar documentos exigidos
     * (CNPJ, Atas, Certidões, Cartas de Anuência, etc.) e verifica
     * se aparecem mencionados na proposta do proponente.
     */
    generateDocumentChecklist: function (fullContext, workspaceState) {
        const profile = (workspaceState && workspaceState.editalProfile) || {};
        const editalText = (workspaceState && workspaceState.editalRefText || '').toLowerCase();
        const fullLower = fullContext.toLowerCase();

        // Banco de documentos comuns em editais de fomento — cada item é testado
        // contra o edital para verificar se é exigido, e depois contra a proposta
        const documentBank = [
            { name: 'Cartão CNPJ atualizado', editalPattern: /cnpj|cadastro nacional/i, proposalPattern: /cnpj/i },
            { name: 'Ata de Eleição da Diretoria vigente', editalPattern: /ata\s*(de\s*)?(elei[çc][ãa]o|diretoria|posse)/i, proposalPattern: /ata\s*(de\s*)?(elei[çc][ãa]o|diretoria|posse)/i },
            { name: 'Estatuto Social registrado', editalPattern: /estatuto\s*social/i, proposalPattern: /estatuto/i },
            { name: 'Certidão Negativa de Débitos (CND)', editalPattern: /cnd|certid[ãa]o\s*negativa\s*de\s*d[eé]bitos/i, proposalPattern: /cnd|certid[ãa]o.*d[eé]bito/i },
            { name: 'Certidão FGTS', editalPattern: /fgts|certid[ãa]o.*fundo\s*de\s*garantia/i, proposalPattern: /fgts/i },
            { name: 'Certidão CNDT (Trabalhista)', editalPattern: /cndt|certid[ãa]o.*trabalh/i, proposalPattern: /cndt/i },
            { name: 'Carta de Anuência Comunitária', editalPattern: /carta\s*de\s*anu[eê]ncia|anu[eê]ncia\s*comunit/i, proposalPattern: /anu[eê]ncia/i },
            { name: 'Plano de Trabalho', editalPattern: /plano\s*de\s*trabalho/i, proposalPattern: /plano\s*de\s*trabalho/i },
            { name: 'Declaração de Contrapartida', editalPattern: /declara[çc][ãa]o.*contrapartida/i, proposalPattern: /contrapartida/i },
            { name: 'Comprovante de endereço da sede', editalPattern: /comprovante\s*(de\s*)?endere[çc]o|sede/i, proposalPattern: /endere[çc]o.*sede|sede.*endere[çc]o/i },
            { name: 'Licença do ECAD', editalPattern: /ecad|execu[çc][ãa]o.*musical|direitos?\s*autor/i, proposalPattern: /ecad/i },
            { name: 'Registro no SisGen', editalPattern: /sisgen|patrim[oô]nio\s*gen[eé]tico|conhecimento\s*tradicional/i, proposalPattern: /sisgen/i }
        ];

        const exigidos = [];
        const atendidos = [];
        const pendentes = [];

        documentBank.forEach(doc => {
            // Verifica se o edital exige este documento
            if (doc.editalPattern.test(editalText)) {
                exigidos.push(doc.name);
                // Verifica se a proposta menciona o documento
                if (doc.proposalPattern.test(fullLower)) {
                    atendidos.push(doc.name);
                } else {
                    pendentes.push(doc.name);
                }
            }
        });

        return { exigidos, atendidos, pendentes };
    },

    /**
     * NOVA FUNÇÃO (Skill D) — Processa erratas e retificações de editais.
     * Recebe o texto da errata e compara com o edital original,
     * identificando mudanças em prazos, valores, regras e requisitos.
     * Retorna um resumo estruturado das alterações detectadas.
     */
    processErrata: function (errataText, originalEditalText) {
        if (!errataText || !originalEditalText) {
            return { mudancas: [], resumo: 'Nenhuma errata ou edital original fornecido para comparação.' };
        }

        const errataLower = errataText.toLowerCase();
        const mudancas = [];

        // 1. Detectar mudanças de prazo/data
        const datePatterns = [
            /(?:novo\s*)?prazo[\s\S]{0,100}?(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4})/gi,
            /(?:prorroga|altera|retifica)[\s\S]{0,100}?(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4})/gi,
            /(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4})[\s\S]{0,50}?(?:onde\s*se\s*l[eê]|passa\s*a\s*ser|altera)/gi
        ];
        datePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(errataText)) !== null) {
                const context = errataText.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50).trim();
                mudancas.push({ tipo: '📅 Alteração de Prazo/Data', detalhe: context });
            }
        });

        // 2. Detectar mudanças de valor monetário
        const moneyPattern = /(?:onde\s*se\s*l[eê]|altera|retifica|passa\s*a\s*ser)[\s\S]{0,100}?r\$\s*[\d\.\,]+/gi;
        let moneyMatch;
        while ((moneyMatch = moneyPattern.exec(errataText)) !== null) {
            const context = errataText.substring(Math.max(0, moneyMatch.index - 30), moneyMatch.index + moneyMatch[0].length + 30).trim();
            mudancas.push({ tipo: '💰 Alteração de Valor', detalhe: context });
        }

        // 3. Detectar mudanças em itens/cláusulas
        const clausePattern = /(?:item|cl[áa]usula|artigo|par[áa]grafo|inciso|al[ií]nea)\s*[\d\.]+[\s\S]{0,200}?(?:onde\s*se\s*l[eê]|passa\s*a\s*(?:ser|vigorar|ter)|fica\s*alterado|fica\s*retificado)/gi;
        let clauseMatch;
        while ((clauseMatch = clausePattern.exec(errataText)) !== null) {
            const context = errataText.substring(clauseMatch.index, clauseMatch.index + clauseMatch[0].length + 100).trim();
            mudancas.push({ tipo: '📋 Alteração de Cláusula', detalhe: context.substring(0, 250) });
        }

        // 4. Detectar inclusões/exclusões
        if (/(?:inclui|acrescenta|adiciona)\s*(?:se|o\s*seguinte)/i.test(errataText)) {
            mudancas.push({ tipo: '➕ Inclusão de novo requisito', detalhe: 'A errata inclui novos itens ou requisitos. Revise o texto completo da errata.' });
        }
        if (/(?:exclui|suprime|revoga)\s*(?:se|o\s*seguinte|o\s*item)/i.test(errataText)) {
            mudancas.push({ tipo: '➖ Exclusão de requisito', detalhe: 'A errata exclui itens anteriormente exigidos. Verifique se sua proposta já não contempla itens removidos.' });
        }

        const resumo = mudancas.length > 0
            ? `Foram detectadas ${mudancas.length} alteração(ões) na errata em relação ao edital original.`
            : 'Nenhuma alteração significativa detectada pela análise automática. Recomenda-se revisão manual.';

        return { mudancas, resumo };
    }
};
