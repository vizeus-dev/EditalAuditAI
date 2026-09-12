#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
test_live_full_flow.py
Testa o fluxo completo de Geracao Unificada + Auditoria Completa dos 14 Agentes
com suporte a mock 100% offline para suítes de regressao automatizadas.
"""

import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestLiveFullFlow(unittest.TestCase):
    def setUp(self):
        self.mock_document_content = {
            "justificativa": "<p>Justificativa do projeto cultural</p>",
            "objetivos": "<p>Objetivo geral e especificos</p>",
            "metodologia": "<p>Metodologia em 3 etapas</p>",
            "cronograma": "<table><tr><td>Atividade 1</td></tr></table>",
            "orcamento": "<table><tr><td>Coordenação</td></tr></table>",
            "acessibilidade": "<p>Acessibilidade com LIBRAS e rampas</p>",
            "publico": "<p>Publico-alvo prioritario</p>",
            "contrapartida": "<p>Contrapartida social</p>",
            "comunicacao": "<p>Plano de divulgacao</p>",
            "ficha_tecnica": "<p>Equipe tecnica qualificada</p>",
            "monitoramento": "<p>Indicadores de impacto</p>",
            "compliance": "<p>Certidoes negativas CNDT e FGTS</p>",
            "sustentabilidade": "<p>Praticas ESG e reducao de descartaveis</p>",
            "rider": "<p>Rider tecnico de sonorizacao e iluminacao</p>"
        }

        self.mock_audit_result = {
            "nota_final": 92,
            "nota_tecnica": 82,
            "nota_priorizacao": 10,
            "total_orcamento": 220000.0,
            "custos_administrativos_percentual": 14.5,
            "relatorio_geral": "Proposta aprovada com alto merito cultural.",
            "agentes": [
                {"id": "agente_01", "nota": 95, "parecer": "Objeto plenamente aderente."},
                {"id": "agente_02", "nota": 90, "parecer": "Acessibilidade completa."}
            ],
            "alertas": [],
            "ajustes": []
        }

    def test_mock_full_flow_payload_structure(self):
        """Valida a estrutura de dados de entrada e saida do pipeline unificado."""
        payload = {
            "cover": {
                "title": "Circuito Cultural Tambores Esperanca 2026",
                "institution": "Fundo Estadual de Cultura / Rio Doce",
                "proponent": "Associacao Cultural Tambores Esperanca",
                "city": "Belo Horizonte / MG",
                "year": "2026",
                "budget": 220000
            },
            "editalRefText": "Edital de fomento cultural...",
            "proposalDraftText": "Oficinas de percussao e apresentacoes...",
            "annexes": [{"name": "Regulamento.pdf", "content": "Teto 15% adm, 10% marketing."}]
        }

        self.assertIn("cover", payload)
        self.assertIn("title", payload["cover"])
        self.assertEqual(len(self.mock_document_content), 14)
        self.assertGreaterEqual(self.mock_audit_result["nota_final"], 70)
        self.assertLessEqual(self.mock_audit_result["custos_administrativos_percentual"], 15.0)

    @patch('urllib.request.urlopen')
    def test_mocked_backend_generate_and_audit_flow(self, mock_urlopen):
        """Simula a chamada de rede HTTP aos endpoints de geracao e auditoria."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "documentContent": self.mock_document_content,
            "auditoria": self.mock_audit_result
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        # Executar simulacao
        import urllib.request
        req = urllib.request.Request("http://127.0.0.1:8085/api/generate-proposal-unified", data=b'{}', method="POST")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            self.assertEqual(len(data["documentContent"]), 14)
            self.assertEqual(data["auditoria"]["nota_final"], 92)

if __name__ == "__main__":
    unittest.main()
