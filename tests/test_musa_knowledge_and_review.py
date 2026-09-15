#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Testes Unitários para a Base de Conhecimento e Avaliação dos 14 Pareceristas M.U.S.A.
Verifica operação 100% offline, checklists normativos analíticos, fontes regulatórias e fallback gracioso.
"""

import unittest
from unittest.mock import patch
from services.backend.handlers.musa_review_handler import (
    MUSA_EXPERT_PROFILES,
    evaluate_musa_deep_review,
    enrich_context_from_web,
    ALIASES
)

class TestMusaKnowledgeAndReview(unittest.TestCase):

    def test_all_14_experts_configured_with_checklists(self):
        """Valida se todos os 14 pareceristas possuem perfis completos com checklists e recomendações."""
        self.assertEqual(len(MUSA_EXPERT_PROFILES), 14, "Devem existir exatamente 14 pareceristas MUSA.")

        for key, profile in MUSA_EXPERT_PROFILES.items():
            self.assertIn("name", profile, f"Parecerista {key} sem nome.")
            self.assertIn("specialty", profile, f"Parecerista {key} sem especialidade.")
            self.assertIn("legalAnchor", profile, f"Parecerista {key} sem legalAnchor.")
            self.assertIn("promptGuideline", profile, f"Parecerista {key} sem promptGuideline.")
            self.assertIn("checklist", profile, f"Parecerista {key} sem checklist.")
            self.assertIn("defaultRecommendation", profile, f"Parecerista {key} sem defaultRecommendation.")
            
            for item in profile["checklist"]:
                self.assertIn("item", item)
                self.assertIn("pattern", item)
                self.assertIn("legalRef", item)
            
            self.assertGreater(len(profile["defaultRecommendation"]), 100, f"Recomendação de {key} deve ser substancial.")

    @patch("services.backend.handlers.musa_review_handler.llm_gateway")
    def test_offline_deterministic_evaluation_for_all_experts(self, mock_gw):
        """Verifica se a avaliação de todos os 14 pareceristas opera perfeitamente sem internet (fallback offline)."""
        mock_gw.generate.side_effect = RuntimeError("Sem conexão com API")
        sample_cover = {
            "title": "Festival de Teatro de Bonecos do Sertão",
            "institution": "Secretaria Municipal de Cultura",
            "budget": 150000.00
        }

        # 1. Teste com texto vazio -> deve pontuar baixo, detectar itens não preenchidos e listar riscos
        empty_res = evaluate_musa_deep_review(
            parecerista_key="acessibilidade",
            section_content="",
            cover=sample_cover
        )
        self.assertEqual(empty_res["mode"], "local_deterministic")
        self.assertLessEqual(empty_res["score"], 50)
        self.assertGreater(len(empty_res["risks"]), 0)
        self.assertTrue(any(not c["done"] for c in empty_res["checklist"]))

        # 2. Teste com texto rico e conforme -> deve pontuar alto e marcar checklist
        rich_access_text = (
            "Todas as apresentações contarão com Intérprete de Libras presencialmente no palco e audiodescrição gravada "
            "com receptores individuais para pessoas com deficiência visual. O espaço físico possui rampas de acesso, "
            "sanitários adaptados, piso tátil e reserva de 5% de assentos conforme a norma ABNT NBR 9050. "
            "A equipe de acolhimento passou por capacitação atitudinal para recepção prioritária e inclusiva."
        )
        rich_res = evaluate_musa_deep_review(
            parecerista_key="acessibilidade",
            section_content=rich_access_text,
            cover=sample_cover
        )
        self.assertEqual(rich_res["mode"], "local_deterministic")
        self.assertGreaterEqual(rich_res["score"], 85)
        self.assertTrue(all(c["done"] for c in rich_res["checklist"]))

    def test_enrich_context_from_web_resilience(self):
        """Garante que enrich_context_from_web gera fontes e referências ricas mesmo offline."""
        sources = enrich_context_from_web("orcamento", institution="Ministério da Cultura")
        self.assertIsInstance(sources, list)
        self.assertGreaterEqual(len(sources), 3)
        self.assertTrue(any("2622" in s or "272" in s for s in sources), "Deve citar jurisprudência do TCU sobre BDI e custos.")

    def test_aliases_resolution(self):
        """Garante que aliases como 'publico', 'ficha_tecnica', 'rider' mapeiam corretamente para os 14 especialistas."""
        res_publico = evaluate_musa_deep_review(parecerista_key="publico", section_content="Gratuidade total")
        self.assertEqual(res_publico["specialty"], "Democratização do Acesso & Formação de Público")

        res_equipe = evaluate_musa_deep_review(parecerista_key="ficha_tecnica", section_content="Coordenação geral")
        self.assertEqual(res_equipe["specialty"], "Ficha Técnica & Capacidade Técnica")

        res_rider = evaluate_musa_deep_review(parecerista_key="rider", section_content="Sistema de som")
        self.assertEqual(res_rider["specialty"], "Rider Técnico & Infraestrutura Operacional")

if __name__ == '__main__':
    unittest.main()
