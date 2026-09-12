# tests/test_prazo_deadline_timezone.py
# -*- coding: utf-8 -*-
# Groundwork para futura validação de prazo de submissão em tempo real — não usado no fluxo atual, que é auditoria assíncrona sem prazo de inscrição.
"""
Suíte de Testes Automatizados: Cálculo de Prazo/Deadline, Conversão de Fuso Horário e Grace Period
Valida a conformidade de prazos de editais públicos com base no Horário Oficial de Brasília (UTC-3),
resolução de microssegundos e janela de tolerância técnica (120s) para latência de rede.
"""

import unittest
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.time_auditor import (
    DeadlineTimezoneCalculator,
    FUSO_BRASILIA,
    FUSO_MANAUS,
    FUSO_ACRE,
    FUSO_UTC
)


class TestPrazoDeadlineTimezone(unittest.TestCase):
    """Testes unitários para cálculo de prazos, fusos horários e tolerância de rede."""
    
    def setUp(self):
        # Edital Rio Doce: Encerramento em 29/06/2026 às 23h59:59 no horário de Brasília (UTC-3)
        self.deadline_brasilia = DeadlineTimezoneCalculator.parse_edital_deadline("29.06.2026", "23:59:59", FUSO_BRASILIA)

    def test_parse_deadline_brasilia_with_microseconds(self):
        """Verifica o parsing correto do prazo com timezone UTC-3 e teto de microssegundos (999999)."""
        self.assertEqual(self.deadline_brasilia.year, 2026)
        self.assertEqual(self.deadline_brasilia.month, 6)
        self.assertEqual(self.deadline_brasilia.day, 29)
        self.assertEqual(self.deadline_brasilia.hour, 23)
        self.assertEqual(self.deadline_brasilia.minute, 59)
        self.assertEqual(self.deadline_brasilia.second, 59)
        self.assertEqual(self.deadline_brasilia.microsecond, 999999)
        self.assertEqual(self.deadline_brasilia.tzinfo, FUSO_BRASILIA)

    def test_timezone_conversion_utc(self):
        """Verifica se 23:59:59.999999 BRT (UTC-3) corresponde a 02:59:59.999999 UTC do dia seguinte."""
        deadline_utc = self.deadline_brasilia.astimezone(FUSO_UTC)
        self.assertEqual(deadline_utc.year, 2026)
        self.assertEqual(deadline_utc.month, 6)
        self.assertEqual(deadline_utc.day, 30)
        self.assertEqual(deadline_utc.hour, 2)
        self.assertEqual(deadline_utc.minute, 59)
        self.assertEqual(deadline_utc.second, 59)
        self.assertEqual(deadline_utc.microsecond, 999999)

    def test_submission_from_manaus_timezone(self):
        """Proponente em Manaus (UTC-4) submete às 22h30 locais no dia 29/06/2026 (23h30 BRT)."""
        sub_manaus = datetime(2026, 6, 29, 22, 30, 0, tzinfo=FUSO_MANAUS)
        self.assertTrue(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_manaus, self.deadline_brasilia),
            "Submissão de Manaus às 22h30 local deveria ser considerada elegível."
        )

    def test_submission_from_acre_timezone(self):
        """Proponente no Acre (UTC-5) submete às 21h45 locais no dia 29/06/2026 (23h45 BRT)."""
        sub_acre = datetime(2026, 6, 29, 21, 45, 0, tzinfo=FUSO_ACRE)
        self.assertTrue(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_acre, self.deadline_brasilia),
            "Submissão do Acre às 21h45 local deveria ser considerada elegível."
        )

    def test_submission_exact_limit_microsecond(self):
        """Submissão no último microssegundo do prazo (23:59:59.999999) deve ser aceita."""
        sub_exact = datetime(2026, 6, 29, 23, 59, 59, 999999, tzinfo=FUSO_BRASILIA)
        self.assertTrue(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_exact, self.deadline_brasilia),
            "Submissão no último microssegundo deve ser considerada elegível."
        )

    def test_submission_within_grace_period(self):
        """
        Submissão com trânsito de rede atrasado em 45 segundos (00:00:45 do dia seguinte).
        Deve ser aceita dentro da janela de tolerância técnica de 120s.
        """
        sub_grace = datetime(2026, 6, 30, 0, 0, 45, tzinfo=FUSO_BRASILIA)
        self.assertTrue(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_grace, self.deadline_brasilia, allow_grace_period=True),
            "Submissão dentro da janela de tolerância técnica de 120s deve ser aceita."
        )

    def test_submission_exceeding_grace_period(self):
        """
        Submissão 125 segundos após o encerramento do prazo (00:02:05 do dia seguinte).
        Deve ser categoricamente rejeitada (intempestiva).
        """
        sub_late = datetime(2026, 6, 30, 0, 2, 5, tzinfo=FUSO_BRASILIA)
        self.assertFalse(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_late, self.deadline_brasilia, allow_grace_period=True),
            "Submissão que excede o período de tolerância técnica deve ser rejeitada."
        )

    def test_strict_mode_without_grace_period(self):
        """No modo estrito (sem tolerância), qualquer fração após 23:59:59.999999 é rejeitada."""
        sub_strict_late = datetime(2026, 6, 30, 0, 0, 1, tzinfo=FUSO_BRASILIA)
        self.assertFalse(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_strict_late, self.deadline_brasilia, allow_grace_period=False),
            "No modo estrito, submissão após o teto exato deve ser rejeitada."
        )

    def test_remaining_time_calculation(self):
        """Verifica o cálculo do tempo restante até o encerramento do edital."""
        current_time = datetime(2026, 6, 20, 10, 0, 0, tzinfo=FUSO_BRASILIA)
        rem = DeadlineTimezoneCalculator.remaining_time(current_time, self.deadline_brasilia)
        self.assertEqual(rem.days, 9)
        self.assertEqual(rem.seconds, (13 * 3600) + (59 * 60) + 59)
        self.assertEqual(rem.microseconds, 999999)


if __name__ == '__main__':
    unittest.main()
