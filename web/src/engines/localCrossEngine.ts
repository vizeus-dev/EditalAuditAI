/**
 * localCrossEngine.ts — Motor de Cruzamento Offline Determinístico (Padrão Matt Pocock)
 * Executa 100% dos cálculos matemáticos e checagens regulatórias locais sem chamadas de rede.
 */

import type { BudgetItem, BudgetAuditResult, ComplianceIssue, OfflineDiagnostic, WorkspaceCover, DocumentContent, PareceristaMUSA, MusaChecklistItem } from '../types/edital';

export class LocalCrossEngine {
  public static readonly VERSION = '3.0.0-ts';

  /**
   * Executa auditoria orçamentária matemática determinística.
   */
  public static auditBudget(items: BudgetItem[], cover: WorkspaceCover): BudgetAuditResult {
    const totalCalculado = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const totalDeclarado = Number(cover.budget) || totalCalculado;
    const divergencia = Math.abs(totalCalculado - totalDeclarado);
    const hasDivergence = divergencia > 0.05;

    const baseCalculo = totalCalculado > 0 ? totalCalculado : totalDeclarado;

    // Regras de Expressões Regulares para Rubricas
    const adminRegex = /coordena|direção|gestão|administra|gerência|supervisão|secretaria executiva/i;
    const comRegex = /comunicação|divulgação|marketing|assessoria de imprensa|mídia|design|identidade visual/i;
    const accessRegex = /libras|audiodescrição|audiodescricao|braille|acessibilidade|intérprete|tradutor.*sinais/i;
    const taxRegex = /inss|iss|irrf|fgts|encargo|tribut|imposto|das|patronal|recolhimento/i;
    const bdiRegex = /\bbdi\b|bonifica|despesas indiretas|taxa de rateio/i;
    const materialEquipRegex = /aquisição|equipamento|material permanente|compra de|aparelho|computador|iluminação|som|câmera/i;

    let totalAdmin = 0;
    let totalCom = 0;
    let totalAccess = 0;
    let totalTax = 0;
    let hasBdi = false;
    let hasMaterialEquip = false;

    for (const item of items) {
      const fullText = `${item.rubrica || ''} ${item.item || ''} ${item.especificacao || ''}`;
      const itemVal = Number(item.total) || 0;

      if (adminRegex.test(fullText)) totalAdmin += itemVal;
      if (comRegex.test(fullText)) totalCom += itemVal;
      if (accessRegex.test(fullText)) totalAccess += itemVal;
      if (taxRegex.test(fullText)) totalTax += itemVal;
      if (bdiRegex.test(fullText)) hasBdi = true;
      if (materialEquipRegex.test(fullText)) hasMaterialEquip = true;
    }

    const pctAdmin = baseCalculo > 0 ? (totalAdmin / baseCalculo) * 100 : 0;
    const pctCom = baseCalculo > 0 ? (totalCom / baseCalculo) * 100 : 0;
    const pctAccess = baseCalculo > 0 ? (totalAccess / baseCalculo) * 100 : 0;

    // Tetos Regulamentares da Lei 14.903/2024 e Jurisprudência TCU Súmula 272
    const adminExceeded = pctAdmin > 15.05; // Margem técnica de 0.05%
    const comExceeded = pctCom > 10.05;
    const hasSumulaTCU272Risk = hasBdi && hasMaterialEquip;

    const alerts: string[] = [];
    if (hasDivergence) {
      alerts.push(`Divergência orçamentária detectada: Soma dos itens (R$ ${totalCalculado.toFixed(2)}) difere do total declarado (R$ ${totalDeclarado.toFixed(2)}).`);
    }
    if (adminExceeded) {
      alerts.push(`Custos administrativos (${pctAdmin.toFixed(1)}%) ultrapassam o teto de 15% fixado pelo Marco Legal da Cultura.`);
    }
    if (comExceeded) {
      alerts.push(`Custos de divulgação (${pctCom.toFixed(1)}%) ultrapassam o teto referencial de 10%.`);
    }
    if (hasSumulaTCU272Risk) {
      alerts.push('Risco de Glosa (Súmula TCU 272): Foi detectada incidência de BDI/taxa de rateio conjuntamente com aquisição de bens ou materiais permanentes.');
    }
    if (totalAccess === 0) {
      alerts.push('Nenhum item orçamentário específico para medidas de acessibilidade (Libras/Audiodescrição) foi identificado.');
    }

    return {
      totalCalculado,
      totalDeclarado,
      divergencia,
      hasDivergence,
      totalAdmin,
      pctAdmin,
      adminExceeded,
      totalCom,
      pctCom,
      comExceeded,
      totalAccess,
      pctAccess,
      hasAccessItem: totalAccess > 0,
      totalTax,
      hasTaxItem: totalTax > 0,
      hasSumulaTCU272Risk,
      itemsCount: items.length,
      alerts
    };
  }

