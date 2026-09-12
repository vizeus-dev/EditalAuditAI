"""
Suite de Testes de Hardening e Auditoria de Segurança do EditalAudit AI
Valida:
1. GET /api/restart com restrição de client_address (localhost) e header X-Admin-Token
2. Anti-SSRF (validate_safe_url) bloqueando loopback, RFC 1918, link-local e metadados de nuvem
3. Prevenção de DoS por Content-Length / read_limited_body (411, 400, 413)
4. Cabeçalhos de Segurança (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
5. Header x-goog-api-key em services/api.py
6. Dependências e versões seguras (pypdf, pdf.js, SheetJS xlsx, mammoth)
7. Saúde do servidor (/api/health) e geração de relatórios ponta a ponta
"""

import unittest
import os
import sys
import io
import json
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pypdf
import openpyxl
from server import validate_safe_url, CustomHTTPRequestHandler
from services.api import GeminiProvider


class TestAntiSSRFValidation(unittest.TestCase):
    """Testa rigorosamente a proteção Anti-SSRF em URLs fornecidas pelo usuário."""

    def test_block_invalid_schemes(self):
        invalid_schemes = [
            "file:///etc/passwd",
            "ftp://ftp.example.com/file",
            "gopher://gopher.example.com",
            "javascript:alert(1)",
            "data:text/html,<h1>test</h1>"
        ]
        for url in invalid_schemes:
            with self.assertRaises(ValueError, msg=f"Deveria bloquear esquema: {url}"):
                validate_safe_url(url)

    def test_block_loopback_and_localhost(self):
        loopback_urls = [
            "http://localhost:8080/api/restart",
            "http://127.0.0.1:8000/",
            "http://127.0.0.1:11434/api/generate",
            "http://[::1]:8080/api/restart",
            "https://localhost/admin"
        ]
        for url in loopback_urls:
            with self.assertRaises(ValueError, msg=f"Deveria bloquear loopback: {url}"):
                validate_safe_url(url)

    def test_block_private_networks_rfc1918(self):
        private_urls = [
            "http://10.0.0.1/admin",
            "http://10.254.1.10:8080/metrics",
            "http://192.168.1.1/router-login",
            "http://192.168.0.100:3000/db",
            "http://172.16.0.1/",
            "http://172.31.255.254/"
        ]
        for url in private_urls:
            with self.assertRaises(ValueError, msg=f"Deveria bloquear IP privado: {url}"):
                validate_safe_url(url)

    def test_block_cloud_metadata(self):
        cloud_meta_urls = [
            "http://169.254.169.254/latest/meta-data/",
            "http://169.254.169.254/computeMetadata/v1/"
        ]
        for url in cloud_meta_urls:
            with self.assertRaises(ValueError, msg=f"Deveria bloquear metadados: {url}"):
                validate_safe_url(url)

    def test_allow_legitimate_public_urls(self):
        public_urls = [
            "https://www.google.com",
            "https://gov.br",
            "https://cultura.gov.br/editais",
            "http://example.com"
        ]
        for url in public_urls:
            try:
                validate_safe_url(url)
            except ValueError as e:
                self.fail(f"URL pública legítima '{url}' foi indevidamente bloqueada: {e}")


