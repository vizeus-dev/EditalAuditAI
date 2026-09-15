# -*- coding: utf-8 -*-
"""
errors.py — Hierarquia Centralizada de Exceções e Respostas de Erro (Padrão ECC Backend)
Padroniza códigos de status HTTP, mensagens seguras e formatos canônicos de resposta JSON.
"""

from typing import Dict, Any, Optional, Tuple
import datetime


class ApiError(Exception):
    """Exceção base para erros de domínio e API no backend."""
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_SERVER_ERROR",
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}

    def to_response_dict(self) -> Dict[str, Any]:
        res = {
            "success": False,
            "error": self.message,
            "code": self.error_code,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        if self.details:
            res["details"] = self.details
        return res


class ValidationError(ApiError):
    """Erro de validação de payload ou campos obrigatórios faltantes (HTTP 400)."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message, status_code=400, error_code="VALIDATION_ERROR", details=details)


class NotFoundError(ApiError):
    """Recurso ou arquivo não encontrado (HTTP 404)."""
    def __init__(self, message: str = "Recurso não encontrado.") -> None:
        super().__init__(message, status_code=404, error_code="NOT_FOUND")


class SecurityError(ApiError):
    """Violação de segurança, URL proibida ou bloqueio anti-SSRF (HTTP 403)."""
    def __init__(self, message: str = "Operação bloqueada por política de segurança.") -> None:
        super().__init__(message, status_code=403, error_code="SECURITY_VIOLATION")


class RateLimitExceededError(ApiError):
    """Limite de requisições excedido pelo upstream ou gateway (HTTP 429)."""
    def __init__(self, message: str = "Limite de requisições excedido. Aguarde alguns instantes.") -> None:
        super().__init__(message, status_code=429, error_code="RATE_LIMIT_EXCEEDED")


class UpstreamTimeoutError(ApiError):
    """Tempo limite de conexão com provedores externos esgotado (HTTP 504)."""
    def __init__(self, message: str = "Tempo limite de comunicação esgotado.") -> None:
        super().__init__(message, status_code=504, error_code="GATEWAY_TIMEOUT")


def format_error_response(exc: Exception) -> Tuple[int, Dict[str, Any]]:
    """
    Converte qualquer exceção Python no par (status_code, response_dict) canônico.
    """
    if isinstance(exc, ApiError):
        return exc.status_code, exc.to_response_dict()
    
    # Tratamento genérico de exceções não mapeadas
    return 500, {
        "success": False,
        "error": str(exc) or "Erro interno inesperado no servidor.",
        "code": "UNEXPECTED_ERROR",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
