# test_prazo_deadline_timezone.py
# -*- coding: utf-8 -*-
"""
Suíte de Testes Automatizados: Cálculo de Prazo/Deadline e Conversão de Fuso Horário
Valida a conformidade de prazos de editais públicos com base no Horário Oficial de Brasília (UTC-3).
"""

import unittest
from datetime import datetime, timezone, timedelta
import re

# Definição dos fusos horários brasileiros conforme legislação
FUSO_BRASILIA = timezone(timedelta(hours=-3), name="America/Sao_Paulo")
FUSO_MANAUS = timezone(timedelta(hours=-4), name="America/Manaus")
FUSO_NORONHA = timezone(timedelta(hours=-2), name="America/Noronha")
FUSO_UTC = timezone.utc


class DeadlineTimezoneCalculator:
    """Calculadora de prazos e conformidade temporal com suporte a múltiplos fusos."""
    
    @staticmethod
    def parse_edital_deadline(date_str: str, time_str: str = "23:59:59", tz: timezone = FUSO_BRASILIA) -> datetime:
        """Converte strings de data (DD/MM/YYYY ou DD.MM.YYYY) e hora em objeto datetime consciente de fuso."""
        clean_date = re.sub(r'[\.\-]', '/', date_str.strip())
        parts = clean_date.split('/')
        if len(parts) != 3:
            raise ValueError(f"Formato de data inválido: {date_str}")
        
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        if year < 100:
            year += 2000
            
        time_parts = [int(p) for p in time_str.split(':')]
        hour = time_parts[0] if len(time_parts) > 0 else 23
        minute = time_parts[1] if len(time_parts) > 1 else 59
        second = time_parts[2] if len(time_parts) > 2 else 59
        
        dt_naive = datetime(year, month, day, hour, minute, second)
        return dt_naive.replace(tzinfo=tz)

    @staticmethod
    def is_submission_eligible(submission_dt: datetime, deadline_dt: datetime) -> bool:
        """Verifica se a submissão ocorreu estritamente antes ou no segundo limite do prazo."""
        # Converter ambas para UTC para comparação segura independente de fuso de origem
        sub_utc = submission_dt.astimezone(FUSO_UTC)
        dead_utc = deadline_dt.astimezone(FUSO_UTC)
        return sub_utc <= dead_utc

    @staticmethod
    def remaining_time(current_dt: datetime, deadline_dt: datetime) -> timedelta:
        """Calcula o tempo restante até o encerramento do edital."""
        curr_utc = current_dt.astimezone(FUSO_UTC)
        dead_utc = deadline_dt.astimezone(FUSO_UTC)
        return dead_utc - curr_utc


class TestPrazoDeadlineTimezone(unittest.TestCase):
    """Testes unitários para cálculo de prazos e fusos horários."""
    
    def setUp(self):
        # Edital Rio Doce: Encerramento em 29/06/2026 às 23h59 no horário de Brasília (UTC-3)
        self.deadline_brasilia = DeadlineTimezoneCalculator.parse_edital_deadline("29.06.2026", "23:59:59", FUSO_BRASILIA)

    def test_parse_deadline_brasilia(self):
        """Verifica o parsing correto do prazo com timezone UTC-3."""
        self.assertEqual(self.deadline_brasilia.year, 2026)
        self.assertEqual(self.deadline_brasilia.month, 6)
        self.assertEqual(self.deadline_brasilia.day, 29)
        self.assertEqual(self.deadline_brasilia.hour, 23)
        self.assertEqual(self.deadline_brasilia.minute, 59)
        self.assertEqual(self.deadline_brasilia.second, 59)
        self.assertEqual(self.deadline_brasilia.tzinfo, FUSO_BRASILIA)

    def test_timezone_conversion_utc(self):
        """Verifica se 23:59:59 BRT (UTC-3) corresponde exatamente a 02:59:59 UTC do dia seguinte."""
        deadline_utc = self.deadline_brasilia.astimezone(FUSO_UTC)
        self.assertEqual(deadline_utc.year, 2026)
        self.assertEqual(deadline_utc.month, 6)
        self.assertEqual(deadline_utc.day, 30)
        self.assertEqual(deadline_utc.hour, 2)
        self.assertEqual(deadline_utc.minute, 59)
        self.assertEqual(deadline_utc.second, 59)

    def test_submission_from_manaus_timezone(self):
        """Proponente em Manaus (UTC-4) submete às 22h30 locais no dia 29/06/2026.
        22h30 Manaus (UTC-4) = 23h30 Brasília (UTC-3) -> ELEGÍVEL DENTRO DO PRAZO.
        """
        sub_manaus = datetime(2026, 6, 29, 22, 30, 0, tzinfo=FUSO_MANAUS)
        self.assertTrue(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_manaus, self.deadline_brasilia),
            "Submissão de Manaus às 22h30 local deveria ser considerada elegível."
        )

    def test_submission_from_manaus_late(self):
        """Proponente em Manaus (UTC-4) submete às 23h15 locais no dia 29/06/2026.
        23h15 Manaus (UTC-4) = 00h15 do dia 30/06 em Brasília (UTC-3) -> INTEMPESTIVA (REPROVADA).
        """
        sub_manaus_late = datetime(2026, 6, 29, 23, 15, 0, tzinfo=FUSO_MANAUS)
        self.assertFalse(
            DeadlineTimezoneCalculator.is_submission_eligible(sub_manaus_late, self.deadline_brasilia),
            "Submissão de Manaus após as 23h locais ultrapassou o teto de Brasília."
        )

    def test_submission_exact_limit_second(self):
        """Submissão no segundo limite exato (23:59:59) deve ser aceita."""
        sub_exact = datetime(2026, 6, 29, 23, 59, 59, tzinfo=FUSO_BRASILIA)
        self.assertTrue(DeadlineTimezoneCalculator.is_submission_eligible(sub_exact, self.deadline_brasilia))

    def test_submission_one_second_late(self):
        """Submissão 1 segundo após o prazo limite (00:00:00 do dia 30/06) deve ser rejeitada."""
        sub_late = datetime(2026, 6, 30, 0, 0, 0, tzinfo=FUSO_BRASILIA)
        self.assertFalse(DeadlineTimezoneCalculator.is_submission_eligible(sub_late, self.deadline_brasilia))

    def test_remaining_time_calculation(self):
        """Verifica o cálculo do tempo restante até o encerramento do edital."""
        current_time = datetime(2026, 6, 20, 10, 0, 0, tzinfo=FUSO_BRASILIA)
        rem = DeadlineTimezoneCalculator.remaining_time(current_time, self.deadline_brasilia)
        self.assertEqual(rem.days, 9)
        self.assertEqual(rem.seconds, (13 * 3600) + (59 * 60) + 59)


if __name__ == '__main__':
    unittest.main()