  /**
   * Executa diagnóstico consolidado combinando orçamento e regras normativas.
   */
  public static runDiagnostic(
    items: BudgetItem[],
    cover: WorkspaceCover,
    content: DocumentContent
  ): OfflineDiagnostic {
    const startTime = performance.now();
    const budget = this.auditBudget(items, cover);
    const issues: ComplianceIssue[] = [];

    // Verificação de divergência financeira
    if (budget.hasDivergence) {
      issues.push({
        id: 'budget-divergence',
        category: 'critical',
        rule: 'Precisão da Planilha de Custos (Súmula TCU 272)',
        description: `A soma dos itens detalhados difere em R$ ${budget.divergencia.toFixed(2)} do teto declarado no projeto.`,
        legalGround: 'Súmula TCU 272 e Art. 18 da Lei 14.133/2021',
        recommendation: 'Ajuste os valores unitários ou o total informado na capa para obter exata correspondência matemática.'
      });
    }

    // Verificação de teto administrativo
    if (budget.adminExceeded) {
      issues.push({
        id: 'admin-cap',
        category: 'critical',
        rule: 'Teto de Custos Administrativos (15%)',
        description: `O total alocado em gestão (${budget.pctAdmin.toFixed(1)}%) excede o limite máximo legal de 15%.`,
        legalGround: 'Art. 12 do Decreto Federal regulamentador da Lei 14.903/2024',
        recommendation: 'Remaneje rubricas de coordenação para despesas finalísticas de produção cultural.'
      });
    }

    // Verificação de Acessibilidade
    if (!content.acessibilidade || content.acessibilidade.trim().length < 50) {
      issues.push({
        id: 'accessibility-missing',
        category: 'warning',
        rule: 'Medidas Obrigatórias de Acessibilidade (NBR 9050)',
        description: 'A seção de Acessibilidade está ausente ou com detalhamento insuficiente.',
        legalGround: 'Art. 18 da Lei 14.903/2024 e Lei Brasileira de Inclusão (Lei 13.146/2015)',
        recommendation: 'Descreva expressamente ao menos uma medida de acessibilidade física e uma comunicacional (ex: Libras).'
      });
    }

    // Cálculo do Score (0 a 100)
    let score = 100;
    for (const issue of issues) {
      if (issue.category === 'critical') score -= 25;
      if (issue.category === 'warning') score -= 10;
    }
    score = Math.max(0, score);

    const elapsed = Math.round(performance.now() - startTime);

    return {
      score,
      status: score >= 80 ? 'aprovado' : score >= 50 ? 'atencao' : 'critico',
      processingTimeMs: elapsed,
      budget,
      issues,
      pareceres: {}
    };
  }

  /**
   * Executa a auditoria cruzada pelos 14 pareceristas M.U.S.A., gerando pareceres,
   * notas de conformidade e recomendações para injeção direta na proposta.
   */
  private static evaluateParecerista(
    id: number,
    key: string,
    targetSection: keyof DocumentContent,
    name: string,
    specialty: string,
    legalAnchor: string,
    promptGuideline: string,
    checklistSpecs: Array<{ item: string; pattern: RegExp; legalRef: string }>,
    defaultRecommendation: string,
    sectionText: string,
    customScoreOverride?: number,
    customParecerOverride?: string
  ): PareceristaMUSA {
    const text = (sectionText || '').trim();
    const len = text.length;
    const evaluatedChecklist: MusaChecklistItem[] = [];
    let doneCount = 0;

    for (const spec of checklistSpecs) {
      const isDone = len > 0 && spec.pattern.test(text);
      if (isDone) doneCount++;
      evaluatedChecklist.push({
        item: spec.item,
        done: isDone,
        legalRef: spec.legalRef
      });
    }

    const total = checklistSpecs.length;
    let score = customScoreOverride;
    let parecer = customParecerOverride;
    const risks: string[] = [];

    if (score === undefined || parecer === undefined) {
      if (len < 40) {
        score = 45;
        parecer = `⚠️ Seção em branco ou excessivamente resumida (${len} caracteres). ${name} adverte que a ausência de detalhamento gera risco iminente de inabilitação ou nota zero em ${specialty}.`;
        risks.push(`Risco de inabilitação sumária por ausência de dados em ${specialty}.`);
      } else if (doneCount === total) {
        score = Math.min(98, 90 + Math.floor(len / 150));
        parecer = `✓ ${name} constatou conformidade técnica exemplar com todas as âncoras estabelecidas em ${legalAnchor}. Todos os ${total} parâmetros normativos foram cumpridos.`;
      } else if (doneCount >= Math.ceil(total / 2)) {
        score = 75 + Math.floor((doneCount / total) * 15);
        const pendentes = evaluatedChecklist.filter(c => !c.done);
        parecer = `⚠️ Parcialmente Conforme: ${name} identificou atendimento a ${doneCount}/${total} parâmetros. Recomenda-se complementar: '${pendentes[0]?.item || 'Aprofundamento técnico'}'.`;
        risks.push(`Perda de pontuação na banca por ausência de ${pendentes[0]?.item || 'dados'}.`);
      } else {
        score = 60 + doneCount * 5;
        const pendentes = evaluatedChecklist.filter(c => !c.done);
        parecer = `⚠️ Parecer com Ressalvas Críticas: A redação apresenta ${pendentes.length} omissões normativas em ${specialty}. É indispensável incorporar a minuta recomendada.`;
        risks.push(`Risco de desclassificação técnica perante a banca (${specialty}).`);
      }
    }

    return {
      id,
      key,
      targetSection,
      name,
      specialty,
      legalAnchor,
      promptGuideline,
      status: 'done',
      score,
      parecer,
      risks,
      checklist: evaluatedChecklist,
      recommendedText: defaultRecommendation,
      mode: 'local_deterministic'
    };
  }

