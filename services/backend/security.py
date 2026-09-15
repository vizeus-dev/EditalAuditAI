#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Módulo de Segurança e Validações Anti-SSRF e Anti-DoS para o EditalAudit AI
"""

import socket
import ipaddress
import urllib.parse

def validate_safe_url(target_url: str):
    """
    Valida se uma URL é segura para requisição (Anti-SSRF).
    Permite apenas HTTP/HTTPS e bloqueia endereços de loopback (127.0.0.1, localhost),
    redes privadas (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) e metadados de nuvem (169.254.169.254).
    """
    if not target_url or not isinstance(target_url, str):
        raise ValueError("URL inválida ou não fornecida.")
        
    parsed = urllib.parse.urlparse(target_url.strip())
    if parsed.scheme not in ('http', 'https'):
        raise ValueError(f"Esquema de URL inválido '{parsed.scheme}'. Apenas HTTP e HTTPS são permitidos.")
        
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Hostname inválido na URL fornecida.")
        
    # Bloqueio explícito de hostnames de loopback comuns
    if hostname.lower() in ('localhost', '127.0.0.1', '::1'):
        raise ValueError(f"Acesso bloqueado ao endereço local/loopback: {hostname}")
        
    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
        if not resolved_ips:
            raise ValueError(f"Não foi possível resolver o hostname: {hostname}")
            
        for item in resolved_ips:
            ip_str = item[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local or ip_obj.is_multicast:
                raise ValueError(f"Acesso bloqueado ao endereço de rede privada/interna: {ip_str}")
            if str(ip_obj) == "169.254.169.254":
                raise ValueError("Acesso bloqueado a endpoint de metadados da nuvem.")
    except socket.gaierror:
        raise ValueError(f"Falha na resolução de DNS para o domínio: {hostname}")
