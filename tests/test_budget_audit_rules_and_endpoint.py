import unittest
import json
import os

class TestBudgetAuditRulesAndEndpoint(unittest.TestCase):
    """
    Testes de TDD para o motor de regras contábeis e orçamentárias (TK-02)
    e o endpoint /api/audit-budget no backend modular (Agente ALPHA).
    """

    def setUp(self):
        # Importação do handler a ser testado
        from services.backend.handlers.budget_audit_handler import audit_budget_rules
        self.audit_func = audit_budget_rules

    def test_audit_fechamento_capa_sem_divergencia(self):
        """Valida que uma planilha com soma exata igual à capa não gera divergência."""
        items = [
            {"item": "Oficina de Teatro", "quantidade": 10, "valorUnitario": 1000, "total": 10000},
            {"item": "Cenografia", "quantidade": 1, "valorUnitario": 5000, "total": 5000}
        ]
        res = self.audit_func(items, declared_budget=15000.0)
        self.assertEqual(res["total_calculado"], 15000.0)
        self.assertEqual(res["total_declarado"], 15000.0)
        self.assertEqual(res["divergencia"], 0.0)
        self.assertFalse(res["has_divergence"])

    def test_audit_fechamento_capa_com_divergencia(self):
        """Valida que divergência entre capa e planilha emite apontamento saneável."""
        items = [
            {"item": "Oficina de Teatro", "quantidade": 10, "valorUnitario": 1000, "total": 10000}
        ]
        res = self.audit_func(items, declared_budget=12000.0)
        self.assertEqual(res["total_calculado"], 10000.0)
        self.assertEqual(res["total_declarado"], 12000.0)
        self.assertEqual(res["divergencia"], 2000.0)
        self.assertTrue(res["has_divergence"])
        self.assertTrue(any("Divergência orçamentária" in a for a in res["alertas"]))

    def test_audit_teto_administrativo_excedido(self):
        """Valida que despesas de gestão acima de 15% violam a Lei 14.903/2024."""
        items = [
            {"item": "Coordenação Geral", "quantidade": 1, "valorUnitario": 20000, "total": 20000}, # 20%
            {"item": "Apresentação Musical", "quantidade": 1, "valorUnitario": 80000, "total": 80000}
        ]
        res = self.audit_func(items, declared_budget=100000.0)
        self.assertEqual(res["total_admin"], 20000.0)
        self.assertAlmostEqual(res["pct_admin"], 20.0, places=1)
        self.assertTrue(res["admin_exceeded"])
        self.assertTrue(any("15%" in a for a in res["alertas"]))

    def test_audit_teto_divulgacao_excedido(self):
        """Valida que despesas de comunicação acima de 10% emitem alerta."""
        items = [
            {"item": "Assessoria de Imprensa", "quantidade": 1, "valorUnitario": 15000, "total": 15000}, # 15%
            {"item": "Produção do Espetáculo", "quantidade": 1, "valorUnitario": 85000, "total": 85000}
        ]
        res = self.audit_func(items, declared_budget=100000.0)
        self.assertAlmostEqual(res["pct_com"], 15.0, places=1)
        self.assertTrue(res["com_exceeded"])

    def test_audit_sumula_tcu_272_bdi_proibido(self):
        """Valida apontamento contra aplicação de BDI sobre aquisição de bens ou materiais puros."""
        items = [
            {"item": "Aquisição de Equipamento de Iluminação", "quantidade": 1, "valorUnitario": 10000, "total": 10000},
            {"item": "Taxa de BDI sobre Equipamento", "quantidade": 1, "valorUnitario": 2500, "total": 2500}
        ]
        res = self.audit_func(items, declared_budget=12500.0)
        self.assertTrue(res["has_sumula_tcu_272_risk"])
        self.assertTrue(any("Súmula TCU 272" in a for a in res["alertas"]))

    def test_handle_budget_audit_request_integration(self):
        """Valida o controlador HTTP recebendo payload JSON e emitindo resposta 200."""
        from services.backend.handlers.budget_audit_handler import handle_budget_audit_request
        
        class MockHandler:
            def __init__(self):
                self.status_code = None
                self.response_data = None
            def send_json_response(self, code, data):
                self.status_code = code
                self.response_data = data

        handler = MockHandler()
        payload = json.dumps({
            "items": [
                {"item": "Oficina", "quantidade": 1, "valorUnitario": 5000, "total": 5000}
            ],
            "declared_budget": 5000.0
        }).encode('utf-8')

        handle_budget_audit_request(handler, payload)
        self.assertEqual(handler.status_code, 200)
        self.assertEqual(handler.response_data["total_calculado"], 5000.0)
        self.assertFalse(handler.response_data["has_divergence"])

if __name__ == "__main__":
    unittest.main()
