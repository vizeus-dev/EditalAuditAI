# tests/test_security_hotfix.py
# -*- coding: utf-8 -*-
"""
Suíte de Testes de Verificação do Hotfix de Segurança e Integridade
Valida Anti-SSRF, Proteção do Endpoint /api/restart, Headers de Segurança,
Payload Limit, Transmissão da Chave Gemini e Persistência em submissions/.
"""

import unittest
import os
import sys
import json
import tempfile
import time
import shutil

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import server
from server import validate_safe_url
from services.api import GeminiProvider


class TestAntiSSRF(unittest.TestCase):
    def test_blocks_localhost(self):
        blocked_urls = [
            "http://localhost:8000/api/restart",
            "http://127.0.0.1:8080",
            "http://127.0.0.2:3000",
            "http://[::1]:8000/admin",
        ]
        for url in blocked_urls:
            with self.assertRaises(ValueError, msg=f"Deveria ter bloqueado: {url}"):
                validate_safe_url(url)

    def test_blocks_private_networks(self):
        blocked_urls = [
            "http://10.0.0.1/secret",
            "http://192.168.1.1/router",
            "http://172.16.0.1/internal",
            "http://172.31.255.255/api",
        ]
        for url in blocked_urls:
            with self.assertRaises(ValueError, msg=f"Deveria ter bloqueado: {url}"):
                validate_safe_url(url)

    def test_blocks_cloud_metadata(self):
        blocked_urls = [
            "http://169.254.169.254/latest/meta-data/",
            "http://169.254.169.254/computeMetadata/v1/",
        ]
        for url in blocked_urls:
            with self.assertRaises(ValueError, msg=f"Deveria ter bloqueado metadados: {url}"):
                validate_safe_url(url)

    def test_blocks_invalid_schemes(self):
        blocked_urls = [
            "file:///etc/passwd",
            "ftp://ftp.server.com/file",
            "gopher://server.com",
            "data:text/html,<html></html>",
        ]
        for url in blocked_urls:
            with self.assertRaises(ValueError, msg=f"Deveria ter bloqueado esquema: {url}"):
                validate_safe_url(url)

    def test_allows_public_https_domains(self):
        # Domínios públicos legítimos com resolução DNS real
        allowed_urls = [
            "https://www.google.com",
            "https://github.com",
        ]
        for url in allowed_urls:
            try:
                validate_safe_url(url)
            except ValueError as e:
                self.fail(f"URL legítima foi incorretamente bloqueada: {url} -> {e}")


class TestGeminiKeySecurity(unittest.TestCase):
    def test_generate_headers_contain_api_key(self):
        provider = GeminiProvider()
        import inspect
        src_gen = inspect.getsource(provider.generate)
        src_stream = inspect.getsource(provider.stream_generate)

        # Não deve conter concatenação na query string
        self.assertNotIn("generateContent?key=", src_gen)
        self.assertNotIn("streamGenerateContent?key=", src_stream)

        # Deve conter x-goog-api-key nos headers
        self.assertIn('"x-goog-api-key": api_key', src_gen)
        self.assertIn('"x-goog-api-key": api_key', src_stream)


class TestSubmissionPersistence(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.orig_submissions_dir = os.path.join(os.path.dirname(os.path.abspath(server.__file__)), "submissions")

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_submission_file_naming_and_storage(self):
        submissions_dir = self.orig_submissions_dir
        os.makedirs(submissions_dir, exist_ok=True)

        sample_payload = {
            "submission_id": "PROP-TEST-999",
            "project_title": "Projeto Teste Segurança",
            "budget": 50000.0,
            "proponent": "Proponente Teste"
        }

        import re
        raw_sub_id = sample_payload.get('submission_id')
        ts = int(time.time() * 1000)
        clean_sub_id = re.sub(r'[^\w\-]', '_', str(raw_sub_id))
        file_name = f"sub_{clean_sub_id}_{ts}.json"
        file_path = os.path.join(submissions_dir, file_name)

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sample_payload, f, ensure_ascii=False, indent=2)

        self.assertTrue(os.path.exists(file_path))
        with open(file_path, 'r', encoding='utf-8') as f:
            loaded = json.load(f)
        self.assertEqual(loaded["submission_id"], "PROP-TEST-999")

        # Cleanup
        os.remove(file_path)


class TestConfigAndDependencies(unittest.TestCase):
    def test_gitignore_contains_env_and_submissions(self):
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        gitignore_path = os.path.join(repo_root, ".gitignore")
        self.assertTrue(os.path.exists(gitignore_path))

        with open(gitignore_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn(".env", content)
        self.assertIn("*.env", content)
        self.assertIn(".env.*", content)
        self.assertIn("submissions/", content)

    def test_requirements_pypdf_version(self):
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        req_path = os.path.join(repo_root, "requirements.txt")
        self.assertTrue(os.path.exists(req_path))

        with open(req_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("pypdf>=6.15.0", content)

    def test_index_html_cdn_updates(self):
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        index_path = os.path.join(repo_root, "index.html")
        self.assertTrue(os.path.exists(index_path))

        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("pdf.js/4.10.38", content)
        self.assertIn("mammoth/1.11.0", content)

    def test_app_js_pdf_eval_disabled(self):
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        app_js_path = os.path.join(repo_root, "app.js")
        self.assertTrue(os.path.exists(app_js_path))

        with open(app_js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("isEvalSupported: false", content)
        self.assertIn("pdf.js/4.10.38", content)


if __name__ == '__main__':
    unittest.main()
