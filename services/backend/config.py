#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Configurações e Constantes Centrais do Backend EditalAudit AI
"""

import os
import time

# Carrega variáveis de ambiente de .env local se existir (Padrão Ponytail - Zero dependências externas)
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
if os.path.exists(_env_path):
    try:
        with open(_env_path, 'r', encoding='utf-8') as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith('#') and '=' in _line:
                    _k, _v = _line.split('=', 1)
                    os.environ.setdefault(_k.strip(), _v.strip())
    except Exception:
        pass

SERVER_START_TIME = time.time()
PORT = int(os.environ.get('PORT', 8085))

ASAAS_API_KEY = os.environ.get('ASAAS_API_KEY', '')
ASAAS_BASE_URL = os.environ.get('ASAAS_BASE_URL', 'https://api.asaas.com/v3')

# Pool de Chaves Google Gemini (Tiered Pool: Free Round-Robin + Paid Fallback)
GEMINI_FREE_KEYS = [k.strip() for k in os.environ.get('GEMINI_FREE_KEYS', '').split(',') if k.strip()]
GEMINI_PAID_KEY = os.environ.get('GEMINI_PAID_KEY', '').strip()
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '').strip() or (GEMINI_FREE_KEYS[0] if GEMINI_FREE_KEYS else '')


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
]

SECURITY_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    'Content-Security-Policy': (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "worker-src 'self' blob: https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com http://localhost:11434 http://127.0.0.1:11434; "
        "object-src 'none'; "
        "frame-ancestors 'none';"
    )
}
