#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Surgical Chunker para Editais de Grande Porte (Padrão Ponytail - Zero Dependências Pesadas)
Fatia documentos extensos (50 a 300 páginas) em extratos temáticos cirúrgicos (< 3.000 tokens)
para os 14 pareceristas especialistas M.U.S.A.
Reduz em até 98% o custo de tokens e tempo de latência de API.
"""

import re
from typing import Dict, List, Optional, Set

# Mapeamento canônico de palavras-chave temáticas para os 14 pareceristas M.U.S.A.
MUSA_THEMATIC_KEYWORDS: Dict[str, List[str]] = {
    "justificativa": [
        "objeto", "justificativa", "relevância", "motivação", "finalidade",
        "interesse público", "territorial", "políticas públicas", "plano nacional de cultura"
    ],
    "objetivos": [
        "objetivo", "objetivos", "meta", "metas", "smart", "mensurável",
        "alcance", "indicador", "resultado esperado"
    ],
    "metodologia": [
        "metodologia", "plano de trabalho", "etapa", "etapas", "pré-produção",
        "produção", "pós-produção", "atividades", "operacional"
    ],
    "cronograma": [
        "cronograma", "prazo", "prazos", "data", "inscrição", "inscrições",
        "impugnação", "recurso", "homologação", "vigência", "execução",
        "meses", "dias úteis", "calendário", "prorrogação", "art. 183"
    ],
    "orcamento": [
        "orçamento", "recursos financeiros", "financeiro", "valor", "r$",
        "custo", "custos", "preço", "teto", "15%", "10%", "taxa de bdi",
        "bdi", "súmula tcu 272", "tabela referencial", "despesa", "pagamento",
        "sobrepreço", "glosa", "remanejamento", "art. 12"
    ],
    "acessibilidade": [
        "acessibilidade", "libras", "audiodescrição", "braille", "pcd",
        "pessoa com deficiência", "mobilidade reduzida", "nbr 9050",
        "inclusão", "intérprete", "legenda", "assentos", "acessibilidade comunicacional",
        "art. 18"
    ],
    "democratizacao": [
        "democratização", "gratuidade", "ingressos", "acesso público",
        "descentralização", "periferia", "vulnerabilidade", "gratuito",
        "distribuição de ingressos"
    ],
    "contrapartida": [
        "contrapartida", "retorno social", "oficina", "palestra", "formação",
        "contrapartida social", "impacto social", "comunidade"
    ],
    "equipe": [
        "ficha técnica", "equipe", "currículo", "atestado de capacidade",
        "súmula tcu 263", "experiência", "portfólio", "notória especialização",
        "qualificação técnica", "responsável técnico"
    ],
    "comunicacao": [
        "comunicação", "divulgação", "mídia", "imprensa", "logomarca",
        "redes sociais", "assessoria de imprensa", "visibilidade", "créditos"
    ],
    "monitoramento": [
        "monitoramento", "avaliação", "indicadores", "prestação de contas",
        "relatório de atividades", "matriz lógica", "fiscalização"
    ],
    "sustentabilidade": [
        "sustentabilidade", "esg", "resíduos", "meio ambiente", "ambiental",
        "reciclagem", "descarte", "impacto ambiental"
    ],
    "rider_tecnico": [
        "rider", "rider técnico", "iluminação", "sonorização", "palco",
        "cenotécnica", "abnt", "avcb", "clcb", "bombeiros", "infraestrutura",
        "elétrica", "acústica"
    ],
    "compliance": [
        "habilitação", "compliance", "jurídica", "certidão", "cnd", "cndt",
        "fgts", "inss", "seguridade social", "receita federal", "regularidade",
        "ecad", "direitos autorais", "nepotismo", "falência", "trabalhista",
        "marco legal", "lei 14.133", "lei 14.903"
    ]
}

# Aliases sinônimos para interoperabilidade
ALIASES: Dict[str, str] = {
    "juridico": "compliance",
    "habilitacao": "compliance",
    "prazos": "cronograma",
    "financeiro": "orcamento",
    "tabela_referencial": "orcamento",
    "inclusao": "acessibilidade",
    "democratizacao_acesso": "democratizacao",
    "publico": "democratizacao",
    "contrapartida_social": "contrapartida",
    "ficha_tecnica": "equipe",
    "plano_trabalho": "metodologia",
    "rider": "rider_tecnico",
    "rider_tecnico": "rider_tecnico",
    "infraestrutura": "rider_tecnico"
}


def _normalize_key(key: str) -> str:
    """Normaliza o identificador do parecerista resolvendo aliases comuns."""
    cleaned = key.strip().lower().replace("-", "_").replace(" ", "_")
    return ALIASES.get(cleaned, cleaned)


def _split_into_blocks(text: str) -> List[str]:
    """
    Divide o texto em blocos semânticos (capítulos, seções ou parágrafos).
    Preserva a estrutura lógica de leitura do edital.
    """
    # Divide primariamente por quebras de linha duplas ou cabeçalhos
    raw_blocks = re.split(r'\n\s*\n', text)
    blocks: List[str] = []
    
    for block in raw_blocks:
        b = block.strip()
        if not b:
            continue
        # Se o bloco for muito longo (> 3000 caracteres), quebra por linhas numeradas
        if len(b) > 3000:
            subparts = re.split(r'(?=\n\s*(?:CAPÍTULO|[0-9]+\.[0-9]+|\bArt\.?\s*[0-9]+))', b)
            for sp in subparts:
                sp_clean = sp.strip()
                if sp_clean:
                    blocks.append(sp_clean)
        else:
            blocks.append(b)
            
    return blocks


def _score_block(block: str, keywords: List[str]) -> int:
    """Calcula a relevância de um bloco para o conjunto de palavras-chave."""
    lower_block = block.lower()
    score = 0
    for kw in keywords:
        kw_lower = kw.lower()
        count = lower_block.count(kw_lower)
        if count > 0:
            # Palavras compostas/específicas recebem peso maior
            weight = 3 if (" " in kw_lower or "%" in kw_lower or "súmula" in kw_lower or "cndt" in kw_lower) else 1
            score += count * weight
    return score


def get_surgical_context_for_parecerista(
    edital_text: str, 
    parecerista_key: str, 
    max_chars: int = 12000
) -> str:
    """
    Extrai o extrato cirúrgico exclusivo para um determinado parecerista MUSA.
    Garante que cláusulas irrelevantes sejam descartadas para respeitar o teto de tokens.
    """
    norm_key = _normalize_key(parecerista_key)
    keywords = MUSA_THEMATIC_KEYWORDS.get(norm_key, [])
    
    if not keywords:
        # Fallback seguro: retorna corte inicial do edital
        return edital_text[:max_chars]

    blocks = _split_into_blocks(edital_text)
    if not blocks:
        return edital_text[:max_chars]

    # Identifica o preâmbulo (identificação do edital e órgão)
    preamble = blocks[0] if len(blocks) > 0 and any(h in blocks[0].upper() for h in ["EDITAL", "CHAMAMENTO", "PREGÃO", "CONCURSO", "ÓRGÃO"]) else ""

    # Pontua cada bloco
    scored_blocks = []
    for idx, block in enumerate(blocks):
        # Evita duplicar o preâmbulo nos blocos avaliados
        if idx == 0 and preamble:
            continue
        score = _score_block(block, keywords)
        if score > 0:
            scored_blocks.append((idx, score, block))

    if not scored_blocks:
        # Se nenhum bloco pontuou, tenta buscar por palavras-chave parciais ou retorna preâmbulo + início
        fallback = f"{preamble}\n\n{edital_text[:max_chars]}" if preamble else edital_text[:max_chars]
        return fallback.strip()

    # Mantém a ordem original de aparição dos blocos relevantes no edital
    scored_blocks.sort(key=lambda x: x[0])

    selected_texts = []
    current_length = len(preamble) + 2 if preamble else 0

    if preamble:
        selected_texts.append(preamble)

    for idx, score, block in scored_blocks:
        block_len = len(block) + 2
        if current_length + block_len <= max_chars:
            selected_texts.append(block)
            current_length += block_len
        else:
            break

    result = "\n\n".join(selected_texts)
    return result.strip()


def extract_surgical_bundle(edital_text: str) -> Dict[str, str]:
    """
    Gera o bundle cirúrgico completo com as fatias temáticas para todos os 14 pareceristas MUSA.
    Permite envio simultâneo de requisições super leves ou armazenamento local em cache.
    Popula tanto as chaves canônicas quanto os aliases mais comuns (rider, publico, ficha_tecnica).
    """
    bundle: Dict[str, str] = {}
    for key in MUSA_THEMATIC_KEYWORDS.keys():
        bundle[key] = get_surgical_context_for_parecerista(edital_text, key)

    # Popula aliases complementares para interoperabilidade com o frontend
    for alias_key, canon_key in ALIASES.items():
        if canon_key in bundle and alias_key not in bundle:
            bundle[alias_key] = bundle[canon_key]

    return bundle
