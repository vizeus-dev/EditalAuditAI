import unittest
import re
import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
from services.api import DocumentRetriever, SemanticCache

class TestArchitecturalFixes(unittest.TestCase):
    
    def test_semantic_chunker_preserves_tables(self):
        sample_text = (
            "CAPÍTULO I - DO OBJETO\n\n"
            "Este edital tem por objetivo selecionar projetos culturais.\n\n"
            "| Item | Rubrica | Valor Máximo |\n"
            "| --- | --- | --- |\n"
            "| 1 | Gestão Administrativa | 15% |\n"
            "| 2 | Produção Cultural | 45% |\n"
            "| 3 | Acessibilidade LIBRAS | 10% |\n\n"
            "CAPÍTULO II - DAS VEDAÇÕES\n\n"
            "É vedado o pagamento de taxas de administração genéricas."
        )
        chunks = DocumentRetriever.chunk_text(sample_text, chunk_size=800, overlap=100)
        self.assertTrue(len(chunks) >= 1)
        
        # Verify table is kept intact in one of the chunks
        table_chunk = next((c for c in chunks if "| Rubrica |" in c), None)
        self.assertIsNotNone(table_chunk, "Table should be present in a chunk")
        self.assertIn("| 1 | Gestão Administrativa | 15% |", table_chunk)
        self.assertIn("| 3 | Acessibilidade LIBRAS | 10% |", table_chunk)

    def test_bm25_retrieval_with_compliance_boost(self):
        edital_doc = (
            "Seção 1: Apresentação da cidade e histórico cultural da região.\n"
            "O município possui rica tradição em festejos populares e artesanato.\n\n"
            "Seção 2: Tetos e Limites Orçamentários.\n"
            "O teto máximo por proposta é de R$ 150.000,00. Os custos de gestão administrativa "
            "não podem ultrapassar o limite de 15% do valor global.\n\n"
            "Seção 3: Acessibilidade Comunicacional e Cotas.\n"
            "É obrigatória a presença de intérprete de LIBRAS e audiodescrição em todas as apresentações. "
            "Haverá reserva de cotas de 20% para pessoas negras e indígenas.\n\n"
            "Seção 4: Doações e parcerias locais.\n"
            "Parcerias comunitárias devem ser descritas na proposta."
        )
        
        query = "Qual é o limite teto dos custos administrativo e regras de LIBRAS e acessibilidade?"
        retrieved = DocumentRetriever.retrieve(edital_doc, query, top_k=2)
        
        self.assertTrue(len(retrieved) >= 1)
        combined_retrieved = " ".join(retrieved)
        self.assertIn("15%", combined_retrieved, "Should retrieve Section 2 with budget cap")
        self.assertIn("LIBRAS", combined_retrieved, "Should retrieve Section 3 with accessibility")

    def test_bm25_handles_empty_and_short_inputs(self):
        self.assertEqual(DocumentRetriever.chunk_text(""), [])
        self.assertEqual(DocumentRetriever.retrieve("", "query"), [])
        self.assertEqual(DocumentRetriever.retrieve("Short text", ""), [])

    def test_semantic_cache(self):
        cache = SemanticCache()
        cache.store("prompt_test_1", "response_test_1")
        self.assertEqual(cache.lookup("prompt_test_1"), "response_test_1")
        self.assertIsNone(cache.lookup("unknown_prompt"))


if __name__ == '__main__':
    unittest.main()
