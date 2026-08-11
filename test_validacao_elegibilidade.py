# test_validacao_elegibilidade.py
# -*- coding: utf-8 -*-
"""
Suíte de Testes Automatizados: Validação de Elegibilidade Jurídica, Orçamentária e Territorial
Valida critérios eliminatórios e classificatórios conforme diretrizes de editais de fomento.
"""

import unittest
from datetime import date
from typing import Dict, Any, List, Tuple


class EligibilityValidator:
    """Motor de validação de elegibilidade e conformidade regulatória para editais públicos."""

    MUNICAPIOS_ELEGIVEIS_RIO_DOCE = {
        "mariana", "baixo guandu", "colatina", "linhares", "fundao", "fundão",
        "serra", "aracruz", "governador valadares", "ipatinga", "timoteo", "timóteo"
    }

    NATUREZAS_JURIDICAS_PERMITIDAS = {
        "associacao", "associação", "cooperativa", "fundacao", "fundação", "osc", "ong"
    }

    @classmethod
    def validate_proponent(cls, proponent: Dict[str, Any], edital_rules: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Avalia a elegibilidade de um proponente frente às regras de um edital."""
        inconsistencies = []

        # 1. Natureza Jurídica
        natureza = proponent.get("natureza_juridica", "").lower().strip()
        if natureza not in cls.NATUREZAS_JURIDICAS_PERMITIDAS:
            inconsistencies.append(f"Natureza jurídica '{natureza}' não permitida para editais comunitários sem fins lucrativos.")

        # 2. Tempo de Fundação / Existência
        tempo_meses = proponent.get("tempo_existencia_meses", 0)
        min_meses = edital_rules.get("min_existencia_meses", 12)
        if tempo_meses < min_meses:
            inconsistencies.append(f"Tempo de existência de {tempo_meses} meses é inferior ao mínimo exigido ({min_meses} meses).")

        # 3. Território de Atuação / Sede
        cidade = proponent.get("municipio", "").lower().strip()
        if cidade not in cls.MUNICAPIOS_ELEGIVEIS_RIO_DOCE:
            inconsistencies.append(f"Município '{proponent.get('municipio')}' não consta na lista de territórios elegíveis da Bacia do Rio Doce.")

        # 4. Certidões de Regularidade Fiscal
        certidoes = proponent.get("certidoes", {})
        data_referencia = edital_rules.get("data_referencia", date(2026, 6, 29))
        
        for cert_nome, cert_val in certidoes.items():
            if not cert_val.get("valida", False):
                inconsistencies.append(f"Certidão {cert_nome} inválida ou ausente.")
            elif cert_val.get("validade") and cert_val.get("validade") < data_referencia:
                inconsistencies.append(f"Certidão {cert_nome} vencida em {cert_val.get('validade')}.")

        # 5. Teto Orçamentário e Sub-tetos
        valor_solicitado = proponent.get("valor_solicitado", 0.0)
        teto_max = edital_rules.get("teto_orcamentario", 220000.0)
        piso_min = edital_rules.get("piso_orcamentario", 50000.0)
        
        if valor_solicitado > teto_max:
            inconsistencies.append(f"Valor solicitado (R$ {valor_solicitado:,.2f}) excede o teto máximo permitido (R$ {teto_max:,.2f}).")
        elif valor_solicitado < piso_min:
            inconsistencies.append(f"Valor solicitado (R$ {valor_solicitado:,.2f}) é inferior ao piso mínimo (R$ {piso_min:,.2f}).")

        # 6. Limite de Custos Administrativos
        custos_admin = proponent.get("custos_administrativos_pct", 0.0)
        max_admin_pct = edital_rules.get("max_admin_pct", 15.0)
        if custos_admin > max_admin_pct:
            inconsistencies.append(f"Custos administrativos ({custos_admin:.1f}%) excedem o teto permitido de {max_admin_pct:.1f}%.")

        # 7. Acessibilidade Obrigatória
        medidas_acessibilidade = proponent.get("medidas_acessibilidade", [])
        if not medidas_acessibilidade:
            inconsistencies.append("Proposta não previu nenhuma medida obrigatória de acessibilidade (LIBRAS, Audiodescrição ou Física).")

        is_eligible = (len(inconsistencies) == 0)
        return is_eligible, inconsistencies


class TestValidacaoElegibilidade(unittest.TestCase):
    """Testes unitários para regras de elegibilidade e conformidade."""

    def setUp(self):
        self.edital_rules = {
            "teto_orcamentario": 220000.0,
            "piso_orcamentario": 50000.0,
            "min_existencia_meses": 12,
            "max_admin_pct": 15.0,
            "data_referencia": date(2026, 6, 29)
        }

    def test_proponente_totalmente_elegivel(self):
        """Valida que uma proposta 100% em conformidade é aprovada sem pendências."""
        proponent = {
            "nome": "Associação Cultural Tambores Esperança",
            "natureza_juridica": "Associação",
            "tempo_existencia_meses": 36,
            "municipio": "Fundão",
            "valor_solicitado": 220000.0,
            "custos_administrativos_pct": 12.5,
            "certidoes": {
                "CNDT": {"valida": True, "validade": date(2026, 12, 31)},
                "FGTS": {"valida": True, "validade": date(2026, 8, 15)},
                "ReceitaFederal": {"valida": True, "validade": date(2026, 10, 10)},
            },
            "medidas_acessibilidade": ["Intérprete de LIBRAS", "Espaço com rampa de acesso"]
        }
        eligible, errors = EligibilityValidator.validate_proponent(proponent, self.edital_rules)
        self.assertTrue(eligible)
        self.assertEqual(len(errors), 0)

    def test_rejeicao_por_teto_orcamentario_estourado(self):
        """Valida a reprovação quando o valor solicitado ultrapassa o teto do edital."""
        proponent = {
            "natureza_juridica": "Associação",
            "tempo_existencia_meses": 24,
            "municipio": "Linhares",
            "valor_solicitado": 250000.0,  # Teto é 220k
            "custos_administrativos_pct": 10.0,
            "certidoes": {"CNDT": {"valida": True, "validade": date(2026, 12, 31)}},
            "medidas_acessibilidade": ["LIBRAS"]
        }
        eligible, errors = EligibilityValidator.validate_proponent(proponent, self.edital_rules)
        self.assertFalse(eligible)
        self.assertTrue(any("excede o teto máximo" in err for err in errors))

    def test_rejeicao_por_custos_administrativos_acima_do_limite(self):
        """Valida a reprovação quando os custos administrativos excedem 15%."""
        proponent = {
            "natureza_juridica": "Cooperativa",
            "tempo_existencia_meses": 18,
            "municipio": "Colatina",
            "valor_solicitado": 180000.0,
            "custos_administrativos_pct": 18.5,  # Limite é 15%
            "certidoes": {"CNDT": {"valida": True, "validade": date(2026, 12, 31)}},
            "medidas_acessibilidade": ["Audiodescrição"]
        }
        eligible, errors = EligibilityValidator.validate_proponent(proponent, self.edital_rules)
        self.assertFalse(eligible)
        self.assertTrue(any("Custos administrativos" in err for err in errors))

    def test_rejeicao_por_certidao_vencida(self):
        """Valida que certidões com validade anterior à data limite do edital são rejeitadas."""
        proponent = {
            "natureza_juridica": "OSC",
            "tempo_existencia_meses": 48,
            "municipio": "Mariana",
            "valor_solicitado": 200000.0,
            "custos_administrativos_pct": 8.0,
            "certidoes": {
                "CNDT": {"valida": True, "validade": date(2026, 5, 10)},  # Vencida antes de 29/06/2026
            },
            "medidas_acessibilidade": ["LIBRAS"]
        }
        eligible, errors = EligibilityValidator.validate_proponent(proponent, self.edital_rules)
        self.assertFalse(eligible)
        self.assertTrue(any("vencida em" in err for err in errors))

    def test_rejeicao_por_territorio_nao_elegivel(self):
        """Valida a rejeição de proponente com sede fora dos municípios atingidos."""
        proponent = {
            "natureza_juridica": "Associação",
            "tempo_existencia_meses": 24,
            "municipio": "Porto Alegre",  # Fora da Bacia do Rio Doce
            "valor_solicitado": 150000.0,
            "custos_administrativos_pct": 10.0,
            "certidoes": {"CNDT": {"valida": True, "validade": date(2026, 12, 31)}},
            "medidas_acessibilidade": ["LIBRAS"]
        }
        eligible, errors = EligibilityValidator.validate_proponent(proponent, self.edital_rules)
        self.assertFalse(eligible)
        self.assertTrue(any("não consta na lista de territórios elegíveis" in err for err in errors))


if __name__ == '__main__':
    unittest.main()
