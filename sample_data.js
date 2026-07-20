// Sample Data for EditalAudit AI
const SAMPLE_EDITAL_TEXT = "--- PAGE 1 ---\n \n \n \nCHAMADA PÚBLICA Nº 2026/001 \nEDIT AL RIO DOCE PARTICIPA TIVO E COMUNIT ÁRIO \nOBJETO: Seleção de Projetos Comunitários \n \n \nIMPORT ANTE \n \nRECEBIMENTO DAS PROPOST AS DE PROPOST AS \nPrazo limite: até 23h59 do dia 29.06.2026 \n \nEndereço eletrônico: riodoce@fbb.org.br \n \n \nCRONOGRAMA \nLANÇAMENTO DO EDIT AL 22.05.2026 \nDA T A LIMITE RECEBIMENTO DE PROPOSTAS 29.06.2026 \nPREVISÃO DIVULGAÇÃO RESUL T ADO PARCIAL 20.07 .2026 \nAPRESENT AÇÃO DE RECURSO 20.07.2026 a 23.07 .2026 \nPUBLICAÇÃO RESUL T ADO FINAL 07.08.2026 \nPREVISÃO FORMALIZAÇÃO 14.08.2026 \n \n* Alterações das datas e/ou prazos do cronograma acima serão divulgadas na página \neletrônica www.fbb.org.br em Editais de Seleções Públicas. Nesse caso, a entidade \nproponente se responsabiliza por acompanhar informações sobre o edital no endereço \neletrônico mencionado. \n \n* Os prazos acima consideram o horário de Brasília-DF, até às 23h59 do dia 29.06.2026. \n \nA Fundação Banco do Brasil – Fundação BB, instituição sem fins lucrativos \ncriada pelo Banco do Brasil S.A., com sede em Brasília/DF e autonomia \nadministrativa e financeira, torna público este Edital de Chamada Pública. \nEsta seleção segue as regras do Instrumento para Aplicação de Recursos do \nFundo Rio Doce nº 01/2026, firmado entre a União (por meio da Secretaria-\nGeral da Presidência da República  – SG/PR), o Banco do Brasil S.A. e a \nFundação BB. \nO edital faz parte das ações previstas no Novo Acordo Rio Doce, homologado \npelo Supremo Tribunal Federal nos autos da Petição nº 13.157 /DF para \nReparação Integral e Definitiva relative ao rompimento da Barragem de \nFundão, integrante do Complexo Minerário de Germano, localizada no \nMunicípio de Mariana, Estado de Minas  Gerais, ocorrido em 5 de novembro \nde 2015. \n \n1. DISPOSIÇÕES GERAIS \n \n1.1 A escolha dos projetos será feita por uma Comissão de Seleção, composta \npor funcionários da Fundação Banco do Brasil e, se necessário, também por \nfuncionários da FBB S.A. e da Secretaria-Geral da Presidência da República...";

