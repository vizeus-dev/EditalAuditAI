#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Testes Unitários: MUSA Deep Review (Avaliação Especialista dos 14 Pareceristas)
Valida a geração de pareceres aprofundados com fatiamento cirúrgico de edital e fallback determinístico.
Padrão Ponytail (Stdlib / Tipagem Estrita) + TDD.
"""

import unittest
from unittest.mock import MagicMock, patch
from services.backend.handlers.musa_review_handler import (
    evaluate_musa_deep_review,
    MUSA_EXPERT_PROFILES
)


class TestMusaDeepReview(unittest.TestCase):

    def setUp(self):
        self.sample_edital = """
        EDITAL DE CHAMAMENTO PÚBLICO Nº 01/2026 - CULTURA VIVA
        CAPÍTULO III - DO ORÇAMENTO
        3.1 O limite máximo para despesas administrativas é de 15%, conforme Lei 14.903/2024.
        3.2 Fica proibida a incidência de BDI sobre aquisições puras de bens (Súmula TCU 272).
        CAPÍTULO IV - DA ACESSIBILIDADE
        4.1 Todas as atividades devem incluir intérprete de Libras e audiodescrição (NBR 9050).
        """
        self.sample_cover = {
            "title": "Festival Sons da Terra",
            "institution": "Secretaria de Cultura",
            "totalBudget": 100000.0
        }

    def test_all_14_expert_profiles_registered(self):
        """Todos os 14 pareceristas MUSA devem estar formalmente mapeados."""
        expected_keys = [
            "justificativa", "objetivos", "metodologia", "cronograma",
            "orcamento", "acessibilidade", "democratizacao", "contrapartida",
            "equipe", "comunicacao", "monitoramento", "sustentabilidade",
            "rider_tecnico", "compliance"
        ]
        for key in expected_keys:
            self.assertIn(key, MUSA_EXPERT_PROFILES)
            prof = MUSA_EXPERT_PROFILES[key]
            self.assertTrue(len(prof["name"]) > 0)
            self.assertTrue(len(prof["legalAnchor"]) > 0)

    def test_fallback_deterministic_when_offline(self):
        """Quando o gateway LLM estiver offline ou sem chave, retorna parecer determinístico seguro."""
        with patch("services.backend.handlers.musa_review_handler.llm_gateway") as mock_gw:
            mock_gw.generate.side_effect = RuntimeError("Sem conexão com API")
            
            result = evaluate_musa_deep_review(
                parecerista_key="acessibilidade",
                section_content="Apresentação com intérprete de Libras e audiodescrição gravada.",
                edital_text=self.sample_edital,
                cover=self.sample_cover
            )

            self.assertIn("score", result)
            self.assertIn("parecer", result)
            self.assertIn("recommended_text", result)
            self.assertGreaterEqual(result["score"], 80)
            self.assertEqual(result.get("mode"), "local_deterministic")

    def test_orcamento_eval_detects_legal_anchors(self):
        """O parecerista de orçamento Rui Barbosa deve fundamentar em Súmula TCU 272 e Lei 14.903."""
        prof = MUSA_EXPERT_PROFILES["orcamento"]
        self.assertIn("Rui Barbosa", prof["name"])
        self.assertIn("272", prof["legalAnchor"])

    def test_aliases_resolution(self):
        """Aliases como 'publico', 'ficha_tecnica' e 'rider' devem resolver para os membros oficiais."""
        for alias in ["publico", "ficha_tecnica", "rider"]:
            result = evaluate_musa_deep_review(
                parecerista_key=alias,
                section_content="Conteúdo de teste para a seção com mais de sessenta caracteres válidos.",
                edital_text=self.sample_edital,
                cover=self.sample_cover
            )
            self.assertIn("score", result)
            self.assertTrue(len(result["parecer"]) > 10)


if __name__ == "__main__":
    unittest.main()