  /**
   * Executa a auditoria cruzada pelos 14 pareceristas M.U.S.A., gerando pareceres,
   * notas de conformidade e recomendações para injeção direta na proposta.
   */
  public static auditMusaBanca(
    items: BudgetItem[],
    cover: WorkspaceCover,
    content: DocumentContent,
    _editalText: string = ''
  ): PareceristaMUSA[] {
    const budget = this.auditBudget(items, cover);

    return [
      // 1. Justificativa
      this.evaluateParecerista(
        1,
        'justificativa',
        'justificativa',
        'Dr. Afonso Pena',
        'Justificativa & Relevância Territorial',
        'Lei nº 14.903/2024 e Plano Nacional de Cultura (Lei nº 12.343/2010)',
        'Audita a consistência da fundamentação, pertinência cultural, impacto no território e adequação ao fomento público.',
        [
          { item: 'Identificação clara do problema ou oportunidade cultural no território', pattern: /(território|comunidade|localidade|regi[aã]o|bairro|periferia)/i, legalRef: 'Art. 2º Lei 14.903/2024' },
          { item: 'Alinhamento explícito ao Plano Nacional de Cultura ou diretrizes locais', pattern: /(plano nacional de cultura|pnc|diretrizes|pol[íi]tica p[úu]blica)/i, legalRef: 'Lei 12.343/2010' },
          { item: 'Demonstração do interesse público e relevância social da intervenção', pattern: /(interesse p[úu]blico|relev[âa]ncia|impacto|transforma[çc][ãa]o)/i, legalRef: 'Art. 37 CF/88' },
          { item: 'Histórico de atuação e enraizamento da iniciativa ou coletivo', pattern: /(hist[óo]rico|trajet[óo]ria|atua[çc][ãa]o|experi[êe]ncia|anos)/i, legalRef: 'Princípio da Continuidade' },
          { item: 'Fundamentação do público beneficiado e valorização da diversidade', pattern: /(diversidade|pluralidade|inclus[ãa]o|popula[çc][ãa]o|comunit[áa]ri)/i, legalRef: 'Art. 215 CF/88' }
        ],
        'O presente projeto cultural fundamenta-se nas diretrizes estratégicas da Lei nº 14.903/2024 (Marco Regulatório do Fomento à Cultura) e do Plano Nacional de Cultura (Lei nº 12.343/2010), promovendo o desenvolvimento cultural sustentável, a descentralização do acesso e a valorização das manifestações artísticas do território.',
        content.justificativa
      ),

      // 2. Objetivos
      this.evaluateParecerista(
        2,
        'objetivos',
        'objetivos',
        'Profa. Clarice Lispector',
        'Objetivos & Metas (SMART)',
        'Metodologia SMART, Princípio da Eficiência (Art. 37 CF/88) e Art. 11 da Lei 14.133/2021',
        'Examina clareza, mensurabilidade quantitativa e qualitativa e coerência operacional das metas.',
        [
          { item: 'Objetivo Geral com verbo de ação no infinitivo e objeto claro', pattern: /(objetivo geral|promover|realizar|produzir|desenvolver|capacitar)/i, legalRef: 'Metodologia SMART' },
          { item: 'Metas Específicas mensuráveis numericamente (quantitativos explícitos)', pattern: /(\d+\s*(apresenta[çc][õo]es|oficinas|sess[õo]es|apresenta[çc][ãa]o|aulas|alunos|benefici[áa]rios))/i, legalRef: 'Art. 18 Lei 14.903/2024' },
          { item: 'Estimativa de alcance populacional (público direto mensurado)', pattern: /(\d+\s*(pessoas|espectadores|participantes|p[úu]blico))/i, legalRef: 'Indicador de Eficácia' },
          { item: 'Registro documental e arquivístico do produto cultural', pattern: /(registro|grava[çc][ãa]o|v[íi]deo|fotogr[áa]fico|cat[áa]logo|acervo)/i, legalRef: 'Comprovação do Objeto' },
          { item: 'Temporalidade delimitada para alcance de cada meta', pattern: /(m[êe]s|meses|dias|semanas|etapa|per[íi]odo)/i, legalRef: 'Critério Temporal SMART' }
        ],
        'Objetivo Geral: Produzir e circular as atividades artísticas com excelência técnica e gratuidade.\nMetas Específicas:\n1. Realizar 100% das apresentações previstas no certame.\n2. Beneficiar diretamente no mínimo 600 espectadores presenciais.\n3. Capacitar gratuitamente 40 jovens em práticas artísticas.\n4. Gerar registro audiovisual em alta definição para salvaguarda pública.',
        content.objetivos
      ),

      // 3. Metodologia
      this.evaluateParecerista(
        3,
        'metodologia',
        'metodologia',
        'Eng. Darcy Ribeiro',
        'Metodologia & Plano de Trabalho',
        'Encadeamento Lógico em 3 Fases (Pré, Produção, Pós) e Mitigação de Riscos',
        'Audita o encadeamento executivo, cronologia técnica, arranjo produtivo e viabilidade das atividades.',
        [
          { item: 'Detalhamento da Fase de Pré-Produção (contratações, licenças, ensaios)', pattern: /(pr[ée]-produ[çc][ãa]o|prepara[çc][ãa]o|planejamento|ensaio|contrata)/i, legalRef: 'Fase Preliminar' },
          { item: 'Detalhamento da Fase de Produção (execução, montagem, apresentações)', pattern: /(produ[çc][ãa]o|montagem|apresenta[çc][ãa]o|execu[çc][ãa]o|apresenta)/i, legalRef: 'Fase Executiva' },
          { item: 'Detalhamento da Fase de Pós-Produção (desmontagem, notas, relatório)', pattern: /(p[óo]s-produ[çc][ãa]o|desmontagem|presta[çc][ãa]o de contas|relat[óo]rio)/i, legalRef: 'Fase Conclusiva' },
          { item: 'Previsão de plano de contingência e gestão de riscos operacionais', pattern: /(conting[êe]ncia|risco|imprevisto|alternativa|seguran[çc]a)/i, legalRef: 'Gestão de Riscos' },
          { item: 'Protocolos de acolhimento e organização do público', pattern: /(acolhimento|recep[çc][ãa]o|orienta[çc][ãa]o|organiza[çc][ãa]o|fluxo)/i, legalRef: 'Segurança de Eventos' }
        ],
        'Fase 1 - Pré-Produção: Contratos de elenco/técnicos, licenças e ensaios.\nFase 2 - Produção: Montagem de som/luz, segurança elétrica (NR-10) e apresentações públicas gratuitas com acolhimento inclusivo.\nFase 3 - Pós-Produção: Desmontagem, emissão de certidões, tabulação de público e Relatório de Execução do Objeto.',
        content.metodologia
      ),

      // 4. Cronograma
      this.evaluateParecerista(
        4,
        'cronograma',
        'cronograma',
        'Dra. Nise da Silveira',
        'Cronograma Operacional',
        'Art. 183 da Lei 14.133/2021 (Prazos em Dias Úteis) e Compatibilidade Sazonal',
        'Valida marcos temporais mensais, coerência entre desembolso e execução e vigência do certame.',
        [
          { item: 'Discriminação temporal por meses ou semanas de execução', pattern: /(m[êe]s\s*\d+|semana\s*\d+|bimestre|trimestre)/i, legalRef: 'Marco Temporal' },
          { item: 'Compatibilidade entre vigência da proposta e teto do certame', pattern: /(\d+\s*(meses|dias|vig[êe]ncia))/i, legalRef: 'Prazo Máximo do Edital' },
          { item: 'Previsão de prazo hábil para prestação de contas final', pattern: /(presta[çc][ãa]o de contas|relat[óo]rio final|encerramento)/i, legalRef: 'Art. 18 Lei 14.903/2024' },
          { item: 'Adequação a sazonalidades climáticas e calendário escolar/comunitário', pattern: /(calend[áa]rio|per[íi]odo|f[ée]rias|sazonal|tempo)/i, legalRef: 'Viabilidade Operacional' },
          { item: 'Marcos críticos de aprovação e desembolso orçamentário', pattern: /(desembolso|repasse|etapa|marco|libera[çc][ãa]o)/i, legalRef: 'Cronograma Físico-Financeiro' }
        ],
        'Mês 1 a 2: Pré-produção, licenças e contratações.\nMês 3: Divulgação em massa e alinhamento do rider.\nMês 4: Execução das apresentações e oficinas.\nMês 5: Prestação de contas e relatório fotográfico de cumprimento do objeto.',
        content.cronograma
      ),

      // 5. Orçamento
      this.evaluateParecerista(
        5,
        'orcamento',
        'orcamento',
        'Auditor Rui Barbosa',
        'Orçamento & Tabela Referencial',
        'Súmula TCU 272, Acórdão 2622/2013-TCU, IN MinC 01/2023 (15% e 10%) e Lei 14.903/2024',
        'Audita conformidade aritmética, razoabilidade de custos de mercado, respeito a tetos e vedação a BDI em compras.',
        [
          { item: 'Equilíbrio aritmético exato (soma dos itens igual ao teto declarado)', pattern: /(r\$|\d+[.,]\d{2})/i, legalRef: 'Invariante Contábil' },
          { item: 'Custos administrativos/gestão limitados a no máximo 15% do total', pattern: /(15%|administra|gest[ãa]o|coordena[çc][ãa]o)/i, legalRef: 'IN MinC 01/2023' },
          { item: 'Custos de divulgação/comunicação limitados a no máximo 10% do total', pattern: /(10%|divulga[çc][ãa]o|comunica[çc][ãa]o|m[íi]dia|assessoria)/i, legalRef: 'IN MinC 01/2023' },
          { item: 'Reserva orçamentária expressa para serviços de acessibilidade', pattern: /(acessibilidade|libras|audiodescri)/i, legalRef: 'Art. 18 Lei 14.903/2024' },
          { item: 'Inexistência de duplicidade de BDI ou taxa de lucro sobre compras puras', pattern: /(bdi|lucro|sobrepre[çc]o|taxa de administra[çc][ãa]o)/i, legalRef: 'Súmula TCU 272 / Acórdão 2622' }
        ],
        'Planilha orçamentária ajustada aos limites legais: Custos de gestão limitados a 15%, custos de comunicação a 10%, sem duplicidade de BDI e com reserva explícita para serviços de acessibilidade.',
        content.orcamento,
        budget.adminExceeded || budget.hasDivergence ? 65 : 95,
        budget.adminExceeded
          ? `⚠️ Custos administrativos (${budget.pctAdmin.toFixed(1)}%) ultrapassam o teto legal de 15%. É imperativo remanejar rubricas para atividades finalísticas.`
          : budget.hasDivergence
          ? `⚠️ Divergência matemática de R$ ${budget.divergencia.toFixed(2)} entre soma dos itens e valor declarado.`
          : '✓ Planilha orçamentária equilibrada com respeito integral aos limites da Lei 14.903/2024 e da Súmula TCU 272.'
      ),

      // 6. Acessibilidade
      this.evaluateParecerista(
        6,
        'acessibilidade',
        'acessibilidade',
        'Conselheira Dorina Nowill',
        'Acessibilidade (NBR 9050, 15290 e 16452)',
        'Lei Brasileira de Inclusão (Lei nº 13.146/2015), IN MinC nº 10/2023 e ABNT NBR 9050',
        'Exige medidas tripartites obrigatórias: Acessibilidade Comunicacional, Arquitetônica e Atitudinal.',
        [
          { item: 'Acessibilidade Comunicacional: Tradutor e Intérprete de Libras presencial', pattern: /(libras|l[íi]ngua brasileira de sinais)/i, legalRef: 'NBR 15290' },
          { item: 'Acessibilidade Comunicacional: Audiodescrição gravada ou ao vivo', pattern: /(audiodescri[çc][ãa]o|narrativa em [áa]udio)/i, legalRef: 'NBR 16452' },
          { item: 'Acessibilidade Física: Rampas, sanitários adaptados e piso tátil', pattern: /(rampa|sanit[áa]rio|acesso f[íi]sico|cadeirante|mobilidade reduzida|nbr\s*9050)/i, legalRef: 'NBR 9050' },
          { item: 'Acessibilidade Atitudinal: Treinamento e acolhimento prioritário da equipe', pattern: /(atitudinal|acolhimento|treinamento|capacita[çc][ãa]o|atendimento)/i, legalRef: 'Art. 2º Lei 13.146/2015' },
          { item: 'Reserva de assentos e espaços livres para PCDs e acompanhantes', pattern: /(reserva|assentos|espa[çc]os|acompanhante)/i, legalRef: 'Decreto 5.296/2004' }
        ],
        'Medidas Comunicacionais: Todas as apresentações contarão com Intérprete de Libras presencial e audiodescrição gravada/ao vivo.\nMedidas Físicas: Espaços com rampas de acesso, sanitários adaptados, piso tátil e reserva de assentos para pessoas com deficiência ou mobilidade reduzida.\nMedidas Atitudinais: Capacitação da equipe de recepção para acolhimento humanizado e prioritário.',
        content.acessibilidade
      ),

      // 7. Democratização
      this.evaluateParecerista(
        7,
        'democratizacao',
        'publico',
        'Mestre Gilberto Gil',
        'Democratização do Acesso & Formação de Público',
        'Art. 215 da CF/88, Lei nº 14.903/2024 e Desconcentração Territorial',
        'Audita gratuidade universal, distribuição de ingressos e descentralização territorial para periferias.',
        [
          { item: 'Garantia de gratuidade integral em todas as sessões e atividades', pattern: /(gratuit|sem cobran[çc]a|franco|acesso livre)/i, legalRef: 'Art. 14 Lei 14.903/2024' },
          { item: 'Distribuição de ingressos ou vagas para escolas públicas e vulneráveis', pattern: /(escola p[úu]blica|comunidade|vulnerab|baixa renda|estudante)/i, legalRef: 'Ações Afirmativas' },
          { item: 'Descentralização geográfica (apresentações em bairros periféricos/interior)', pattern: /(periferia|descentraliza|interior|zona rural|bairros afastados)/i, legalRef: 'Desconcentração Cultural' },
          { item: 'Transmissão ou disponibilização digital aberta e sem paywall', pattern: /(transmiss[ãa]o|digital|online|youtube|grava[çc][ãa]o|aberta)/i, legalRef: 'Acesso Digital' },
          { item: 'Mecanismos de mediação cultural e debate pós-apresentação', pattern: /(media[çc][ãa]o|debate|conversa|di[áa]logo|bate-papo)/i, legalRef: 'Formação de Plateia' }
        ],
        'Público Direto: Estudantes da rede pública estadual/municipal, idosos e famílias de baixa renda.\nPúblico Indireto: Sociedade em geral através da transmissão e difusão gratuita online.\nEstimativa de Impacto: Mínimo de 600 espectadores presenciais e 2.500 visualizações na internet.',
        content.publico
      ),

      // 8. Contrapartida
      this.evaluateParecerista(
        8,
        'contrapartida',
        'contrapartida',
        'Profa. Lélia Gonzalez',
        'Contrapartida Social & Retorno Comunitário',
        'Art. 14 da Lei nº 14.903/2024 (Ações Afirmativas e Devolutivas Sociais)',
        'Verifica oficinas formativas, doação de acervos e geração de valor multiplicador sem ônus.',
        [
          { item: 'Oficinas formativas ou palestras práticas gratuitas para a comunidade', pattern: /(oficina|workshop|palestra|forma[çc][ãa]o|capacita[çc][ãa]o|aula)/i, legalRef: 'Art. 14 Lei 14.903/2024' },
          { item: 'Doação de acervo físico ou digital para bibliotecas/instituições públicas', pattern: /(doa[çc][ãa]o|acervo|biblioteca|escola|arquivo)/i, legalRef: 'Legado Cultural' },
          { item: 'Ações afirmativas direcionadas a mulheres, pessoas negras e indígenas', pattern: /(a[çc][õo]es afirmativas|mulheres|negr[ao]s|ind[íi]genas|quilombolas)/i, legalRef: 'IN MinC 10/2023' },
          { item: 'Especificação da carga horária e ementa pedagógica da ação formativa', pattern: /(\d+\s*horas|\d+\s*h|carga hor[áa]ria|conte[úu]do|ementa)/i, legalRef: 'Rigor Pedagógico' },
          { item: 'Público-alvo qualificado beneficiário da contrapartida', pattern: /(jovens|professores|educadores|artistas locais|iniciantes)/i, legalRef: 'Efetividade Social' }
        ],
        'Contrapartidas Sociais Obrigatórias:\n1. Realização de 2 oficinas práticas formativas gratuitas para jovens da rede pública.\n2. Doação de registros audiovisuais para acervo da biblioteca pública municipal.\n3. Entrada 100% gratuita para todas as apresentações.',
        content.contrapartida
      ),

      // 9. Equipe / Ficha Técnica
      this.evaluateParecerista(
        9,
        'equipe',
        'ficha_tecnica',
        'Dr. Sobral Pinto',
        'Ficha Técnica & Capacidade Técnica',
        'Súmula TCU 263 (Proporcionalidade de Atestados) e Leis nº 6.533/1978 e 3.857/1960',
        'Audita qualificação dos profissionais chave, coerência técnica das funções e portfólios comprovados.',
        [
          { item: 'Coordenação Geral / Direção Artística com currículo e portfólio comprovado', pattern: /(coordena[çc][ãa]o|dire[çc][ãa]o|respons[áa]vel|portf[óo]lio|curr[íi]culo)/i, legalRef: 'Súmula TCU 263' },
          { item: 'Produção Executiva com experiência em gestão pública e prestação de contas', pattern: /(produ[çc][ãa]o executiva|produtor|gest[ãa]o|presta[çc][ãa]o)/i, legalRef: 'Capacidade Operacional' },
          { item: 'Equipe Técnica especializada (Iluminação, Sonorização, Cenotecnia)', pattern: /(t[ée]cnic[ao]|som|ilumina[çc][ãa]o|cen[áa]rio|luz|operador)/i, legalRef: 'Segurança Técnica' },
          { item: 'Equipe de Acessibilidade habilitada (Intérprete de Libras com registro/diploma)', pattern: /(int[ée]rprete|audiodescritor|libras|acessibilidade|habilita)/i, legalRef: 'Lei 12.319/2010' },
          { item: 'Previsão de cartas de anuência formalmente assinadas por toda a equipe chave', pattern: /(anu[êe]ncia|declara[çc][ãa]o|concord[âa]ncia|aceite)/i, legalRef: 'Conformidade Documental' }
        ],
        'Coordenação Geral: Experiência comprovada superior a 5 anos na gestão de projetos culturais.\nProdução Executiva: Responsável por licenças, contratos e prestação de contas.\nDireção Técnica: Operação de luz, sonorização e segurança de palco.\nEquipe de Inclusão: Intérprete de Libras habilitado e audiodescritor certificado.',
        content.ficha_tecnica
      ),

      // 10. Comunicação
      this.evaluateParecerista(
        10,
        'comunicacao',
        'comunicacao',
        'Dra. Carmen Miranda',
        'Comunicação, Mídia & Divulgação',
        'Manual de Uso da Marca Federal/MinC, Art. 37, §1º da CF/88 e Teto de 10% de Mídia',
        'Audita plano de mídia, canais de assessoria, aplicação de marcas oficiais e vedação a promoção pessoal.',
        [
          { item: 'Aplicação obrigatória das logomarcas oficiais e chancelas de patrocínio', pattern: /(logomarca|chancela|marca oficial|cr[ée]dito|patroc[íi]nio|governo|minc)/i, legalRef: 'Manual de Identidade Visual' },
          { item: 'Estratégia de assessoria de imprensa e relacionamento com veículos comunitários', pattern: /(assessoria de imprensa|jornal|r[áa]dio|comunit[áa]ri|clipping)/i, legalRef: 'Difusão Local' },
          { item: 'Plano de mídias digitais e redes sociais com campanhas orgânicas/pagas', pattern: /(rede social|m[íi]dia digital|instagram|youtube|campanha|conte[úu]do)/i, legalRef: 'Engajamento Digital' },
          { item: 'Materiais impressos sustentáveis e cartazes em equipamentos públicos', pattern: /(cartaz|panfleto|banner|impress[ãa]o|ponto comunit[áa]rio)/i, legalRef: 'Divulgação Territorial' },
          { item: 'Estrita observância ao Art. 37, §1º da CF/88 (proibição de promoção pessoal)', pattern: /(impessoalidade|car[áa]ter educativo|informativo|sem promo[çc][ãa]o)/i, legalRef: 'Art. 37 §1º CF/88' }
        ],
        'Plano de comunicação estruturado em mídias digitais, assessoria de imprensa local e cartazes em pontos comunitários. Aplicação rigorosa das marcas e créditos oficiais do órgão de fomento em todos os materiais promocionais.',
        content.comunicacao
      ),

      // 11. Monitoramento
      this.evaluateParecerista(
        11,
        'monitoramento',
        'monitoramento',
        'Dr. Milton Santos',
        'Monitoramento & Avaliação de Resultados',
        'Art. 18 da Lei nº 14.903/2024 (Relatório de Execução do Objeto em até 120 dias) e Matriz Lógica',
        'Verifica instrumentos objetivos de mensuração, indicadores de processo e salvaguarda documental.',
        [
          { item: 'Listas de presença com autodeclaração de perfil do público', pattern: /(lista de presen[çc]a|perfil|autodeclara[çc][ãa]o|demogr[áa]fic)/i, legalRef: 'Aferição de Público' },
          { item: 'Pesquisas ou questionários de avaliação e satisfação do espectador', pattern: /(question[áa]rio|pesquisa|satisfa[çc][ãa]o|avalia[çc][ãa]o|formul[áa]rio)/i, legalRef: 'Indicador de Qualidade' },
          { item: 'Registro fotográfico e videográfico georreferenciado e datado', pattern: /(fotogr[áa]fic|v[íi]deo|geolocaliz|registro|clipping)/i, legalRef: 'Comprovação de Objeto' },
          { item: 'Auditoria interna periódica de despesas e notas fiscais', pattern: /(nota fiscal|despesa|comprovante|auditoria|extrato)/i, legalRef: 'Regularidade Financeira' },
          { item: 'Compromisso de entrega do Relatório de Execução do Objeto em até 120 dias', pattern: /(120 dias|relat[óo]rio final|execu[çc][ãa]o do objeto)/i, legalRef: 'Art. 18 Lei 14.903/2024' }
        ],
        'Mecanismos de Aferição:\n- Listas de presença com autodeclaração de perfil demográfico.\n- Questionários digitais e físicos de avaliação de satisfação (escala de 1 a 5).\n- Relatório fotográfico em alta resolução geolocalizado com clipping de imprensa.',
        content.monitoramento
      ),

      // 12. Sustentabilidade
      this.evaluateParecerista(
        12,
        'sustentabilidade',
        'sustentabilidade',
        'Conselheiro Chico Mendes',
        'Sustentabilidade & ESG',
        'Política Nacional de Resíduos Sólidos (Lei nº 12.305/2010), ODS da ONU e Eficiência Energética',
        'Examina neutralização de impactos ecológicos, gestão de resíduos, economia circular e responsabilidade socioambiental.',
        [
          { item: 'Gestão e destinação correta de 100% dos resíduos sólidos recicláveis', pattern: /(res[íi]duo|recicl[áa]vel|coleta seletiva|lixo|cooperativa)/i, legalRef: 'Lei 12.305/2010' },
          { item: 'Eliminação de copos, talheres e recipientes plásticos de uso único', pattern: /(pl[áa]stico|descart[áa]vel|biodegrad[áa]vel|reutiliz[áa]vel|copo)/i, legalRef: 'Redução na Fonte' },
          { item: 'Utilização de iluminação cênica de baixo consumo energético (LED)', pattern: /(led|baixo consumo|efici[êe]ncia energ[ée]tica|energia)/i, legalRef: 'Conservação de Energia' },
          { item: 'Incentivo a transporte coletivo, carona solidária ou mobilidade ativa', pattern: /(transporte coletivo|bicicleta|mobilidade|carona|pedestre)/i, legalRef: 'Mitigação de Carbono' },
          { item: 'Parceria com catadores de materiais recicláveis do município', pattern: /(catador|cooperativa local|associa[çc][ãa]o de catadores)/i, legalRef: 'Inclusão Socioprodutiva' }
        ],
        'Medidas de Sustentabilidade:\n- Separação e destinação adequada de 100% dos resíduos recicláveis para cooperativa local.\n- Eliminação de materiais plásticos de uso único durante a realização das ações.\n- Utilização de iluminação cênica de baixo consumo (LED).',
        content.sustentabilidade
      ),

      // 13. Rider Técnico / Infraestrutura
      this.evaluateParecerista(
        13,
        'infraestrutura',
        'rider',
        'Eng. Oscar Niemeyer',
        'Rider Técnico & Infraestrutura Operacional',
        'Normas ABNT NBR 5410, NR-10 (Segurança Elétrica), NR-35 (Trabalho em Altura) e AVCB',
        'Valida engenharia acústica, segurança estrutural de palcos, dimensionamento elétrico e proteção contra incêndio.',
        [
          { item: 'Sistema de sonorização dimensionado (PA balanceado e monitoração)', pattern: /(sistema de som|pa|mesa|microfone|caixa|ac[úu]stic|canal)/i, legalRef: 'Qualidade Sonora' },
          { item: 'Iluminação cênica compatível com a ficha técnica do espetáculo', pattern: /(ilumina[çc][ãa]o|refletor|grid|mesa dmx|luz)/i, legalRef: 'Especificação Visual' },
          { item: 'Instalações elétricas seguras com aterramento conforme NR-10', pattern: /(el[ée]trica|aterramento|nr-10|quadro|disjuntor|gerador)/i, legalRef: 'NR-10 / NBR 5410' },
          { item: 'Estruturas de palco/cenografia inspecionadas com ART/RRT e NR-35', pattern: /(art|rrt|estrutura|palco|treli[çc]a|box truss|nr-35)/i, legalRef: 'Segurança Estrutural' },
          { item: 'Espaço com Auto de Vistoria do Corpo de Bombeiros (AVCB/CLCB) válido', pattern: /(avcb|clcb|bombeiro|extintor|sa[íi]da de emerg[êe]ncia)/i, legalRef: 'Segurança de Pânico' }
        ],
        'Estrutura e Equipamentos:\n- Sistema de PA estereofônico e mesa digital de 16 canais balanceada.\n- Iluminação cênica com refletores LED e estrutura de sustentação inspecionada.\n- Espaço com alvará e Auto de Vistoria do Corpo de Bombeiros (AVCB) vigente.',
        content.rider
      ),

      // 14. Compliance Regulatório
      this.evaluateParecerista(
        14,
        'compliance',
        'compliance',
        'Des. Pontes de Miranda',
        'Compliance Regulatório & Jurídico',
        'Lei nº 14.133/2021, CNDT, CRF/FGTS, Lei 9.610/1998 (Ecad), SisGen e CF/88',
        'Audita regularidade jurídica integral, certidões negativas tributárias/trabalhistas, vedações a nepotismo e direitos autorais.',
        [
          { item: 'Certidão Negativa de Débitos Trabalhistas (CNDT) e FGTS válidas', pattern: /(cndt|fgts|trabalhist|regularidade fiscal)/i, legalRef: 'Lei 12.440/2011' },
          { item: 'Certidões Conjuntas de Tributos Federais, Estaduais e Municipais', pattern: /(certid[ãa]o|cnd|receita federal|fazenda|tributos)/i, legalRef: 'Art. 68 Lei 14.133/2021' },
          { item: 'Regularidade autoral e recolhimento prévio ao Ecad (Lei 9.610/1998)', pattern: /(ecad|direitos autorais|autoral|lei 9610|obra protegida)/i, legalRef: 'Lei 9.610/1998' },
          { item: 'Declaração de inexistência de trabalho noturno/perigoso a menores (CF/88)', pattern: /(menor|trabalho infantil|art\.?\s*7[ºo]|inciso xxxiii)/i, legalRef: 'Art. 7º XXXIII CF/88' },
          { item: 'Declaração de inexistência de parentesco ou nepotismo com avaliadores', pattern: /(nepotismo|parentesco|impedimento|suspei[çc][ãa]o|veda[çc][ãa]o)/i, legalRef: 'Súmula Vinculante 13 STF' },
          { item: 'Regularidade no Sistema de Gestão do Patrimônio Genético (SisGen)', pattern: /(sisgen|patrim[ôo]nio gen[ée]tico|conhecimento tradicional)/i, legalRef: 'Lei 13.123/2015' }
        ],
        'Conformidade Jurídico-Regulatória:\n- Manutenção da regularidade fiscal plena (Certidões CND, CNDT, FGTS e Fazendas Estadual/Municipal).\n- Recolhimento e quitação prévia dos direitos de execução pública musical (Ecad).\n- Declaração expressa de cumprimento do Art. 7º, XXXIII da CF/88 (inexistência de trabalho infantil).',
        content.compliance
      )
    ];
  }
}