const SAMPLE_AUDIT_RESULT = {
  "metadados_do_edital": {
    "titulo_identificado": "Chamada Pública nº 2026/001 - Edital Rio Doce Participativo e Comunitário",
    "organizacao_emissora": "Fundação Banco do Brasil (Fundação BB)",
    "valor_total_do_fomento": "R$ 225.000.000,00",
    "publico_alvo": "Organizações da Sociedade Civil (OSCs), cooperativas, coletivos formalizados/informais e comunidades tradicionais (IPCTs)."
  },
  "alertas_criticos_juridicos": [
    {
      "tipo_de_erro": "Contradição Temporal de Envio de Documentação",
      "descricao_da_falha": "O Edital cita no item 6.5.c a obrigatoriedade de envio do Anexo 2 (Declarações/Atas de Anuência das Comunidades Atingidas) no momento de inscrição da proposta. No entanto, o cronograma e os formulários listam o Anexo 2 para ser providenciado ou assinado após a aprovação do projeto (Mês 1 e 2) durante a fase de execução.",
      "onde_esta_no_texto": "Item 6.5.c vs. Cronograma de Atividades do Anexo 3.",
      "correcao_sugerida": "Uniformizar as redações para exigir o Anexo 2 assinado e entregue impreterivelmente no ato de submissão do projeto."
    },
    {
      "tipo_de_erro": "Exclusão burocrática de Microempreendedores (MEI)",
      "descricao_da_falha": "O item 5.1.f proíbe terminantemente a participação de Microempreendedores Individuais (MEI) e empresas com fins lucrativos. Contudo, o edital incentiva iniciativas de economia popular/solidária e geração de renda local, que comumente são operadas por cooperados ou artesãos constituídos como MEI, gerando incoerência prática.",
      "onde_esta_no_texto": "Item 5.1.f (Impedimentos) vs. Item 2.2 (Geração de renda e economia popular).",
      "correcao_sugerida": "Abrir exceção para MEIs que façam parte de redes ou cooperativas de economia solidária sob chancela coletiva, ou permitir a representação sob regras específicas."
    },
    {
      "tipo_de_erro": "Prazo excessivamente exíguo para envio postal físico",
      "descricao_da_falha": "O item 6.4.3 exige o envio de documentos originais ou autenticados para a sede em Brasília/DF dentro de apenas 5 dias úteis a contar da notificação, o que prejudica proponentes isolados ou distantes da calha do Rio Doce no Espírito Santo e Minas Gerais.",
      "onde_esta_no_texto": "Item 6.4.3 (Disposições de envio).",
      "correcao_sugerida": "Substituir a remessa física obrigatória pelo carregamento de cópias autenticadas eletronicamente e assinaturas digitais no SISTEMA, reduzindo custos de logística."
    }
  ],
  "avaliacao_de_qualidade": [
    {
      "dimensao": "Clareza e Linguagem Simples",
      "nota_maxima": 25,
      "nota_atribuida": 22,
      "justificativa": "O edital apresenta linguagem clara e direta em sua maior parte, com definições fáceis para coletivos informais e entidades religiosas. Perde 3 pontos pela complexidade no trâmite de envio físico de originais a Brasília."
    },
    {
      "dimensao": "Segurança Jurídica e Prazos",
      "nota_maxima": 25,
      "nota_atribuida": 17,
      "justificativa": "Contradições temporais graves sobre o momento de entrega da anuência da comunidade (Anexo 2) e exigência desnecessária de correspondência física geram severa insegurança jurídica e risco de exclusão processual."
    },
    {
      "dimensao": "Critérios de Pontuação e Objetividade",
      "nota_maxima": 25,
      "nota_atribuida": 21,
      "justificativa": "Os critérios de pontuação técnica (Anexo 7) e de priorização (Anexo 8) estão descritos, mas há subjetividade em dimensões de adequação de metodologias e 'interação entre comunidades' sem métricas concretas."
    },
    {
      "dimensao": "Inclusão, Acessibilidade e Cotas",
      "nota_maxima": 25,
      "nota_atribuida": 25,
      "justificativa": "Pontuação máxima. O edital prevê de forma brilhante cotas para IPCT (5%), priorização para mulheres, negros, PcDs, jovens e idosos, além de prever acessibilidade cível em galpões e tradução simultânea em Libras."
    }
  ],
  "notas_totais": {
    "nota_final_do_edital": 85,
    "classificacao": "Boa Qualidade (Requer Ajustes)"
  },
  "feedback_qualitativo": {
    "pontos_fortes_da_redacao": [
      "Clara definição das linhas de fomento e das faixas de financiamento (Faixa 1 e Faixa 2) adequadas à complexidade.",
      "Garantia de orçamento mínimo territorial de R$ 1,5 milhão por município, descentralizando a captação.",
      "Amplo escopo de acessibilidade e cotas com critérios de desempate claros voltados para grupos vulnerabilizados."
    ],
    "buracos_ou_omissoes": [
      "Inexistência de canais alternativos locais ou digitais para validação de atos constitutivos e atas, forçando envio de cópia física via correios a Brasília.",
      "Ausência de detalhamento prático dos modelos de relatórios parciais de acompanhamento e da prestação de contas no sistema FBB."
    ],
    "parecer_geral": "A minuta da Chamada Pública nº 2026/001 é tecnicamente robusta e estruturada de acordo com as diretrizes do Novo Acordo do Rio Doce. O edital se destaca no quesito inclusão e territorialidade. Entretanto, a redação contém conflitos e redundâncias burocráticas (envio postal físico e divergências sobre o momento de entrega da anuência Anexo 2) que põem em risco a segurança jurídica e a ampla concorrência dos proponentes locais mais vulneráveis."
  },
  "plano_de_revisao_para_redatores": [
    {
      "pendencia": "Corrigir a ambiguidade temporal sobre o momento de entrega do Anexo 2 (anuência) unificando a exigência para o ato de inscrição ou de contratação.",
      "nivel_de_urgencia": "ALTA"
    },
    {
      "pendencia": "Substituir a obrigação de entrega de documentos físicos em Brasília/DF por envio de arquivos autenticados/assinados digitalmente via SISTEMA.",
      "nivel_de_urgencia": "ALTA"
    },
    {
      "pendencia": "Definir com clareza a admissibilidade de MEIs formados por trabalhadores e artesãos locais da economia popular e solidária no escopo de fomento.",
      "nivel_de_urgencia": "MEDIA"
    },
    {
      "pendencia": "Detallar as métricas e indicadores de monitoramento do Anexo 7 para diminuir a subjetividade na avaliação das metas.",
      "nivel_de_urgencia": "MEDIA"
    }
  ]
};

