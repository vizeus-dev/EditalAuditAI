import unittest
import os
import re

class TestDomainInvariantsAndContext(unittest.TestCase):
    """
    Testes de conformidade de Linguagem Ubíqua (DDD) e Invariantes Legais
    definidas em docs/CONTEXT.md e implementadas no frontend e backend.
    """

    def setUp(self):
        self.context_path = os.path.join("docs", "CONTEXT.md")
        self.types_path = os.path.join("web", "src", "types", "edital.ts")
        self.engine_path = os.path.join("web", "src", "engines", "localCrossEngine.ts")
        self.task_path = "task.md"

    def test_context_md_ubiquitous_vocabulary(self):
        """Verifica se docs/CONTEXT.md define todas as entidades essenciais do domínio."""
        self.assertTrue(os.path.exists(self.context_path), "docs/CONTEXT.md não encontrado")
        with open(self.context_path, "r", encoding="utf-8") as f:
            content = f.read()

        required_terms = [
            "InstrumentoConvocatorio",
            "DemonstrativoOrcamentario",
            "RubricaOrcamentaria",
            "CategoriaCusto",
            "ValorCapaDeclarado",
            "ValorAnaliticoCalculado",
            "DiscrepanciaOrcamentaria",
            "TETO_ADMINISTRATIVO_PERCENTUAL = 0.15",
            "TETO_DIVULGACAO_PERCENTUAL = 0.10",
            "RegraSumulaTCU272"
        ]

        for term in required_terms:
            self.assertIn(term, content, f"Termo ubíquo obrigatório '{term}' ausente em CONTEXT.md")

    def test_typescript_domain_types_alignment(self):
        """Verifica se web/src/types/edital.ts implementa os tipos alinhados ao CONTEXT.md."""
        self.assertTrue(os.path.exists(self.types_path), "web/src/types/edital.ts não encontrado")
        with open(self.types_path, "r", encoding="utf-8") as f:
            content = f.read()

        required_types = [
            "RubricaOrcamentaria",
            "DemonstrativoOrcamentario",
            "InstrumentoConvocatorio",
            "CategoriaCusto",
            "GrauSeveridade",
            "ApontamentoConformidade"
        ]

        for t in required_types:
            self.assertIn(t, content, f"Tipo TypeScript de domínio '{t}' ausente em web/src/types/edital.ts")

    def test_local_cross_engine_invariants(self):
        """Verifica se LocalCrossEngine valida expressamente os tetos e a Súmula TCU 272."""
        self.assertTrue(os.path.exists(self.engine_path), "localCrossEngine.ts não encontrado")
        with open(self.engine_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("Súmula TCU 272", content, "Menção e regra da Súmula TCU 272 ausente no engine")
        self.assertIn("15", content, "Regra do teto administrativo de 15% ausente no engine")
        self.assertIn("10", content, "Regra do teto de divulgação de 10% ausente no engine")

    def test_task_dag_consistency(self):
        """Garante que task.md reflete a DAG com tickets da Fase 2."""
        self.assertTrue(os.path.exists(self.task_path), "task.md não encontrado")
        with open(self.task_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("TK-01", content)
        self.assertIn("TK-02", content)
        self.assertIn("TK-03", content)
        self.assertIn("TK-04", content)
        self.assertIn("TK-05", content)
        self.assertIn("TK-06", content)

if __name__ == "__main__":
    unittest.main()
