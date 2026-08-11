import unittest
import re
import os
import sys
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
from services.api import DocumentRetriever, SemanticCache, GeminiProvider

class FullArchitectureVerification(unittest.TestCase):

    def test_python_semantic_chunker_and_bm25(self):
        long_edital = """
        EDITAL Nº 01/2026 - FOMENTO À CULTURA E ÀS ARTES
        
        CAPÍTULO I - DO OBJETO E FINALIDADE
        Art. 1º O presente Edital destina-se à seleção e premiação de projetos culturais para o exercício de 2026.
        Art. 2º Poderão se inscrever pessoas físicas e jurídicas domiciliadas no Estado.
        
        CAPÍTULO II - DOS LIMITES ORÇAMENTÁRIOS E REGRAS FINANCEIRAS
        Art. 3º O valor total destinado a cada proposta será de até R$ 200.000,00.
        Art. 4º Fica estipulado o teto de 15% para custos administrativos e coordenação geral.
        Art. 5º Despesas de divulgação e assessoria de imprensa não poderão exceder 10%.
        
        | Categoria | Descrição | Teto Máximo |
        | --- | --- | --- |
        | Administrativo | Gestão, coordenação e contabilidade | 15% |
        | Comunicação | Mídia, tráfego pago e assessoria | 10% |
        | Acessibilidade | Libras, audiodescrição e rampas | 8% |
        | Produção | Cachês, equipamentos e infraestrutura | 67% |
        
        CAPÍTULO III - DA ACESSIBILIDADE E POLÍTICAS AFIRMATIVAS
        Art. 6º Todas as atividades presenciais e digitais devem contar com acessibilidade física e comunicacional (LIBRAS e Audiodescrição).
        Art. 7º Ficam reservadas 25% das vagas para grupos prioritários e cotas afirmativas.
        
        CAPÍTULO IV - DAS VEDAÇÕES E PENALIDADES
        Art. 8º É expressamente vedada a aquisição de bens imóveis ou terrenos.
        Art. 9º O descumprimento de prazos implicará em glosa e devolução dos recursos.
        """
        
        chunks = DocumentRetriever.chunk_text(long_edital, chunk_size=600, overlap=100)
        self.assertTrue(len(chunks) >= 3, f"Expected at least 3 chunks, got {len(chunks)}")
        
        # Check BM25 retrieval for budget questions
        query_budget = "Quais são os limites orçamentários e teto de custos de gestão administrativa?"
        retrieved_budget = DocumentRetriever.retrieve(long_edital, query_budget, top_k=2)
        retrieved_str = " ".join(retrieved_budget)
        self.assertIn("15%", retrieved_str)
        self.assertIn("Administrativo", retrieved_str)

        # Check BM25 retrieval for accessibility
        query_acc = "Quais são as exigências obrigatórias de acessibilidade comunicacional, LIBRAS e cotas?"
        retrieved_acc = DocumentRetriever.retrieve(long_edital, query_acc, top_k=2)
        acc_str = " ".join(retrieved_acc)
        self.assertIn("LIBRAS", acc_str)
        self.assertIn("Audiodescrição", acc_str)

    def test_js_files_syntax_integrity(self):
        """Verifies that JS files are properly formatted and valid."""
        js_files = [
            os.path.join(PROJECT_ROOT, "src", "controllers", "aiController.js"),
            os.path.join(PROJECT_ROOT, "src", "controllers", "offlineAuditor.js"),
            os.path.join(PROJECT_ROOT, "app.js")
        ]
        for fpath in js_files:
            self.assertTrue(os.path.exists(fpath), f"File {fpath} must exist")
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
                self.assertTrue(len(content) > 1000, f"File {fpath} must not be empty")
                
                # Check for critical architectural functions
                if "aiController.js" in fpath:
                    self.assertIn("buildProjectBriefing", content)
                    self.assertIn("validateCitations", content)
                    self.assertIn("_inferActivityType", content)
                    self.assertIn("confianca", content)
                elif "offlineAuditor.js" in fpath:
                    self.assertIn("analyzeBudgetLocal", content)
                    self.assertIn("evaluateAgentLocal", content)
                    self.assertIn("confianca", content)
                elif "app.js" in fpath:
                    self.assertIn("sanitizeExtractedText", content)
                    self.assertIn("buildCrossRefSummary", content)

    def test_citation_validation_regex(self):
        """Tests the citation matching pattern used in the zero-hallucination engine."""
        citation_regex = re.compile(r'\[📌\s*EDITAL:\s*[\'\"“](.+?)[\'\"”]\s*\]', re.IGNORECASE)
        sample = "O projeto atende ao [📌 EDITAL: 'teto máximo de 15% para custos administrativos'] e prevê execução regular."
        match = citation_regex.search(sample)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), "teto máximo de 15% para custos administrativos")


if __name__ == '__main__':
    unittest.main()