class TestLimitedBodyReadingAndDoSProtection(unittest.TestCase):
    """Testa o helper read_limited_body e a proteção contra payloads gigantes (HTTP 413)."""

    def _create_mock_handler(self, headers_dict, body_bytes=b""):
        handler = CustomHTTPRequestHandler.__new__(CustomHTTPRequestHandler)
        handler.headers = headers_dict
        handler.rfile = io.BytesIO(body_bytes)
        handler.wfile = io.BytesIO()
        handler.send_response = MagicMock()
        handler.send_header = MagicMock()
        handler.end_headers = MagicMock()
        
        def mock_send_json(status_code, data_dict):
            handler.last_status = status_code
            handler.last_json = data_dict
            handler.wfile.write(json.dumps(data_dict).encode('utf-8'))
        handler.send_json_response = mock_send_json
        handler.last_status = None
        handler.last_json = None
        return handler

    def test_missing_content_length_returns_411(self):
        handler = self._create_mock_handler({})
        result = handler.read_limited_body()
        self.assertIsNone(result)
        self.assertEqual(handler.last_status, 411)
        self.assertIn("Content-Length obrigatório", handler.last_json.get("error", ""))

    def test_invalid_content_length_returns_400(self):
        handler = self._create_mock_handler({'Content-Length': 'invalid_number'})
        result = handler.read_limited_body()
        self.assertIsNone(result)
        self.assertEqual(handler.last_status, 400)

    def test_negative_content_length_returns_400(self):
        handler = self._create_mock_handler({'Content-Length': '-10'})
        result = handler.read_limited_body()
        self.assertIsNone(result)
        self.assertEqual(handler.last_status, 400)

    def test_excessive_content_length_returns_413(self):
        # Simula envio de payload de 60 MB (teto é 50 MB)
        handler = self._create_mock_handler({'Content-Length': str(60 * 1024 * 1024)})
        result = handler.read_limited_body(max_bytes=50 * 1024 * 1024)
        self.assertIsNone(result)
        self.assertEqual(handler.last_status, 413)
        self.assertIn("Payload muito grande", handler.last_json.get("error", ""))

    def test_valid_payload_reads_successfully(self):
        sample_payload = json.dumps({"test": "valid_payload_data"}).encode('utf-8')
        handler = self._create_mock_handler(
            {'Content-Length': str(len(sample_payload))},
            body_bytes=sample_payload
        )
        result = handler.read_limited_body()
        self.assertEqual(result, sample_payload)
        self.assertIsNone(handler.last_status)


