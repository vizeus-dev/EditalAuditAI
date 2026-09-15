#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Testes Automatizados para os Endpoints de Pagamento Asaas Pix e Gestão de Créditos Pay-Per-Use:
- POST /api/pix/create-charge (Criação de cobrança Pix com QR Code)
- GET /api/pix/status (Consulta de status para polling de liberação em 2s)
- POST /api/pix/webhook (Processamento de confirmação de pagamento e liberação de créditos)
- GET /api/auth/quota (Atualização dinâmica do saldo de créditos do usuário)
"""

import unittest
import json
import io
from unittest.mock import MagicMock
from server import CustomHTTPRequestHandler, USER_CREDIT_STORE, PIX_CHARGES_STORE


class DummyWfile:
    def __init__(self):
        self.data = bytearray()

    def write(self, b):
        self.data.extend(b)

    def flush(self):
        pass


class TestPixAndAsaasEndpoints(unittest.TestCase):
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

        # Limpa stores para isolamento dos testes
        USER_CREDIT_STORE.clear()
        PIX_CHARGES_STORE.clear()

    def _execute_post(self, path, payload):
        self.handler.wfile = DummyWfile()
        self.sent_responses.clear()
        self.handler.path = path
        body_bytes = json.dumps(payload).encode('utf-8')
        self.handler.headers = {'Content-Length': str(len(body_bytes))}
        self.handler.rfile = io.BytesIO(body_bytes)
        self.handler.do_POST()
        return json.loads(self.handler.wfile.data.decode('utf-8'))

    def _execute_get(self, path):
        self.handler.wfile = DummyWfile()
        self.sent_responses.clear()
        self.handler.path = path
        self.handler.do_GET()
        return json.loads(self.handler.wfile.data.decode('utf-8'))

    def test_create_charge_single_credit(self):
        """Valida se /api/pix/create-charge gera cobrança de 1 crédito a R$ 9,90"""
        payload = {"user_id": "usr_test_01", "package": "single"}
        resp = self._execute_post('/api/pix/create-charge', payload)

        self.assertEqual(self.sent_responses[0], 200)
        self.assertEqual(resp.get('status'), 'PENDING')
        self.assertEqual(resp.get('amount'), 9.90)
        self.assertEqual(resp.get('credits'), 1)
        self.assertTrue(resp.get('charge_id', '').startswith('pix_asaas_'))
        self.assertTrue('000201' in resp.get('pix_copy_paste', ''))
        self.assertTrue(resp.get('qr_code_image', '').startswith('data:image/svg+xml;base64,'))

    def test_create_charge_pack5_credits(self):
        """Valida se /api/pix/create-charge gera combo de 5 créditos a R$ 39,90"""
        payload = {"user_id": "usr_test_02", "package": "pack5"}
        resp = self._execute_post('/api/pix/create-charge', payload)

        self.assertEqual(self.sent_responses[0], 200)
        self.assertEqual(resp.get('amount'), 39.90)
        self.assertEqual(resp.get('credits'), 5)

    def test_pix_status_and_webhook_confirmation_lifecycle(self):
        """Valida o ciclo completo: criação -> consulta pendente -> webhook Asaas -> consulta confirmada e créditos liberados"""
        # 1. Cria cobrança
        create_resp = self._execute_post('/api/pix/create-charge', {"user_id": "usr_proponente_rio", "package": "single"})
        charge_id = create_resp['charge_id']

        # 2. Consulta status pendente
        status_resp = self._execute_get(f'/api/pix/status?charge_id={charge_id}')
        self.assertEqual(self.sent_responses[0], 200)
        self.assertEqual(status_resp['status'], 'PENDING')

        # 3. Dispara webhook Asaas simulando confirmação bancária
        webhook_payload = {
            "event": "PAYMENT_CONFIRMED",
            "payment": {
                "id": charge_id,
                "customer": "usr_proponente_rio",
                "value": 9.90,
                "status": "RECEIVED"
            }
        }
        webhook_resp = self._execute_post('/api/pix/webhook', webhook_payload)
        self.assertEqual(self.sent_responses[0], 200)
        self.assertTrue(webhook_resp.get('success'))
        self.assertEqual(webhook_resp.get('credits_added'), 1)
        # Saldo inicial gratuito (1) + crédito comprado (1) = 2
        self.assertEqual(webhook_resp.get('new_balance'), 2)

        # 4. Consulta status após confirmação
        status_after = self._execute_get(f'/api/pix/status?charge_id={charge_id}')
        self.assertEqual(status_after['status'], 'CONFIRMED')

        # 5. Valida se /api/auth/quota reflete os 2 créditos disponíveis
        quota_resp = self._execute_get('/api/auth/quota?user_id=usr_proponente_rio')
        self.assertEqual(quota_resp['credits'], 2)
        self.assertEqual(quota_resp['price_per_credit'], 9.90)


if __name__ == '__main__':
    unittest.main()
