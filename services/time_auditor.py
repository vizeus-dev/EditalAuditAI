# services/time_auditor.py
# -*- coding: utf-8 -*-
"""
Módulo de Auditoria Temporal e Cálculo de Prazos de Editais
Gerencia conversão de fusos horários brasileiros (UTC-3, UTC-4, UTC-5, UTC-2)
e aplicação de janela de tolerância técnica (Grace Period) para latência de rede.
"""

from datetime import datetime, timezone, timedelta
import re

# Definição dos fusos horários brasileiros conforme legislação federal
FUSO_BRASILIA = timezone(timedelta(hours=-3), name="America/Sao_Paulo")
FUSO_MANAUS = timezone(timedelta(hours=-4), name="America/Manaus")
FUSO_ACRE = timezone(timedelta(hours=-5), name="America/Rio_Branco")
FUSO_NORONHA = timezone(timedelta(hours=-2), name="America/Noronha")
FUSO_UTC = timezone.utc


class DeadlineTimezoneCalculator:
    """Calculadora de prazos e conformidade temporal com suporte a múltiplos fusos e grace period."""
    
    GRACE_PERIOD_SECONDS = 120  # Janela de tolerância técnica para latência de rede (2 minutos)
    
    @staticmethod
    def parse_edital_deadline(date_str: str, time_str: str = "23:59:59", tz: timezone = FUSO_BRASILIA) -> datetime:
        """
        Converte strings de data (DD/MM/YYYY, DD.MM.YYYY ou YYYY-MM-DD) e hora em objeto datetime consciente de fuso.
        Garante resolução de microssegundos (999999) para evitar corte prematuro no último segundo.
        """
        if not date_str or not isinstance(date_str, str):
            raise ValueError("String de data não fornecida ou inválida.")

        clean_date = re.sub(r'[\.\-]', '/', date_str.strip())
        parts = clean_date.split('/')
        if len(parts) != 3:
            raise ValueError(f"Formato de data inválido: {date_str}")
        
        # Suporte a formato ISO (YYYY/MM/DD) e brasileiro (DD/MM/YYYY)
        if len(parts[0]) == 4:
            year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
        else:
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            if year < 100:
                year += 2000
            
        time_parts = [int(p) for p in (time_str or "23:59:59").split(':')]
        hour = time_parts[0] if len(time_parts) > 0 else 23
        minute = time_parts[1] if len(time_parts) > 1 else 59
        second = time_parts[2] if len(time_parts) > 2 else 59
        
        # Garante microsecond=999999 para o último segundo do prazo
        dt_naive = datetime(year, month, day, hour, minute, second, 999999)
        return dt_naive.replace(tzinfo=tz)

    @staticmethod
    def is_submission_eligible(submission_dt: datetime, deadline_dt: datetime, allow_grace_period: bool = True) -> bool:
        """
        Verifica se a submissão ocorreu dentro do prazo legal do edital.
        Aplica janela de tolerância técnica (Grace Period de 120s) por padrão para absorver latência de rede TCP/IP.
        Valida se submissao_utc <= (deadline_utc + timedelta(seconds=120)).
        """
        sub_utc = submission_dt.astimezone(FUSO_UTC)
        dead_utc = deadline_dt.astimezone(FUSO_UTC)
        
        if allow_grace_period:
            dead_utc += timedelta(seconds=DeadlineTimezoneCalculator.GRACE_PERIOD_SECONDS)
            
        return sub_utc <= dead_utc

    @staticmethod
    def remaining_time(current_dt: datetime, deadline_dt: datetime) -> timedelta:
        """Calcula o tempo restante até o encerramento do edital."""
        curr_utc = current_dt.astimezone(FUSO_UTC)
        dead_utc = deadline_dt.astimezone(FUSO_UTC)
        return dead_utc - curr_utc