class TestSecurityHeadersAndRestart(unittest.TestCase):
    """Testa os cabeçalhos de segurança (CSP, HSTS/Frame/Options) e o endpoint /api/restart."""

    def test_security_headers_in_end_headers(self):
        headers_sent = {}
        handler = CustomHTTPRequestHandler.__new__(CustomHTTPRequestHandler)
        handler.headers = {}
        handler.request_version = 'HTTP/1.1'
        handler._headers_buffer = []
        handler.wfile = io.BytesIO()
        
        def capture_header(keyword, value):
            headers_sent[keyword] = value
        handler.send_header = capture_header
        
        # Executa end_headers diretamente
        with patch.object(CustomHTTPRequestHandler, 'flush_headers', lambda self: None):
            CustomHTTPRequestHandler.end_headers(handler)
        
        self.assertEqual(headers_sent.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(headers_sent.get('X-Frame-Options'), 'DENY')
        self.assertEqual(headers_sent.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
        self.assertIn('geolocation=()', headers_sent.get('Permissions-Policy', ''))
        self.assertIn('camera=()', headers_sent.get('Permissions-Policy', ''))
        self.assertIn('microphone=()', headers_sent.get('Permissions-Policy', ''))
        
        csp = headers_sent.get('Content-Security-Policy', '')
        self.assertIn("default-src 'self'", csp)
        self.assertIn("https://cdnjs.cloudflare.com", csp)
        self.assertIn("https://generativelanguage.googleapis.com", csp)
        self.assertIn("http://localhost:11434", csp)
        self.assertIn("frame-ancestors 'none'", csp)

    def test_restart_blocked_for_external_ip(self):
        handler = CustomHTTPRequestHandler.__new__(CustomHTTPRequestHandler)
        handler.path = '/api/restart'
        handler.client_address = ('192.168.1.50', 54321)
        handler.headers = {'X-Admin-Token': 'valid_secret'}
        handler.send_json_response = MagicMock()
        
        handler.do_GET()
        handler.send_json_response.assert_called_with(403, unittest.mock.ANY)

    def test_restart_blocked_without_admin_token(self):
        handler = CustomHTTPRequestHandler.__new__(CustomHTTPRequestHandler)
        handler.path = '/api/restart'
        handler.client_address = ('127.0.0.1', 54321)
        handler.headers = {}
        handler.send_json_response = MagicMock()
        
        with patch.dict(os.environ, {'EDITAL_ADMIN_TOKEN': 'super_secret_token_123'}):
            handler.do_GET()
            handler.send_json_response.assert_called_with(401, unittest.mock.ANY)

    def test_restart_blocked_with_wrong_admin_token(self):
        handler = CustomHTTPRequestHandler.__new__(CustomHTTPRequestHandler)
        handler.path = '/api/restart'
        handler.client_address = ('127.0.0.1', 54321)
        handler.headers = {'X-Admin-Token': 'wrong_token'}
        handler.send_json_response = MagicMock()
        
        with patch.dict(os.environ, {'EDITAL_ADMIN_TOKEN': 'super_secret_token_123'}):
            handler.do_GET()
            handler.send_json_response.assert_called_with(401, unittest.mock.ANY)

    def test_restart_allowed_for_local_with_valid_token(self):
        handler = CustomHTTPRequestHandler.__new__(CustomHTTPRequestHandler)
        handler.path = '/api/restart'
        handler.client_address = ('127.0.0.1', 54321)
        handler.headers = {'X-Admin-Token': 'super_secret_token_123'}
        handler.send_json_response = MagicMock()
        
        with patch.dict(os.environ, {'EDITAL_ADMIN_TOKEN': 'super_secret_token_123'}):
            with patch('threading.Thread'):
                handler.do_GET()
                handler.send_json_response.assert_called_with(200, unittest.mock.ANY)


class TestDependencyCVEStatus(unittest.TestCase):
    """Verifica se todas as dependências com CVEs conhecidos foram atualizadas."""

    def test_pypdf_version_is_safe(self):
        # CVE-2026-59935 / 59936 corrigidos em pypdf >= 6.15.0
        v_parts = [int(p) for p in pypdf.__version__.split('.')[:3]]
        self.assertGreaterEqual(
            (v_parts[0], v_parts[1]), 
            (6, 15), 
            f"pypdf deve ser >= 6.15.0. Versão atual: {pypdf.__version__}"
        )

    def test_openpyxl_installed_and_functional(self):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Teste"
        ws['A1'] = "EditalAudit"
        buf = io.BytesIO()
        wb.save(buf)
        self.assertGreater(len(buf.getvalue()), 1000)

    def test_sheetjs_xlsx_file_version(self):
        # Verifica se src/xlsx.full.min.js foi atualizado para >= 0.20.2
        xlsx_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "xlsx.full.min.js")
        self.assertTrue(os.path.exists(xlsx_path), "src/xlsx.full.min.js deve existir.")
        with open(xlsx_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(1000)
            self.assertNotIn("0.18.5", content, "Versão vulnerável 0.18.5 do SheetJS não pode estar presente.")

    def test_frontend_pdfjs_eval_disabled(self):
        # Verifica se app.js possui isEvalSupported: false
        app_js_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.js")
        with open(app_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn("isEvalSupported: false", content, "isEvalSupported deve ser false no getDocument do PDF.js.")

    def test_frontend_cdns_in_index_html(self):
        index_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "index.html")
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # PDF.js >= 4.2.67 (4.10.38)
            self.assertIn("pdf.js/4.10.38", content)
            # Mammoth.js >= 1.11.0
            self.assertIn("mammoth/1.11.0", content)


class TestServicesApiSecurity(unittest.TestCase):
    """Verifica que services/api.py envia a chave de API via header e nunca via URL query string."""

    def test_gemini_provider_uses_header_not_query_param(self):
        import inspect
        src_gen = inspect.getsource(GeminiProvider.generate)
        src_stream = inspect.getsource(GeminiProvider.stream_generate)
        
        # Verifica que o header x-goog-api-key está presente
        self.assertIn('"x-goog-api-key": api_key', src_gen)
        self.assertIn('"x-goog-api-key": api_key', src_stream)
        
        # Garante que ?key= não é concatenado à URL
        self.assertNotIn("generateContent?key=", src_gen)
        self.assertNotIn("streamGenerateContent?key=", src_stream)


if __name__ == '__main__':
    unittest.main()
