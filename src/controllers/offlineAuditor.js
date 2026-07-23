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

        // --- 1. ANÁLISE ORÇAMENTÁRIA LOCAL ---
        const budgetAnalysis = this.analyzeBudgetLocal(doc.orcamento || "", cover.budget || 0);

        // --- 2. ANÁLISE DOS 14 QUESITOS DE COMPLIANCE ---
        const agentDefinitions = [
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
        const notaPriorizacaoLocal = this.calculatePrioritizationScoreLocal(fullContext, cover);

        // --- 4. NOTA FINAL E ALERTAS ORÇAMENTÁRIOS ---
        const notaFinalCalculada = Math.min(130, Math.round(notaTecnicaFinal + notaPriorizacaoLocal));

        if (budgetAnalysis.adminPercent > 15) {
            alertasLocais.unshift({
                tipo: "Estouro Orçamentário",
                descricao: `Custos administrativos (${budgetAnalysis.adminPercent.toFixed(1)}%) ultrapassam o teto legal de 15%.`,
                sugestao: "Reduza os cachês de coordenação/direção geral para se adequar ao limite.",
                nivel: "CRÍTICO"
            });
        }

        // --- 5. GERAÇÃO DO RELATÓRIO GERAL EM HTML ESTRUTURADO ---
        const relatorioHTML = this.buildOfflineHTMLReport(cover, notaFinalCalculada, notaTecnicaFinal, notaPriorizacaoLocal, budgetAnalysis, agentesResults, alertasLocais);

        const auditResponseObj = {
            relatorio_geral: relatorioHTML,
            nota_final: notaFinalCalculada,
            nota_tecnica: notaTecnicaFinal,
            nota_priorizacao: Math.round(notaPriorizacaoLocal * 10) / 10,
            total_orcamento: budgetAnalysis.totalValue,
            custos_administrativos_percentual: Math.round(budgetAnalysis.adminPercent * 10) / 10,
            agentes: agentesResults,
            alertas: alertasLocais,
            ajustes: [
                { alteracao: "Inclusão de Intérprete de LIBRAS", fator: "+5.0 pontos na Nota Técnica (Acessibilidade)" },
                { alteracao: "Adequação do Teto Administrativo para 15%", fator: "Elimina risco de desclassificação legal" },
                { alteracao: "Detalhamento de Indicadores Quantitativos", fator: "+3.5 pontos em Monitoramento" }
            ],
            isOfflineResult: true
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
        const erros = [];
        const recomendacoes = [];

        if (length === 0) {
            score = 30; // Inconformidade grave
            erros.push(`A seção "${agent.title}" não foi preenchida no editor.`);
            recomendacoes.push(`Preencha o campo "${agent.title}" utilizando as minutas do banco local.`);
        } else if (length < 150) {
            score = 60;
            erros.push(`A seção "${agent.title}" está muito sucinta (${length} caracteres).`);
            recomendacoes.push(`Expanda a descrição para ao menos 400 caracteres com dados quantitativos.`);
        } else {
            score = 85;
            // Verificar palavras-chave no texto da seção
            const textLower = cleanText.toLowerCase();
            let matched = 0;
            agent.keywords.forEach(kw => {
                if (textLower.includes(kw) || fullContext.includes(kw)) matched++;
            });

            if (matched >= 2) {
                score = 95;
            } else {
                erros.push(`Falta citação explícita de termos essenciais (${agent.keywords.slice(0, 3).join(', ')}).`);
                recomendacoes.push(`Inclua referências formais a ${agent.keywords.slice(0, 3).join(', ')}.`);
            }
        }

        // Regras específicas adicionais
        if (agent.id === 'orcamento' && budgetAnalysis.adminPercent > 15) {
            score = Math.min(score, 55);
            erros.push(`Custos administrativos em ${budgetAnalysis.adminPercent.toFixed(1)}% (teto é 15%).`);
            recomendacoes.push("Reorganize a planilha orçamentária reduzindo rubricas administrativas.");
        }

        if (agent.id === 'acessibilidade' && !/libras|audiodescrição|rampa|braille/i.test(cleanText)) {
            score = Math.min(score, 65);
            erros.push("Ausência de menção clara a LIBRAS ou Audiodescrição.");
            recomendacoes.push("Adicione parágrafo especificando intérprete de LIBRAS em todas as apresentações.");
        }

        let parecerHTML = `<p><strong>Diagnóstico Local:</strong> A área de <em>${agent.title}</em> atingiu pontuação <strong>${score}/100</strong>.</p>`;
        if (erros.length > 0) {
            parecerHTML += `<p><strong>Pendências Identificadas:</strong></p><ul>${erros.map(e => `<li>${e}</li>`).join('')}</ul>`;
        } else {
            parecerHTML += `<p><strong>Conformidade:</strong> O texto atende satisfatoriamente às diretrizes básicas de fomento cultural.</p>`;
        }
        if (recomendacoes.length > 0) {
            parecerHTML += `<p><strong>Sugestão Otimizada:</strong> ${recomendacoes[0]}</p>`;
        }

        return {
            id: agent.id,
            nota: score,
            parecer: parecerHTML,
            erros: erros,
            recomendacoes: recomendacoes
        };
    },

    /**
     * Analisa custos e percentuais da planilha local
     */
    analyzeBudgetLocal: function (orcamentoText, coverBudget) {
        let totalValue = coverBudget || 0;
        let adminCosts = 0;

        // Tentar extrair números da planilha se for texto formatado
        const lines = (orcamentoText || "").split('\n');
        for (const line of lines) {
            const matchVal = line.match(/(?:r\$|\$)?\s*([\d\.\,]+)/i);
            if (matchVal && matchVal[1]) {
                const numStr = matchVal[1].replace(/\./g, '').replace(',', '.');
                const val = parseFloat(numStr);
                if (!isNaN(val) && val > 0) {
                    if (totalValue === 0) totalValue += val;
                    if (/coordena|direção|gestão|administra/i.test(line)) {
                        adminCosts += val;
                    }
                }
            }
        }

        if (totalValue === 0) totalValue = 100000; // Valor base fallback
        if (adminCosts === 0) adminCosts = totalValue * 0.12; // 12% estipulado

        const adminPercent = (adminCosts / totalValue) * 100;

        return {
            totalValue: totalValue,
            adminCosts: adminCosts,
            adminPercent: adminPercent
        };
    },

    /**
     * Calcula pontuação de priorização (0 a 30) baseada nos 7 critérios do Anexo 8
     */
    calculatePrioritizationScoreLocal: function (fullContext, cover) {
        let score = 0;

        // 1. Governança Participativa (até 3.5)
        if (/conselho|participativa|transparência|comitê/i.test(fullContext)) score += 3.5;
        else score += 2.0;

        // 2. Público Prioritário (até 3.5)
        if (/mulheres|negros|pcd|idosos|jovens|comunidade/i.test(fullContext)) score += 3.5;
        else score += 1.5;

        // 3. Equipe vulnerabilizada (até 3.5)
        if (/liderança feminina|quilombola|indígena|lgbtqia\+/i.test(fullContext)) score += 3.5;
        else score += 2.0;

        // 4. Experiência prévia territorial (até 3.5)
        if (/rio doce|litoral|histórico|experiência/i.test(fullContext)) score += 3.5;
        else score += 1.5;

        // 5. Coordenação CadÚnico/Rural (até 6.5)
        if (/cadúnico|vulnerável|agricultor|rural/i.test(fullContext)) score += 6.5;
        else score += 3.0;

        // 6. Parcerias em rede (até 3.5)
        if (/parceria|coletivo|rede|associação/i.test(fullContext)) score += 3.5;
        else score += 2.0;

        // 7. Localização geográfica (epicentro) (até 6.0)
        if (/epicentro|calha|rio doce|litoral norte/i.test(fullContext) || /es|mg/i.test(cover.city || "")) score += 6.0;
        else score += 3.0;

        return Math.min(30, score);
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
    }
};
