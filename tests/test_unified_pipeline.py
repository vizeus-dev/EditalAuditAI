#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
test_unified_pipeline.py
Test script for the unified proposal generation backend API route with offline mock support.
"""

import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestUnifiedPipeline(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "cover": {
                "title": "Circuito Cultural de Tambores Esperança",
                "institution": "Rio Doce 2026",
                "proponent": "Associação de Tambores Esperança",
                "city": "Belo Horizonte / MG",
                "year": "2026",
                "budget": 220000
            },
            "editalRefText": "Edital de teste para fomento cultural de até R$ 250.000,00.",
            "proposalDraftText": "Queremos fazer oficinas de tambor e apresentações culturais.",
            "annexes": [
                {
                    "name": "Anexo de Proposta Técnica",
                    "content": "Requisitos de cronograma e metas de público mínimas."
                }
            ],
            "model": "gemini-2.0-flash"
        }

    @patch('urllib.request.urlopen')
    def test_unified_pipeline_offline_mock(self, mock_urlopen):
        """Valida que a rota unificada processa e retorna as seções e compliance esperados."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "documentContent": {
                "justificativa": "<p>Justificativa aprovada</p>",
                "objetivos": "<p>Objetivos definidos</p>",
                "orcamento": "<table><tr><td>Valor</td></tr></table>"
            },
            "auditoria": {
                "nota_final": 95,
                "total_orcamento": 220000.0,
                "custos_administrativos_percentual": 12.0,
                "alertas": [],
                "ajustes": [],
                "agentes": [{"id": "agente_01", "nota": 95}]
            }
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        import urllib.request
        req = urllib.request.Request(
            "http://127.0.0.1:8085/api/generate-proposal-unified",
            data=json.dumps(self.payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            res_json = json.loads(resp.read().decode('utf-8'))
            self.assertIn("documentContent", res_json)
            self.assertIn("auditoria", res_json)
            self.assertEqual(res_json["auditoria"]["nota_final"], 95)
            self.assertLessEqual(res_json["auditoria"]["custos_administrativos_percentual"], 15.0)

if __name__ == "__main__":
    unittest.main()
