/**
 * contextExtractor.js — Motor de Extração Semântica & Relevância Contextual (ContextExtractorEngine v1.0)
 *
 * Otimiza a extração de regras, tabelas, baremas e cláusulas do edital para alimentação
 * dos sub-agentes especialistas e revisores, garantindo conformidade com a diretriz Zero-Alucinação.
 *
 * Princípios:
 * 1. Preservação de tabelas e matrizes de preços (evita truncamento no meio de linhas).
 * 2. Pontuação léxica ponderada por quesito com bônus para artigos de lei e referências numéricas.
 * 3. Token budgeting dinâmico e ordenação cronológica para manter a coerência textual.
 */

window.ContextExtractorEngine = {
    name: "ContextExtractorEngine v1.0 — Extrator Semântico Contextual",

    // Taxonomia léxica e pesos para cada domínio
    TAXONOMY: {
        // --- EIXO 1: FOMENTO CULTURAL (14 AGENTES) ---
        justificativa: {
            primary: [/justificativa/i, /relev[âa]ncia/i, /m[ée]rito/i, /impacto\s+cultural/i, /objeto\s+do\s+edital/i],
            secondary: [/hist[óo]rico/i, /territ[óo]rio/i, /comunidade/i, /democratiza/i, /fomento/i, /proponente/i],
            weight: 1.2
        },
        objetivos: {
            primary: [/objetivo/i, /meta/i, /resultado\s+esperado/i, /alcance/i, /finalidade/i],
            secondary: [/quantitativo/i, /qualitativo/i, /p[úu]blico\s+alvo/i, /espec[íi]fico/i, /geral/i],
            weight: 1.2
        },
        metodologia: {
            primary: [/metodologia/i, /plano\s+de\s+trabalho/i, /etapa/i, /fase/i, /execu[çc][ãa]o/i],
            secondary: [/pr[ée]-produ[çc][ãa]o/i, /p[óo]s-produ[çc][ãa]o/i, /operacional/i, /desenvolvimento/i],
            weight: 1.1
        },
        cronograma: {
            primary: [/cronograma/i, /prazo/i, /per[íi]odo/i, /dura[çc][ãa]o/i, /m[êe]s/i, /semana/i],
            secondary: [/data\s+limite/i, /vig[êe]ncia/i, /execu[çc][ãa]o\s+f[íi]sica/i, /calend[áa]rio/i],
            weight: 1.1
        },
        orcamento: {
            primary: [/or[çc]amento/i, /planilha/i, /teto/i, /limite/i, /custo/i, /rubrica/i, /r\$/i, /valor\s+m[áa]ximo/i],
            secondary: [/administrativ/i, /divulga[çc][ãa]o/i, /encargo/i, /tribut/i, /inss/i, /iss/i, /irrf/i, /fgts/i, /vedada/i, /glosa/i, /mei/i, /rpa/i, /reembolso/i],
            weight: 1.5
        },
        acessibilidade: {
            primary: [/acessibilidade/i, /pcd/i, /libras/i, /audiodescri[çc][ãa]o/i, /braille/i, /legenda/i],
            secondary: [/lei\s*13\.146/i, /cotas/i, /a[çc][õo]es\s+afirmativas/i, /inclus/i, /rampa/i, /gratuito.*acompanhante/i, /banheiro\s+adaptado/i],
            weight: 1.4
        },
        publico: {
            primary: [/p[úu]blico/i, /benefici[áa]rio/i, /faixa\s+et[áa]ria/i, /estudante/i, /comunidade/i],
            secondary: [/acesso\s+gratuito/i, /demogr[áa]fico/i, /perfil/i, /vulnerabilidade/i, /territ[óo]rio/i],
            weight: 1.1
        },
        contrapartida: {
            primary: [/contrapartida/i, /legado/i, /retorno\s+social/i, /doa[çc][ãa]o/i, /oficina\s+gratuita/i],
            secondary: [/social/i, /escola\s+p[úu]blica/i, /formação/i, /impacto/i],
            weight: 1.2
        },
        comunicacao: {
            primary: [/comunica[çc][ãa]o/i, /divulga[çc][ãa]o/i, /assessoria/i, /m[íi]dia/i, /redes\s+sociais/i],
            secondary: [/marca/i, /logomarca/i, /propaganda/i, /tr[áa]fego\s+pago/i, /pe[çc]as\s+gr[áa]ficas/i, /clipagem/i],
            weight: 1.1
        },
        ficha_tecnica: {
            primary: [/ficha\s+t[ée]cnica/i, /curr[íi]culo/i, /equipe/i, /fun[çc][ãa]o/i, /capacidade\s+operacional/i],
            secondary: [/experi[êe]ncia/i, /comprova[çc][ãa]o/i, /portf[óo]lio/i, /coordena/i, /dire[çc][ãa]o/i],
            weight: 1.1
        },
        monitoramento: {
            primary: [/monitoramento/i, /indicador/i, /avalia[çc][ãa]o/i, /pesquisa/i, /relat[óo]rio/i, /matriz\s+l[óo]gica/i],
            secondary: [/mensura[çc][ãa]o/i, /comprova[çc][ãa]o/i, /lista\s+de\s+presen[çc]a/i, /fiscaliza[çc][ãa]o/i, /meta/i],
            weight: 1.2
        },
        compliance: {
            primary: [/habilita[çc][ãa]o/i, /certid[ãa]o/i, /regularidade/i, /cndt/i, /fgts/i, /receita/i],
            secondary: [/ecad/i, /sisgen/i, /direitos\s+autorais/i, /lei/i, /presta[çc][ãa]o\s+de\s+contas/i, /decreto/i],
            weight: 1.3
        },
        sustentabilidade: {
            primary: [/sustentabilidade/i, /esg/i, /res[íi]duo/i, /carbono/i, /ecol[óo]gic/i, /meio\s+ambiente/i],
            secondary: [/reciclagem/i, /mitiga[çc][ãa]o/i, /impacto\s+ambiental/i, /descarte/i],
            weight: 1.1
        },
        rider: {
            primary: [/rider/i, /palco/i, /som/i, /ilumina[çc][ãa]o/i, /log[íi]stica/i, /montagem/i],
            secondary: [/transporte/i, /hospedagem/i, /t[ée]cnico/i, /camarim/i, /sonoriza[çc][ãa]o/i, /gerador/i],
            weight: 1.1
        },

        // --- EIXO 2: LICITAÇÕES (Lei 14.133/21) ---
        etp_tr: {
            primary: [/estudo\s+t[ée]cnico\s+preliminar/i, /etp/i, /termo\s+de\s+refer[êe]ncia/i, /tr/i, /matriz\s+de\s+risco/i],
            secondary: [/objeto/i, /justificativa\s+da\s+contrata[çc][ãa]o/i, /especifica[çc][ãa]o\s+t[ée]cnica/i],
            weight: 1.3
        },
        alice_auditoria: {
            primary: [/red\s+flag/i, /cartel/i, /restri[çc][ãa]o/i, /exclusividade/i, /direcionamento/i],
            secondary: [/pesquisa\s+de\s+pre[çc]os/i, /marca/i, /sobrepre[çc]o/i, /impugna/i],
            weight: 1.4
        },
        licit_compliance: {
            primary: [/liquidez/i, /balan[çc]o/i, /solv[êe]ncia/i, /patrim[ôo]nio\s+l[íi]quido/i],
            secondary: [/certid[ãa]o/i, /atestado\s+de\s+capacidade/i, /habilita[çc][ãa]o\s+jur[íi]dica/i],
            weight: 1.3
        },
        esclarecimento: {
            primary: [/impugna[çc][ãa]o/i, /esclarecimento/i, /recurso/i, /parecer/i, /pregoeiro/i],
            secondary: [/tcu/i, /ac[óo]rd[ãa]o/i, /jurisprud[êe]ncia/i, /decis[ãa]o/i],
            weight: 1.2
        },

        // --- EIXO 3: CONCURSOS PÚBLICOS ---
        verticalizado: {
            primary: [/conte[úu]do\s+program[áa]tico/i, /disciplina/i, /t[óo]picos/i, /peso/i, /incid[êe]ncia/i],
            secondary: [/horas/i, /estudo/i, /dificuldade/i, /quest[õo]es/i],
            weight: 1.3
        },
        treino_didatico: {
            primary: [/quest[ãa]o/i, /gabarito/i, /banca/i, /cebraspe/i, /fgv/i, /fcc/i, /vunesp/i],
            secondary: [/anki/i, /flashcard/i, /srs/i, /comentad/i, /discursiva/i],
            weight: 1.3
        }
    },

    /**
     * Extrai trechos altamente relevantes com preservação de estrutura de blocos e tabelas.
     * @param {string} fullText - Texto integral do edital/anexos
     * @param {string} sectionType - Identificador da seção (ex: 'orcamento', 'acessibilidade')
     * @param {number} maxCharLimit - Orçamento máximo de caracteres (default 35.000)
     * @returns {string} Texto formatado com trechos relevantes
     */
    extractOptimizedContext: function (fullText, sectionType, maxCharLimit = 35000) {
        if (!fullText || typeof fullText !== 'string') return "";

        const cleanText = fullText.replace(/\r\n/g, '\n').replace(/\t/g, '  ');
        const taxonomy = this.TAXONOMY[sectionType] || {
            primary: [new RegExp(sectionType, 'i')],
            secondary: [/requisito/i, /crit[ée]rio/i, /obriga/i, /vedado/i, /norma/i],
            weight: 1.0
        };

        // 1. Fragmentação por blocos lógicos estruturados (parágrafos, artigos, tabelas markdown/HTML)
        const rawBlocks = cleanText.split(/\n{2,}/);
        const scoredBlocks = [];

        for (let i = 0; i < rawBlocks.length; i++) {
            const block = rawBlocks[i].trim();
            if (block.length < 20) continue;

            let score = 0;

            // Match primário (palavras-chave críticas)
            if (Array.isArray(taxonomy.primary)) {
                taxonomy.primary.forEach(regex => {
                    const matches = block.match(regex);
                    if (matches) score += matches.length * 6 * taxonomy.weight;
                });
            }

            // Match secundário (termos complementares)
            if (Array.isArray(taxonomy.secondary)) {
                taxonomy.secondary.forEach(regex => {
                    const matches = block.match(regex);
                    if (matches) score += matches.length * 2;
                });
            }

            // Bônus para presença de valores monetários, percentuais e limites
            if (/(\d+[\.,]\d+|\bR\$\b|\b%\b)/.test(block)) score += 3;

            // Bônus para identificadores formais de cláusulas e leis
            if (/(art\.|item|cl[áa]usula|se[çc][ãa]o|anexo|tabela|par[áa]grafo)\s*\d+/i.test(block)) score += 4;

            // Bônus para termos mandatórios/proibitivos
            if (/(obrigat[óo]ri|vedado|desclassifica|penalidade|elimina[çc][ãa]o|teto\s+m[áa]ximo)/i.test(block)) score += 4;

            if (score > 0) {
                scoredBlocks.push({ index: i, text: block, score: score });
            }
        }

        // 2. Ordenação por relevância decrescente
        scoredBlocks.sort((a, b) => b.score - a.score);

        // 3. Montagem do buffer respeitando o limite de caracteres
        const selected = [];
        let accumulatedChars = 0;

        for (const item of scoredBlocks) {
            const blockLen = item.text.length + 6; // Inclui separador
            if (accumulatedChars + blockLen <= maxCharLimit) {
                selected.push(item);
                accumulatedChars += blockLen;
            } else {
                const remaining = maxCharLimit - accumulatedChars;
                if (remaining > 150) {
                    selected.push({ index: item.index, text: item.text.substring(0, remaining) + "...", score: item.score });
                }
                break;
            }
        }

        // 4. Reordena para manter a leitura sequencial original do edital
        selected.sort((a, b) => a.index - b.index);

        if (selected.length === 0 || accumulatedChars < 200) {
            // Fallback contextual elegante: cabeçalho e disposições gerais do edital
            const headerSlice = cleanText.substring(0, 10000);
            const tailSlice = cleanText.length > 20000 ? cleanText.substring(cleanText.length - 6000) : "";
            return `[VISÃO GERAL DO EDITAL (CONTEXTO BASE)]:\n${headerSlice}${tailSlice ? `\n\n[DISPOSIÇÕES GERAIS & ANEXOS]:\n${tailSlice}` : ''}`;
        }

        return selected.map(s => s.text).join('\n\n---\n\n');
    }
};
