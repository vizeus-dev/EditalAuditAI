# -*- coding: utf-8 -*-
"""
test_backend_domain_and_repo.py — Testes Unitários de Modelagem de Domínio e Padrões de Backend
Testa os modelos DDD canônicos, hierarquia de erros e AuditReportRepository.
"""

import unittest
import tempfile
import shutil
import os
from services.backend.domain_models import (
    CategoriaCusto,
    GrauSeveridade,
    RubricaOrcamentaria,
    DiscrepanciaOrcamentaria,
    DemonstrativoOrcamentario,
    ApontamentoConformidade,
    InstrumentoConvocatorio,
    SubmissaoRegistro
)
from services.backend.errors import (
    ApiError,
    ValidationError,
    NotFoundError,
    SecurityError,
    format_error_response
)
from services.backend.repositories import AuditReportRepository


class TestBackendDomainModels(unittest.TestCase):
    def test_rubrica_orcamentaria_calc_and_dict(self):
        rubrica = RubricaOrcamentaria(
            item="Cachê Musical",
            rubrica="Produção Artística",
            quantidade=3,
            valor_unitario=1500.0,
            categoria=CategoriaCusto.RECURSOS_HUMANOS
        )
        self.assertEqual(rubrica.total, 4500.0)
        d = rubrica.to_dict()
        self.assertEqual(d["item"], "Cachê Musical")
        self.assertEqual(d["categoria"], "RECURSOS_HUMANOS")
        self.assertEqual(d["total"], 4500.0)

    def test_discrepancia_orcamentaria(self):
        # Caso com divergência
        disc = DiscrepanciaOrcamentaria.calcular(declarado=50000.0, calculado=50200.0)
        self.assertTrue(disc.possui_divergencia)
        self.assertEqual(disc.diferenca_aritmetica, 200.0)

        # Caso em conformidade
        disc_ok = DiscrepanciaOrcamentaria.calcular(declarado=50000.0, calculado=50000.02)
        self.assertFalse(disc_ok.possui_divergencia)

    def test_apontamento_conformidade(self):
        apontamento = ApontamentoConformidade(
            id="APT-001",
            categoria="critical",
            regra="Teto Administrativo 15%",
            descricao="Despesas administrativas totalizam 18.2%",
            fundamento_legal="Art. 12 da Lei 14.903/2024",
            recomendacao="Readequar rubricas de coordenação para até 15%",
            severidade=GrauSeveridade.ELIMINATORIO
        )
        d = apontamento.to_dict()
        self.assertEqual(d["severidade"], "ELIMINATORIO")
        self.assertEqual(d["categoria"], "critical")


class TestBackendErrors(unittest.TestCase):
    def test_validation_error_format(self):
        err = ValidationError("Campo 'items' obrigatório.", details={"field": "items"})
        status, resp = format_error_response(err)
        self.assertEqual(status, 400)
        self.assertFalse(resp["success"])
        self.assertEqual(resp["code"], "VALIDATION_ERROR")
        self.assertEqual(resp["details"], {"field": "items"})

    def test_not_found_error_format(self):
        err = NotFoundError("Edital 404 não encontrado.")
        status, resp = format_error_response(err)
        self.assertEqual(status, 404)
        self.assertEqual(resp["code"], "NOT_FOUND")

    def test_security_error_format(self):
        err = SecurityError("Acesso a IP privado bloqueado.")
        status, resp = format_error_response(err)
        self.assertEqual(status, 403)
        self.assertEqual(resp["code"], "SECURITY_VIOLATION")


class TestAuditReportRepository(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.repo = AuditReportRepository(base_dir=self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_save_and_load_latest_report(self):
        sample_data = {
            "title": "Festival de Teatro Comunitário",
            "budget": 80000.0,
            "items": [{"item": "Palco", "total": 10000.0}]
        }
        reg = self.repo.save_report(sample_data, raw_sub_id="fest_teatro_01")
        self.assertIn("fest_teatro_01", reg.submission_id)
        self.assertTrue(os.path.exists(os.path.join(self.repo.submissions_dir, reg.filename)))

        loaded = self.repo.load_latest_report()
        self.assertEqual(loaded["title"], "Festival de Teatro Comunitário")
        self.assertEqual(loaded["budget"], 80000.0)

    def test_load_empty_raises_not_found(self):
        with self.assertRaises(NotFoundError):
            self.repo.load_latest_report()

    def test_save_invalid_data_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            self.repo.save_report("dados_invalidos_como_string")  # type: ignore

    def test_list_reports(self):
        self.repo.save_report({"prop": "A"}, raw_sub_id="sub_a")
        self.repo.save_report({"prop": "B"}, raw_sub_id="sub_b")
        reports = self.repo.list_reports(limit=10)
        self.assertEqual(len(reports), 2)


if __name__ == '__main__':
    unittest.main()
