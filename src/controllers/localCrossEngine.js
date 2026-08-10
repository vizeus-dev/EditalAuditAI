/**
 * localCrossEngine.js — Motor de Cruzamento Offline (LocalCrossEngine v2.0)
 *
 * Arquitetura Local-First: executa 100% da auditoria matemática, normativa e
 * estrutural do projeto SEM qualquer requisição HTTP/API.
 *
 * 5 Submódulos:
 *   1. BudgetAuditor    — Auditoria Matemática & Orçamentária
 *   2. ComplianceScanner — Verificador de Conformidade & Gatilhos Normativos
 *   3. SectionValidator  — Validador Estrutural de Seções
 *   4. DiagnosticBuilder — Gerador do Pré-Relatório (Score 0-100)
 *   5. APIHandoff        — Estruturação do Handoff para a LLM
 *
 * Princípio: O código local (JavaScript/IndexedDB) realiza toda a auditoria
 * determinística. Quando a API estiver ativa, ela atua APENAS como camada
 * final de polimento e síntese narrativa.
 */

window.LocalCrossEngine = {

    name: "LocalCrossEngine v2.0 — Motor de Cruzamento Offline Determinístico",
    version: "2.0.0",

    // =====================================================================
    // PONTO DE ENTRADA PRINCIPAL
    // =====================================================================

    /**
     * Executa o diagnóstico completo offline.
     * Retorna o objeto offlineDiagnostic pronto para renderização e/ou handoff à API.
     * @param {Object} workspaceState — estado completo do workspace
     * @returns {Object} offlineDiagnostic
     */
    runFullDiagnostic: function (workspaceState) {
        console.log('[LocalCrossEngine] ▶ Iniciando diagnóstico completo offline...');
        const startTime = performance.now();

        const doc = workspaceState.documentContent || {};
        const cover = workspaceState.cover || {};
        const editalText = workspaceState.editalRefText || "";
        const draftText = workspaceState.proposalDraftText || "";
        const annexes = workspaceState.annexes || [];
        const profile = workspaceState.editalProfile || {};

        // --- 1. Auditoria Matemática & Orçamentária ---
        const budgetResult = this.BudgetAuditor.audit(doc, cover, profile, editalText);

        // --- 2. Verificação de Conformidade & Gatilhos Normativos ---
        const complianceResult = this.ComplianceScanner.scan(editalText, draftText, doc, annexes);

        // --- 3. Validação Estrutural de Seções ---
        const sectionResult = this.SectionValidator.validate(doc, editalText, profile);

        // --- 4. Geração do Diagnóstico Consolidado ---
        const diagnostic = this.DiagnosticBuilder.build(
            budgetResult, complianceResult, sectionResult, cover, profile
        );

        const elapsed = Math.round(performance.now() - startTime);
        diagnostic.processingTimeMs = elapsed;
        console.log(`[LocalCrossEngine] ✓ Diagnóstico completo em ${elapsed}ms | Score: ${diagnostic.score}/100`);

        return diagnostic;
    },

    // =====================================================================
    // 1. MOTOR DE AUDITORIA MATEMÁTICA & ORÇAMENTÁRIA
    // =====================================================================
    BudgetAuditor: {

        /**
         * Extrai valores da planilha orçamentária e calcula todos os indicadores.
         */
        audit: function (doc, cover, profile, editalText) {
            const orcamentoHtml = doc.orcamento || "";
            const totalDeclarado = Number(cover.budget) || 0;

            // Extrair itens do editor (reutiliza parseBudgetItemsFromEditor do app.js)
            let items = [];
            if (typeof parseBudgetItemsFromEditor === 'function') {
                items = parseBudgetItemsFromEditor(orcamentoHtml);
            } else {
                items = this._fallbackParseItems(orcamentoHtml);
            }

            // --- Cálculos Fundamentais ---
            const totalCalculado = items.reduce((sum, it) => sum + (it.total || 0), 0);
            const totalProjeto = totalCalculado > 0 ? totalCalculado : totalDeclarado;

            // --- Classificação de Rubricas ---
            const adminKeywords = /coordena|direção|gestão|administra|gerência|supervisão|secretaria executiva/i;
            const comKeywords = /comunicação|divulgação|marketing|assessoria de imprensa|mídia|design|identidade visual/i;
            const accessKeywords = /libras|audiodescrição|audiodescricao|braille|acessibilidade|intérprete|tradutor.*sinais/i;
            const taxKeywords = /inss|iss|irrf|fgts|encargo|tribut|imposto|das|patronal|recolhimento/i;

            let adminTotal = 0;
            let comTotal = 0;
            let accessTotal = 0;
            let taxTotal = 0;
            const itemsClassified = [];
            const inconsistencies = [];
            const missingTaxItems = [];

            items.forEach((it, idx) => {
                const label = `${it.rubrica || ''} ${it.item || ''} ${it.especificacao || ''}`.toLowerCase();

                // Classificação
                let category = 'operacional';
                if (adminKeywords.test(label)) { category = 'administrativo'; adminTotal += (it.total || 0); }
                else if (comKeywords.test(label)) { category = 'comunicacao'; comTotal += (it.total || 0); }
                else if (accessKeywords.test(label)) { category = 'acessibilidade'; accessTotal += (it.total || 0); }
                else if (taxKeywords.test(label)) { category = 'tributario'; taxTotal += (it.total || 0); }

                // Detecção de inconsistências
                if (it.total !== undefined && it.qtd && it.valorUnit) {
                    const expectedTotal = it.qtd * it.valorUnit;
                    if (Math.abs(expectedTotal - it.total) > 1) {
                        inconsistencies.push({
                            item: it.item || `Item ${idx + 1}`,
                            expected: expectedTotal,
                            actual: it.total,
                            type: 'soma_incorreta'
                        });
                    }
                }

                if (it.total < 0) {
                    inconsistencies.push({
                        item: it.item || `Item ${idx + 1}`,
                        type: 'valor_negativo',
                        value: it.total
                    });
                }

                if (it.valorUnit !== undefined && isNaN(it.valorUnit)) {
                    inconsistencies.push({
                        item: it.item || `Item ${idx + 1}`,
                        type: 'celula_nao_numerica',
                        field: 'valorUnit'
                    });
                }

                itemsClassified.push({ ...it, category });
            });

            // --- Verificação de soma total ---
            if (totalDeclarado > 0 && totalCalculado > 0 && Math.abs(totalDeclarado - totalCalculado) > 100) {
                inconsistencies.push({
                    item: 'Total Geral',
                    type: 'divergencia_total',
                    declared: totalDeclarado,
                    calculated: totalCalculado,
                    difference: Math.abs(totalDeclarado - totalCalculado)
                });
            }

            // --- Percentuais ---
            const adminPercent = totalProjeto > 0 ? (adminTotal / totalProjeto) * 100 : 0;
            const comPercent = totalProjeto > 0 ? (comTotal / totalProjeto) * 100 : 0;
            const accessPercent = totalProjeto > 0 ? (accessTotal / totalProjeto) * 100 : 0;
            const taxPercent = totalProjeto > 0 ? (taxTotal / totalProjeto) * 100 : 0;

            // --- Tetos do Edital ---
            const tetoAdmin = profile.tetoGestao || this._extractCeiling(editalText, 'admin') || 15;
            const tetoCom = profile.tetoMarketing || this._extractCeiling(editalText, 'com') || 20;

            // --- Alertas ---
            const redAlerts = [];
            const yellowAlerts = [];

            if (adminPercent > tetoAdmin) {
                redAlerts.push({
                    code: 'BUDGET_ADMIN_OVER',
                    msg: `Custos administrativos (${adminPercent.toFixed(1)}%) ultrapassam o teto de ${tetoAdmin}% do edital.`,
                    action: `Reduza rubricas de coordenação/gestão para ficar abaixo de ${tetoAdmin}%.`,
                    impact: 'eliminatorio'
                });
            }

            if (comPercent > tetoCom) {
                yellowAlerts.push({
                    code: 'BUDGET_COM_OVER',
                    msg: `Custos de comunicação (${comPercent.toFixed(1)}%) ultrapassam o limite recomendado de ${tetoCom}%.`,
                    action: `Revise as rubricas de divulgação/marketing.`,
                    impact: 'risco_medio'
                });
            }

            // Verificar faixa de valor do edital
            if (profile.faixaValor) {
                if (totalProjeto > profile.faixaValor.max) {
                    redAlerts.push({
                        code: 'BUDGET_OVER_MAX',
                        msg: `Orçamento (R$ ${totalProjeto.toLocaleString('pt-BR')}) excede o teto do edital (R$ ${profile.faixaValor.max.toLocaleString('pt-BR')}).`,
                        action: 'Reduza o orçamento total para se adequar à faixa do edital.',
                        impact: 'eliminatorio'
                    });
                }
                if (totalProjeto < profile.faixaValor.min) {
                    yellowAlerts.push({
                        code: 'BUDGET_UNDER_MIN',
                        msg: `Orçamento (R$ ${totalProjeto.toLocaleString('pt-BR')}) abaixo do piso do edital (R$ ${profile.faixaValor.min.toLocaleString('pt-BR')}).`,
                        action: 'Verifique se o valor está compatível com a faixa do edital.',
                        impact: 'risco_medio'
                    });
                }
            }

            // --- Verificação de Rubricas Tributárias Obrigatórias ---
            const taxRubricsCheck = this._checkTaxRubrics(items, doc, totalProjeto);
            taxRubricsCheck.missing.forEach(m => {
                yellowAlerts.push({
                    code: 'BUDGET_TAX_MISSING',
                    msg: m.msg,
                    action: m.action,
                    impact: 'risco_alto'
                });
            });

            // --- Verificação de itens de acessibilidade no orçamento ---
            const accessCheck = this._checkAccessibilityBudget(items, doc);
            accessCheck.missing.forEach(m => {
                yellowAlerts.push({
                    code: 'BUDGET_ACCESS_MISSING',
                    msg: m.msg,
                    action: m.action,
                    impact: 'risco_medio'
                });
            });

            // --- Detecção de duplicatas ---
            const duplicates = this._detectDuplicates(items);
            duplicates.forEach(d => {
                yellowAlerts.push({
                    code: 'BUDGET_DUPLICATE',
                    msg: `Possível duplicata detectada: "${d.item1}" e "${d.item2}" (similaridade: ${d.similarity}%).`,
                    action: 'Verifique se esses itens não representam a mesma despesa.',
                    impact: 'risco_baixo'
                });
            });

            // --- Despesas Vedadas ---
            const vedasCheck = this._checkVedasExpenses(items, profile);
            vedasCheck.forEach(v => {
                redAlerts.push({
                    code: 'BUDGET_VEDADA',
                    msg: v.msg,
                    action: v.action,
                    impact: 'eliminatorio'
                });
            });

            // Score do módulo (0-100)
            let score = 100;
            score -= redAlerts.length * 20;
            score -= yellowAlerts.length * 5;
            score -= inconsistencies.length * 8;
            if (items.length === 0 && totalDeclarado === 0) score = 0;
            else if (items.length === 0) score = Math.min(score, 40);
            score = Math.max(0, Math.min(100, score));

            return {
                score,
                totalProjeto,
                totalDeclarado,
                totalCalculado,
                itemCount: items.length,
                adminTotal, adminPercent: Math.round(adminPercent * 10) / 10,
                comTotal, comPercent: Math.round(comPercent * 10) / 10,
                accessTotal, accessPercent: Math.round(accessPercent * 10) / 10,
                taxTotal, taxPercent: Math.round(taxPercent * 10) / 10,
                tetoAdmin, tetoCom,
                inconsistencies,
                redAlerts,
                yellowAlerts,
                itemsClassified,
                hasData: items.length > 0 || totalDeclarado > 0
            };
        },

        /** Verifica presença de rubricas tributárias obrigatórias */
        _checkTaxRubrics: function (items, doc, totalProjeto) {
            const missing = [];
            const allText = items.map(i => `${i.rubrica} ${i.item} ${i.especificacao}`).join(' ').toLowerCase();
            const docText = JSON.stringify(doc).toLowerCase();

            // Verificar se há contratações PF sem previsão de encargos
            const hasPF = /rpa|pessoa física|autônomo|cachê|freelanc/i.test(allText + ' ' + docText);
            const hasINSS = /inss|previdência|patronal/i.test(allText);
            const hasIRRF = /irrf|imposto.*renda.*retido|irpf/i.test(allText);
            const hasISS = /iss|imposto.*serviço/i.test(allText);
            const hasFGTS = /fgts|fundo.*garantia/i.test(allText);

            if (hasPF && !hasINSS) {
                missing.push({
                    tax: 'INSS Patronal',
                    msg: 'Contratações de Pessoa Física (RPA) detectadas, mas INSS Patronal (20%) não está previsto na planilha.',
                    action: 'Inclua rubrica de INSS Patronal (20% sobre o bruto) para todas as contratações PF/RPA.'
                });
            }
            if (hasPF && !hasIRRF) {
                missing.push({
                    tax: 'IRRF',
                    msg: 'Contratações PF detectadas sem previsão de IRRF (tabela progressiva).',
                    action: 'Inclua provisão de IRRF para pagamentos PF acima da faixa de isenção.'
                });
            }
            if (hasPF && !hasISS) {
                missing.push({
                    tax: 'ISS',
                    msg: 'Serviços PF/PJ detectados sem previsão de ISS (2% a 5%).',
                    action: 'Inclua rubrica de ISS municipal conforme alíquota local.'
                });
            }

            // Verificar se encargos existem mas são insuficientes
            if (hasINSS && totalProjeto > 0) {
                const encargosTotal = items
                    .filter(i => /inss|encargo|patronal|tribut/i.test(`${i.rubrica} ${i.item}`))
                    .reduce((s, i) => s + (i.total || 0), 0);
                const pfTotal = items
                    .filter(i => /rpa|cachê|autônomo/i.test(`${i.rubrica} ${i.item} ${i.especificacao}`))
                    .reduce((s, i) => s + (i.total || 0), 0);

                if (pfTotal > 0 && encargosTotal < pfTotal * 0.15) {
                    missing.push({
                        tax: 'Encargos Insuficientes',
                        msg: `Provisão de encargos (R$ ${encargosTotal.toLocaleString('pt-BR')}) parece insuficiente para o total de contratações PF (R$ ${pfTotal.toLocaleString('pt-BR')}).`,
                        action: 'Revise os encargos para garantir cobertura mínima de 20% (INSS) + IRRF + ISS.'
                    });
                }
            }

            return { missing };
        },

        /** Verifica se itens de acessibilidade estão orçados */
        _checkAccessibilityBudget: function (items, doc) {
            const missing = [];
            const accessText = (doc.acessibilidade || '').toLowerCase();
            const budgetText = items.map(i => `${i.rubrica} ${i.item} ${i.especificacao}`).join(' ').toLowerCase();

            // Se acessibilidade menciona Libras mas orçamento não tem
            if (/libras|intérprete|interprete|sinais/i.test(accessText) && !/libras|intérprete|interprete|sinais/i.test(budgetText)) {
                missing.push({
                    msg: 'Seção de Acessibilidade menciona intérprete de LIBRAS, mas não há rubrica correspondente no orçamento.',
                    action: 'Inclua item orçamentário para contratação de intérprete de LIBRAS.'
                });
            }

            // Se acessibilidade menciona audiodescrição mas orçamento não tem
            if (/audiodescrição|audiodescricao|audiodescritor/i.test(accessText) && !/audiodescrição|audiodescricao|audiodescritor/i.test(budgetText)) {
                missing.push({
                    msg: 'Seção de Acessibilidade menciona audiodescrição, mas não há rubrica correspondente no orçamento.',
                    action: 'Inclua item orçamentário para serviço de audiodescrição.'
                });
            }

            // Se não há nenhuma menção a acessibilidade no orçamento
            if (items.length > 0 && !/libras|audiodescrição|audiodescricao|braille|acessib/i.test(budgetText)) {
                missing.push({
                    msg: 'Nenhum item de acessibilidade comunicacional ou física encontrado no orçamento.',
                    action: 'Inclua rubricas de acessibilidade (LIBRAS, audiodescrição) conforme Lei 13.146/2015.'
                });
            }

            return { missing };
        },

        /** Detecta possíveis itens duplicados na planilha */
        _detectDuplicates: function (items) {
            const duplicates = [];
            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const a = (items[i].item || '').toLowerCase().trim();
                    const b = (items[j].item || '').toLowerCase().trim();
                    if (a.length < 5 || b.length < 5) continue;

                    const similarity = this._stringSimilarity(a, b);
                    if (similarity >= 80) {
                        duplicates.push({
                            item1: items[i].item,
                            item2: items[j].item,
                            similarity: Math.round(similarity)
                        });
                    }
                }
            }
            return duplicates;
        },

        /** Similaridade de strings simples baseada em palavras comuns */
        _stringSimilarity: function (a, b) {
            const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
            const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
            if (wordsA.size === 0 || wordsB.size === 0) return 0;
            let common = 0;
            wordsA.forEach(w => { if (wordsB.has(w)) common++; });
            return (common / Math.max(wordsA.size, wordsB.size)) * 100;
        },

        /** Verifica itens contra despesas vedadas pelo edital */
        _checkVedasExpenses: function (items, profile) {
            const vedadas = profile.despesasVedadas || [];
            if (vedadas.length === 0) return [];

            const results = [];
            const vedadasPatterns = [
                { test: /terreno|imóvel|compra.*terra/i, label: 'Compra de terrenos ou imóveis' },
                { test: /dívida|débito anterior|quitação/i, label: 'Pagamento de dívidas' },
                { test: /multa|juros.*mora|penalidade/i, label: 'Multas, juros ou penalidades' },
                { test: /taxa.*administra|overhead/i, label: 'Taxas de administração' },
                { test: /manutenção.*entidade|custo.*fixo.*sede/i, label: 'Manutenção da entidade' }
            ];

            items.forEach(it => {
                const label = `${it.rubrica} ${it.item} ${it.especificacao}`.toLowerCase();
                vedadasPatterns.forEach(vp => {
                    if (vp.test.test(label)) {
                        results.push({
                            msg: `Item "${it.item}" pode configurar despesa vedada: ${vp.label}.`,
                            action: `Remova ou reclassifique o item "${it.item}" conforme regras do edital.`
                        });
                    }
                });
            });

            return results;
        },

        /** Extrai teto de percentual do texto do edital */
        _extractCeiling: function (editalText, type) {
            if (!editalText) return null;
            const textLower = editalText.toLowerCase();
            const patterns = type === 'admin'
                ? [
                    /(?:gestão|administra|coordenação)[^.]{0,60}?(?:até|máximo|limite)\s*(?:de)?\s*(\d{1,2})\s*%/i,
                    /(?:até|máximo|limite)\s*(?:de)?\s*(\d{1,2})\s*%[^.]{0,60}?(?:gestão|administra|coordenação)/i
                ]
                : [
                    /(?:comunicação|divulgação|marketing)[^.]{0,60}?(?:até|máximo|limite)\s*(?:de)?\s*(\d{1,2})\s*%/i,
                    /(?:até|máximo|limite)\s*(?:de)?\s*(\d{1,2})\s*%[^.]{0,60}?(?:comunicação|divulgação|marketing)/i
                ];

            for (const p of patterns) {
                const m = textLower.match(p);
                if (m && m[1]) {
                    const val = parseInt(m[1], 10);
                    if (val >= 5 && val <= 50) return val;
                }
            }
            return null;
        },

        /** Parser de fallback caso parseBudgetItemsFromEditor não esteja disponível */
        _fallbackParseItems: function (html) {
            if (!html) return [];
            const items = [];
            const lines = html.replace(/<[^>]+>/g, '\n').split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (/R\$\s*[\d.,]+/.test(trimmed)) {
                    const matchVal = trimmed.match(/R\$\s*([\d.,]+)/);
                    if (matchVal) {
                        const cleanStr = matchVal[1].replace(/\./g, '').replace(',', '.');
                        const val = parseFloat(cleanStr);
                        if (!isNaN(val) && val > 0) {
                            const parts = trimmed.split(/[:\-–—]/);
                            items.push({
                                rubrica: 'Geral',
                                item: parts[0] ? parts[0].replace(/^[\d.*\-\+\s]+/, '').trim() : 'Item',
                                especificacao: trimmed,
                                qtd: 1,
                                valorUnit: val,
                                subtotal: val,
                                total: val
                            });
                        }
                    }
                }
            });
            return items;
        }
    },

    // =====================================================================
    // 2. VERIFICADOR DE CONFORMIDADE & GATILHOS NORMATIVOS
    // =====================================================================
    ComplianceScanner: {

        /**
         * Dicionário estático de regras e termos sensíveis.
         * Cada categoria contém termos de gatilho e a ação regulatória associada.
         */
        RULES_DICTIONARY: {
            compliance_legal: {
                label: 'Compliance Legal & Habilitação',
                icon: '📜',
                terms: [
                    { term: 'cnd', fullName: 'Certidão Negativa de Débitos', regex: /\bcnd\b|certid[ãa]o\s*negativa\s*de\s*d[eé]bitos/i },
                    { term: 'fgts', fullName: 'Certificado de Regularidade FGTS', regex: /\bfgts\b|fundo\s*de\s*garantia/i },
                    { term: 'cndt', fullName: 'Certidão Negativa de Débitos Trabalhistas', regex: /\bcndt\b|certid[ãa]o.*trabalh/i },
                    { term: 'receita_federal', fullName: 'Certidão da Receita Federal', regex: /receita\s*federal|certid[ãa]o.*tribut.*federal/i },
                    { term: 'certidao_municipal', fullName: 'Certidão Negativa Municipal', regex: /certid[ãa]o.*municipal|tributos?\s*municipal/i },
                    { term: 'carta_anuencia', fullName: 'Carta de Anuência', regex: /carta\s*de\s*anu[eê]ncia|anu[eê]ncia\s*comunit/i },
                    { term: 'estatuto', fullName: 'Estatuto Social', regex: /estatuto\s*social/i },
                    { term: 'ata_diretoria', fullName: 'Ata de Eleição da Diretoria', regex: /ata\s*(de\s*)?(elei[çc][ãa]o|diretoria|posse)/i },
                    { term: 'cnpj', fullName: 'Cartão CNPJ Atualizado', regex: /\bcnpj\b|cadastro\s*nacional/i },
                    { term: 'plano_trabalho', fullName: 'Plano de Trabalho Formal', regex: /plano\s*de\s*trabalho/i },
                    { term: 'declaracao_contrapartida', fullName: 'Declaração de Contrapartida', regex: /declara[çc][ãa]o.*contrapartida/i },
                    { term: 'comprovante_endereco', fullName: 'Comprovante de Endereço da Sede', regex: /comprovante\s*(de\s*)?endere[çc]o|sede.*comprov/i }
                ],
                alertAction: 'Providenciar documento obrigatório antes da submissão.'
            },

            conhecimentos_tradicionais: {
                label: 'Conhecimentos Tradicionais & Etnobotânica',
                icon: '🌿',
                terms: [
                    { term: 'patrimonio_genetico', fullName: 'Patrimônio Genético', regex: /patrim[oô]nio\s*gen[eé]tico/i },
                    { term: 'saberes_tradicionais', fullName: 'Saberes Tradicionais', regex: /saberes?\s*tradicion|conhecimento\s*tradicional/i },
                    { term: 'ervas', fullName: 'Ervas Medicinais/Rituais', regex: /\bervas?\b.*(?:medicin|ritual|sagrada|cura)/i },
                    { term: 'sacramentos', fullName: 'Sacramentos/Uso Ritual', regex: /sacramento|uso\s*ritual|ritualístic/i },
                    { term: 'ayahuasca', fullName: 'Ayahuasca/Daime', regex: /ayahuasca|daime|hoasca|vegetal.*uni[ãa]o/i },
                    { term: 'jurema', fullName: 'Jurema Sagrada', regex: /jurema/i },
                    { term: 'etnobotanica', fullName: 'Etnobotânica', regex: /etnobot[âa]nica/i },
                    { term: 'quilombola', fullName: 'Comunidade Quilombola', regex: /quilombol/i },
                    { term: 'indigena', fullName: 'Comunidade Indígena', regex: /ind[ií]gena|povo\s*origin[áa]rio/i },
                    { term: 'pajé', fullName: 'Pajé/Xamã/Curandeiro', regex: /paj[ée]|xam[ãa]|curandeir/i },
                    { term: 'mestre_raizeiro', fullName: 'Mestre(a) Raizeiro(a)', regex: /raizeir|mestre.*ervas?|rezadeir/i },
                    { term: 'farmacopeia', fullName: 'Farmacopeia Popular', regex: /farmacopeia|farmacop[ée]ia/i }
                ],
                alertAction: '🚨 OBRIGATÓRIO: Registro no SisGen (Sistema Nacional de Gestão do Patrimônio Genético) e/ou IBAMA antes da execução do projeto. Lei 13.123/2015.'
            },

            direitos_autorais: {
                label: 'Direitos Autorais & Licenciamento',
                icon: '🎵',
                terms: [
                    { term: 'musica', fullName: 'Execução Musical', regex: /\bm[úu]sica\b|execu[çc][ãa]o\s*musical|canç[ãa]o|playlist|DJ/i },
                    { term: 'repertorio', fullName: 'Repertório Musical', regex: /repert[óo]rio|setlist/i },
                    { term: 'cover', fullName: 'Cover/Versão', regex: /\bcover\b|vers[ãa]o\s*(?:de|musical)/i },
                    { term: 'obra_artistica', fullName: 'Obra Artística de Terceiros', regex: /obra\s*art[ií]stica|obra\s*liter[áa]ria|roteiro\s*de\s*terceiro/i },
                    { term: 'composicao', fullName: 'Composição Musical', regex: /composi[çc][ãa]o|compositor|letr(?:a|ista)/i },
                    { term: 'trilha_sonora', fullName: 'Trilha Sonora', regex: /trilha\s*sonora|sound\s*design/i },
                    { term: 'filme_terceiros', fullName: 'Exibição de Filmes/Vídeos de Terceiros', regex: /exibi[çc][ãa]o\s*(?:de\s*)?filme|mostra\s*(?:de\s*)?cinema|cineclube/i },
                    { term: 'fotografia_acervo', fullName: 'Fotografia/Acervo de Terceiros', regex: /acervo\s*fotogr[áa]fico|imagens?\s*de\s*terceiros?/i }
                ],
                alertAction: '🚨 OBRIGATÓRIO: Licenciamento ECAD (Escritório Central de Arrecadação e Distribuição) para qualquer execução musical pública. Verificar direitos autorais de obras de terceiros (Lei 9.610/1998).'
            },

            ambiental: {
                label: 'Ambiental & Licenciamento',
                icon: '🌳',
                terms: [
                    { term: 'manejo', fullName: 'Manejo de Recursos Naturais', regex: /manejo|extrativismo|manejo\s*florestal/i },
                    { term: 'fauna', fullName: 'Fauna Silvestre', regex: /fauna\s*silvestre|animal\s*silvestre|espécie.*nativa/i },
                    { term: 'flora', fullName: 'Flora Nativa', regex: /flora\s*nativa|vegeta[çc][ãa]o\s*nativa/i },
                    { term: 'desmatamento', fullName: 'Desmatamento/Supressão Vegetal', regex: /desmatamento|supress[ãa]o\s*vegetal/i },
                    { term: 'area_protegida', fullName: 'Área Protegida/UC', regex: /[áa]rea\s*protegida|unidade\s*de\s*conserva[çc][ãa]o|\buc\b/i },
                    { term: 'rio_nascente', fullName: 'Recursos Hídricos', regex: /nascente|manancial|[áa]gua\s*potável|bacia\s*hidrogr[áa]fica/i }
                ],
                alertAction: '🚨 Verificar necessidade de licenciamento ambiental junto ao IBAMA/ICMBio ou órgão estadual de meio ambiente.'
            },

            patrimonio_cultural: {
                label: 'Patrimônio Cultural & IPHAN',
                icon: '🏛️',
                terms: [
                    { term: 'tombado', fullName: 'Bem Tombado', regex: /tombad|patrimônio\s*(?:histórico|cultural)\s*(?:tombad|registrad)/i },
                    { term: 'iphan', fullName: 'IPHAN', regex: /\biphan\b|instituto.*patrim[oô]nio/i },
                    { term: 'restauro', fullName: 'Restauro/Conservação', regex: /restaur[oa]|conserva[çc][ãa]o.*patrimônio/i },
                    { term: 'sitio_arqueologico', fullName: 'Sítio Arqueológico', regex: /s[ií]tio\s*arqueol[óo]gico|escava[çc][ãa]o/i },
                    { term: 'patrimonio_imaterial', fullName: 'Patrimônio Imaterial', regex: /patrimônio\s*imaterial|bem\s*imaterial|registro\s*imaterial/i }
                ],
                alertAction: 'Verificar necessidade de autorização do IPHAN para intervenção em bens tombados ou patrimônio imaterial registrado.'
            }
        },

        /**
         * Varre todos os textos do projeto contra o dicionário de regras.
         * Retorna hits (termos encontrados), gaps (exigidos no edital mas ausentes na proposta)
         * e alertas priorizados.
         */
        scan: function (editalText, draftText, doc, annexes) {
            const editalLower = (editalText || '').toLowerCase();
            const proposalParts = [
                draftText || '',
                JSON.stringify(doc || {}),
                (annexes || []).map(a => `${a.name} ${a.content || ''}`).join(' ')
            ];
            const proposalLower = proposalParts.join(' ').toLowerCase();

            const hits = [];       // Termos encontrados no projeto
            const gaps = [];       // Exigidos no edital, ausentes na proposta
            const triggers = [];   // Gatilhos normativos que exigem ação regulatória
            const redAlerts = [];
            const yellowAlerts = [];

            for (const [categoryId, category] of Object.entries(this.RULES_DICTIONARY)) {
                const categoryHits = [];

                category.terms.forEach(rule => {
                    const inEdital = rule.regex.test(editalLower);
                    const inProposal = rule.regex.test(proposalLower);

                    if (inEdital && inProposal) {
                        categoryHits.push({ term: rule.fullName, status: 'OK', inEdital: true, inProposal: true });
                    } else if (inEdital && !inProposal) {
                        // Gap: edital exige, proposta não menciona
                        gaps.push({
                            category: category.label,
                            term: rule.fullName,
                            termId: rule.term
                        });

                        if (categoryId === 'compliance_legal') {
                            redAlerts.push({
                                code: `COMPLIANCE_GAP_${rule.term.toUpperCase()}`,
                                msg: `O edital exige "${rule.fullName}", mas a proposta não menciona este documento/requisito.`,
                                action: `Providencie e mencione "${rule.fullName}" na proposta ou anexos.`,
                                category: category.label,
                                impact: 'eliminatorio'
                            });
                        } else {
                            yellowAlerts.push({
                                code: `COMPLIANCE_GAP_${rule.term.toUpperCase()}`,
                                msg: `O edital menciona "${rule.fullName}", mas a proposta não faz referência.`,
                                action: `Verifique se "${rule.fullName}" é aplicável ao seu projeto e tome as medidas necessárias.`,
                                category: category.label,
                                impact: 'risco_medio'
                            });
                        }
                    } else if (!inEdital && inProposal) {
                        // Gatilho: presente na proposta — verificar se requer ação regulatória
                        if (categoryId === 'conhecimentos_tradicionais' || categoryId === 'direitos_autorais' || categoryId === 'ambiental') {
                            triggers.push({
                                category: category.label,
                                categoryId: categoryId,
                                term: rule.fullName,
                                termId: rule.term,
                                action: category.alertAction,
                                icon: category.icon
                            });

                            yellowAlerts.push({
                                code: `TRIGGER_${rule.term.toUpperCase()}`,
                                msg: `${category.icon} Gatilho normativo detectado: "${rule.fullName}" presente no projeto.`,
                                action: category.alertAction,
                                category: category.label,
                                impact: categoryId === 'conhecimentos_tradicionais' ? 'risco_alto' : 'risco_medio'
                            });
                        }
                        categoryHits.push({ term: rule.fullName, status: 'TRIGGER', inEdital: false, inProposal: true });
                    }

                    if (inEdital || inProposal) {
                        hits.push({
                            category: category.label,
                            categoryId: categoryId,
                            term: rule.fullName,
                            termId: rule.term,
                            inEdital,
                            inProposal,
                            status: inEdital && inProposal ? 'OK' : (inEdital ? 'GAP' : 'TRIGGER')
                        });
                    }
                });
            }

            // Score do módulo (0-100)
            let score = 100;
            score -= redAlerts.length * 15;
            score -= yellowAlerts.length * 5;
            score -= gaps.length * 3;
            score = Math.max(0, Math.min(100, score));

            return {
                score,
                hits,
                gaps,
                triggers,
                redAlerts,
                yellowAlerts,
                totalTermsScanned: Object.values(this.RULES_DICTIONARY).reduce((s, c) => s + c.terms.length, 0),
                matchedCount: hits.length,
                gapCount: gaps.length,
                triggerCount: triggers.length
            };
        }
    },

    // =====================================================================
    // 3. VALIDADOR ESTRUTURAL DE SEÇÕES
    // =====================================================================
    SectionValidator: {

        /** Seções básicas obrigatórias e suas expectativas */
        CORE_SECTIONS: [
            { id: 'justificativa', label: 'Justificativa', minChars: 200, weight: 1.2 },
            { id: 'objetivos', label: 'Objetivos', minChars: 150, weight: 1.1 },
            { id: 'metodologia', label: 'Metodologia', minChars: 300, weight: 1.3 },
            { id: 'cronograma', label: 'Cronograma', minChars: 100, weight: 1.0 },
            { id: 'orcamento', label: 'Orçamento', minChars: 100, weight: 1.2 },
            { id: 'acessibilidade', label: 'Acessibilidade', minChars: 100, weight: 1.0 }
        ],

        /** Mapa de termos esperados entre seções (cross-reference) */
        CROSS_REFERENCE_MAP: [
            { from: 'metodologia', to: 'orcamento', keywords: /oficina|workshop|curso|palestra|show|apresenta|evento|transport|alimenta|hospedagem|produção|edição/i, label: 'Atividade descrita na Metodologia deve ter rubrica no Orçamento' },
            { from: 'metodologia', to: 'cronograma', keywords: /etapa|fase|pré-produção|pós-produção|execução|mês|semana/i, label: 'Fases da Metodologia devem estar refletidas no Cronograma' },
            { from: 'acessibilidade', to: 'orcamento', keywords: /libras|intérprete|audiodescrição|braille|rampa|acessib/i, label: 'Medidas de Acessibilidade devem ter rubrica no Orçamento' },
            { from: 'objetivos', to: 'metodologia', keywords: /capacitar|formar|realizar|promover|produzir|apresentar|documentar/i, label: 'Ações dos Objetivos devem estar detalhadas na Metodologia' },
            { from: 'justificativa', to: 'objetivos', keywords: /necessidade|demanda|carência|urgência|importância/i, label: 'Problemas da Justificativa devem ser endereçados pelos Objetivos' }
        ],

        /**
         * Valida integridade das seções e coerência cruzada.
         */
        validate: function (doc, editalText, profile) {
            const redAlerts = [];
            const yellowAlerts = [];
            const sectionStatus = {};
            const crossReferenceGaps = [];

            // --- 1. Análise individual de cada seção ---
            this.CORE_SECTIONS.forEach(sec => {
                const content = (doc[sec.id] || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
                const charCount = content.length;
                let status = 'OK';
                let detail = '';

                if (charCount === 0) {
                    status = 'VAZIO';
                    detail = `Seção "${sec.label}" está completamente vazia.`;
                    redAlerts.push({
                        code: `SECTION_EMPTY_${sec.id.toUpperCase()}`,
                        msg: detail,
                        action: `Preencha a seção "${sec.label}" no editor ou use o Redator para gerar o conteúdo.`,
                        impact: 'eliminatorio'
                    });
                } else if (charCount < 50) {
                    status = 'MUITO_CURTO';
                    detail = `Seção "${sec.label}" tem apenas ${charCount} caracteres — insuficiente para avaliação.`;
                    redAlerts.push({
                        code: `SECTION_SHORT_${sec.id.toUpperCase()}`,
                        msg: detail,
                        action: `Expanda a seção "${sec.label}" com detalhamento operacional (mín. ${sec.minChars} caracteres).`,
                        impact: 'risco_alto'
                    });
                } else if (charCount < sec.minChars) {
                    status = 'CURTO';
                    detail = `Seção "${sec.label}" tem ${charCount} caracteres (recomendado: mín. ${sec.minChars}).`;
                    yellowAlerts.push({
                        code: `SECTION_BELOW_MIN_${sec.id.toUpperCase()}`,
                        msg: detail,
                        action: `Enriqueça a seção "${sec.label}" com dados quantitativos, prazos ou indicadores concretos.`,
                        impact: 'risco_baixo'
                    });
                }

                sectionStatus[sec.id] = {
                    label: sec.label,
                    status,
                    charCount,
                    minChars: sec.minChars,
                    detail,
                    completeness: charCount === 0 ? 0 : Math.min(100, Math.round((charCount / sec.minChars) * 100))
                };
            });

            // --- 2. Detecção de seções replicadas (copy-paste) ---
            const sectionIds = this.CORE_SECTIONS.map(s => s.id);
            for (let i = 0; i < sectionIds.length; i++) {
                for (let j = i + 1; j < sectionIds.length; j++) {
                    const a = (doc[sectionIds[i]] || '').replace(/<[^>]+>/g, '').trim();
                    const b = (doc[sectionIds[j]] || '').replace(/<[^>]+>/g, '').trim();
                    if (a.length > 100 && b.length > 100) {
                        // Compara primeiros 300 chars
                        const snippetA = a.substring(0, 300).toLowerCase();
                        const snippetB = b.substring(0, 300).toLowerCase();
                        if (snippetA === snippetB) {
                            yellowAlerts.push({
                                code: `SECTION_DUPLICATE_${sectionIds[i]}_${sectionIds[j]}`,
                                msg: `Possível texto replicado entre "${this.CORE_SECTIONS[i].label}" e "${this.CORE_SECTIONS[j].label}".`,
                                action: 'Diferencie o conteúdo de cada seção para evitar penalização por falta de originalidade.',
                                impact: 'risco_medio'
                            });
                        }
                    }
                }
            }

            // --- 3. Análise cruzada (cross-reference) ---
            this.CROSS_REFERENCE_MAP.forEach(rule => {
                const fromText = (doc[rule.from] || '').replace(/<[^>]+>/g, ' ').toLowerCase();
                const toText = (doc[rule.to] || '').replace(/<[^>]+>/g, ' ').toLowerCase();

                if (fromText.length < 50 || toText.length < 50) return; // Skip if sections too short

                // Extrair termos-chave da seção "from"
                const fromTerms = [];
                const fromWords = fromText.match(rule.keywords);
                if (fromWords) {
                    fromWords.forEach(w => {
                        const word = w.toLowerCase().trim();
                        if (word.length > 3 && !toText.includes(word)) {
                            fromTerms.push(word);
                        }
                    });
                }

                // Se encontrou termos na seção "from" que não aparecem na "to"
                if (fromTerms.length > 0) {
                    crossReferenceGaps.push({
                        from: rule.from,
                        to: rule.to,
                        missingTerms: [...new Set(fromTerms)].slice(0, 5),
                        rule: rule.label
                    });

                    yellowAlerts.push({
                        code: `XREF_${rule.from.toUpperCase()}_${rule.to.toUpperCase()}`,
                        msg: `Desalinhamento: ${rule.label}. Termos como "${fromTerms.slice(0, 3).join('", "')}" aparecem em ${this._labelFor(rule.from)} mas não em ${this._labelFor(rule.to)}.`,
                        action: `Revise ${this._labelFor(rule.to)} para incluir referência aos itens mencionados em ${this._labelFor(rule.from)}.`,
                        impact: 'risco_medio'
                    });
                }
            });

            // --- 4. Verificação de seções exigidas pelo edital mas ausentes ---
            if (profile.secoes_exigidas && Array.isArray(profile.secoes_exigidas)) {
                profile.secoes_exigidas.forEach(sec => {
                    const secId = sec.toLowerCase().replace(/\s+/g, '_').replace(/[áàã]/g, 'a').replace(/[éê]/g, 'e').replace(/[íì]/g, 'i').replace(/[óòõ]/g, 'o').replace(/[úù]/g, 'u').replace(/[ç]/g, 'c');
                    if (doc[secId] === undefined || (doc[secId] || '').trim().length === 0) {
                        // Check if it maps to one of our core sections
                        const mapped = this.CORE_SECTIONS.find(cs => sec.toLowerCase().includes(cs.label.toLowerCase()));
                        if (!mapped) {
                            yellowAlerts.push({
                                code: `SECTION_EDITAL_REQUIRED_${secId}`,
                                msg: `O edital exige a seção "${sec}", que não está presente ou não foi preenchida.`,
                                action: `Adicione conteúdo para a seção "${sec}" conforme exigido pelo edital.`,
                                impact: 'risco_alto'
                            });
                        }
                    }
                });
            }

            // Score do módulo (0-100)
            const filledSections = this.CORE_SECTIONS.filter(s => (doc[s.id] || '').trim().length >= s.minChars);
            let score = Math.round((filledSections.length / this.CORE_SECTIONS.length) * 70);
            // Bonus for cross-reference alignment
            const maxGaps = this.CROSS_REFERENCE_MAP.length;
            const gapsFound = crossReferenceGaps.length;
            score += Math.round(((maxGaps - gapsFound) / maxGaps) * 30);
            score -= redAlerts.length * 10;
            score = Math.max(0, Math.min(100, score));

            return {
                score,
                sectionStatus,
                crossReferenceGaps,
                redAlerts,
                yellowAlerts,
                filledCount: filledSections.length,
                totalRequired: this.CORE_SECTIONS.length,
                completenessPercent: Math.round((filledSections.length / this.CORE_SECTIONS.length) * 100)
            };
        },

        _labelFor: function (sectionId) {
            const sec = this.CORE_SECTIONS.find(s => s.id === sectionId);
            return sec ? sec.label : sectionId;
        }
    },

    // =====================================================================
    // 4. GERADOR DO PRÉ-RELATÓRIO LOCAL (DiagnosticBuilder)
    // =====================================================================
    DiagnosticBuilder: {

        /**
         * Consolida resultados dos 3 motores e gera o offlineDiagnostic.
         * Score = média ponderada: Budget (30%), Compliance (30%), Sections (40%)
         */
        build: function (budgetResult, complianceResult, sectionResult, cover, profile) {
            // Score ponderado
            const budgetWeight = 0.30;
            const complianceWeight = 0.30;
            const sectionWeight = 0.40;

            const score = Math.round(
                (budgetResult.score * budgetWeight) +
                (complianceResult.score * complianceWeight) +
                (sectionResult.score * sectionWeight)
            );

            // Consolidar alertas
            const redAlerts = [
                ...budgetResult.redAlerts.map(a => ({ ...a, source: 'BudgetAuditor' })),
                ...complianceResult.redAlerts.map(a => ({ ...a, source: 'ComplianceScanner' })),
                ...sectionResult.redAlerts.map(a => ({ ...a, source: 'SectionValidator' }))
            ];

            const yellowAlerts = [
                ...budgetResult.yellowAlerts.map(a => ({ ...a, source: 'BudgetAuditor' })),
                ...complianceResult.yellowAlerts.map(a => ({ ...a, source: 'ComplianceScanner' })),
                ...sectionResult.yellowAlerts.map(a => ({ ...a, source: 'SectionValidator' }))
            ];

            // Ordenar por severidade
            redAlerts.sort((a, b) => (a.impact === 'eliminatorio' ? -1 : 1));
            yellowAlerts.sort((a, b) => {
                const severity = { risco_alto: 0, risco_medio: 1, risco_baixo: 2 };
                return (severity[a.impact] || 2) - (severity[b.impact] || 2);
            });

            return {
                score: Math.max(0, Math.min(100, score)),
                timestamp: new Date().toISOString(),
                engineVersion: '2.0.0',

                // Scores individuais
                budgetScore: budgetResult.score,
                complianceScore: complianceResult.score,
                sectionScore: sectionResult.score,

                // Alertas consolidados
                redAlerts,
                yellowAlerts,

                // Resumo orçamentário
                budgetSummary: {
                    totalProjeto: budgetResult.totalProjeto,
                    totalDeclarado: budgetResult.totalDeclarado,
                    totalCalculado: budgetResult.totalCalculado,
                    itemCount: budgetResult.itemCount,
                    adminPercent: budgetResult.adminPercent,
                    comPercent: budgetResult.comPercent,
                    accessPercent: budgetResult.accessPercent,
                    taxPercent: budgetResult.taxPercent,
                    tetoAdmin: budgetResult.tetoAdmin,
                    tetoCom: budgetResult.tetoCom,
                    inconsistencies: budgetResult.inconsistencies,
                    hasData: budgetResult.hasData
                },

                // Relatório de compliance
                complianceHits: {
                    totalScanned: complianceResult.totalTermsScanned,
                    matched: complianceResult.matchedCount,
                    gaps: complianceResult.gapCount,
                    triggers: complianceResult.triggerCount,
                    hits: complianceResult.hits,
                    gapDetails: complianceResult.gaps,
                    triggerDetails: complianceResult.triggers
                },

                // Integridade estrutural
                sectionMatrix: {
                    status: sectionResult.sectionStatus,
                    crossReferenceGaps: sectionResult.crossReferenceGaps,
                    filledCount: sectionResult.filledCount,
                    totalRequired: sectionResult.totalRequired,
                    completenessPercent: sectionResult.completenessPercent
                },

                // Metadados
                projectTitle: (cover && cover.title) || 'Projeto sem título',
                proponentName: (cover && cover.proponent) || 'Proponente não informado',
                editalName: (profile && profile.fomento) || 'Edital não identificado'
            };
        }
    },

    // =====================================================================
    // 5. HANDOFF ESTRUTURADO PARA A API
    // =====================================================================
    APIHandoff: {

        /**
         * Constrói o payload enriquecido para envio à LLM.
         * A API NÃO recebe o edital cru — recebe texto + offlineDiagnostic pré-mastigado.
         */
        buildEnrichedPayload: function (offlineDiagnostic, workspaceState) {
            const doc = workspaceState.documentContent || {};
            const cover = workspaceState.cover || {};

            // Texto limpo do projeto (sem HTML)
            const cleanSections = Object.entries(doc)
                .filter(([k, v]) => v && v.trim().length > 20)
                .map(([k, v]) => {
                    const clean = v.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
                    return `### ${k.toUpperCase()}\n${clean}`;
                }).join('\n\n');

            // Serialização compacta do diagnóstico
            const diagnosticSummary = this._serializeDiagnostic(offlineDiagnostic);

            return {
                projectText: cleanSections,
                diagnosticText: diagnosticSummary,
                systemPrompt: this._buildSystemPrompt(offlineDiagnostic),
                enrichedPrompt: this._buildEnrichedPrompt(cleanSections, diagnosticSummary, cover)
            };
        },

        /**
         * System Prompt para a API — instrui a focar em polimento narrativo.
         */
        _buildSystemPrompt: function (diag) {
            return `Você é o Auditor-Chefe de Projetos Culturais, especialista em editais de fomento público.

CONTEXTO OPERACIONAL:
Um Motor de Regras Offline (LocalCrossEngine v2.0) já executou a seguinte pré-auditoria determinística do projeto:
- Score Offline: ${diag.score}/100
- Alertas Vermelhos (Erros Graves): ${diag.redAlerts.length}
- Alertas Amarelos (Recomendações): ${diag.yellowAlerts.length}
- Orçamento: R$ ${(diag.budgetSummary.totalProjeto || 0).toLocaleString('pt-BR')} | Admin: ${diag.budgetSummary.adminPercent}% (Teto: ${diag.budgetSummary.tetoAdmin}%)
- Seções Preenchidas: ${diag.sectionMatrix.filledCount}/${diag.sectionMatrix.totalRequired}
- Gaps de Compliance: ${diag.complianceHits.gaps} | Gatilhos Normativos: ${diag.complianceHits.triggers}

DIRETRIZ PRINCIPAL:
Analise o projeto considerando o Diagnóstico Offline já realizado (injetado abaixo). 
NÃO repita cálculos matemáticos já feitos — eles são determinísticos e precisos.
Concentre sua inteligência em:
1. POLIR a redação e aprofundar os ARGUMENTOS DE MÉRITO CULTURAL
2. Avaliar a COERÊNCIA NARRATIVA entre seções (algo que regras determinísticas não captam)
3. Sugerir ESTRATÉGIAS DE POSICIONAMENTO competitivo na banca
4. Identificar OPORTUNIDADES DE BONIFICAÇÃO que o motor offline não detecta
5. Validar ou contestar os alertas do motor offline com análise semântica profunda

DIRETRIZ ZERO-ALUCINAÇÃO:
Para cada exigência citada, referencie [📌 EDITAL: '...'] ou explicite [⚠️ INFERÊNCIA CONTEXTUAL].`;
        },

        /**
         * Prompt enriquecido com o diagnóstico local injetado.
         */
        _buildEnrichedPrompt: function (cleanSections, diagnosticSummary, cover) {
            return `[DIAGNÓSTICO OFFLINE PRÉ-PROCESSADO — LocalCrossEngine v2.0]:
${diagnosticSummary}

[PROPOSTA DO PROJETO]:
Título: ${cover.title || 'Não informado'}
Proponente: ${cover.proponent || 'Não informado'}
Orçamento: R$ ${(cover.budget || 0).toLocaleString('pt-BR')}

${cleanSections}

Com base no diagnóstico offline acima E no texto do projeto, produza sua avaliação consolidada de mérito, coerência e estratégia competitiva.`;
        },

        /**
         * Serializa o offlineDiagnostic em texto estruturado para injeção no prompt.
         */
        _serializeDiagnostic: function (diag) {
            const parts = [];

            parts.push(`═══ SCORE OFFLINE: ${diag.score}/100 ═══`);
            parts.push(`Budget: ${diag.budgetScore}/100 | Compliance: ${diag.complianceScore}/100 | Seções: ${diag.sectionScore}/100`);
            parts.push('');

            // Alertas Vermelhos
            if (diag.redAlerts.length > 0) {
                parts.push('🔴 ALERTAS VERMELHOS (ERROS GRAVES):');
                diag.redAlerts.forEach((a, i) => {
                    parts.push(`  ${i + 1}. [${a.source}] ${a.msg}`);
                    parts.push(`     ↳ Ação: ${a.action}`);
                });
                parts.push('');
            }

            // Alertas Amarelos
            if (diag.yellowAlerts.length > 0) {
                parts.push('🟡 ALERTAS AMARELOS (RECOMENDAÇÕES):');
                diag.yellowAlerts.slice(0, 15).forEach((a, i) => {
                    parts.push(`  ${i + 1}. [${a.source}] ${a.msg}`);
                });
                parts.push('');
            }

            // Budget Summary
            const bs = diag.budgetSummary;
            parts.push('💰 RESUMO ORÇAMENTÁRIO:');
            parts.push(`  Total: R$ ${(bs.totalProjeto || 0).toLocaleString('pt-BR')} | Itens: ${bs.itemCount}`);
            parts.push(`  Admin: ${bs.adminPercent}% (teto ${bs.tetoAdmin}%) | Comunicação: ${bs.comPercent}% (teto ${bs.tetoCom}%)`);
            parts.push(`  Acessibilidade: ${bs.accessPercent}% | Tributário: ${bs.taxPercent}%`);
            if (bs.inconsistencies && bs.inconsistencies.length > 0) {
                parts.push(`  ⚠️ Inconsistências: ${bs.inconsistencies.length} encontrada(s)`);
            }
            parts.push('');

            // Compliance
            const ch = diag.complianceHits;
            parts.push('📜 COMPLIANCE:');
            parts.push(`  Termos varridos: ${ch.totalScanned} | Matches: ${ch.matched} | Gaps: ${ch.gaps} | Gatilhos: ${ch.triggers}`);
            if (ch.gapDetails && ch.gapDetails.length > 0) {
                parts.push('  Gaps encontrados:');
                ch.gapDetails.forEach(g => parts.push(`    - ${g.term} (${g.category})`));
            }
            if (ch.triggerDetails && ch.triggerDetails.length > 0) {
                parts.push('  Gatilhos normativos:');
                ch.triggerDetails.forEach(t => parts.push(`    - ${t.icon} ${t.term}: ${t.action}`));
            }
            parts.push('');

            // Section Matrix
            const sm = diag.sectionMatrix;
            parts.push('📋 INTEGRIDADE DAS SEÇÕES:');
            parts.push(`  Preenchidas: ${sm.filledCount}/${sm.totalRequired} (${sm.completenessPercent}%)`);
            if (sm.status) {
                Object.entries(sm.status).forEach(([id, s]) => {
                    const statusIcon = s.status === 'OK' ? '✅' : s.status === 'VAZIO' ? '❌' : '⚠️';
                    parts.push(`    ${statusIcon} ${s.label}: ${s.status} (${s.charCount} chars, ${s.completeness}%)`);
                });
            }
            if (sm.crossReferenceGaps && sm.crossReferenceGaps.length > 0) {
                parts.push('  Cross-reference gaps:');
                sm.crossReferenceGaps.forEach(g => {
                    parts.push(`    - ${g.from} → ${g.to}: termos ausentes [${g.missingTerms.join(', ')}]`);
                });
            }

            return parts.join('\n');
        }
    }
};

console.log('[LocalCrossEngine] ✓ Motor de Cruzamento Offline v2.0 carregado.');
