#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Testes Automatizados para os Endpoints SaaS:
- GET /api/auth/quota (Cotas de Usuário e Features Ativas)
- GET /api/share/<token> (Metadados de Compartilhamento Público Somente-Leitura)
"""

import unittest
import json
from unittest.mock import MagicMock, patch
from server import CustomHTTPRequestHandler


class DummyWfile:
    def __init__(self):
        self.data = bytearray()

    def write(self, b):
        self.data.extend(b)

    def flush(self):
        pass


class TestSaaSQuotaAndShareEndpoints(unittest.TestCase):
    def setUp(self):
        self.handler = CustomHTTPRequestHandler.__new__(CustomHTTPRequestHandler)
        self.handler.wfile = DummyWfile()
        self.handler.rfile = MagicMock()
        self.handler.headers = {}
        self.handler.client_address = ('127.0.0.1', 8000)
        self.sent_responses = []
        self.sent_headers = []

        def mock_send_response(code, message=None):
            self.sent_responses.append(code)

        def mock_send_header(keyword, value):
            self.sent_headers.append((keyword, value))

        def mock_end_headers():
            pass

        self.handler.send_response = mock_send_response
        self.handler.send_header = mock_send_header
        self.handler.end_headers = mock_end_headers

    def test_quota_endpoint_returns_freemium_quota(self):
        """Valida se /api/auth/quota retorna cota mensal e features do plano freemium"""
        self.handler.path = '/api/auth/quota?user_id=proponente-cultura-123'
        self.handler.do_GET()

        self.assertEqual(self.sent_responses[0], 200)
        payload = json.loads(self.handler.wfile.data.decode('utf-8'))
        self.assertEqual(payload.get('user_id'), 'proponente-cultura-123')
        self.assertEqual(payload.get('limit'), 5)
        self.assertEqual(payload.get('plan'), 'freemium')
        self.assertTrue(payload.get('features', {}).get('musa_14_pareceristas'))
        self.assertTrue(payload.get('features', {}).get('local_cross_audit'))

    def test_share_endpoint_returns_readonly_token_status(self):
        """Valida se /api/share/<token> retorna status ativo e flag read_only"""
        self.handler.path = '/api/share/sh_987654321'
        self.handler.do_GET()

        self.assertEqual(self.sent_responses[0], 200)
        payload = json.loads(self.handler.wfile.data.decode('utf-8'))
        self.assertEqual(payload.get('share_token'), 'sh_987654321')
        self.assertTrue(payload.get('read_only'))
        self.assertEqual(payload.get('status'), 'active')


if __name__ == '__main__':
    unittest.main()
