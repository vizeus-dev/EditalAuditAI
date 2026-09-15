import unittest
from services.backend.handlers.surgical_chunker import (
    get_surgical_context_for_parecerista,
    extract_surgical_bundle,
    MUSA_THEMATIC_KEYWORDS
)

SAMPLE_GIANT_EDITAL = """
EDITAL DE CHAMAMENTO PÚBLICO Nº 01/2026 - CULTURA VIVA
ÓRGÃO CONVOCATÓRIO: SECRETARIA DE ESTADO DE CULTURA

CAPÍTULO I - DO OBJETO E JUSTIFICATIVA
1.1 O presente chamamento público tem por objeto a seleção de 50 projetos culturais voltados à circulação de espetáculos cênicos e musicais.
1.2 A justificativa baseia-se na descentralização territorial e democratização cultural em municípios com menos de 50 mil habitantes.

CAPÍTULO II - DOS PRAZOS E CRONOGRAMA
2.1 As inscrições ficam abertas do dia 01/10/2026 até 31/10/2026.
2.2 O prazo para impugnação do edital é de 3 (três) dias úteis após a publicação.
2.3 A execução dos projetos selecionados deverá ocorrer no prazo de 6 (seis) meses contados da data de homologação.

CAPÍTULO III - DOS RECURSOS FINANCEIROS E ORÇAMENTO
3.1 O valor total destinado a este certame é de R$ 5.000.000,00 (cinco milhões de reais).
3.2 Cada projeto poderá solicitar até R$ 100.000,00.
3.3 Os custos administrativos não poderão exceder 15% (quinze por cento) do valor total proposto, conforme Art. 12 da Lei 14.903/2024.
3.4 Os custos com comunicação e divulgação estão limitados ao teto referencial de 10%.
3.5 É expressamente vedada a incidência de taxa de BDI sobre itens de fornecimento ou compra de bens sem justificativa (Súmula TCU 272).

CAPÍTULO IV - DA ACESSIBILIDADE E DEMOCRATIZAÇÃO
4.1 Todos os projetos deverão contemplar obrigatoriamente medidas de acessibilidade comunicacional, incluindo intérprete de Libras e audiodescrição.
4.2 Deverá ser garantida a reserva de no mínimo 10% dos assentos para pessoas com deficiência ou mobilidade reduzida, atendendo à NBR 9050.
4.3 A distribuição de ingressos gratuitos deverá atingir ao menos 50% da lotação de cada apresentação.

CAPÍTULO V - DA HABILITAÇÃO JURÍDICA E COMPLIANCE
5.1 O proponente deverá comprovar regularidade perante a Seguridade Social (CND do INSS) e ao FGTS.
5.2 Apresentação obrigatória da Certidão Negativa de Débitos Trabalhistas (CNDT).
5.3 Comprovação de regularidade com o Ecad para execução de obras musicais protegidas por direitos autorais.
"""

class TestSurgicalChunker(unittest.TestCase):
    """
    Testes automatizados do fatiador cirúrgico de editais (Surgical Chunker).
    Garante que cada parecerista MUSA receba apenas as seções relevantes com < 3.000 tokens.
    """

    def test_surgical_context_orcamento(self):
        """O parecerista de orçamento só deve receber cláusulas de valores, tetos e BDI."""
        ctx = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "orcamento")
        self.assertIn("15%", ctx)
        self.assertIn("Súmula TCU 272", ctx)
        self.assertIn("R$ 100.000,00", ctx)
        # Não deve conter detalhes de ingressos ou NBR 9050 se o corte for estrito
        self.assertLess(len(ctx), len(SAMPLE_GIANT_EDITAL))

    def test_surgical_context_acessibilidade(self):
        """O parecerista de acessibilidade deve receber medidas de inclusão e Libras."""
        ctx = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "acessibilidade")
        self.assertIn("Libras", ctx)
        self.assertIn("audiodescrição", ctx)
        self.assertIn("NBR 9050", ctx)

    def test_surgical_context_juridico(self):
        """O parecerista jurídico/compliance deve receber exigências de certidões e CNDT."""
        ctx = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "compliance")
        self.assertIn("CNDT", ctx)
        self.assertIn("FGTS", ctx)
        self.assertIn("Ecad", ctx)

    def test_surgical_context_prazos_cronograma(self):
        """O parecerista de cronograma deve receber datas e prazos de recurso."""
        ctx = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "cronograma")
        self.assertIn("impugnação", ctx)
        self.assertIn("6 (seis) meses", ctx)

    def test_extract_bundle_covers_all_musa(self):
        """O bundle cirúrgico deve gerar fatias para todos os pareceristas mapeados."""
        bundle = extract_surgical_bundle(SAMPLE_GIANT_EDITAL)
        self.assertIn("orcamento", bundle)
        self.assertIn("acessibilidade", bundle)
        self.assertIn("compliance", bundle)
        self.assertIn("cronograma", bundle)
        self.assertIn("justificativa", bundle)
        # Aliases também devem estar disponíveis no bundle para o frontend
        self.assertIn("rider", bundle)
        self.assertIn("publico", bundle)
        self.assertIn("ficha_tecnica", bundle)

    def test_surgical_context_aliases(self):
        """Aliases como 'juridico', 'prazos', 'rider' e 'ficha_tecnica' devem ser resolvidos."""
        ctx_juridico = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "juridico")
        self.assertIn("CNDT", ctx_juridico)
        
        ctx_prazos = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "prazos")
        self.assertIn("impugnação", ctx_prazos)

        ctx_rider = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "rider")
        self.assertTrue(len(ctx_rider) > 0)

        ctx_ficha = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "ficha_tecnica")
        self.assertTrue(len(ctx_ficha) > 0)

    def test_surgical_context_unknown_fallback(self):
        """Se o parecerista for desconhecido, deve retornar fallback seguro do edital sem travar."""
        ctx = get_surgical_context_for_parecerista(SAMPLE_GIANT_EDITAL, "desconhecido_xyz")
        self.assertTrue(len(ctx) > 0)

if __name__ == "__main__":
    unittest.main()