// ==========================================
// BANCA SIMULATION MOCK DATA
// ==========================================

const SAMPLE_PROPOSAL_TEXT = "PROPOSTA DE PROJETO CULTURAL\nTítulo: Pescador Pé de Serra: Do Mar às Danças de Forró\nProponente: Ponto de Cultura Tambores Esperança (via Motiv)\nValor Solicitado: R$ 220.000,00\nPrazo de Execução: 12 meses\nTerritório: Fundão e Serra/ES (Litoral Atingido)\n\nResumo: Fortalecimento das identidades tradicionais da pesca artesanal associada a manifestações culturais de dança e música forró tradicional. Tecnologia social inspirada na Band'Erê (FBB). Comitê comunitário gestor para tomadas de decisão e transparência. Acessibilidade promovida com intérpretes de Libras nas oficinas e apresentações comunitárias.";

const SAMPLE_BANCA_RESULT = {
  "metadados_do_projeto": {
    "nome_do_projeto": "Pescador Pé de Serra: Do Mar às Danças de Forró",
    "proponente": "Ponto de Cultura Tambores Esperança (via Motiv)",
    "faixa_de_financiamento": "Faixa 2 — R$ 220.000",
    "prazo_de_execucao": "12 meses",
    "municipios_atendidos": "Fundão e Serra/ES",
    "edital_referencia": "Edital Rio Doce Participativo e Comunitário 2026/011 - Anexo 7 e 8"
  },
  "notas_da_banca": {
    "nota_final": 70.5,
    "nota_tecnica_total": 37.5,
    "nota_priorizacao_total": 33.0,
    "nota_potencial": 81.0,
    "classificacao": "Bom e Classificável"
  },
  "ajustes_realizados": [
    {
      "alteracao_feita": "Matriz Lógica criada (2 objetivos, 4 metas, indicadores e meios de verificação)",
      "criterio_impactado": "CR1, CR5"
    },
    {
      "alteracao_feita": "Plano de Monitoramento e Avaliação com linha de base e responsáveis",
      "criterio_impactado": "CR5"
    },
    {
      "alteracao_feita": "Comitê Comunitário Gestor (governança compartilhada e transparência)",
      "criterio_impactado": "Prioriz. 1, CR3"
    },
    {
      "alteracao_feita": "Tecnologia Social ancorada na Band'Erê (Transforma FBB) + forró/IPHAN",
      "criterio_impactado": "TS / CR1"
    },
    {
      "alteracao_feita": "Parceiros citados nominalmente (Colônias, Secretarias, Cineclubes)",
      "criterio_impactado": "CR3, Prioriz. 6"
    },
    {
      "alteracao_feita": "Atuação prévia na região atingida explicitada (desde 2021)",
      "criterio_impactado": "Prioriz. 4, CR3"
    },
    {
      "alteracao_feita": "Território justificado (Nova Almeida listada; Fundão por adjacência)",
      "criterio_impactado": "Prioriz. 7"
    },
    {
      "alteracao_feita": "Reorganização nos campos oficiais (2.6, 2.7, 5.1-5.6) do Anexo 3",
      "criterio_impactado": "Geral"
    },
    {
      "alteracao_feita": "Erro aritmético corrigido em subtotais do orçamento original",
      "criterio_impactado": "CR4"
    }
  ],
  "pontuacao_tecnica": [
    {
      "criterio": "CR1 — Adequação ao objeto e coerência (metas, indicadores, resultados)",
      "nota_maxima": 10.0,
      "nota_atribuida": 8.5,
      "justificativa": "Há Matriz Lógica completa (2 OE → 4 metas → atividades → resultados → indicadores → meios). A solução responde ao problema e as metas levam aos resultados. Único resíduo: o nexo causal com o desastre ainda é mais argumentativo que evidenciado."
    },
    {
      "criterio": "CR2 — Metodologia e plano de trabalho",
      "nota_maxima": 10.0,
      "nota_atribuida": 9.0,
      "justificativa": "Cronograma de 12 meses claro (+2); diversidade cultural forte (+2); direitos humanos/acessibilidade — Libras, ≥50% mulheres (+2); reconhece os modos de vida da pesca (+2). Participação na construção declarada, mas depende de anexar evidências (+1)."
    },
    {
      "criterio": "CR3 — Exequibilidade técnica (experiência, parcerias, monitoramento)",
      "nota_maxima": 10.0,
      "nota_atribuida": 7.5,
      "justificativa": "Experiência da instituição desde 2021 na área atingida (+5); parcerias agora citadas nominalmente — IPHAN, colônias, Secretarias, cineclubes (+5); participação comunitária no monitoramento via Comitê Gestor (+5). Falta apenas capacitação da equipe de gestão (15/20 -> 7,5)."
    },
    {
      "criterio": "CR4 — Orçamento, economicidade e custos",
      "nota_maxima": 10.0,
      "nota_atribuida": 8.0,
      "justificativa": "Memória de cálculo detalhada e agora aderente às metas da Matriz Lógica; gestão cravada em 25%. Atenção de economicidade: ~25% em equipamentos e ~14% em alimentação; custo/beneficiário direto alto."
    },
    {
      "criterio": "CR5 — Monitoramento, indicadores e avaliação",
      "nota_maxima": 5.0,
      "nota_atribuida": 4.5,
      "justificativa": "Indicadores por meta, meios de verificação explícitos e plano de M&A com linha de base, responsáveis e periodicidade. Bem resolvido."
    }
  ],
  "pontuacao_priorizacao": [
    {
      "criterio": "1 — Governança participativa (decisões + transparência)",
      "nota_maxima": 5.0,
      "nota_atribuida": 5.0,
      "justificativa": "Comitê Comunitário Gestor (colônias, mestres, mulheres, jovens) com decisões compartilhadas, reuniões periódicas e prestação de contas pública; beneficiários acompanham os indicadores."
    },
    {
      "criterio": "2 — Caracterização de público prioritário",
      "nota_maxima": 5.0,
      "nota_atribuida": 5.0,
      "justificativa": "Identifica objetivamente mulheres (≥50%), jovens, pescadores artesanais e PcD (Libras)."
    },
    {
      "criterio": "3 — Grupos prioritários na coordenação (mulheres/jovens/IPCT)",
      "nota_maxima": 5.0,
      "nota_atribuida": 5.0,
      "justificativa": "≥50% mulheres na gestão + Mestre Tradicional e pescadores na equipe com Anexo 9. Critério maximizado."
    },
    {
      "criterio": "4 — Atuação prévia na defesa das comunidades atingidas",
      "nota_maxima": 5.0,
      "nota_atribuida": 4.0,
      "justificativa": "Ponto de Cultura formalizado em 2021, atuando na faixa atingida. A atuação é real; falta apenas anexar as evidências (atas, fotos, notícias) para chegar a 5."
    },
    {
      "criterio": "5 — Coordenação vulnerabilizada (CadÚnico + área rural)",
      "nota_maxima": 10.0,
      "nota_atribuida": 0.0,
      "justificativa": "Maior oportunidade aberta. Não declarado. Se a coordenação for inscrita no CadÚnico e/ou residir em área rural, vale até 10 pts."
    },
    {
      "criterio": "6 — Interação entre comunidades / redes",
      "nota_maxima": 5.0,
      "nota_atribuida": 4.0,
      "justificativa": "Conecta Fundão e Serra, várias comunidades pesqueiras, economia solidária e parceiros nomeados; falta formalizar as redes para o ponto cheio."
    },
    {
      "criterio": "7 — Localização geográfica (epicentro/calha/litoral)",
      "nota_maxima": 10.0,
      "nota_atribuida": 10.0,
      "justificativa": "Litoral Atingido verificado: Nova Almeida/Serra listada; Fundão na calha atingida (cláusula 'não se limitando')."
    }
  ],
  "riscos_eliminatorios": [
    {
      "item": "Ata de Anuência das Comunidades (Anexo 2)",
      "descricao": "Obrigatória (mín. 10 assinaturas). Sua ausência elimina o projeto na Fase I, independentemente da nota.",
      "acao_sugerida": "Produzir a Ata com as comunidades de Fundão e Serra antes de submeter."
    },
    {
      "item": "Habilitação da entidade",
      "descricao": "CNPJ ativo em um dos 49 municípios (Anexo 1) e certidões fiscais negativas.",
      "acao_sugerida": "Confirmar enquadramento territorial e emitir certidões válidas."
    }
  ],
  "fragilidades_e_pendencias": [
    {
      "item": "P1 · CadÚnico + área rural — 10 pontos não capturados.",
      "acao_sugerida": "Se a coordenação for CadÚnico e/ou residir em área rural, declarar e comprovar (campo 5.6). Melhor custo-benefício de pontuação que resta."
    },
    {
      "item": "P2 · Evidências de atuação prévia e de participação na construção — a anexar.",
      "acao_sugerida": "Juntar atas, fotos, notícias e registros de escutas (campos 5.1 e 5.2). Sobe CR2 e Prioriz. 4."
    },
    {
      "item": "P3 · Nexo causal com o desastre — reforçar com dados locais.",
      "acao_sugerida": "Inserir dados/relatos do dano (adoecimento, queda da pesca, perda de convívio) no campo 2.6."
    },
    {
      "item": "P4 · Capacitação da equipe de gestão — ausente (CR3).",
      "acao_sugerida": "Incluir uma ação simples de formação da equipe (gestão do projeto, prestação de contas)."
    },
    {
      "item": "P5 · Economicidade — orçamento pede defesa.",
      "acao_sugerida": "Reforçar o patrimônio permanente (tombamento) e o alcance via multiplicadores para melhorar a relação custo-impacto."
    },
    {
      "item": "P6 · Redes/cooperativas — formalizar menção.",
      "acao_sugerida": "Nomear as cooperativas/redes parceiras e o papel de cada uma na continuidade."
    }
  ],
  "pontos_fortes": [
    "Coordenação prioritária forte: ≥50% mulheres + Mestre Tradicional/pescadores com Anexo 9.",
    "Governança participativa real: Comitê Comunitário Gestor com transparência e controle social.",
    "Estrutura técnica avaliável: Matriz Lógica + plano de M&A com indicadores e meios de verificação.",
    "Tecnologia Social ancorada: metodologia inspirada na TS reconhecida Band'Erê (Transforma FBB).",
    "Acessibilidade real: intérprete de Libras nas atividades.",
    "Patrimônio permanente: instrumentos e som tombados garantem legado pós-projeto.",
    "Território e gestão: Litoral Atingido verificado e gestão dentro do teto de 25%."
  ],
  "avaliacao_critica_final": "A proposta está tecnicamente bem montada e competitiva. Tem mérito (cultura popular como reabilitação dos modos de vida da pesca atingida), está no formato avaliável do Anexo 3 — com Matriz Lógica, indicadores e plano de monitoramento — e reúne diferenciais reais: coordenação prioritária (mulheres + mestres tradicionais), governança participativa, acessibilidade em Libras, patrimônio permanente e Tecnologia Social ancorada numa referência reconhecida. Na simulação, ela soma ~70,5/100 (técnicos ~37,5 + priorização ~33), passando o corte com folga e já num patamar disputável. O que ainda a segura não é o mérito, e sim documentação e dois pontos de pontuação: garantir a Ata de Anuência (eliminatório), anexar as evidências de atuação prévia e participação, e — sobretudo — capturar os 10 pontos de CadÚnico/área rural se a coordenação se enquadrar.",
  "lista_de_acao": [
    {
      "num": 1,
      "pendencia": "Ata de Anuência (Anexo 2) — obter no mínimo 10 assinaturas em Fundão e Serra",
      "impacto": "ELIMINATÓRIO",
      "status": false
    },
    {
      "num": 2,
      "pendencia": "CadÚnico / área rural da coordenação — declarar e comprovar no campo 5.6",
      "impacto": "+ até 10 pts",
      "status": false
    },
    {
      "num": 3,
      "pendencia": "Evidências de atuação prévia e de participação — anexar atas, fotos, notícias",
      "impacto": "+ ~1 a 2 pts",
      "status": false
    },
    {
      "num": 4,
      "pendencia": "Habilitação — confirmar CNPJ ativo nos 49 municípios + certidões negativas",
      "impacto": "Habilitação",
      "status": false
    },
    {
      "num": 5,
      "pendencia": "Reforçar o nexo com o desastre — dados/relatos locais do dano (campo 2.6)",
      "impacto": "Qualidade CR1",
      "status": false
    },
    {
      "num": 6,
      "pendencia": "Capacitação da equipe de gestão — incluir uma ação simples (CR3)",
      "impacto": "+ ~1 pt",
      "status": false
    },
    {
      "num": 7,
      "pendencia": "Jovem na coordenação — declarar com Anexo 9, se houver",
      "impacto": "Prioriz. 3",
      "status": false
    },
    {
      "num": 8,
      "pendencia": "Nomear redes/cooperativas parceiras e seu papel na continuidade",
      "impacto": "+ ~1 pt",
      "status": false
    },
    {
      "num": 9,
      "pendencia": "Defesa de economicidade — reforçar patrimônio permanente + multiplicadores",
      "impacto": "Qualidade CR4",
      "status": false
    }
  ]
};
