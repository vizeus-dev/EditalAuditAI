#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Pacote Backend Modular EditalAudit AI (Padrão Ponytail - Zero Dependências Pesadas)
"""

from services.backend.config import PORT, SERVER_START_TIME, USER_AGENTS, SECURITY_HEADERS
from services.backend.security import validate_safe_url
from services.backend.handlers.proxy_handler import (
    safe_encode_cp1252,
    fix_double_encoded_utf8,
    search_ddg_html,
    search_ddg_lite,
    search_wikipedia_api,
    search_yahoo,
    search_ddg,
    extract_document_links,
    HTMLTextExtractor,
    HTMLTableParser
)
from services.backend.handlers.pdf_handler import (
    get_divider,
    add_reportlab_footer,
    format_ptbr_currency,
    clean_html_tags,
    make_reportlab_safe,
    append_html_content_to_story,
    generate_proposal_abnt_pdf
)
from services.backend.handlers.xlsx_handler import generate_budget_xlsx
from services.backend.handlers.anki_handler import handle_anki_export
from services.backend.handlers.llm_handler import handle_llm_generate, handle_llm_stream, llm_gateway
from services.backend.handlers.budget_audit_handler import audit_budget_rules, handle_budget_audit_request
from services.backend.handlers.surgical_chunker import (
    get_surgical_context_for_parecerista,
    extract_surgical_bundle,
    MUSA_THEMATIC_KEYWORDS
)
from services.backend.handlers.document_extractor import (
    extract_text_and_metadata,
    detect_edital_metadata,
    generate_proposal_draft_suggestion
)
from services.backend.handlers.musa_review_handler import (
    evaluate_musa_deep_review,
    MUSA_EXPERT_PROFILES
)
from services.backend.domain_models import (
    CategoriaCusto,
    GrauSeveridade,
    RubricaOrcamentaria,
    DiscrepanciaOrcamentaria,
    DemonstrativoOrcamentario,
    ApontamentoConformidade,
    InstrumentoConvocatorio,
    PareceristaMusaProfile,
    SubmissaoRegistro
)
from services.backend.errors import (
    ApiError,
    ValidationError,
    NotFoundError,
    SecurityError,
    RateLimitExceededError,
    UpstreamTimeoutError,
    format_error_response
)
from services.backend.repositories import AuditReportRepository



