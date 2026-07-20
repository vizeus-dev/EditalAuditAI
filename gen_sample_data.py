import os
import json

def generate():
    edital_path = "edital_rules.txt"
    out_dir = r"C:\Users\victo\.gemini\antigravity-ide\scratch\edital-audit"
    os.makedirs(out_dir, exist_ok=True)
    
    # Read the edital rules
    if os.path.exists(edital_path):
        with open(edital_path, "r", encoding="utf-8") as f:
            edital_text = f.read()
    else:
        edital_text = "Texto do Edital não disponível. Por favor, cole o edital aqui."
    
    # Pre-audited JSON
    mock_audit = {
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
    }
    
    js_content = f"""// Sample Data for EditalAudit AI
const SAMPLE_EDITAL_TEXT = {json.dumps(edital_text, ensure_ascii=False)};

const SAMPLE_AUDIT_RESULT = {json.dumps(mock_audit, indent=2, ensure_ascii=False)};
"""
    
    out_path = os.path.join(out_dir, "sample_data.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Generated sample_data.js at {out_path}")

if __name__ == "__main__":
    generate()
