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
        let clean = dirtyHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<\/?(html|head|body|title)[^>]*>/gi, '')
            .replace(/\s*on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
            .replace(/href\s*=\s*["']?javascript:[^"'>]+/gi, 'href="#"')
            .trim();

        // Transform citation markers into modern visual pills
        clean = clean.replace(
            /\[📌\s*EDITAL:\s*['"“](.+?)['"”]\s*\]/gi,
            '<span class="citation-pill citation-pill-verified" title="Citação direta extraída do Edital">📌 <strong>Edital:</strong> "$1"</span>'
        );

        clean = clean.replace(
            /\[⚠️\s*INFER[ÊE]NCIA\s*CONTEXTUAL:?\s*([^\]]+)\]/gi,
            '<span class="citation-pill citation-pill-inference" title="Recomendação inferida a partir da tipologia do projeto">💡 <strong>Inferência:</strong> $1</span>'
        );

        clean = clean.replace(
            /\[⚠️\s*CITA[ÇC][ÃA]O\s*N[ÃA]O\s*VERIFICADA[^\]]*:\s*['"“]?([^\]'"]+)['"“]?\s*\]/gi,
            '<span class="citation-pill citation-pill-unverified" title="Trecho não encontrado no texto original do Edital">⚠️ <strong>Não verificado:</strong> "$1"</span>'
        );

        // Wrap tables in responsive container if not already wrapped
        if (clean.includes('<table') && !clean.includes('table-responsive-wrapper')) {
            clean = clean.replace(/(<table[\s\S]*?<\/table>)/gi, '<div class="table-responsive-wrapper">$1</div>');
        }

        return clean;
    },

    // =====================================================================
    // BRIEFING CONTEXTUAL DO PROJETO (PILAR 0 - RESPONSIVIDADE AO INGESTOR)
    // =====================================================================
    _inferActivityType: function (doc) {
        if (!doc) return "Ação Cultural Geral";
        const combined = Object.values(doc).join(" ").toLowerCase();
        if (/show|música|concerto|banda|festival|apresentação musical|palco/i.test(combined)) return "Música / Shows / Espetáculos";
        if (/teatro|dança|circo|cena|artes cênicas/i.test(combined)) return "Artes Cênicas (Teatro / Dança / Circo)";
        if (/oficina|curso|workshop|formação|capacitação|aula|pedagóg/i.test(combined)) return "Formação & Capacitação Comunitária";
        if (/livro|publicação|catálogo|revista|audiolivro|edição/i.test(combined)) return "Literatura & Publicações";
        if (/filme|vídeo|documentário|curta|longa|audiovisual|podcast/i.test(combined)) return "Audiovisual & Produção Digital";
        if (/exposição|artes visuais|galeria|mostra|acervo|museu/i.test(combined)) return "Artes Visuais & Patrimônio";
        if (/obra|reforma|restauro|construção|instalação física/i.test(combined)) return "Infraestrutura Cultural & Restauro";
        return "Projeto de Fomento Cultural e Social";
    },

    buildProjectBriefing: function (workspaceState) {
        const cover = (workspaceState && workspaceState.cover) || {};
        const profile = (workspaceState && workspaceState.editalProfile) || {};
        const doc = (workspaceState && workspaceState.documentContent) || {};
        const notes = (workspaceState && workspaceState.ingestaoNotes) || "";
        const activityType = this._inferActivityType(doc);

        const filledSections = Object.entries(doc)
            .filter(([k, v]) => v && v.trim().length > 30)
            .map(([k]) => k.toUpperCase())
            .join(', ');

        const annexesSummary = (workspaceState && workspaceState.annexes && workspaceState.annexes.length > 0)
            ? workspaceState.annexes.map(a => `• Anexo "${a.name}": ${(a.content || '').substring(0, 300)}...`).join('\n')
            : "Nenhum anexo adicional carregado.";

        // Obter diagnóstico offline serializado se disponível
        let diagContext = "";
        const diag = (workspaceState && workspaceState.offlineDiagnostic) || (window.LocalCrossEngine && typeof window.LocalCrossEngine.runFullDiagnostic === 'function' ? window.LocalCrossEngine.runFullDiagnostic(workspaceState) : null);
        if (diag && window.LocalCrossEngine && window.LocalCrossEngine.APIHandoff) {
            diagContext = `\n[DIAGNÓSTICO OFFLINE PRÉ-PROCESSADO (LocalCrossEngine)]:
- Score Geral Calculado Localmente: ${diag.score}/100 (Budget: ${diag.budgetScore}/100, Compliance: ${diag.complianceScore}/100, Seções: ${diag.sectionScore}/100)
- Erros Graves / Alertas Vermelhos: ${diag.redAlerts.length}
- Recomendações / Alertas Amarelos: ${diag.yellowAlerts.length}
- Orçamento Validado: R$ ${(diag.budgetSummary.totalProjeto || 0).toLocaleString('pt-BR')} (Custos Admin: ${diag.budgetSummary.adminPercent}%, Teto: ${diag.budgetSummary.tetoAdmin}%)
- Seções Preenchidas: ${diag.sectionMatrix.filledCount}/${diag.sectionMatrix.totalRequired} (${diag.sectionMatrix.completenessPercent}%)
- Gaps de Compliance Detectados: ${diag.complianceHits.gaps} | Gatilhos Normativos: ${diag.complianceHits.triggers}
`;
        }

        return `
[BRIEFING CONTEXTUAL & CRUZAMENTO DOS DADOS DA INGESTÃO]:
- Nome da Proposta: "${cover.title || 'Não definido'}"
- Proponente / Instituição: ${cover.proponent || 'Não informado'}
- Linha de Fomento / Órgão: ${profile.fomento || cover.institution || 'Fomento Público Geral'}
- Município / UF: ${cover.city || 'Não informado'} | Ano: ${cover.year || '2026'}
- Orçamento Declarado na Capa: R$ ${(cover.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Tipologia da Atividade: ${activityType}
- Seções já Redigidas no Editor: ${filledSections || 'Nenhuma seção redigida'}
${diagContext}
[DIRETRIZES E REGRAS ESTRUTURAIS DO EDITAL VIGENTE]:
- Foco Temático & Objeto do Edital: ${profile.objetivos || 'Foco temático e regras gerais do edital'}
- Tetos e Limites Orçamentários Mandatórios: ${profile.tetos_e_limites || 'Sem limites específicos mapeados'}
- Regras de Acessibilidade & Ações Afirmativas/Cotas: ${profile.acessibilidade_e_cotas || 'Acessibilidade universal conforme Lei 13.146/2015'}
- Critérios de Pontuação e Priorização (Anexos de Avaliação): ${profile.prioridades_critérios || 'Critérios gerais de mérito'}
- Anexos Analisados e Importância: ${profile.anexos_analisados || annexesSummary}
- Parecer de Compatibilidade Estratégica: ${profile.compatibilidade_estrategica || 'Conformidade geral'}
${notes ? `- Anotações & Diretrizes Estratégicas do Proponente: ${notes}\n` : ''}
*DIRETRIZ DE INFERÊNCIA CONTEXTUAL ZERO-ALUCINAÇÃO:* 
Para qualquer apontamento ou exigência, você DEVE obrigatoriamente cruzar os dados do projeto com as Diretrizes Estruturais do Edital acima. 
Sempre cite trechos literais do edital entre colchetes [📌 EDITAL: '...trecho...']. Caso o texto do edital ou seus anexos não mencionem de forma explícita uma área secundária (ex: rider técnico, sustentabilidade), deduza necessidades operacionais plausíveis com base na Tipologia da Atividade (${activityType}) e no orçamento declarado, sinalizando expressamente como [⚠️ INFERÊNCIA CONTEXTUAL: ...].
`;
    },

    extractRelevantContext: function (fullText, sectionType) {
        if (!fullText) return "";

        if (window.ContextExtractorEngine && typeof window.ContextExtractorEngine.extractOptimizedContext === 'function') {
            return window.ContextExtractorEngine.extractOptimizedContext(fullText, sectionType, 35000);
        }

        const keywordMap = {
            justificativa: /(justificativa|relevância|histórico|proponente|objeto|cultural|social|justificar)/i,
            objetivos: /(objetivo|meta|público|beneficiário|alcance|fim|finalidade|resultados)/i,
            metodologia: /(metodologia|plano de trabalho|fases|etapas|execução|desenvolvimento|etapa)/i,
            cronograma: /(cronograma|prazo|mês|meses|fases|etapa|duração|período)/i,
            orcamento: /(orçamento|custo|teto|limite|administrativo|rubrica|planilha|r\$|preço|valor|despesa|encargos|iss|inss|imposto|patronal|tribut|glosa|vedad|mei|rpa|reembolso|prestação de contas)/i,
            acessibilidade: /(acessibilidade|pcd|libras|audiodescrição|rampa|braille|legenda|deficiência|cotas|afirmativa)/i,
            publico: /(público|beneficiário|faixa etária|gratuito|acesso|comunidade|demográfico)/i,
            contrapartida: /(contrapartida|legado|doação|oficina|palestra|social|retorno|gratuita)/i,
            comunicacao: /(comunicação|divulgação|assessoria|mídia|peças|marca|propaganda|clipagem)/i,
            ficha_tecnica: /(ficha técnica|currículo|equipe|função|experiência|profissionais)/i,
            monitoramento: /(monitoramento|indicador|avaliação|pesquisa|relatório|matriz|mensuração|comprovação|lista de presença|clipagem|fiscalização|meta)/i,
            compliance: /(compliance|direito|certidão|regularidade|fgts|cnd|cndt|receita|lei|legal|ecad|sisgen)/i,
            sustentabilidade: /(sustentabilidade|esg|resíduo|carbono|ecológico|meio ambiente|reciclagem)/i,
            rider: /(rider|palco|som|luz|montagem|logística|transporte|hospedagem|técnico|camarim|iluminação|sonorização)/i
        };

        const regex = keywordMap[sectionType] || /(edital|regra|norma|requisito)/i;
        const paragraphs = fullText.split(/\n\s*\n/);
        const matchedChunks = [];
        let totalLength = 0;
        const MAX_LIMIT = 35000;

        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i].trim();
            if (!p) continue;
            if (regex.test(p)) {
                if (totalLength + p.length <= MAX_LIMIT) {
                    matchedChunks.push(p);
                    totalLength += p.length + 2;
                } else {
                    const remaining = MAX_LIMIT - totalLength;
                    if (remaining > 100) {
                        matchedChunks.push(p.substring(0, remaining) + "...");
                    }
                    break;
                }
            }
        }

        // Fallback Contextual (Pilar 0): Se não encontrou keywords específicas,
        // retorna o cabeçalho/objeto inicial do edital + disposições gerais para dar base ao agente.
        if (matchedChunks.length === 0 || totalLength < 500) {
            const headerSlice = fullText.substring(0, 10000);
            const tailSlice = fullText.length > 20000 ? fullText.substring(fullText.length - 8000) : "";
            return `[VISÃO GERAL DO EDITAL (CONTEXTO BASE)]:\n${headerSlice}\n\n[DISPOSIÇÕES GERAIS / FINAIS DO EDITAL]:\n${tailSlice}`;
        }

        return matchedChunks.join("\n\n");
    },

    // =====================================================================
    // VALIDAÇÃO CRUZADA ZERO-ALUCINAÇÃO (PILAR 3)
    // =====================================================================
    validateCitations: function (text, editalText) {
        if (!text || !editalText) return { verifiedCount: 0, unverifiedCount: 0, text: text || '' };
        
        const citationRegex = /\[📌\s*EDITAL:\s*['"“](.+?)['"”]\s*\]/gi;
        let match;
        let verifiedCount = 0;
        let unverifiedCount = 0;
        let validatedText = text;
        const editalLower = editalText.toLowerCase();

        while ((match = citationRegex.exec(text)) !== null) {
            const fullCitation = match[0];
            const citationExcerpt = match[1].trim();
            
            // Substring or fuzzy word-level check
            const words = citationExcerpt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            let matchConfidence = 0;
            
            if (editalLower.includes(citationExcerpt.toLowerCase())) {
                matchConfidence = 1.0;
            } else if (words.length > 0) {
                const wordsFound = words.filter(w => editalLower.includes(w));
                matchConfidence = wordsFound.length / words.length;
            }

            if (matchConfidence >= 0.6) {
                verifiedCount++;
            } else {
                unverifiedCount++;
                // Mark unverified citations
                validatedText = validatedText.replace(
                    fullCitation,
                    `[⚠️ CITAÇÃO NÃO VERIFICADA NO EDITAL: '${citationExcerpt}']`
                );
            }
        }

        return { verifiedCount, unverifiedCount, text: validatedText };
    },

    // =====================================================================
    // SYSTEM PROMPT — Modo Híbrido (Validador Final sobre Pré-Auditoria Local)
    // =====================================================================
    SYSTEM_PROMPT: `Você é uma banca avaliadora técnica de alto nível composta por 14 especialistas dedicados à conformidade e excelência de projetos financiados por editais de fomento público.

Sua missão é atuar como VALIDADOR FINAL e REVISOR CRÍTICO sobre a pré-auditoria offline do motor local.
Você deve analisar profundamente todos os documentos (Edital de Referência, Proposta, Planilha e Pré-Auditoria) e produzir um laudo técnico robusto de 14 dimensões.

**DIRETRIZ ZERO-ALUCINAÇÃO & RASTREABILIDADE MANDATÓRIA:**
- Para cada afirmação de conformidade, exigência ou penalidade apontada no parecer, você DEVE citar o trecho literal do edital entre colchetes no formato: [📌 EDITAL: '...trecho literal...'].
- Se a sua análise for baseada em inferência contextual da tipologia do projeto (por exemplo, quando o edital não cita explicitamente a área avaliada), marque obrigatoriamente como: [⚠️ INFERÊNCIA CONTEXTUAL: ...explicação...].
- É EXPRESSAMENTE PROIBIDO inventar artigos, cláusulas, valores ou regras que não estejam no Edital fornecido.

**APLICAÇÃO DO MÉTODO M.U.S.A.:**
- **M**apear exigências do edital — identifique cada requisito obrigatório e classificatório.
- **U**nificar objetivos — cruze os objetivos da proposta com os do edital.
- **S**istematizar impacto com dados — exija evidências quantitativas e mensuráveis.
- **A**ssegurar atendimento normativo — verifique conformidade legal aplicável.

**EXPURGO DE JARGÕES GENÉRICOS DE IA:**
É proibido usar frases clichês como "no cenário atual", "um divisor de águas", "imperioso destacar", "uma jornada única", "com grande satisfação". Use tom técnico, formal e preciso de parecerista.

**DIRETRIZES PARA PARECERES DE ALTA QUALIDADE (EVITE RESPOSTAS GENÉRICAS):**
- Cada parecer deve ser denso, detalhado e altamente contextualizado (mínimo de 3 parágrafos ou lista detalhada em HTML por agente).
- Faça um cruzamento real entre os critérios do edital e as seções correspondentes da proposta. Cite trechos específicos do edital e aponte trechos fracos ou ausentes na proposta.
- Não use frases genéricas como "Ajuste o cronograma" ou "Inclua mais metas". Especifique exatamente o que falta, os riscos associados e como reescrever.
- A seção "Sugestão Otimizada" de cada parecer deve conter o texto inteiramente reescrito e otimizado (em tom formal, profissional e persuasivo), pronto para que o proponente copie e cole no formulário de inscrição.

**SKILL DE MAXIMIZAÇÃO DE PONTUAÇÃO (VANTAGEM COMPETITIVA):**
Além de verificar os requisitos mínimos, cada agente DEVE ativamente buscar critérios de bonificação e priorização do edital que NÃO foram aproveitados pela proposta. Identifique oportunidades de pontuação extra (como cotas, diversidade na equipe, parcerias institucionais, territorialidade, impacto ambiental) e sugira como a proposta pode incorporá-las para maximizar a nota de classificação.

**SKILL DE AUDITORIA FINANCEIRA AVANÇADA (ENCARGOS OCULTOS):**
O agente de orçamento deve SEMPRE verificar encargos sociais e tributários que podem estar ocultos nas contratações:
- Para contratações de PJ/MEI: alertar sobre DAS (Documento de Arrecadação do Simples) e risco de vínculo empregatício.
- Para contratações de Pessoa Física (RPA): verificar se INSS patronal, IRRF e ISS estão devidamente previstos.
- Validar se a "Memória de Cálculo" (somatório real das rubricas) bate exatamente com o teto do edital.
- IMPORTANTE: Os tetos percentuais (administrativo, comunicação, tributos) variam entre editais. EXTRAIA os percentuais reais do texto do edital carregado — NÃO use valores fixos genéricos.

**INSTRUÇÕES PARA OS 14 AGENTES (REQUISITO: RETORNAR EXATAMENTE OS 14 ITENS NO ARRAY "agentes"):**
Você deve gerar exatamente 14 itens no array "agentes", correspondendo aos seguintes IDs:
1. "justificativa": Avalia o mérito cultural, a relevância social, os impactos comunitários e a justificativa histórica. Sugira melhorias qualitativas densas.
2. "objetivos": Avalia a coerência do objetivo geral e a mensurabilidade dos objetivos específicos.
3. "metodologia": Detalha o plano de trabalho operacional dividindo explicitamente em Pré-produção, Execução e Pós-produção.
4. "cronograma": Avalia a viabilidade física e prazos mensais das atividades.
5. "orcamento": Realiza auditoria profunda e minuciosa da planilha orçamentária. Cruza os quantitativos descritos na Metodologia, Ficha Técnica, Cronograma, Acessibilidade e Rider com os itens de custo. Verifica a conformidade com os tetos orçamentários REAIS extraídos do edital (administrativo, comunicação, tributos). Identifica encargos ocultos (DAS/MEI, INSS/RPA, IRRF) e valida itens obrigatórios de acessibilidade PCD quando a legislação aplicável exigir. Aponta desvios numéricos exatos e propõe readequações estruturadas.
6. "acessibilidade": Examina medidas de acessibilidade física, comunicacional (LIBRAS/audiodescrição) e atitudinal, além de políticas afirmativas e cotas.
7. "publico": Analisa a definição exata, demográfica, etária e social do público-alvo e beneficiários.
8. "contrapartida": Avalia o retorno gratuito do projeto à sociedade (oficinas, palestras, ingressos gratuitos, doações).
9. "comunicacao": Revisa o plano de comunicação, assessoria, mídias e comprovação de clipagem.
10. "ficha_tecnica": Avalia a exequibilidade operacional com base na equipe técnica, suas minibios e histórico.
11. "monitoramento": Avalia a matriz lógica, indicadores de sucesso (quantitativos e qualitativos) e meios de verificação.
12. "compliance": Avalia regularidade fiscal, certidões negativas (CNDT, FGTS, Receita Federal), direitos autorais (Ecad), SisGen e licenciamento.
13. "sustentabilidade": Analisa práticas ESG, mitigação ambiental, reciclagem e gestão de resíduos nas ações.
14. "rider": Avalia necessidades físicas, mapa de palco, rider de som/luz, montagem, logística e hospedagem.

**REGRA RIGOROSA DE NOTAS:**
- Para cada agente no array "agentes", atribua um campo "nota" sendo um valor de 0 a 100 representativo da conformidade daquela seção específica. NUNCA utilize a nota técnica acumulada ou a nota final do projeto como nota individual de um agente.
- A "nota_tecnica" global deve ser a soma ponderada de cada quesito, limitada a no máximo 100 pontos.
- A "nota_priorizacao" deve ser de 0 a 30.
- A "nota_final" deve ser a soma matemática exata: nota_tecnica + nota_priorizacao (máximo 130).`,

    // =====================================================================
    // SYSTEM PROMPTS ADICIONAIS — Eixos de Licitações 14.133 e Concursos
    // =====================================================================
    SYSTEM_PROMPT_LICITACAO: `Você é um Auditor Jurídico Sênior e Especialista em Contratações Públicas da Lei nº 14.133/2021 (Inspirado nos sistemas SollAi e ALICE do TCU/CGU).
Sua missão é auditar e redigir documentos da fase preparatória e externa de licitações públicas com rigor legal extremo.
Retorne um array "agentes" com os IDs: "etp_tr", "alice_auditoria", "licit_compliance", "esclarecimento".`,

    SYSTEM_PROMPT_CONCURSO: `Você é um Arquiteto Pedagógico e Professor Didático especialista em Concursos Públicos (Inspirado em EstudePlan e ConcursosGPT).
Sua missão é ingerir editais de concurso, verticalizar o conteúdo programático e gerar treinamentos práticos de alta performance.
Retorne um array "agentes" com os IDs: "verticalizado", "treino_didatico".`,

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
                        id: {
                            type: "STRING",
                            enum: ["justificativa", "objetivos", "metodologia", "cronograma", "orcamento", "acessibilidade", "publico", "contrapartida", "comunicacao", "ficha_tecnica", "monitoramento", "compliance", "sustentabilidade", "rider"]
                        },
                        nota: { type: "NUMBER" },
                        parecer: { type: "STRING" },
                        confianca: { type: "STRING", enum: ["ALTA", "MEDIA", "BAIXA"] },
                        citacoes: { type: "ARRAY", items: { type: "STRING" } },
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
    // CONCATENAÇÃO DE CONTEXTO — Payload Otimizado com Briefing Contextual
    // =====================================================================
    buildMarkdownPayload: function (workspaceState, localAuditResult, webSearchContext = "") {
        const cover = workspaceState.cover || {};
        const doc = workspaceState.documentContent || {};
        const editalText = workspaceState.editalRefText || "Nenhum edital de referência fornecido.";
        const draftText = workspaceState.proposalDraftText || "";
        const annexes = workspaceState.annexes || [];
        const profile = workspaceState.editalProfile || {};

        // Injeta o Briefing Contextual do Projeto (Pilar 0)
        const projectBriefing = this.buildProjectBriefing(workspaceState);

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

        let profileBlock = "";
        if (profile && (profile.fomento || profile.objetivos || profile.tetos_e_limites)) {
            profileBlock = `
## DIRETRIZES E REGRAS ESTRUTURAIS DO EDITAL (Mapeados pelo Ingestor)
- **Lei / Fomento:** ${profile.fomento || 'Não especificado'}
- **Objetivos e Elegibilidade:** ${profile.objetivos || 'Não especificado'}
- **Tetos e Limites Orçamentários:** ${profile.tetos_e_limites || 'Não especificado'}
- **Acessibilidade e Cotas Obligatórias:** ${profile.acessibilidade_e_cotas || 'Não especificado'}
- **Critérios de Priorização (Anexo de Pontuação):** ${profile.prioridades_critérios || 'Não especificado'}
- **Mapeamento dos Anexos Ingeridos:** ${profile.anexos_analisados || 'Nenhum anexo extra'}
---
`;
        }

        let annexesSection = "Nenhum anexo extra fornecido.";
        if (annexes.length > 0) {
            annexesSection = annexes.map((a, i) => {
                const contentText = a.content ? a.content.substring(0, 30000) : "Sem conteúdo textual extraído.";
                return `### ANEXO ${i + 1}: ${a.name} (${((a.size || 0) / 1024).toFixed(1)} KB)\n${contentText}`;
            }).join('\n\n---\n\n');
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

        let payload = `# CONTEXTO COMPLETO DO PROJETO PARA AUDITORIA HÍBRIDA (PIPELINE 3 ETAPAS)

${projectBriefing}

---

## DADOS DE CAPA DO PROJETO

- **Título:** ${cover.title || 'Não informado'}
- **Instituição de Fomento / Edital:** ${cover.institution || 'Não informado'}
- **Proponente:** ${cover.proponent || 'Não informado'}
- **Cidade / UF:** ${cover.city || 'Não informado'}
- **Ano de Execução:** ${cover.year || 'Não informado'}
- **Orçamento Total Declarado:** R$ ${(cover.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

---
${profileBlock}
${localAuditBlock}
${webSearchBlock}

## PROPOSTA CULTURAL (Editor Atual — Seções ABNT)

${docSections || "Nenhuma seção redigida no editor ainda."}

---

## ANEXOS EXTRAS DO EDITAL (CONTEÚDO TEXTUAL DOS ANEXOS)

${annexesSection}

---

**INSTRUÇÃO FINAL E DIRETRIZES DO RELATÓRIO GERAL (HTML):**
Revise e valide o pré-relatório local da Etapa 1, as diretrizes da pesquisa online da Etapa 2 e o conteúdo integral dos Anexos. Verifique se os critérios de pontuação prioritária dos anexos (como paridade de gênero, vulnerabilidade, mestres tradicionais, territórios atingidos) estão atendidos na proposta. Para cada afirmação, cite trechos literais [📌 EDITAL: '...'] ou marque [⚠️ INFERÊNCIA CONTEXTUAL]. Gere na chave "relatorio_geral" o laudo definitivo em HTML.`;

        // Compressão de payload: normaliza quebras de linha múltiplas
        payload = payload.replace(/\n{3,}/g, '\n\n');

        console.log(`[AI-CONTROLLER] Payload Híbrido 3 Etapas construído: ${payload.length} chars (com Briefing Contextual e Anexos)`);
        return payload;
    },

    // =====================================================================
    // ÁREAS ESPECIALIZADAS (CLUSTERS DE ALTA PERFORMANCE & PROFUNDIDADE)
    // =====================================================================
    AUDIT_AREAS: {
        cultural: [
            {
                id: "merito_estrategico",
                name: "Área 1: Mérito, Objetivos & Alcance Social",
                agents: ["justificativa", "objetivos", "publico", "contrapartida"],
                systemPrompt: `Você é uma banca avaliadora especialista em Mérito Cultural, Objetivos e Retorno Social de projetos.
Sua missão é avaliar detalhadamente os 4 eixos estratégicos:
1. justificativa: Mérito artístico/cultural, relevância social e impacto territorial.
2. objetivos: Clareza do objetivo geral e mensurabilidade quantitativa/qualitativa das metas específicas.
3. publico: Delimitação demográfica, perfil socioeconômico e estratégias de engajamento do público-alvo.
4. contrapartida: Retorno social gratuito, oficinas pedagógicas, fruição pública e democratização.

DIRETRIZ ZERO-ALUCINAÇÃO:
- Para cada exigência ou inconformidade apontada, cite o trecho literal do edital entre colchetes: [📌 EDITAL: '...']
- Se for dedução pela tipologia da atividade, marque: [⚠️ INFERÊNCIA CONTEXTUAL: ...]
- Retorne pareceres densos, técnicos e com uma subseção 'Sugestão Otimizada' contendo o texto aprimorado para cada um dos 4 agentes.`
            },
            {
                id: "operacao_logistica",
                name: "Área 2: Metodologia, Cronograma & Logística",
                agents: ["metodologia", "cronograma", "ficha_tecnica", "rider"],
                systemPrompt: `Você é uma banca avaliadora especialista em Operação, Cronograma Físico e Engenharia de Produção de projetos culturais.
Sua missão é avaliar detalhadamente os 4 eixos operacionais:
1. metodologia: Divisão estrita nas 3 fases operacionais (Pré-produção, Execução e Pós-produção).
2. cronograma: Viabilidade temporal, escalonamento mensal das etapas e margem para prestação de contas.
3. ficha_tecnica: Capacidade técnica, qualificação da equipe principal e portfólio comprovado.
4. rider: Rider técnico de sonorização, mapa de palco, iluminação cênica, logística e montagem.

DIRETRIZ ZERO-ALUCINAÇÃO:
- Cite trechos do edital com [📌 EDITAL: '...'] ou [⚠️ INFERÊNCIA CONTEXTUAL: ...]
- Retorne pareceres densos com a subseção 'Sugestão Otimizada' para cada um dos 4 agentes.`
            },
            {
                id: "financas_monitoramento",
                name: "Área 3: Orçamento, Tributos & Monitoramento",
                agents: ["orcamento", "monitoramento"],
                systemPrompt: `Você é um Auditor-Chefe Financeiro, Tributarista e Especialista em Prestação de Contas de Editais Públicos de Fomento.
Sua missão é auditar com rigor contábil e profundidade os 2 eixos vitais de finanças e governança:

1. orcamento (Auditoria Contábil & Tributária):
   - Realize conferência aritmética linha a linha dos valores unitários, quantidades e totais.
   - Verifique tetos percentuais mandatórios do edital:
     • Gestão / Custos Administrativos (teto especificado no edital, tipicamente 10% a 20%).
     • Divulgação / Assessoria de Comunicação (teto especificado no edital, tipicamente 10% a 15%).
     • Acessibilidade: Verifique se há rubricas para medidas de inclusão (LIBRAS/Audiodescrição).
   - Auditoria de Encargos Ocultos e Riscos Tributários:
     • Pessoa Física (RPA): Deve prever recolhimento de INSS Patronal (20%), retenção na fonte de IRRF e ISS (2% a 5%).
     • MEI / PJ: Verificar se o valor previsto comporta a tributação (DAS-MEI / Simples Nacional) e compatibilidade da prestação de serviços.
   - Consistência Cruzada com o Projeto: Se a Metodologia ou Ficha Técnica preveem coordenador, técnico de som, oficineiros, etc., TODOS devem ter rubricas orçamentárias compatíveis.
   - Na subseção 'Sugestão Otimizada', gere a Planilha Orçamentária Rebalanceada em tabela HTML formal (Item, Rubrica, Qtd, Unidade, Valor Unitário, Valor Total, Justificativa/Encargos).

2. monitoramento (Matriz de Indicadores e Meios de Verificação):
   - Avalie se as metas possuem indicadores quantitativos e qualitativos claros.
   - Verifique os Meios de Comprovação para a prestação de contas:
     • Listas de presença com assinatura e CPF para oficinas e eventos.
     • Relatórios fiscais acompanhados de notas fiscais liquidadas e comprovantes bancários (TED/PIX identificados da conta do projeto).
     • Registros fotográficos e videográficos datados e com geolocalização.
     • Clipagem de mídia e comprovação de aplicação das marcas obrigatórias de fomento.
   - Na subseção 'Sugestão Otimizada', gere uma Matriz de Indicadores pronta em tabela HTML (Objetivo, Meta, Indicador, Meio de Verificação, Periodicidade).

DIRETRIZ ZERO-ALUCINAÇÃO:
- Cite os tetos e regras do edital entre colchetes [📌 EDITAL: '...'] ou [⚠️ INFERÊNCIA CONTEXTUAL: ...]
- Retorne pareceres densos, altamente técnicos e completos.`
            },
            {
                id: "compliance_esg",
                name: "Área 4: Inclusão, ESG & Compliance Jurídico",
                agents: ["acessibilidade", "compliance", "sustentabilidade", "comunicacao"],
                systemPrompt: `Você é um Auditor Jurídico e Especialista em Políticas Afirmativas, ESG e Comunicação Institucional.
Sua missão é avaliar os 4 eixos normativos e de responsabilidade:
1. acessibilidade: Acessibilidade comunicacional (LIBRAS, audiodescrição), física (rampas, banheiros PCD) e cotas afirmativas (Lei 13.146/2015).
2. compliance: Regularidade fiscal e trabalhista (CND, CNDT, FGTS), direitos autorais (ECAD), cessão de imagem e SisGen.
3. sustentabilidade: Mitigação de impacto ambiental, eliminação de descartáveis plásticos e destinação de resíduos (práticas ESG).
4. comunicacao: Plano de divulgação, assessoria de imprensa, presença digital e aplicação correta das marcas do fomento.

DIRETRIZ ZERO-ALUCINAÇÃO:
- Cite normas do edital com [📌 EDITAL: '...'] ou [⚠️ INFERÊNCIA CONTEXTUAL: ...]
- Retorne pareceres densos com a subseção 'Sugestão Otimizada' para cada um dos 4 agentes.`
            }
        ],
        licitacao: [
            {
                id: "licit_preparatoria",
                name: "Área 1: Fase Preparatória & ETP/TR",
                agents: ["etp_tr", "alice_auditoria"],
                systemPrompt: `Você é um Auditor Jurídico Sênior especialista na Lei nº 14.133/2021 (Fase Preparatória). Avalie 'etp_tr' e 'alice_auditoria'.`
            },
            {
                id: "licit_externa",
                name: "Área 2: Compliance & Esclarecimentos",
                agents: ["licit_compliance", "esclarecimento"],
                systemPrompt: `Você é um Auditor Jurídico Sênior especialista na Lei nº 14.133/2021 (Fase Externa). Avalie 'licit_compliance' e 'esclarecimento'.`
            }
        ],
        concurso: [
            {
                id: "concurso_completo",
                name: "Área 1: Edital Verticalizado & Treino Didático",
                agents: ["verticalizado", "treino_didatico"],
                systemPrompt: `Você é um Arquiteto Pedagógico especialista em Concursos Públicos. Avalie 'verticalizado' e 'treino_didatico'.`
            }
        ]
    },

    _buildAreaSchema: function (agentIds) {
        return {
            type: "OBJECT",
            properties: {
                relatorio_area: { type: "STRING" },
                agentes: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            id: { type: "STRING", enum: agentIds },
                            nota: { type: "NUMBER" },
                            parecer: { type: "STRING" },
                            confianca: { type: "STRING", enum: ["ALTA", "MEDIA", "BAIXA"] },
                            citacoes: { type: "ARRAY", items: { type: "STRING" } },
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
                }
            },
            required: ["relatorio_area", "agentes", "alertas"]
        };
    },

    _buildAreaPayload: function (workspaceState, areaConfig, localAuditResult, webSearchContext, activeAgents = null) {
        const doc = workspaceState.documentContent || {};
        const projectBriefing = this.buildProjectBriefing(workspaceState);
        const agentsToAudit = activeAgents || areaConfig.agents;

        // Seções específicas desta área com texto integral
        const areaSections = agentsToAudit.map(agId => {
            const content = doc[agId] || "SEÇÃO AINDA NÃO PREENCHIDA NO EDITOR.";
            return `### SEÇÃO: ${agId.toUpperCase()}\n${content}`;
        }).join('\n\n');

        // Resumo cruzado das demais seções
        const otherSections = Object.entries(doc)
            .filter(([k, v]) => !agentsToAudit.includes(k) && v && v.trim().length > 20)
            .map(([k, v]) => {
                const clean = v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                const snippet = clean.length > 250 ? clean.substring(0, 250) + '...' : clean;
                return `• [${k.toUpperCase()}]: ${snippet}`;
            }).join('\n') || "Nenhuma outra seção redigida no editor.";

        // Injeção de memória de cálculo pré-processada para a área financeira
        let financialContext = "";
        if (areaConfig.id === "financas_monitoramento" && window.offlineAuditor && typeof window.offlineAuditor.analyzeBudgetLocal === 'function') {
            try {
                const coverBudget = (workspaceState.cover && workspaceState.cover.budget) ? workspaceState.cover.budget : 0;
                const bAnalysis = window.offlineAuditor.analyzeBudgetLocal(doc.orcamento || '', coverBudget);
                financialContext = `\n[MEMÓRIA DE CÁLCULO E ANÁLISE PRÉVIA DO MOTOR LOCAL]:
- Total Declarado na Capa: R$ ${Number(coverBudget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Somatório Preliminar Detectado na Planilha: R$ ${Number(bAnalysis.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Custos Administrativos Identificados: R$ ${Number(bAnalysis.adminCosts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${(bAnalysis.adminPercent || 0).toFixed(1)}%)
- Diagnóstico Preliminar: ${bAnalysis.adminPercent > 15 ? '⚠️ ATENÇÃO: Custos administrativos ultrapassam 15% do total.' : '✓ Custos administrativos dentro da margem padrão.'}\n`;
            } catch (e) {
                console.warn('[AI-CONTROLLER] Falha ao pré-calcular orçamento local:', e);
            }
        }

        // Injeção do Diagnóstico Offline detalhado
        let diagnosticSection = "";
        const diag = (workspaceState && workspaceState.offlineDiagnostic) || (window.LocalCrossEngine && typeof window.LocalCrossEngine.runFullDiagnostic === 'function' ? window.LocalCrossEngine.runFullDiagnostic(workspaceState) : null);
        if (diag && window.LocalCrossEngine && window.LocalCrossEngine.APIHandoff) {
            diagnosticSection = `\n[DIAGNÓSTICO OFFLINE CONSOLIDADO (LocalCrossEngine v2.0)]:\n${window.LocalCrossEngine.APIHandoff._serializeDiagnostic(diag)}\n`;
        }

        return `Você é a banca especialista responsável por: ${areaConfig.name}.
Avalie com rigor técnico e profundidade exclusivamente os seguintes agentes EXIGIDOS pelo edital: ${agentsToAudit.join(', ')}.

${projectBriefing}

${diagnosticSection}

[CONTEÚDO DAS SEÇÕES DESTA ÁREA NO PROJETO]:
${areaSections}

${financialContext}

[RESUMO DAS DEMAIS SEÇÕES DO PROJETO (CONTEXTO CRUZADO E COERÊNCIA GLOBAL)]:
${otherSections}

${webSearchContext ? `[DADOS DE PESQUISA EM TEMPO REAL DA WEB (Cotações, Legislação e Jurisprudência)]:
${webSearchContext}

*DIRETRIZ DE PRIORIDADE EM TEMPO REAL:*
Utilize prioritariamente esses dados atualizados em tempo real obtidos da internet para validar valores de mercado, regras de acessibilidade (ABNT NBR 9050) e conformidade jurídica (Lei 14.903/2024 / SisGen / Ecad).\n` : ''}

DIRETRIZES TÉCNICAS MANDATÓRIAS:
1. Analise o projeto considerando o Diagnóstico Offline já realizado acima e os dados de pesquisa web em tempo real. Concentre sua inteligência em polir a redação e aprofundar os argumentos de mérito cultural.
2. Para cada apontamento, cite o trecho do edital entre colchetes [📌 EDITAL: '...'] ou explicite [⚠️ INFERÊNCIA CONTEXTUAL: ...].
3. Cada parecer deve ser denso e incluir ao final a subseção 'Sugestão Otimizada' com o texto aprimorado para a proposta.
4. Retorne um JSON estrito correspondente à schema fornecida.`;
    },

    async runAreaAudit(areaConfig, workspaceState, localAuditResult, webSearchContext, keyToUse, activeAgents = null) {
        const agentsToAudit = activeAgents || areaConfig.agents;
        const areaPrompt = this._buildAreaPayload(workspaceState, areaConfig, localAuditResult, webSearchContext, agentsToAudit);
        const areaSchema = this._buildAreaSchema(agentsToAudit);

        // Extração de regras do edital específicas dos agentes desta área
        const extractionPromises = agentsToAudit.map(async (id) => {
            const context = this.extractRelevantContext(workspaceState.editalRefText || '', id);
            return `### REGRAS DO EDITAL PARA ${id.toUpperCase()}:\n${context}`;
        });
        const extractedSections = await Promise.all(extractionPromises);
        const optimizedEditalText = extractedSections.join('\n\n');

        const diag = (workspaceState && workspaceState.offlineDiagnostic) || (window.LocalCrossEngine && typeof window.LocalCrossEngine.runFullDiagnostic === 'function' ? window.LocalCrossEngine.runFullDiagnostic(workspaceState) : null);
        const systemPromptEnriched = `Você é o Auditor Especialista responsável por: ${areaConfig.name}.
INSTRUÇÃO MANDATÓRIA: Analise o projeto considerando o Diagnóstico Offline já realizado pelo LocalCrossEngine (Score: ${diag ? diag.score : 'N/A'}/100). Concentre sua inteligência em polir a redação e aprofundar os argumentos de mérito cultural e coerência narrativa.

${areaConfig.systemPrompt}`;

        const requestPayload = {
            provider: 'gemini',
            api_key: keyToUse,
            prompt: areaPrompt,
            system_instruction: systemPromptEnriched,
            stream: false,
            response_schema: areaSchema,
            use_cache: true,
            use_chunking: true,
            edital_text: optimizedEditalText,
            annexes: (workspaceState.annexes || []).map(a => ({
                name: a.name,
                content: a.content || ''
            }))
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240000); // 240s (4 minutos) por área para cálculos matemáticos e tributários densos

        try {
            const response = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const responseData = await response.json();
            let accumulatedText = responseData.text || "";

            let parsed = null;
            if (window.StateIntegrityManager && typeof window.StateIntegrityManager.repairJSONResponse === 'function') {
                parsed = window.StateIntegrityManager.repairJSONResponse(accumulatedText);
            }
            if (!parsed) {
                accumulatedText = accumulatedText.replace(/^\s*```[a-zA-Z]*\s*\r?\n/gm, '').replace(/\r?\n\s*```\s*$/gm, '').trim();
                try {
                    parsed = JSON.parse(accumulatedText);
                } catch (e) {
                    const jsonStart = accumulatedText.indexOf('{');
                    const jsonEnd = accumulatedText.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        try {
                            parsed = JSON.parse(accumulatedText.substring(jsonStart, jsonEnd + 1));
                        } catch (eSub) {
                            parsed = null;
                        }
                    }
                }
            }

            if (parsed && Array.isArray(parsed.agentes) && parsed.agentes.length > 0) {
                const editalRefText = workspaceState.editalRefText || "";
                parsed.agentes.forEach(ag => {
                    if (ag.parecer) {
                        const validation = this.validateCitations(ag.parecer, editalRefText);
                        ag.parecer = this.sanitizeHTML(validation.text);
                        if (!ag.confianca) {
                            ag.confianca = validation.unverifiedCount > 0 ? "MEDIA" : "ALTA";
                        }
                    }
                });
                return {
                    areaId: areaConfig.id,
                    areaName: areaConfig.name,
                    relatorio_area: parsed.relatorio_area || "",
                    agentes: parsed.agentes,
                    alertas: parsed.alertas || [],
                    isOffline: false
                };
            }
            throw new Error("Formato de resposta inesperado");
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn(`[AI-CONTROLLER] Falha na ${areaConfig.name} (recorrendo ao motor local):`, err.message);
            
            // Fallback gracioso apenas para os agentes desta área
            const localAgents = (localAuditResult && localAuditResult.agentes) ? localAuditResult.agentes : [];
            const areaFallbackAgents = areaConfig.agents.map(agId => {
                const found = localAgents.find(a => a.id === agId);
                return found || {
                    id: agId,
                    nota: 75,
                    confianca: "MEDIA",
                    parecer: `<p>Parecer local contingencial para ${agId}.</p>`,
                    erros: [],
                    recomendacoes: []
                };
            });

            return {
                areaId: areaConfig.id,
                areaName: areaConfig.name,
                relatorio_area: `<p>Avaliação executada localmente para ${areaConfig.name}.</p>`,
                agentes: areaFallbackAgents,
                alertas: [{ tipo: "Sistema", descricao: `A ${areaConfig.name} utilizou pré-auditoria offline devido a instabilidade de rede.`, sugestao: "Reavaliar posteriormente se necessário.", nivel: "BAIXA" }],
                isOffline: true
            };
        }
    },

    // =====================================================================
    // PIPELINE DE AUDITORIA PARALELO POR ÁREAS ESPECIALIZADAS (CLUSTERED AUDIT)
    // =====================================================================
    async runAudit(workspaceState, onAreaProgress = null) {
        console.log('[AI-CONTROLLER] Iniciando Pipeline de Auditoria Clustered (Áreas Especializadas em Paralelo)...');

        if (!workspaceState) {
            throw new Error("Estado do workspace não fornecido.");
        }

        // --- ETAPA 1: Pré-Auditoria Local Offline (IndexedDB) ---
        let localAuditResult = null;
        if (window.offlineAuditor && typeof window.offlineAuditor.runLocalAudit === 'function') {
            try {
                localAuditResult = await window.offlineAuditor.runLocalAudit(workspaceState);
                console.log('[AI-CONTROLLER] Pré-auditoria offline local concluída com sucesso.');
            } catch (errLocal) {
                console.warn('[AI-CONTROLLER] Falha na pré-auditoria offline:', errLocal);
            }
        }

        if (typeof showToast === 'function') {
            showToast("⚡ Etapa 1: Cruzamento offline de regras concluído.", "info");
        }

        // --- ETAPA 2: Pesquisa Online Real Contextualizada ---
        let webSearchContext = "";
        if (window.webSearchController && typeof window.webSearchController.executeRealWebSearch === 'function') {
            try {
                const query = window.webSearchController.buildAgentQuery('auditor', workspaceState, localAuditResult);
                if (typeof showToast === 'function') {
                    showToast("🌐 Etapa 2: Pesquisando jurisprudência e normas em tempo real na web...", "info");
                }
                const searchRes = await window.webSearchController.executeRealWebSearch(query, {
                    agentKey: 'auditor',
                    maxResults: 4,
                    timeoutMs: 6500
                });
                if (searchRes && searchRes.success && searchRes.contextText) {
                    webSearchContext = searchRes.contextText;
                    if (typeof showToast === 'function') {
                        showToast("🌐 Etapa 2: Normas e parâmetros atualizados da Web integrados com sucesso.", "info");
                    }
                }
            } catch (searchErr) {
                console.warn('[AI-CONTROLLER] Pesquisa online falhou, utilizando fallback offline:', searchErr);
            }
        }

        const keyToUse = window.geminiKey || localStorage.getItem('gemini_api_key');

        // Modo Offline puro se sem API Key
        if (!keyToUse) {
            console.log('[AI-CONTROLLER] Sem chave API. Retornando laudo da Etapa 1/2.');
            if (typeof showToast === 'function') {
                showToast("⚡ Auditoria concluída autonomamente via IndexedDB!", "success");
            }
            if (!localAuditResult) {
                throw new Error("Não foi possível gerar a auditoria offline. Verifique os dados do projeto.");
            }
            return this._transformToAppFormat(localAuditResult, workspaceState, localAuditResult);
        }

        // --- ETAPA 3: Disparo Paralelo das 4 Áreas Especializadas (Gemini) ---
        const axis = workspaceState.activeAxis || "cultural";
        const areas = this.AUDIT_AREAS[axis] || this.AUDIT_AREAS.cultural;

        // Extrair lista estrita de seções exigidas pelo edital
        const rawRequired = (workspaceState.editalProfile && Array.isArray(workspaceState.editalProfile.secoes_exigidas))
            ? workspaceState.editalProfile.secoes_exigidas
            : [];
        const requiredSections = rawRequired.length > 0
            ? rawRequired.map(s => s.toLowerCase().trim())
            : null; // null = todas consideradas exigidas por padrão

        if (typeof showToast === 'function') {
            const reqMsg = requiredSections ? ` (${requiredSections.length} seções exigidas pelo edital)` : '';
            showToast(`🚀 Disparando ${areas.length} áreas especializadas em paralelo${reqMsg}...`, "info");
        }

        // Disparo concorrente via Promise.allSettled filtrando apenas agentes exigidos
        const areaPromises = areas.map(areaConfig => {
            const activeAgents = requiredSections
                ? areaConfig.agents.filter(agId => requiredSections.includes(agId.toLowerCase()))
                : areaConfig.agents;

            // Se a área não tem nenhuma seção exigida no edital, resolve imediatamente
            if (activeAgents.length === 0) {
                const omittedResult = {
                    areaId: areaConfig.id,
                    areaName: areaConfig.name,
                    relatorio_area: `<p style="color:var(--text-muted);"><em>Nenhuma seção desta área foi exigida pelo edital.</em></p>`,
                    agentes: areaConfig.agents.map(agId => ({
                        id: agId,
                        nota: null,
                        notRequired: true,
                        confianca: "N/A",
                        parecer: `<p><em>Seção "${agId.toUpperCase()}" não exigida no regulamento deste edital.</em></p>`,
                        erros: [],
                        recomendacoes: []
                    })),
                    alertas: []
                };
                if (typeof onAreaProgress === 'function') onAreaProgress(omittedResult);
                return Promise.resolve(omittedResult);
            }

            return this.runAreaAudit(areaConfig, workspaceState, localAuditResult, webSearchContext, keyToUse, activeAgents)
                .then(areaResult => {
                    // Para os agentes desta área que não foram exigidos, preenche como notRequired
                    const omittedInArea = areaConfig.agents.filter(agId => !activeAgents.includes(agId));
                    omittedInArea.forEach(omId => {
                        if (!areaResult.agentes.some(ag => ag.id === omId)) {
                            areaResult.agentes.push({
                                id: omId,
                                nota: null,
                                notRequired: true,
                                confianca: "N/A",
                                parecer: `<p><em>Seção "${omId.toUpperCase()}" não exigida no regulamento deste edital.</em></p>`,
                                erros: [],
                                recomendacoes: []
                            });
                        }
                    });

                    if (typeof onAreaProgress === 'function') {
                        onAreaProgress(areaResult);
                    }
                    return areaResult;
                });
        });

        const settledResults = await Promise.allSettled(areaPromises);

        // Consolidação dos Resultados das Áreas
        let consolidatedAgentes = [];
        let consolidatedAlertas = [];
        let relatorioPartes = [];

        settledResults.forEach((res, idx) => {
            if (res.status === 'fulfilled' && res.value) {
                const areaData = res.value;
                if (Array.isArray(areaData.agentes)) {
                    consolidatedAgentes.push(...areaData.agentes);
                }
                if (Array.isArray(areaData.alertas)) {
                    consolidatedAlertas.push(...areaData.alertas);
                }
                if (areaData.relatorio_area) {
                    relatorioPartes.push(`<h4>${areaData.areaName}</h4>${areaData.relatorio_area}`);
                }
            } else {
                // Fallback para a área que falhou totalmente
                const failedArea = areas[idx];
                console.warn(`[AI-CONTROLLER] Falha crítica na área ${failedArea.name}`);
                if (localAuditResult && localAuditResult.agentes) {
                    const fallbackSubset = localAuditResult.agentes.filter(a => failedArea.agents.includes(a.id));
                    consolidatedAgentes.push(...fallbackSubset);
                }
            }
        });

        // Garantir que todos os 14 agentes existam no array final
        const expectedAgentIds = areas.flatMap(a => a.agents);
        expectedAgentIds.forEach(expId => {
            if (!consolidatedAgentes.some(ag => ag.id === expId)) {
                const isReq = !requiredSections || requiredSections.includes(expId.toLowerCase());
                consolidatedAgentes.push({
                    id: expId,
                    nota: isReq ? 75 : null,
                    notRequired: !isReq,
                    confianca: isReq ? "MEDIA" : "N/A",
                    parecer: isReq ? `<p>Avaliação consolidada para ${expId}.</p>` : `<p><em>Seção não exigida pelo edital.</em></p>`,
                    erros: [],
                    recomendacoes: []
                });
            }
        });

        // Cálculo Matemático da Pontuação Consolidada (APENAS com seções exigidas)
        const requiredAgentes = consolidatedAgentes.filter(ag => !ag.notRequired && typeof ag.nota === 'number');
        const somaNotas = requiredAgentes.reduce((acc, ag) => acc + ag.nota, 0);
        const notaTecnica = requiredAgentes.length > 0 ? Math.round(somaNotas / requiredAgentes.length) : 80;
        const notaPriorizacao = Math.min(30, Math.round(notaTecnica * 0.25));
        const notaFinal = Math.min(130, notaTecnica + notaPriorizacao);

        const projectTitle = (workspaceState.cover && workspaceState.cover.title) || "Proposta Cultural";
        const budgetTotal = (workspaceState.cover && workspaceState.cover.budget) || 100000;

        const relatorioGeral = `
        <div class="audit-consolidated-report">
            <h3>Laudo Técnico Executivo Consolidado — ${projectTitle}</h3>
            <p>Auditoria multissetorial concluída com sucesso através de <strong>${areas.length} Áreas Especializadas</strong> (avaliando estritamente as ${requiredAgentes.length} seções exigidas pelo edital).</p>
            <div class="audit-areas-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin: 1rem 0;">
                ${areas.map(a => {
            const areaAgents = consolidatedAgentes.filter(ag => a.agents.includes(ag.id) && !ag.notRequired);
            if (areaAgents.length === 0) {
                return `<div style="background: var(--bg-card, #f8fafc); border: 1px dashed var(--border-color, #cbd5e1); border-radius: 8px; padding: 0.75rem; opacity:0.75;">
                                <strong>${a.name}</strong><br>
                                <span style="font-size: 0.85rem; color: var(--text-muted);">Não exigida no edital</span>
                            </div>`;
            }
            const avgScore = Math.round(areaAgents.reduce((s, ag) => s + (ag.nota || 0), 0) / (areaAgents.length || 1));
            return `<div style="background: var(--bg-card, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 0.75rem;">
                        <strong>${a.name}</strong><br>
                        <span style="font-size: 1.25rem; font-weight: 700; color: ${avgScore >= 80 ? '#059669' : '#d97706'};">Nota Média: ${avgScore}/100</span>
                    </div>`;
        }).join('')}
            </div>
            ${relatorioPartes.join('<hr style="margin: 1rem 0; border: none; border-top: 1px dashed var(--border-color);"/>')}
        </div>`;

        const finalJson = {
            relatorio_geral: this.sanitizeHTML(relatorioGeral),
            nota_final: notaFinal,
            nota_tecnica: notaTecnica,
            nota_priorizacao: notaPriorizacao,
            total_orcamento: budgetTotal,
            custos_administrativos_percentual: (localAuditResult && localAuditResult.custos_administrativos_percentual) || 12,
            agentes: consolidatedAgentes,
            alertas: consolidatedAlertas,
            ajustes: []
        };

        if (typeof showToast === 'function') {
            showToast("✓ Auditoria das áreas exigidas concluída com sucesso!", "success");
        }

        return this._transformToAppFormat(finalJson, workspaceState, localAuditResult);
    },

    // =====================================================================
    // SUPERVISÃO ESTRATÉGICA — Consolidação Global (Auditoria + Revisão)
    // =====================================================================
    async runSupervisorSynthesis(workspaceState) {
        const keyToUse = window.geminiKey || localStorage.getItem('gemini_api_key');
        const doc = workspaceState.documentContent || {};
        const cover = workspaceState.cover || {};
        const profile = workspaceState.editalProfile || {};
        const lastAudit = workspaceState.lastAuditData || {};
        const revisorResults = workspaceState.revisorAgentsResults || {};

        const rawRequired = (profile && Array.isArray(profile.secoes_exigidas)) ? profile.secoes_exigidas : [];
        const requiredSections = rawRequired.length > 0
            ? rawRequired.map(s => s.toLowerCase().trim())
            : ["justificativa", "objetivos", "metodologia", "cronograma", "orcamento", "acessibilidade", "publico", "ficha_tecnica", "monitoramento", "compliance", "sustentabilidade"];

        let auditSummary = lastAudit.relatorio_analitico || lastAudit.relatorio_geral || lastAudit.summary || "Auditoria geral preliminar.";
        let revisorFeedback = "";

        requiredSections.forEach(secKey => {
            const rev = revisorResults[secKey];
            const audCrit = (lastAudit.criterios || []).find(c => c.id === secKey) || (lastAudit.agentes || []).find(a => a.id === secKey);
            const secText = doc[secKey] || "Seção não redigida no editor.";

            revisorFeedback += `\n### SEÇÃO: ${secKey.toUpperCase()}
- Texto Atual (amostra): ${secText.replace(/<[^>]*>/g, ' ').substring(0, 250)}...
- Nota Auditoria: ${audCrit ? audCrit.nota : 'N/A'}/100 | Parecer Auditoria: ${audCrit ? audCrit.parecer : 'Conforme'}
- Nota Revisão: ${rev ? rev.nota : 'N/A'}/100 | Parecer Revisor: ${rev ? (rev.parecer ? rev.parecer.replace(/<[^>]*>/g, ' ').substring(0, 250) : 'Pendente') : 'Pendente'}
`;
        });

        // Etapa 2: Pesquisa Online Real para Diretrizes de Supervisão
        let webSearchContext = "";
        if (window.webSearchController && typeof window.webSearchController.executeRealWebSearch === 'function') {
            try {
                const query = window.webSearchController.buildAgentQuery('supervisor', workspaceState);
                const searchRes = await window.webSearchController.executeRealWebSearch(query, {
                    agentKey: 'supervisor',
                    maxResults: 4,
                    timeoutMs: 6500
                });
                if (searchRes && searchRes.success && searchRes.contextText) {
                    webSearchContext = searchRes.contextText;
                }
            } catch (err) {
                console.warn('[SUPERVISOR] Pesquisa web ignorada:', err);
            }
        }

        const supervisorPrompt = `Você é o Arquiteto-Chefe e Supervisor Estratégico do projeto cultural "${cover.title || 'Projeto Cultural'}".
Sua missão é consolidar os apontamentos da Auditoria (Aba 2) e da Revisão (Aba 3) e formular as DECISÕES EXECUTIVAS VINCULANTES e o GUIA DE AÇÃO PARA O REDATOR para cada seção exigida pelo edital.

[DADOS DA PROPOSTA & EDITAL]:
- Proponente: ${cover.proponent || 'Não informado'} | Fomento: ${profile.fomento || cover.institution || 'Fomento Público Geral'}
- Tetos & Limites: ${profile.tetos_e_limites || 'Limites legais padrão'}
- Critérios de Priorização: ${profile.prioridades_critérios || 'Avaliação de mérito'}
- Seções Exigidas pelo Edital: ${requiredSections.join(', ').toUpperCase()}

[LAUDO DE AUDITORIA]:
${auditSummary.substring(0, 2500)}

[APONTAMENTOS DAS SEÇÕES EXIGIDAS]:
${revisorFeedback}

${webSearchContext ? `[DADOS DE PESQUISA EM TEMPO REAL DA WEB (Jurisprudência TCU/MinC e Governança)]:\n${webSearchContext}\n` : ''}

DIRETRIZES DE SUPERVISÃO:
1. Para cada seção exigida (${requiredSections.join(', ')}), defina:
   - status: "APROVADO" (nota >= 85), "AJUSTE_RECOMENDADO" (65-84), ou "INCONFORMIDADE_CRITICA" (< 65 ou risco de inabilitação).
   - diagnostico: Resumo analítico conciso do estado da seção.
   - diretriz_redacao: Instrução prescritiva e prática para o Redator (ex: 'Reescrever o cronograma detalhando mês 1 a 6 em tabela com marcos de prestação de contas').
   - pontos_criticos: Lista de 1 a 3 itens a corrigir.
2. Forneça um "sumario_executivo" e "grau_maturidade_global" (ex: "88% de Maturidade Competitiva").
3. Retorne estritamente um JSON estruturado conforme o schema fornecido.`;

        const SUPERVISOR_SCHEMA = {
            type: "OBJECT",
            properties: {
                sumario_executivo: { type: "STRING" },
                grau_maturidade_global: { type: "STRING" },
                decisoes_secoes: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            secao: { type: "STRING" },
                            status: { type: "STRING" },
                            diagnostico: { type: "STRING" },
                            diretriz_redacao: { type: "STRING" },
                            pontos_criticos: {
                                type: "ARRAY",
                                items: { type: "STRING" }
                            }
                        },
                        required: ["secao", "status", "diagnostico", "diretriz_redacao"]
                    }
                },
                plano_acao_prioritario: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                }
            },
            required: ["sumario_executivo", "grau_maturidade_global", "decisoes_secoes", "plano_acao_prioritario"]
        };

        if (keyToUse) {
            try {
                const requestPayload = {
                    provider: 'gemini',
                    api_key: keyToUse,
                    prompt: supervisorPrompt,
                    system_instruction: "Você é o Supervisor Estratégico de Projetos. Responda estritamente em JSON estruturado conforme o schema.",
                    stream: false,
                    response_schema: SUPERVISOR_SCHEMA,
                    use_cache: true
                };

                const response = await fetch('/api/llm/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify(requestPayload)
                });

                if (response.ok) {
                    const resData = await response.json();
                    let rawText = resData.text || '';
                    let parsed = null;
                    if (window.StateIntegrityManager && typeof window.StateIntegrityManager.repairJSONResponse === 'function') {
                        parsed = window.StateIntegrityManager.repairJSONResponse(rawText);
                    }
                    if (!parsed) {
                        let cleanText = rawText.replace(/^\s*```[a-zA-Z]*\s*\r?\n/gm, '').replace(/\r?\n\s*```\s*$/gm, '').trim();
                        try {
                            parsed = JSON.parse(cleanText);
                        } catch (e) {
                            parsed = null;
                        }
                    }
                    if (parsed && Array.isArray(parsed.decisoes_secoes)) {
                        return parsed;
                    }
                }
            } catch (errApi) {
                console.warn("[AI-CONTROLLER] Falha na API ao sintetizar supervisão. Recorrendo ao motor local:", errApi);
            }
        }

        // Fallback Local
        return this._getOfflineSupervisorSynthesis(workspaceState, requiredSections);
    },

    _getOfflineSupervisorSynthesis(workspaceState, requiredSections) {
        const lastAudit = workspaceState.lastAuditData || {};
        const revisorResults = workspaceState.revisorAgentsResults || {};

        const decisoes = requiredSections.map(secKey => {
            const rev = revisorResults[secKey];
            const audCrit = (lastAudit.criterios || []).find(c => c.id === secKey) || (lastAudit.agentes || []).find(a => a.id === secKey);
            const notaAud = audCrit ? audCrit.nota : 75;
            const notaRev = rev ? rev.nota : 75;
            const media = Math.round((notaAud + notaRev) / 2);

            let status = "APROVADO";
            let diretriz = `Manter a estrutura atual e realizar apenas polimento de vocabulário e coesão textual.`;
            if (media < 65) {
                status = "INCONFORMIDADE_CRITICA";
                diretriz = `Reescrever a seção com urgência incluindo referências explícitas aos critérios do edital e parâmetros orçamentários.`;
            } else if (media < 85) {
                status = "AJUSTE_RECOMENDADO";
                diretriz = `Enriquecer a seção com quantitativos detalhados, metas verificáveis e alinhamento às diretrizes do edital.`;
            }

            return {
                secao: secKey,
                status,
                diagnostico: `Pontuação média estimada em ${media}/100 com base na auditoria normativa e parecer setorial.`,
                diretriz_redacao: diretriz,
                pontos_criticos: media < 85 ? [`Ajustar aderência aos itens específicos do edital.`] : []
            };
        });

        return {
            sumario_executivo: `O Supervisor Estratégico cruzou o laudo de conformidade da Auditoria e os pareceres da Banca Revisora para as ${requiredSections.length} seções exigidas pelo edital.`,
            grau_maturidade_global: "Maturidade Competitiva Intermediária-Alta (Ajustes Finais Recomendados)",
            decisoes_secoes: decisoes,
            plano_acao_prioritario: [
                "Reescrever com prioridade as seções marcadas com INCONFORMIDADE CRÍTICA.",
                "Aplicar as diretrizes do Supervisor nas seções com AJUSTE RECOMENDADO.",
                "Executar a formatação final ABNT e exportação de planilha 8 abas."
            ]
        };
    },

    // =====================================================================
    // TRANSFORMAÇÃO — Converte a resposta do Gemini no formato do app.js
    // =====================================================================
    _transformToAppFormat: function (geminiJson, workspaceState, localAuditResult) {
        const revisorAgentsResults = {};
        const agentesArray = Array.isArray(geminiJson.agentes) ? geminiJson.agentes : [];
        const alertas = Array.isArray(geminiJson.alertas) ? geminiJson.alertas : [];
        const ajustes = Array.isArray(geminiJson.ajustes) ? geminiJson.ajustes : [];

        agentesArray.forEach(ag => {
            const meta = REVISORES_METADATA[ag.id] || { name: ag.id, criterio: ag.id, nota_maxima: 100 };
            revisorAgentsResults[ag.id] = {
                id: ag.id,
                name: meta.name,
                nota: ag.nota,
                notRequired: ag.notRequired === true,
                confianca: ag.confianca || "ALTA",
                parecer: ag.parecer || `<p>Análise do agente ${meta.name}.</p>`,
                sugestao: (ag.recomendacoes && ag.recomendacoes.length > 0) ? ag.recomendacoes[0] : "",
                citacoes: ag.citacoes || [],
                erros: ag.erros || [],
                recomendacoes: ag.recomendacoes || []
            };
        });

        const total = (workspaceState.cover && workspaceState.cover.budget) || 100000;
        const adminPerc = (localAuditResult && localAuditResult.custos_administrativos_percentual) || 12;

        const notasValidas = Object.values(revisorAgentsResults)
            .filter(r => !r.notRequired && typeof r.nota === 'number')
            .map(r => r.nota);
        const notaTecnicaCalculada = notasValidas.length > 0
            ? Math.round(notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length)
            : (geminiJson.nota_tecnica || 80);

        const criterios = Object.entries(REVISORES_METADATA).map(([id, meta]) => {
            const agRes = revisorAgentsResults[id];
            if (agRes && agRes.notRequired) {
                return { criterio: meta.criterio, nota_maxima: meta.nota_maxima, nota_atribuida: null, notRequired: true, justificativa: "Seção não exigida pelo edital." };
            }
            const nota_atribuida = agRes ? agRes.nota : (geminiJson.criterios ? (geminiJson.criterios.find(c => c.id === id) || {}).nota : 75);
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
            const acessibilidadeNota = revisorAgentsResults['acessibilidade'] && revisorAgentsResults['acessibilidade'].nota ? revisorAgentsResults['acessibilidade'].nota : 70;
            const publicoNota = revisorAgentsResults['publico'] && revisorAgentsResults['publico'].nota ? revisorAgentsResults['publico'].nota : 70;
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
                .filter(a => !a.notRequired)
                .flatMap(a => (a.erros || []).map(e => ({ alteracao: e, fator: `Agente: ${a.id}` }))),
            alertas: alertas.length > 0 ? alertas : agentesArray
                .filter(a => !a.notRequired)
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
