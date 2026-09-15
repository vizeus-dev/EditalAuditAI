#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Servidor Customizado HTTP para EditalAudit AI
Suporta servir arquivos estáticos e atua como Proxy para carregamento de links de editais.
"""

import os
import sys
import time
import threading
import json
import socket
import ipaddress
import uuid
import urllib.request
import urllib.parse
import urllib.error
import re
import html
import io
import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
from services.api import LLMGateway, DocumentRetriever
from services.skills.anki_exporter import create_anki_apkg_zip

SERVER_START_TIME = time.time()

try:
    if sys.stdout is None or not hasattr(sys.stdout, 'fileno'):
        sys.stdout = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "server_run.log"), "a", encoding="utf-8", buffering=1)
except Exception as e:
    sys.stdout = io.StringIO()

try:
    if sys.stderr is None or not hasattr(sys.stderr, 'fileno'):
        sys.stderr = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "server_run.log"), "a", encoding="utf-8", buffering=1)
except Exception as e:
    sys.stderr = io.StringIO()

try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
except Exception as e:
    print(f"[SERVER][WARN] ReportLab não disponível no ambiente atual: {e}")

# Importações Modulares do Pacote services.backend (Padrão Ponytail)
from services.backend import (
    PORT,
    SERVER_START_TIME,
    USER_AGENTS,
    SECURITY_HEADERS,
    validate_safe_url,
    safe_encode_cp1252,
    fix_double_encoded_utf8,
    search_ddg_html,
    search_ddg_lite,
    search_wikipedia_api,
    search_yahoo,
    search_ddg,
    extract_document_links,
    HTMLTextExtractor,
    HTMLTableParser,
    get_divider,
    add_reportlab_footer,
    format_ptbr_currency,
    clean_html_tags,
    make_reportlab_safe,
    append_html_content_to_story,
    handle_anki_export,
    handle_llm_generate,
    handle_llm_stream,
    llm_gateway,
    handle_budget_audit_request,
    get_surgical_context_for_parecerista,
    extract_surgical_bundle,
    extract_text_and_metadata,
    detect_edital_metadata,
    generate_proposal_draft_suggestion,
    generate_proposal_abnt_pdf,
    generate_budget_xlsx,
    evaluate_musa_deep_review,
    AuditReportRepository,
    NotFoundError,
    ValidationError,
    ApiError
)

gateway = llm_gateway
audit_report_repo = AuditReportRepository()

# Armazenamento em memória resiliente para créditos de usuário (Pay-Per-Use / Asaas Pix)
# Mapeia user_id -> int (saldo de créditos)
USER_CREDIT_STORE = {}
# Mapeia charge_id -> dict (metadados da cobrança Pix)
PIX_CHARGES_STORE = {}


class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    timeout = 120  # Evita travamento de threads com conexões presas
    directory = os.path.dirname(os.path.abspath(__file__))

    def do_GET(self):
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return

        if self.path == '/api/health':
            self.send_json_response(200, {
                "status": "healthy",
                "version": "3.0.0",
                "server_start_time": SERVER_START_TIME,
                "pid": os.getpid(),
                "cwd": os.getcwd()
            })
            return

        if self.path == '/api/restart':
            client_ip = self.client_address[0]
            # Restrição apenas a localhost
            if client_ip not in ('127.0.0.1', '::1'):
                self.send_json_response(403, {"error": "Acesso não autorizado a comandos administrativos. Origem deve ser local."})
                return

            # Exige token administrativo
            auth_header = self.headers.get('X-Admin-Token', '')
            expected_token = os.environ.get('EDITAL_ADMIN_TOKEN')
            if not expected_token or auth_header != expected_token:
                self.send_json_response(401, {"error": "Token administrativo ausente ou inválido (X-Admin-Token)."})
                return

            self.send_json_response(200, {"message": "Reiniciando servidor backend com autorização..."})
            def _restart():
                time.sleep(0.5)
                script_dir = os.path.dirname(os.path.abspath(__file__))
                venv_py = os.path.join(script_dir, ".venv", "Scripts", "python.exe")
                py_exec = venv_py if os.path.exists(venv_py) else sys.executable
                os.execv(py_exec, [py_exec, "-X", "utf8", "-u", os.path.join(script_dir, "server.py")])
            threading.Thread(target=_restart, daemon=True).start()
            return

        if self.path.startswith('/api/auth/quota'):
            query_str = self.path.split('?', 1)[1] if '?' in self.path else ''
            user_id = 'demo-local-user'
            for param in query_str.split('&'):
                if param.startswith('user_id='):
                    user_id = urllib.parse.unquote(param.split('=', 1)[1])
                    break

            credits = USER_CREDIT_STORE.get(user_id, 1) # 1 crédito inicial gratuito para degustação
            self.send_json_response(200, {
                "user_id": user_id,
                "credits": credits,
                "used_credits": 0,
                "total_audits": 1,
                "limit": 5,
                "plan": "freemium",
                "price_per_credit": 9.90,
                "currency": "BRL",
                "features": {
                    "musa_14_pareceristas": True,
                    "local_cross_audit": True,
                    "abnt_export": True,
                    "cloud_sync": True,
                    "asaas_pix_instant": True
                }
            })
            return

        if self.path.startswith('/api/pix/status'):
            query_str = self.path.split('?', 1)[1] if '?' in self.path else ''
            charge_id = ''
            for param in query_str.split('&'):
                if param.startswith('charge_id='):
                    charge_id = urllib.parse.unquote(param.split('=', 1)[1])
                    break

            if not charge_id or charge_id not in PIX_CHARGES_STORE:
                self.send_json_response(404, {"error": "Cobrança Pix não encontrada."})
                return

            charge = PIX_CHARGES_STORE[charge_id]
            self.send_json_response(200, charge)
            return

        if self.path.startswith('/api/share/'):
            token = self.path.split('/api/share/', 1)[1].split('?')[0].strip()
            self.send_json_response(200, {
                "share_token": token,
                "status": "active",
                "read_only": True,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            })
            return

        super().do_GET()

    def send_header(self, keyword, value):
        if keyword.lower() == 'content-type':
            if any(text_type in value.lower() for text_type in ['text/html', 'text/javascript', 'application/javascript', 'text/css', 'application/json']):
                if 'charset' not in value.lower():
                    value += '; charset=utf-8'
        super().send_header(keyword, value)

    def read_limited_body(self, max_bytes=75 * 1024 * 1024):
        """
        Lê e valida o corpo da requisição HTTP garantindo um teto máximo de bytes (Anti-DoS).
        Retorna os bytes lidos ou None caso uma resposta de erro (400, 411, 413) já tenha sido enviada.
        """
        raw_cl = self.headers.get('Content-Length')
        if not raw_cl:
            self.send_json_response(411, {"error": "Content-Length obrigatório."})
            return None
        try:
            content_length = int(raw_cl)
        except ValueError:
            self.send_json_response(400, {"error": "Content-Length inválido."})
            return None

        if content_length < 0:
            self.send_json_response(400, {"error": "Content-Length não pode ser negativo."})
            return None

        if content_length > max_bytes:
            self.send_json_response(413, {"error": f"Payload muito grande. Máximo permitido: {max_bytes // (1024*1024)} MB."})
            return None

        return self.rfile.read(content_length)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-API-Key, X-Admin-Token')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()')
        self.send_header('Content-Security-Policy', (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "worker-src 'self' blob: https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' https://generativelanguage.googleapis.com http://localhost:11434 http://127.0.0.1:11434; "
            "object-src 'none'; "
            "frame-ancestors 'none';"
        ))
        super().end_headers()

    def do_POST(self):
        # NÃO CONECTADO AO FRONTEND ATUAL (Persistência real via StateIntegrityManager IndexedDB). Reservado para uso futuro / exportações batch.
        if self.path == '/api/load-audit-report':
            try:
                data = audit_report_repo.load_latest_report()
                self.send_json_response(200, data)
            except NotFoundError as nfe:
                self.send_json_response(404, {"error": str(nfe)})
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao carregar relatório: {str(e)}"})
            return

        post_data = self.read_limited_body()
        if post_data is None:
            return

        if self.path == '/api/audit-budget':
            handle_budget_audit_request(self, post_data)
            return

        if self.path == '/api/pix/create-charge':
            try:
                data = json.loads(post_data.decode('utf-8'))
                user_id = data.get('user_id', 'demo-local-user')
                pkg = data.get('package', 'single')

                if pkg == 'pack5':
                    amount = 39.90
                    credits = 5
                    desc = "EditalAudit AI - Pacote 5 Créditos de Auditoria"
                else:
                    amount = 9.90
                    credits = 1
                    desc = "EditalAudit AI - 1 Crédito de Auditoria Avulsa"

                charge_id = f"pix_asaas_{uuid.uuid4().hex[:12]}"
                pix_code = f"00020126580014br.gov.bcb.pix0136editalaudit-ai-pix@asaas.com520400005303986540{amount:.2f}5802BR5916EDITALAUDIT AI6009SAO PAULO62070503{charge_id[:7]}6304ABCD"

                qr_svg = (
                    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="160" height="160">'
                    f'<rect width="100" height="100" fill="#ffffff"/>'
                    f'<rect x="10" y="10" width="25" height="25" fill="#0f172a"/>'
                    f'<rect x="15" y="15" width="15" height="15" fill="#ffffff"/>'
                    f'<rect x="18" y="18" width="9" height="9" fill="#2563eb"/>'
                    f'<rect x="65" y="10" width="25" height="25" fill="#0f172a"/>'
                    f'<rect x="70" y="15" width="15" height="15" fill="#ffffff"/>'
                    f'<rect x="73" y="18" width="9" height="9" fill="#2563eb"/>'
                    f'<rect x="10" y="65" width="25" height="25" fill="#0f172a"/>'
                    f'<rect x="15" y="70" width="15" height="15" fill="#ffffff"/>'
                    f'<rect x="18" y="73" width="9" height="9" fill="#2563eb"/>'
                    f'<rect x="45" y="45" width="12" height="12" fill="#10b981"/>'
                    f'</svg>'
                )
                import base64
                qr_base64 = "data:image/svg+xml;base64," + base64.b64encode(qr_svg.encode('utf-8')).decode('utf-8')

                charge_record = {
                    "charge_id": charge_id,
                    "user_id": user_id,
                    "status": "PENDING",
                    "package": pkg,
                    "amount": amount,
                    "credits": credits,
                    "description": desc,
                    "pix_copy_paste": pix_code,
                    "qr_code_image": qr_base64,
                    "provider": "asaas",
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
                PIX_CHARGES_STORE[charge_id] = charge_record

                self.send_json_response(200, charge_record)
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao criar cobrança Pix Asaas: {str(e)}"})
            return

        if self.path == '/api/pix/webhook':
            try:
                data = json.loads(post_data.decode('utf-8'))
                event = data.get('event', '')
                payment = data.get('payment', {})
                charge_id = payment.get('id') or data.get('charge_id')

                if event in ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'TEST_CONFIRM') or data.get('status') == 'CONFIRMED':
                    record = PIX_CHARGES_STORE.get(charge_id)
                    user_id = record['user_id'] if record else payment.get('customer') or data.get('user_id', 'demo-local-user')
                    credits_to_add = record['credits'] if record else int(data.get('credits', 1))

                    if record:
                        record['status'] = 'CONFIRMED'
                        record['confirmed_at'] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

                    current_balance = USER_CREDIT_STORE.get(user_id, 1)
                    new_balance = current_balance + credits_to_add
                    USER_CREDIT_STORE[user_id] = new_balance

                    self.send_json_response(200, {
                        "success": True,
                        "event": event,
                        "charge_id": charge_id,
                        "user_id": user_id,
                        "credits_added": credits_to_add,
                        "new_balance": new_balance,
                        "message": f"{credits_to_add} crédito(s) Pix adicionado(s) com sucesso via Asaas!"
                    })
                    return

                self.send_json_response(200, {"received": True, "event": event, "status": "IGNORED"})
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao processar webhook Pix Asaas: {str(e)}"})
            return

        if self.path == '/api/parse-edital-surgical':
            try:
                data = json.loads(post_data.decode('utf-8'))
                text = data.get('text', '')
                if not text:
                    self.send_json_response(400, {"error": "Campo 'text' com o conteúdo do edital é obrigatório."})
                    return
                
                parecerista = data.get('parecerista')
                max_chars = int(data.get('max_chars', 12000))
                
                if parecerista:
                    sliced = get_surgical_context_for_parecerista(text, parecerista, max_chars=max_chars)
                    orig_len = len(text)
                    new_len = len(sliced)
                    reduction = round((1.0 - (new_len / max(orig_len, 1))) * 100, 1)
                    self.send_json_response(200, {
                        "parecerista": parecerista,
                        "context": sliced,
                        "length": new_len,
                        "original_length": orig_len,
                        "reduction_percentage": max(0.0, reduction)
                    })
                else:
                    bundle = extract_surgical_bundle(text)
                    self.send_json_response(200, {
                        "bundle": bundle,
                        "original_length": len(text),
                        "total_pareceristas": len(bundle)
                    })
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro no processamento cirúrgico do edital: {str(e)}"})
            return

        if self.path == '/api/extract-document':
            try:
                data = json.loads(post_data.decode('utf-8'))
                filename = data.get('filename', 'documento.pdf')
                base64_data = data.get('file_base64', '')
                
                if not base64_data:
                    self.send_json_response(400, {"error": "Campo 'file_base64' obrigatório."})
                    return
                
                import base64
                file_bytes = base64.b64decode(base64_data)
                result = extract_text_and_metadata(file_bytes, filename)
                
                # Se a extração teve sucesso, anexa o bundle dos 14 pareceristas imediatamente
                if result.get("text"):
                    result["bundle"] = extract_surgical_bundle(result["text"])
                    result["suggested_draft"] = generate_proposal_draft_suggestion(result["text"])
                
                self.send_json_response(200, result)
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro na extração do documento: {str(e)}"})
            return

        if self.path == '/api/suggest-proposal-draft':
            try:
                data = json.loads(post_data.decode('utf-8'))
                edital_text = data.get('edital_text', '')
                notes_text = data.get('notes_text', '')
                
                draft = generate_proposal_draft_suggestion(edital_text, notes_text)
                metadata = detect_edital_metadata(edital_text)
                self.send_json_response(200, {
                    "draft": draft,
                    "metadata": metadata
                })
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao gerar esboço da proposta: {str(e)}"})
            return

        if self.path == '/api/musa-deep-review':
            try:
                data = json.loads(post_data.decode('utf-8'))
                parecerista_key = data.get('parecerista_key', 'justificativa')
                section_content = data.get('section_content', '')
                edital_text = data.get('edital_text', '')
                cover = data.get('cover', {})
                api_key = data.get('api_key', '') or self.headers.get('X-User-API-Key', '')
                provider = data.get('provider', 'gemini')
                enrich_web = bool(data.get('enrich_web', False))

                review = evaluate_musa_deep_review(
                    parecerista_key=parecerista_key,
                    section_content=section_content,
                    edital_text=edital_text,
                    cover=cover,
                    api_key=api_key,
                    provider=provider,
                    enrich_web=enrich_web
                )
                self.send_json_response(200, review)
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro na avaliação aprofundada MUSA: {str(e)}"})
            return

        if self.path == '/api/export-proposal-pdf':
            try:
                data = json.loads(post_data.decode('utf-8'))
                cover = data.get('cover', {})
                content = data.get('content', {})
                items = data.get('items', [])
                
                pdf_bytes = generate_proposal_abnt_pdf(cover, content, items)
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.send_header('Content-Disposition', 'attachment; filename="Proposta_Tecnica_ABNT.pdf"')
                self.end_headers()
                self.wfile.write(pdf_bytes)
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao compilar proposta PDF ReportLab: {str(e)}"})
            return

        if self.path == '/api/export-finance-xlsx':
            try:
                data = json.loads(post_data.decode('utf-8'))
                cover = data.get('cover', {})
                items = data.get('items', [])
                
                xlsx_bytes = generate_budget_xlsx(cover, items)
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Content-Length', str(len(xlsx_bytes)))
                self.send_header('Content-Disposition', 'attachment; filename="Planilha_Orcamentaria.xlsx"')
                self.end_headers()
                self.wfile.write(xlsx_bytes)
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao gerar planilha orçamentária XLSX: {str(e)}"})
            return

        if self.path in ('/api/export-anki-deck', '/api/export-anki'):
            try:
                zip_bytes, deck_name = handle_anki_export(post_data)
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Length', str(len(zip_bytes)))
                safe_deck = "".join([c for c in deck_name if c.isalnum() or c in (' ', '_', '-')]).strip().replace(' ', '_') or "Baralho_Anki"
                self.send_header('Content-Disposition', f'attachment; filename="{safe_deck}.apkg"')
                self.end_headers()
                self.wfile.write(zip_bytes)
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao gerar baralho Anki: {str(e)}"})
            return


        if self.path == '/api/fetch-url':
            try:
                data = json.loads(post_data.decode('utf-8'))
                url = data.get('url')
                
                if not url:
                    self.send_json_response(400, {"error": "URL ausente no corpo da requisição."})
                    return

                # Validação de segurança anti-SSRF
                try:
                    validate_safe_url(url)
                except ValueError as ve:
                    self.send_json_response(403, {"error": f"URL bloqueada por segurança (Anti-SSRF): {str(ve)}"})
                    return

                # Realiza a requisição ao link do edital
                req = urllib.request.Request(
                    url, 
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                )
                
                with urllib.request.urlopen(req, timeout=12) as response:
                    content = response.read()
                    content_type = response.info().get_content_type()
                    
                    # Se for PDF ou Word (DOCX/DOC), retorna os bytes brutos para o browser processar
                    if 'application/pdf' in content_type or 'application/vnd.openxmlformats' in content_type or 'application/msword' in content_type:
                        self.send_response(200)
                        self.send_header('Content-Type', content_type)
                        self.send_header('Content-Length', str(len(content)))
                        self.end_headers()
                        self.wfile.write(content)
                        return
                    else:
                        # Se for HTML ou texto, decodifica e extrai o texto limpo
                        raw_charset = response.info().get_content_charset()
                        if not raw_charset:
                            try:
                                html_content = content.decode('utf-8')
                            except Exception as e:
                                html_content = content.decode('latin1', errors='replace')
                        else:
                            try:
                                html_content = content.decode(raw_charset)
                            except Exception as e:
                                html_content = content.decode('utf-8', errors='replace')
                        
                        # Extrai texto limpo usando parser embutido
                        parser = HTMLTextExtractor()
                        parser.feed(html_content)
                        clean_text = parser.get_clean_text()
                        
                        response_data = {
                            "text": clean_text,
                            "content_type": content_type
                        }
                        
                        self.send_json_response(200, response_data)
                        return

            except urllib.error.HTTPError as e:
                self.send_json_response(500, {"error": f"Erro HTTP {e.code} ao obter conteúdo da URL."})
            except urllib.error.URLError as e:
                self.send_json_response(500, {"error": f"Falha de conexão ou URL inválida: {str(e.reason)}"})
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro inesperado no servidor proxy: {str(e)}"})
        
        elif self.path == '/api/search-web-editais':
            try:
                data = json.loads(post_data.decode('utf-8'))
                query = data.get('query')
                agent = data.get('agent', 'geral')
                if not query:
                    self.send_json_response(400, {"error": "Termo de busca (query) ausente."})
                    return
                
                results = search_ddg(query, agent_key=agent)
                self.send_json_response(200, {
                    "results": results,
                    "query": query,
                    "agent": agent,
                    "provider": "multi_tier_web_search",
                    "total": len(results)
                })
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao pesquisar: {str(e)}"})
                
        elif self.path == '/api/parse-portal-page':
            try:
                data = json.loads(post_data.decode('utf-8'))
                url = data.get('url')
                if not url:
                    self.send_json_response(400, {"error": "URL ausente."})
                    return

                # Validação de segurança anti-SSRF
                try:
                    validate_safe_url(url)
                except ValueError as ve:
                    self.send_json_response(403, {"error": f"URL bloqueada por segurança (Anti-SSRF): {str(ve)}"})
                    return
                
                req = urllib.request.Request(
                    url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                )
                
                with urllib.request.urlopen(req, timeout=12) as response:
                    content_type = response.info().get_content_type()
                    
                    doc_extensions = ('application/pdf', 'application/vnd.openxmlformats', 'application/msword')
                    is_direct_doc = any(ext in content_type for ext in doc_extensions) or any(url.lower().endswith(ext) for ext in ('.pdf', '.docx', '.doc'))
                    
                    if is_direct_doc:
                        filename = os.path.basename(urllib.parse.urlparse(url).path) or "Edital.pdf"
                        self.send_json_response(200, {
                            "type": "document",
                            "url": url,
                            "name": filename
                        })
                        return
                    else:
                        content = response.read()
                        raw_charset = response.info().get_content_charset()
                        if not raw_charset:
                            try:
                                html_content = content.decode('utf-8')
                            except Exception as e:
                                html_content = content.decode('latin1', errors='replace')
                        else:
                            try:
                                html_content = content.decode(raw_charset)
                            except Exception as e:
                                html_content = content.decode('utf-8', errors='replace')
                        
                        links = extract_document_links(html_content, url)
                        self.send_json_response(200, {
                            "type": "portal",
                            "links": links
                        })
                        return
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao analisar portal: {str(e)}"})
        
        elif self.path == '/api/generate-audit-pdf':
            try:
                data = json.loads(post_data.decode('utf-8'))
                project_title = str(data.get('project_title') or 'Projeto Cultural')
                institution = str(data.get('institution') or 'Não Especificada')
                proponent = str(data.get('proponent') or 'Não Especificado')
                budget = str(data.get('budget') or '0')
                score = str(data.get('score') or '0')
                nota_tecnica = str(data.get('nota_tecnica') or '0')
                nota_priorizacao = str(data.get('nota_priorizacao') or '0')
                relatorio_analitico = str(data.get('relatorio_analitico') or '')
                criterios = data.get('criterios', [])
                ajustes = data.get('ajustes', [])
                alertas = data.get('alertas', [])
                
                # Normalize values to empty lists if they are None/null
                if criterios is None:
                    criterios = []
                if ajustes is None:
                    ajustes = []
                if alertas is None:
                    alertas = []
                
                # Imports cleaned up (now top-level)
                
                pdf_buffer = io.BytesIO()
                doc = SimpleDocTemplate(
                    pdf_buffer,
                    pagesize=A4,
                    leftMargin=54,
                    rightMargin=54,
                    topMargin=54,
                    bottomMargin=54
                )
                
                styles = getSampleStyleSheet()
                
                title_style = ParagraphStyle(
                    'DocTitle',
                    parent=styles['Heading1'],
                    fontName='Helvetica-Bold',
                    fontSize=18,
                    leading=22,
                    textColor=colors.HexColor('#1e1b4b'),
                    spaceAfter=6
                )
                subtitle_style = ParagraphStyle(
                    'DocSubtitle',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=10,
                    leading=13,
                    textColor=colors.HexColor('#4f46e5'),
                    spaceAfter=15
                )
                h2_style = ParagraphStyle(
                    'SectionHeader',
                    parent=styles['Heading2'],
                    fontName='Helvetica-Bold',
                    fontSize=13,
                    leading=16,
                    textColor=colors.HexColor('#0f172a'),
                    spaceBefore=14,
                    spaceAfter=6,
                    keepWithNext=True
                )
                body_style = ParagraphStyle(
                    'BodyTextCustom',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=9.5,
                    leading=13.5,
                    textColor=colors.HexColor('#334155'),
                    spaceAfter=6
                )
                score_style = ParagraphStyle(
                    'ScoreStyle',
                    parent=styles['Normal'],
                    fontName='Helvetica-Bold',
                    fontSize=11,
                    leading=14,
                    textColor=colors.HexColor('#4f46e5')
                )
                
                story = []
                
                # Make header elements reportlab safe
                safe_title = make_reportlab_safe("RELATÓRIO DE AUDITORIA GERAL DE COMPLIANCE")
                safe_proj_title = make_reportlab_safe(project_title)
                safe_proponent = make_reportlab_safe(proponent)
                safe_institution = make_reportlab_safe(institution)
                
                story.append(Paragraph(safe_title, title_style))
                story.append(Paragraph(f"Projeto: <b>{safe_proj_title}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Proponente: {safe_proponent}", subtitle_style))
                story.append(Spacer(1, 10))
                
                # Divider helper cleaned up (uses global)
                
                # Executive Summary Table
                summary_data = [
                    [
                        Paragraph("<b>Fomento/Órgão:</b>", body_style), Paragraph(safe_institution, body_style),
                        Paragraph("<b>Orçamento:</b>", body_style), Paragraph(f"R$ {budget}", body_style)
                    ],
                    [
                        Paragraph("<b>Nota Técnica:</b>", body_style), Paragraph(f"{nota_tecnica} pts", body_style),
                        Paragraph("<b>Nota Priorização:</b>", body_style), Paragraph(f"{nota_priorizacao} pts", body_style)
                    ]
                ]
                summary_table = Table(summary_data, colWidths=[100, 140, 110, 137])
                summary_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 6),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ]))
                
                story.append(Paragraph("<b>Sumário Executivo</b>", h2_style))
                story.append(summary_table)
                story.append(Spacer(1, 10))
                
                # Calculate max_score
                try:
                    max_score = sum(int(crit.get('nota_maxima', 20) or 20) for crit in criterios) if (criterios and len(criterios) > 0) else 100
                except Exception as sum_e:
                    print(f"Error summing max_score: {sum_e}")
                    max_score = 100
                
                # Score Table & Progress Bar
                score_html = f"<b>Nota Geral de Compliance:</b> <font color='#4f46e5' size=14><b>{score} / {max_score}</b></font>"
                score_table_data = [[Paragraph(score_html, score_style)]]
                score_table = Table(score_table_data, colWidths=[487])
                score_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 10),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ]))
                story.append(score_table)
                story.append(Spacer(1, 6))
                
                # Visual Progress Bar
                score_num = 0
                try:
                    score_num = float(score)
                except (ValueError, TypeError):
                    score_num = 0
                percent = min(100.0, max(0.0, (score_num / float(max_score)) * 100)) if max_score > 0 else 0
                width_filled = max(1, int(487 * (percent / 100.0)))
                width_empty = max(1, 487 - width_filled)
                bar_color = colors.HexColor('#10b981') if percent >= 70 else (colors.HexColor('#f59e0b') if percent >= 50 else colors.HexColor('#ef4444'))
                
                progress_table = Table([['', '']], colWidths=[width_filled, width_empty], rowHeights=[8])
                progress_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (0,0), bar_color),
                    ('BACKGROUND', (1,0), (1,0), colors.HexColor('#e2e8f0')),
                    ('PADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                ]))
                story.append(progress_table)
                story.append(Spacer(1, 15))
                story.append(get_divider())
                story.append(Spacer(1, 5))
                
                if relatorio_analitico:
                    story.append(Paragraph("Parecer Técnico Descritivo da Auditoria", h2_style))
                    append_html_content_to_story(relatorio_analitico, story, body_style, h2_style)
                    story.append(Spacer(1, 10))
                
                story.append(Paragraph("Quesitos Analisados (Instrução Normativa MinC)", h2_style))
                for crit in criterios:
                    crit_name = make_reportlab_safe(crit.get('criterio', 'Critério'))
                    try:
                        nota_atrib = int(crit.get('nota_atribuida', 0) or 0)
                    except (ValueError, TypeError):
                        nota_atrib = 0
                    try:
                        nota_max = int(crit.get('nota_maxima', 25) or 25)
                    except (ValueError, TypeError):
                        nota_max = 25
                    just = make_reportlab_safe(crit.get('justificativa', ''))
                    
                    ratio = float(nota_atrib) / float(nota_max) if nota_max > 0 else 0
                    crit_color = '#10b981' if ratio >= 0.8 else ('#d97706' if ratio >= 0.5 else '#ef4444')
                    crit_title = f"<font color='{crit_color}'><b>{crit_name} ({nota_atrib}/{nota_max} pts)</b></font>"
                    try:
                        story.append(Paragraph(crit_title, ParagraphStyle('CritHeader', parent=body_style, fontName='Helvetica-Bold')))
                        story.append(Paragraph(just, body_style))
                    except Exception as pe:
                        print(f"ReportLab criteria rendering error: {pe}")
                        story.append(Paragraph(html.escape(f"{crit.get('criterio', 'Critério')} ({crit.get('nota_atribuida', 0)}/{crit.get('nota_maxima', 25)} pts)"), ParagraphStyle('CritHeader', parent=body_style, fontName='Helvetica-Bold')))
                        story.append(Paragraph(html.escape(crit.get('justificativa', '')), body_style))
                    story.append(Spacer(1, 6))
                
                story.append(Spacer(1, 10))
                
                if ajustes:
                    story.append(Paragraph("Ajustes Operacionais Recomendados", h2_style))
                    table_data = [[
                        Paragraph("<b>Alteração Sugerida</b>", ParagraphStyle('Th', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
                        Paragraph("<b>Fator de Impacto</b>", ParagraphStyle('Th', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))
                    ]]
                    for a in ajustes:
                        alt_text = make_reportlab_safe(a.get('alteracao', ''))
                        fator_text = make_reportlab_safe(a.get('fator', ''))
                        try:
                            alt_p = Paragraph(alt_text, body_style)
                            fator_p = Paragraph(fator_text, body_style)
                        except Exception as pe:
                            print(f"ReportLab adjustments table Paragraph error: {pe}")
                            alt_p = Paragraph(html.escape(a.get('alteracao', '')), body_style)
                            fator_p = Paragraph(html.escape(a.get('fator', '')), body_style)
                        table_data.append([alt_p, fator_p])
                    
                    ajustes_table = Table(table_data, colWidths=[337, 150])
                    ajustes_table.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4f46e5')),
                        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                        ('PADDING', (0,0), (-1,-1), 6),
                        ('VALIGN', (0,0), (-1,-1), 'TOP'),
                        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
                    ]))
                    story.append(ajustes_table)
                    story.append(Spacer(1, 15))
                
                if alertas:
                    story.append(Paragraph("Alertas Críticos Jurídicos & Inconsistências", h2_style))
                    for alert in alertas:
                        al_type = alert.get('tipo', 'Alerta')
                        desc = alert.get('descricao', '')
                        sug = alert.get('sugestao', '')
                        nivel = alert.get('nivel', 'MEDIA').upper()
                        
                        border_color = colors.HexColor('#ef4444') if nivel == 'ALTA' else (colors.HexColor('#f59e0b') if nivel == 'MEDIA' else colors.HexColor('#10b981'))
                        bg_color = colors.HexColor('#fef2f2') if nivel == 'ALTA' else (colors.HexColor('#fffbeb') if nivel == 'MEDIA' else colors.HexColor('#f0fdf4'))
                        
                        safe_type = make_reportlab_safe(al_type)
                        safe_desc = make_reportlab_safe(desc)
                        safe_sug = make_reportlab_safe(sug)
                        
                        alert_html = f"<b>[{nivel}] {safe_type}:</b> {safe_desc}<br/><i>Recomendação: {safe_sug}</i>"
                        
                        try:
                            alert_table_data = [[Paragraph(alert_html, body_style)]]
                        except Exception as pe:
                            print(f"ReportLab alerts Paragraph error: {pe}")
                            esc_type = html.escape(al_type)
                            esc_desc = html.escape(desc)
                            esc_sug = html.escape(sug)
                            alert_html_fallback = f"<b>[{nivel}] {esc_type}:</b> {esc_desc}<br/><i>Recomendação: {esc_sug}</i>"
                            alert_table_data = [[Paragraph(alert_html_fallback, body_style)]]
                        
                        alert_table = Table(alert_table_data, colWidths=[487])
                        alert_table.setStyle(TableStyle([
                            ('BACKGROUND', (0,0), (-1,-1), bg_color),
                            ('BOX', (0,0), (-1,-1), 1, border_color),
                            ('LINELEFT', (0,0), (-1,-1), 4, border_color),
                            ('PADDING', (0,0), (-1,-1), 8),
                            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                        ]))
                        story.append(alert_table)
                        story.append(Spacer(1, 8))
                
                story.append(Spacer(1, 10))
                
                # Disclaimer
                disclaimer_style = ParagraphStyle(
                    'Disclaimer',
                    parent=styles['Normal'],
                    fontName='Helvetica-Oblique',
                    fontSize=8,
                    leading=10,
                    textColor=colors.HexColor('#64748b'),
                    spaceBefore=15
                )
                story.append(Paragraph("Este relatório é uma auditoria preliminar baseada em simulação por inteligência artificial estruturada e leitura estática de conformidade do edital. As notas e recomendações não garantem aprovação do projeto perante a comissão oficial.", disclaimer_style))
                
                doc.build(story, onFirstPage=add_reportlab_footer, onLaterPages=add_reportlab_footer)
                pdf_bytes = pdf_buffer.getvalue()
                pdf_buffer.close()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                import unicodedata
                filename_clean = ''.join(c for c in unicodedata.normalize('NFD', project_title) if unicodedata.category(c) != 'Mn')
                filename_clean = re.sub(r'[^a-zA-Z0-9]', '_', filename_clean)
                filename_clean = re.sub(r'_+', '_', filename_clean).strip('_')
                if not filename_clean or filename_clean.lower() == 'titulo_do_projeto_cultural':
                    filename_clean = "Projeto_Cultural"
                self.send_header('Content-Disposition', f'attachment; filename="Laudo_Auditoria_Compliance_{filename_clean}.pdf"')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.end_headers()
                self.wfile.write(pdf_bytes)
                return
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_json_response(500, {"error": f"Erro ao gerar PDF da auditoria: {str(e)}"})

        elif self.path == '/api/generate-revisor-report-pdf':
            try:
                data = json.loads(post_data.decode('utf-8'))
                project_title = str(data.get('project_title') or 'Projeto Cultural')
                institution = str(data.get('institution') or 'Não Especificada')
                report_content = str(data.get('report_content') or '')
                
                # Imports cleaned up (now top-level)
                
                pdf_buffer = io.BytesIO()
                doc = SimpleDocTemplate(
                    pdf_buffer,
                    pagesize=A4,
                    leftMargin=54,
                    rightMargin=54,
                    topMargin=54,
                    bottomMargin=54
                )
                
                styles = getSampleStyleSheet()
                
                title_style = ParagraphStyle(
                    'DocTitle',
                    parent=styles['Heading1'],
                    fontName='Helvetica-Bold',
                    fontSize=18,
                    leading=22,
                    textColor=colors.HexColor('#1e1b4b'),
                    spaceAfter=6
                )
                subtitle_style = ParagraphStyle(
                    'DocSubtitle',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=10,
                    leading=13,
                    textColor=colors.HexColor('#4f46e5'),
                    spaceAfter=15
                )
                h2_style = ParagraphStyle(
                    'SectionHeader',
                    parent=styles['Heading2'],
                    fontName='Helvetica-Bold',
                    fontSize=13,
                    leading=16,
                    textColor=colors.HexColor('#0f172a'),
                    spaceBefore=14,
                    spaceAfter=6,
                    keepWithNext=True
                )
                body_style = ParagraphStyle(
                    'BodyTextCustom',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=9.5,
                    leading=13.5,
                    textColor=colors.HexColor('#334155'),
                    spaceAfter=6
                )
                
                story = []
                
                # Make header elements reportlab safe
                safe_title = make_reportlab_safe("RELATÓRIO CONSOLIDADO DE REVISÃO E PLANO DE AÇÃO")
                safe_proj_title = make_reportlab_safe(project_title)
                safe_institution = make_reportlab_safe(institution)
                
                story.append(Paragraph(safe_title, title_style))
                story.append(Paragraph(f"Projeto: <b>{safe_proj_title}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Órgão: {safe_institution}", subtitle_style))
                story.append(Spacer(1, 10))
                
                # Divider helper cleaned up (uses global)
                
                story.append(get_divider())
                story.append(Spacer(1, 10))
                
                # Parse report_content HTML tags and structure
                append_html_content_to_story(report_content, story, body_style, h2_style)
                
                story.append(Spacer(1, 15))
                story.append(get_divider())
                
                # Disclaimer
                disclaimer_style = ParagraphStyle(
                    'Disclaimer',
                    parent=styles['Normal'],
                    fontName='Helvetica-Oblique',
                    fontSize=8,
                    leading=10,
                    textColor=colors.HexColor('#64748b'),
                    spaceBefore=15
                )
                story.append(Paragraph("Este documento é um relatório consolidado de revisão analítica e não constitui aprovação ou homologação oficial da proposta.", disclaimer_style))
                
                doc.build(story, onFirstPage=add_reportlab_footer, onLaterPages=add_reportlab_footer)
                pdf_bytes = pdf_buffer.getvalue()
                pdf_buffer.close()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                import unicodedata
                filename_clean = ''.join(c for c in unicodedata.normalize('NFD', project_title) if unicodedata.category(c) != 'Mn')
                filename_clean = re.sub(r'[^a-zA-Z0-9]', '_', filename_clean)
                filename_clean = re.sub(r'_+', '_', filename_clean).strip('_')
                if not filename_clean or filename_clean.lower() == 'titulo_do_projeto_cultural':
                    filename_clean = "Projeto_Cultural"
                self.send_header('Content-Disposition', f'attachment; filename="Relatorio_Detalhado_Revisor_{filename_clean}.pdf"')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.end_headers()
                self.wfile.write(pdf_bytes)
                return
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_json_response(500, {"error": f"Erro ao gerar PDF da revisão: {str(e)}"})

        elif self.path == '/api/generate-finance-pdf':
            try:
                data = json.loads(post_data.decode('utf-8'))
                project_title = str(data.get('project_title') or 'Projeto Cultural')
                proponent = str(data.get('proponent') or 'Não Especificado')
                institution = str(data.get('institution') or 'Não Especificada')
                budget = str(data.get('budget') or '0')
                table_html = str(data.get('table_html') or '')
                
                page_format = landscape(A4)
                printable_width = page_format[0] - 72 # 36pt margins on landscape

                pdf_buffer = io.BytesIO()
                doc = SimpleDocTemplate(
                    pdf_buffer,
                    pagesize=page_format,
                    leftMargin=36,
                    rightMargin=36,
                    topMargin=36,
                    bottomMargin=36
                )
                
                styles = getSampleStyleSheet()
                
                title_style = ParagraphStyle(
                    'DocTitle',
                    parent=styles['Heading1'],
                    fontName='Helvetica-Bold',
                    fontSize=16,
                    leading=20,
                    textColor=colors.HexColor('#1e1b4b'),
                    spaceAfter=4
                )
                subtitle_style = ParagraphStyle(
                    'DocSubtitle',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=9,
                    leading=12,
                    textColor=colors.HexColor('#4f46e5'),
                    spaceAfter=12
                )
                body_style = ParagraphStyle(
                    'TableBodyText',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=7.0,
                    leading=9.0,
                    textColor=colors.HexColor('#334155')
                )
                
                story = []
                
                header_title = f"{institution.upper()} - PLANILHA ORÇAMENTÁRIA DO PROJETO" if institution and institution.lower() != 'edital' else "PLANILHA ORÇAMENTÁRIA DO PROJETO"
                safe_title = make_reportlab_safe(header_title)
                safe_proj_title = make_reportlab_safe(project_title)
                safe_proponent = make_reportlab_safe(proponent)
                safe_institution = make_reportlab_safe(institution)
                
                story.append(Paragraph(safe_title, title_style))
                story.append(Paragraph(f"Projeto: <b>{safe_proj_title}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Proponente: {safe_proponent}", subtitle_style))
                story.append(Spacer(1, 8))
                
                # Create executive summary table for finance header
                summary_data = [
                    [
                        Paragraph("<b>Fomento / Edital:</b>", body_style), Paragraph(safe_institution, body_style),
                        Paragraph("<b>Orçamento Previsto:</b>", body_style), Paragraph(f"R$ {budget}", body_style)
                    ]
                ]
                summary_table = Table(summary_data, colWidths=[90, printable_width*0.4, 110, printable_width*0.35])
                summary_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 6),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ]))
                story.append(summary_table)
                story.append(Spacer(1, 10))

                items = data.get('items', [])
                grand_subtotal = data.get('grandTotalSubtotal', 0)
                grand_impostos = data.get('grandTotalImpostos', 0)
                grand_geral = data.get('grandTotalGeral', 0)

                # Se items não foi passado, usar parser legados de HTML como fallback
                if not items and table_html:
                    parser = HTMLTableParser()
                    parser.feed(table_html)
                    rows = parser.rows
                    items = []
                    for r in rows:
                        if len(r) >= 8 and not r[0]["is_header"]:
                            items.append({
                                "itemGroup": r[0]["text"],
                                "natureza": r[1]["text"],
                                "descricao": r[2]["text"],
                                "unid": r[3]["text"],
                                "qtde": r[4]["text"],
                                "valorPrevisto": r[5]["text"],
                                "valorTotal": r[6]["text"],
                                "atividade": r[7]["text"]
                            })

                if items:
                    headers = ["ITEM / CATEGORIA", "NATUREZA", "DESCRIÇÃO DO ITEM / SERVIÇO", "UNID.", "QTDE", "VALOR PREVISTO (R$)", "VALOR TOTAL (R$)", "ATIVIDADE"]
                    weights = [0.18, 0.18, 0.28, 0.07, 0.05, 0.10, 0.09, 0.05]
                    col_widths = [printable_width * w for w in weights]
                    
                    table_content = []
                    # Add Header Row
                    header_cells = [Paragraph(f"<b>{make_reportlab_safe(h)}</b>", ParagraphStyle('ThFinance', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)) for h in headers]
                    table_content.append(header_cells)
                    
                    # Add Item Rows
                    for idx, it in enumerate(items):
                        val_unit = format_ptbr_currency(it.get('valorUnit', it.get('valorPrevisto', 0)))
                        tot_ger = format_ptbr_currency(it.get('total', it.get('valorTotal', 0)))
                        item_cat = str(it.get('rubrica', it.get('itemGroup', 'Serviços Especializados')))
                        nat_str = str(it.get('destino', it.get('natureza', 'outros serviços de terceiros')))
                        desc_str = str(it.get('item', it.get('descricao', 'Descrição do Serviço')))
                        unid_str = str(it.get('unidade', it.get('unid', 'unidade')))
                        qtd_str = str(it.get('qtd', it.get('qtde', 1)))
                        ativ_str = str(it.get('atividade', (idx % 3) + 1))

                        row_cells = [
                            Paragraph(make_reportlab_safe(item_cat), body_style),
                            Paragraph(make_reportlab_safe(nat_str), body_style),
                            Paragraph(f"<b>{make_reportlab_safe(desc_str)}</b>", body_style),
                            Paragraph(make_reportlab_safe(unid_str), body_style),
                            Paragraph(make_reportlab_safe(qtd_str), body_style),
                            Paragraph(make_reportlab_safe(val_unit), body_style),
                            Paragraph(f"<b>{make_reportlab_safe(tot_ger)}</b>", body_style),
                            Paragraph(make_reportlab_safe(ativ_str), body_style)
                        ]
                        table_content.append(row_cells)

                    # Add Total Row
                    tot_ger_str = f"R$ {grand_geral:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.') if isinstance(grand_geral, (int, float)) else str(grand_geral)

                    total_row_cells = [
                        Paragraph("<b>TOTAL GERAL DO PROJETO:</b>", ParagraphStyle('TotLbl', parent=body_style, fontName='Helvetica-Bold', alignment=2)),
                        Paragraph("", body_style), Paragraph("", body_style), Paragraph("", body_style),
                        Paragraph("", body_style), Paragraph("", body_style),
                        Paragraph(f"<b>{tot_ger_str}</b>", ParagraphStyle('TotVal', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#15803d'))),
                        Paragraph("", body_style)
                    ]
                    table_content.append(total_row_cells)
                        
                    finance_table = Table(table_content, colWidths=col_widths, repeatRows=1)
                    t_style = TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563eb')),
                        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                        ('PADDING', (0,0), (-1,-1), 3),
                        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                        ('SPAN', (0, -1), (5, -1)),
                        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#1e40af')),
                        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
                    ])
                    # Alternating row colors
                    for r_idx in range(1, len(table_content) - 1):
                        if r_idx % 2 == 0:
                            t_style.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#f8fafc'))
                    finance_table.setStyle(t_style)
                    story.append(finance_table)
                    story.append(Spacer(1, 12))

                # Rider Técnico Section (if rider_items passed)
                rider_items = data.get('rider_items', [])
                if rider_items and isinstance(rider_items, list):
                    h2_style = ParagraphStyle(
                        'SectionHeader',
                        parent=styles['Heading2'],
                        fontName='Helvetica-Bold',
                        fontSize=12,
                        leading=15,
                        textColor=colors.HexColor('#4f46e5'),
                        spaceBefore=10,
                        spaceAfter=6
                    )
                    story.append(Paragraph("DETALHAMENTO DO RIDER TÉCNICO & MAPA DE EQUIPAMENTOS", h2_style))
                    
                    rider_table_data = [
                        [
                            Paragraph("<b>Categoria</b>", ParagraphStyle('ThRider', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
                            Paragraph("<b>Equipamento</b>", ParagraphStyle('ThRider', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
                            Paragraph("<b>Modelo Específico / Especificação</b>", ParagraphStyle('ThRider', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
                            Paragraph("<b>Diárias / Qtd</b>", ParagraphStyle('ThRider', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
                            Paragraph("<b>Fornecedor Previsto</b>", ParagraphStyle('ThRider', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
                            Paragraph("<b>Requisito de Palco</b>", ParagraphStyle('ThRider', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))
                        ]
                    ]
                    
                    for rd in rider_items:
                        rider_table_data.append([
                            Paragraph(make_reportlab_safe(rd.get('categoria', '')), body_style),
                            Paragraph(make_reportlab_safe(rd.get('equipamento', '')), body_style),
                            Paragraph(make_reportlab_safe(rd.get('modeloEspecifico', '')), body_style),
                            Paragraph(make_reportlab_safe(rd.get('qtdDiarias', '')), body_style),
                            Paragraph(make_reportlab_safe(rd.get('fornecedorPrevisto', '')), body_style),
                            Paragraph(make_reportlab_safe(rd.get('requisitoPalco', '')), body_style)
                        ])
                        
                    r_widths = [printable_width * w for w in [0.15, 0.20, 0.28, 0.10, 0.15, 0.12]]
                    rider_table = Table(rider_table_data, colWidths=r_widths, repeatRows=1)
                    rt_style = TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6366f1')),
                        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                        ('PADDING', (0,0), (-1,-1), 3),
                        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ])
                    for r_idx in range(1, len(rider_table_data)):
                        if r_idx % 2 == 0:
                            rt_style.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#f8fafc'))
                    rider_table.setStyle(rt_style)
                    story.append(rider_table)
                    story.append(Spacer(1, 10))
                
                # Disclaimer
                disclaimer_style = ParagraphStyle(
                    'Disclaimer',
                    parent=styles['Normal'],
                    fontName='Helvetica-Oblique',
                    fontSize=8,
                    leading=10,
                    textColor=colors.HexColor('#64748b'),
                    spaceBefore=10
                )
                story.append(Paragraph("Este documento foi consolidado pelas 3 Etapas de Auditoria com base na legislação de fomento cultural (Lei Rouanet, Lei Aldir Blanc, IN MinC).", disclaimer_style))
                
                doc.build(story, onFirstPage=add_reportlab_footer, onLaterPages=add_reportlab_footer)
                pdf_bytes = pdf_buffer.getvalue()
                pdf_buffer.close()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                import unicodedata
                filename_clean = ''.join(c for c in unicodedata.normalize('NFD', project_title) if unicodedata.category(c) != 'Mn')
                filename_clean = re.sub(r'[^a-zA-Z0-9]', '_', filename_clean)
                filename_clean = re.sub(r'_+', '_', filename_clean).strip('_')
                if not filename_clean or filename_clean.lower() == 'titulo_do_projeto_cultural':
                    filename_clean = "Projeto_Cultural"
                self.send_header('Content-Disposition', f'attachment; filename="Planilha_Financeira_{filename_clean}.pdf"')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.end_headers()
                self.wfile.write(pdf_bytes)
                return
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_json_response(500, {"error": f"Erro ao gerar PDF do financeiro: {str(e)}"})
        
        # NÃO CONECTADO AO FRONTEND ATUAL (Persistência real via StateIntegrityManager IndexedDB). Reservado para uso futuro / exportações batch.
        elif self.path == '/api/save-audit-report':
            try:
                data = json.loads(post_data.decode('utf-8'))
                raw_sub_id = data.get('submission_id')
                registro = audit_report_repo.save_report(data, raw_sub_id=raw_sub_id)
                self.send_json_response(200, {
                    "success": True, 
                    "message": "Proposta submetida e armazenada com sucesso.",
                    "submission_id": registro.submission_id,
                    "filename": registro.filename,
                    "saved_at_utc": registro.saved_at_utc
                })
            except ValidationError as ve:
                self.send_json_response(400, {"error": str(ve)})
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao persistir submissão: {str(e)}"})

        elif self.path == '/api/analyze-edital-context':
            try:
                data = json.loads(post_data.decode('utf-8'))
                edital_text = data.get('editalRefText', '')
                annexes = data.get('annexes', [])
                api_key = data.get('api_key', '')
                cover = data.get('cover', {})  # Skill A: Receber dados do proponente para cruzamento
                model = data.get('model') or os.environ.get('GEMINI_DEFAULT_MODEL') or 'gemini-3.5-flash'
                model = data.get('model') or os.environ.get('GEMINI_DEFAULT_MODEL') or 'gemini-3.5-flash'
                
                if not edital_text.strip():
                    self.send_json_response(200, {
                        "fomento": "Não Especificado",
                        "objetivos": "Por favor, faça o upload do regulamento do edital.",
                        "tetos_e_limites": "Nenhum valor informado.",
                        "acessibilidade_e_cotas": "Não especificado.",
                        "prioridades_critérios": "Não mapeado.",
                        "anexos_analisados": "Nenhum anexo fornecido."
                    })
                    return

                annexes_context = "\n---\n".join([
                    f"Anexo: {a.get('name', 'Anexo')}\nConteúdo: {a.get('content', '')[:30000]}"
                    for a in annexes
                ]) if annexes else "Sem anexos adicionais."

                # Skill A: Cruzar perfil do proponente com edital se dados disponíveis
                proponent_context = ""
                if cover and (cover.get('title') or cover.get('proponent') or cover.get('city')):
                    proponent_context = f"""\n\n[DADOS DO PROPONENTE PARA CRUZAMENTO ESTRATÉGICO]:
- Título do Projeto: {cover.get('title', 'Não informado')}
- Proponente: {cover.get('proponent', 'Não informado')}
- Cidade/UF: {cover.get('city', 'Não informado')}
- Orçamento Pretendido: R$ {cover.get('budget', 0)}
- Ano de Execução: {cover.get('year', 'Não informado')}

Para a chave "compatibilidade_estrategica", analise a compatibilidade entre o perfil deste proponente (localização, público-alvo provável, capacidade orçamentária) e os objetivos/elegibilidade do edital. Indique grau de aderência e riscos de inelegibilidade."""

                analyze_prompt = f"""Você é o Auditor-Geral e Analista Estrutural de editais públicos e privados.
Sua missão é analisar minuciosamente o Edital principal e seus Anexos fornecidos abaixo para mapear e extrair o perfil estrutural e as regras de conformidade que devem governar todo e qualquer texto ou proposta gerada para este edital.

[CONTEÚDO DO EDITAL DE REFERÊNCIA]:
{edital_text[:150000]}

[ANEXOS ADICIONAIS]:
{annexes_context}
{proponent_context}

Mapeie e estruture as informações em um objeto JSON contendo exatamente as seguintes chaves:
1. fomento: Nome da lei de incentivo ou linha de fomento identificada no edital.
2. objetivos: Resumo curto e claro do foco temático, objetivos principais do edital e tipos de projetos elegíveis.
3. tetos_e_limites: Valores máximos (teto por projeto) e limites percentuais REAIS para rubricas conforme definidos no edital (ex: limite de custos administrativos, divulgação, assessoria).
4. acessibilidade_e_cotas: Regras obrigatórias de acessibilidade e políticas de ação afirmativa/cotas conforme o edital.
5. prioridades_critérios: Critérios de prioridade, desempate e avaliação extraídos dos anexos de pontuação.
6. anexos_analisados: Lista compacta dos anexos enviados e a importância de cada um para o projeto.
7. secoes_exigidas: Lista contendo apenas as chaves das seções especificamente exigidas ou necessárias conforme o edital e anexos (escolhidas estritamente entre: "justificativa", "objetivos", "metodologia", "cronograma", "orcamento", "acessibilidade", "publico", "contrapartida", "comunicacao", "ficha_tecnica", "monitoramento", "compliance", "sustentabilidade", "rider").
8. compatibilidade_estrategica: Parecer breve sobre a compatibilidade entre o proponente e o edital (grau de aderência, riscos de inelegibilidade, oportunidades). Se nenhum dado do proponente foi fornecido, retorne "Dados do proponente não informados para análise de compatibilidade.".

Retorne estritamente o JSON estruturado conforme o Schema fornecido. Sem blocos markdown ou explicações fora do JSON."""

                ANALYZE_SCHEMA = {
                    "type": "OBJECT",
                    "properties": {
                        "fomento": {"type": "STRING"},
                        "objetivos": {"type": "STRING"},
                        "tetos_e_limites": {"type": "STRING"},
                        "acessibilidade_e_cotas": {"type": "STRING"},
                        "prioridades_critérios": {"type": "STRING"},
                        "anexos_analisados": {"type": "STRING"},
                        "secoes_exigidas": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        },
                        "compatibilidade_estrategica": {"type": "STRING"}
                    },
                    "required": ["fomento", "objetivos", "tetos_e_limites", "acessibilidade_e_cotas", "prioridades_critérios", "anexos_analisados", "secoes_exigidas", "compatibilidade_estrategica"]
                }

                print("[SERVER] Iniciando análise prévia do edital...")
                result_str = gateway.generate(
                    provider_name='gemini',
                    model=model,
                    api_key=api_key,
                    prompt=analyze_prompt,
                    system_instruction="Você é o analista estrutural de editais. Retorne estritamente um JSON estruturado com o perfil do edital.",
                    response_schema=ANALYZE_SCHEMA,
                    use_cache=True
                )
                
                try:
                    result_json = json.loads(result_str)
                except Exception as e:
                    print(f"[SERVER][ERROR] Erro ao decodificar JSON de análise: {e}")
                    # Fallback parser
                    try:
                        clean_str = result_str.strip()
                        if clean_str.startswith("```json"):
                            clean_str = clean_str[7:]
                        if clean_str.endswith("```"):
                            clean_str = clean_str[:-3]
                        result_json = json.loads(clean_str.strip())
                    except Exception as e2:
                        print(f"[SERVER][ERROR] Segundo parser falhou: {e2}")
                        raise e
                
                self.send_json_response(200, result_json)
            except urllib.error.HTTPError as he:
                import traceback
                traceback.print_exc()
                if he.code == 429:
                    self.send_json_response(429, {"error": "Limite de requisições do Gemini excedido (HTTP 429). Por favor, aguarde alguns instantes antes de tentar novamente ou verifique os limites de sua chave de API."})
                elif he.code == 400:
                    self.send_json_response(400, {"error": "Requisição inválida para a API do Gemini (HTTP 400). Verifique a chave de API ou as regras configuradas."})
                else:
                    self.send_json_response(he.code, {"error": f"Erro na API do Gemini (HTTP {he.code}): {he.reason}"})
            except Exception as e:
                import traceback
                traceback.print_exc()
                if "429" in str(e):
                    self.send_json_response(429, {"error": "Limite de requisições do Gemini excedido (HTTP 429). Por favor, aguarde alguns instantes antes de tentar novamente."})
                else:
                    self.send_json_response(500, {"error": f"Erro na análise do edital: {str(e)}"})

        elif self.path == '/api/generate-proposal-unified':
            try:
                data = json.loads(post_data.decode('utf-8'))
                cover = data.get('cover', {})
                editalRefText = data.get('editalRefText', '')
                proposalDraftText = data.get('proposalDraftText', '')
                ingestaoNotes = data.get('ingestaoNotes', '')
                annexes = data.get('annexes', [])
                historicalMemories = data.get('historicalMemories', [])
                editalProfile = data.get('editalProfile', {})
                api_key = data.get('api_key', '')
                model = data.get('model') or os.environ.get('GEMINI_DEFAULT_MODEL') or 'gemini-3.5-flash'
                
                profile_context = f"""[PERFIL E REGRAS ESTRUTURAIS DO EDITAL (MANDATÓRIO CRUZAMENTO)]:
- Fomento / Lei: {editalProfile.get('fomento', 'N/A')}
- Objetivos / Elegibilidade: {editalProfile.get('objetivos', 'N/A')}
- Tetos e Limites: {editalProfile.get('tetos_e_limites', 'N/A')}
- Acessibilidade e Cotas: {editalProfile.get('acessibilidade_e_cotas', 'N/A')}
- Prioridades e Critérios: {editalProfile.get('prioridades_critérios', 'N/A')}
- Anexos Mapeados: {editalProfile.get('anexos_analisados', 'N/A')}
""" if editalProfile else ""

                # Pre-processing contexts (generous limits to prevent truncation)
                annexes_context = "\n---\n".join([
                    f"Anexo: {a.get('name', 'Anexo')}\nConteúdo: {a.get('content', '')[:30000]}"
                    for a in annexes
                ]) if annexes else "Sem anexos adicionais."
                
                # Determinar quais seções gerar com base no perfil do edital
                all_sections = ['justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento', 'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica', 'monitoramento', 'compliance', 'sustentabilidade', 'rider']
                secoes_exigidas = editalProfile.get('secoes_exigidas', all_sections) if editalProfile else all_sections
                if not secoes_exigidas or len(secoes_exigidas) == 0:
                    secoes_exigidas = all_sections
                
                # Descritores dinâmicos para cada seção
                section_descriptors = {
                    'justificativa': 'Justificativa longa, detalhada e persuasiva defendendo o mérito, relevância social e impacto no território.',
                    'objetivos': 'Objetivo geral claro e objetivos específicos listados como itens de realizações quantificáveis.',
                    'metodologia': 'Metodologia operacional detalhando passo-a-passo as fases de Pré-produção, Execução e Pós-produção.',
                    'cronograma': 'Cronograma formatado obrigatoriamente como tabela HTML (<table>) organizado por meses.',
                    'orcamento': 'Planilha orçamentária como tabela HTML com colunas: Item, Quantidade, Unidade, Valor Unitário (R$), Valor Total (R$). Respeite rigorosamente os tetos percentuais REAIS extraídos do edital (NÃO use valores genéricos como 15% ou 10%).',
                    'acessibilidade': 'Plano de acessibilidade física, atitudinal e sensorial/comunicacional e cotas afirmativas exigidas pelo edital.',
                    'publico': 'Público-Alvo: perfil demográfico, social e etário detalhado dos beneficiários.',
                    'contrapartida': 'Contrapartida Social e Legado duradouro oferecido gratuitamente à comunidade.',
                    'comunicacao': 'Plano de Comunicação e Divulgação nas mídias sociais, imprensa e peças gráficas.',
                    'ficha_tecnica': 'Ficha Técnica com minibios e cargos da equipe principal para atestar a exequibilidade operacional.',
                    'monitoramento': 'Plano de Monitoramento, Avaliação e Indicadores de sucesso (Matriz Lógica).',
                    'compliance': 'Mecanismos de compliance legal, certidões negativas necessárias conforme o edital.',
                    'sustentabilidade': 'Plano de Sustentabilidade e práticas ESG para mitigação de impactos ambientais.',
                    'rider': 'Rider Técnico detalhando necessidades físicas, mapa de palco, som/luz, montagem e logística.'
                }
                
                # Gerar descrições apenas para as seções exigidas pelo edital
                sections_text = "\n".join([
                    f"{i+1}. {sec}: {section_descriptors.get(sec, 'Seção solicitada pelo edital.')}"
                    for i, sec in enumerate(secoes_exigidas)
                ])

                unified_prompt = f"""Você é uma inteligência artificial de elite especialista em captação de recursos públicos e editais de fomento.
Sua missão é realizar um cruzamento exaustivo e rigoroso entre os dados do edital, seus anexos, o rascunho fornecido e as anotações/orientações específicas do proponente para redigir uma proposta completa de altíssimo nível.

**INSTRUÇÕES CRÍTICAS DE REDAÇÃO (EVITE RESPOSTAS GENÉRICAS):**
- Redija cada seção de forma densa, completa, profissional e contextualizada para o projeto. Não faça resumos, resenhas ou redações rasas.
- Incorpore profundamente o conteúdo e as ideias presentes no [RASCUNHO DO PROPONENTE] e em [ANOTAÇÕES E PONTOS DE ATENÇÃO DO PROPONENTE].
- Respeite e atenda estritamente aos tetos financeiros, limites percentuais, regras de acessibilidade e critérios de priorização descritos no [PERFIL E REGRAS ESTRUTURAIS DO EDITAL] e no [CONTEÚDO DO EDITAL].
- A redação deve estar pronta para submissão oficial (sem placeholders como "[inserir nome]", "[definir data]" ou marcas/pistas de IA).

{profile_context}

[DADOS DO PROJETO]:
- Título: {cover.get('title', 'Não informado')}
- Instituição: {cover.get('institution', 'Não informado')}
- Proponente: {cover.get('proponent', 'Não informado')}
- Cidade/UF: {cover.get('city', 'Não informado')}
- Ano: {cover.get('year', 'Não informado')}
- Orçamento Teto do Projeto: R$ {cover.get('budget', 0)}

[CONTEÚDO DO EDITAL DE REFERÊNCIA (Regulamento)]:
{editalRefText[:150000]}

[ANEXOS ADICIONAIS DO EDITAL]:
{annexes_context}

[RASCUNHO DO PROPONENTE]:
{proposalDraftText[:50000]}

[ANOTAÇÕES E PONTOS DE ATENÇÃO DO PROPONENTE (DIRECIONAMENTO DOS AGENTES DE DOMÍNIO)]:
{ingestaoNotes[:20000] if ingestaoNotes else "Nenhuma anotação adicional."}

---

### MISSÃO: REDIGIR AS SEÇÕES DA PROPOSTA CONFORME EXIGIDO PELO EDITAL
Gere a redação das seguintes seções identificadas como obrigatórias/relevantes pelo perfil do edital (deve conter tags HTML de cabeçalho h3 ou h4 e parágrafos dentro de cada texto):
{sections_text}

Retorne estritamente o JSON estruturado conforme o Schema fornecido. Sem trechos em markdown ou explicações fora do JSON."""

                UNIFIED_RESPONSE_SCHEMA = {
                    "type": "OBJECT",
                    "properties": {
                        "documentContent": {
                            "type": "OBJECT",
                            "properties": {
                                "justificativa": {"type": "STRING"},
                                "objetivos": {"type": "STRING"},
                                "metodologia": {"type": "STRING"},
                                "cronograma": {"type": "STRING"},
                                "orcamento": {"type": "STRING"},
                                "acessibilidade": {"type": "STRING"},
                                "publico": {"type": "STRING"},
                                "contrapartida": {"type": "STRING"},
                                "comunicacao": {"type": "STRING"},
                                "ficha_tecnica": {"type": "STRING"},
                                "monitoramento": {"type": "STRING"},
                                "compliance": {"type": "STRING"},
                                "sustentabilidade": {"type": "STRING"},
                                "rider": {"type": "STRING"}
                            },
                            "required": [
                                "justificativa", "objetivos", "metodologia", "cronograma", "orcamento", "acessibilidade",
                                "publico", "contrapartida", "comunicacao", "ficha_tecnica", "monitoramento", "compliance",
                                "sustentabilidade", "rider"
                            ]
                        }
                    },
                    "required": ["documentContent"]
                }

                print("[SERVER] Iniciando geração da proposta em uma única chamada...")
                result_str = gateway.generate(
                    provider_name='gemini',
                    model=model,
                    api_key=api_key,
                    prompt=unified_prompt,
                    system_instruction="Você é o orquestrador especialista de projetos culturais. Retorne estritamente um JSON contendo documentContent.",
                    response_schema=UNIFIED_RESPONSE_SCHEMA,
                    use_cache=False
                )
                
                try:
                    result_json = json.loads(result_str)
                except Exception as e:
                    print(f"[SERVER][ERROR] Erro ao decodificar JSON unificado: {e}")
                    # Fallback parser
                    try:
                        clean_str = result_str.strip()
                        if clean_str.startswith("```json"):
                            clean_str = clean_str[7:]
                        if clean_str.endswith("```"):
                            clean_str = clean_str[:-3]
                        result_json = json.loads(clean_str.strip())
                    except Exception as e2:
                        print(f"[SERVER][ERROR] Segundo parser unificado falhou: {e2}")
                        raise e
                
                self.send_json_response(200, result_json)
            except urllib.error.HTTPError as he:
                import traceback
                traceback.print_exc()
                if he.code == 429:
                    self.send_json_response(429, {"error": "Limite de requisições do Gemini excedido (HTTP 429). Por favor, aguarde alguns instantes antes de tentar novamente ou verifique os limites de sua chave de API."})
                elif he.code == 400:
                    self.send_json_response(400, {"error": "Requisição inválida para a API do Gemini (HTTP 400). Verifique a chave de API ou as regras configuradas."})
                else:
                    self.send_json_response(he.code, {"error": f"Erro na API do Gemini (HTTP {he.code}): {he.reason}"})
            except Exception as e:
                import traceback
                traceback.print_exc()
                if "429" in str(e):
                    self.send_json_response(429, {"error": "Limite de requisições do Gemini excedido (HTTP 429). Por favor, aguarde alguns instantes antes de tentar novamente."})
                else:
                    self.send_json_response(500, {"error": f"Erro na geração unificada: {str(e)}"})

        elif self.path == '/api/llm/generate':
            try:
                data = json.loads(post_data.decode('utf-8'))
                provider = 'gemini'
                model = data.get('model') or os.environ.get('GEMINI_DEFAULT_MODEL') or 'gemini-3.5-flash'
                api_key = data.get('api_key', '')
                prompt = data.get('prompt', '')
                system_instruction = data.get('system_instruction', None)
                ollama_url = data.get('ollama_url', None)
                use_cache = data.get('use_cache', True)
                use_chunking = data.get('use_chunking', True)
                stream = data.get('stream', False)
                response_schema = data.get('response_schema', None)
                
                # --- TRUNCAMENTO DE SEGURANÇA NO SERVIDOR ---
                MAX_EDITAL_CHARS = 1000000
                MAX_ANNEX_CHARS = 500000
                MAX_FINAL_PROMPT_CHARS = 600000
                
                # Context items for RAG (with safety truncation)
                edital_text = data.get('edital_text', '')
                if edital_text and len(edital_text) > MAX_EDITAL_CHARS:
                    print(f"[SERVER][WARN] edital_text truncado: {len(edital_text)} -> {MAX_EDITAL_CHARS} chars")
                    edital_text = edital_text[:MAX_EDITAL_CHARS]
                
                annexes = data.get('annexes', [])
                if annexes:
                    for a in annexes:
                        a_content = a.get('content', '')
                        if a_content and len(a_content) > MAX_ANNEX_CHARS:
                            print(f"[SERVER][WARN] Anexo '{a.get('name', '?')}' truncado: {len(a_content)} -> {MAX_ANNEX_CHARS} chars")
                            a['content'] = a_content[:MAX_ANNEX_CHARS]
                
                # If chunking is enabled and we have edital/annexes text, perform retrieval
                if use_chunking:
                    retrieved_context = []
                    
                    compliance_keywords = (
                        "orçamento limite teto custos administrativo tributário imposto taxa RPA INSS MEI ISS "
                        "regularidade certidão FGTS CND CNDT proponente tempo atuação experiência justificativa "
                        "cronograma fase pré-produção execução pós-produção prazo riscos equipe direitos autorais "
                        "ECAD som imagem cessão SisGen acessibilidade física rampa adaptada Libras audiodescrição "
                        "cotas reserva democratização contrapartida oficina workshop formação doação "
                        "prestação contas verificação presença foto nota fiscal comprovante clipagem mídia"
                    )
                    retrieval_query = f"{prompt}\n{compliance_keywords}"
                    
                    if edital_text:
                        if len(edital_text) <= 150000:
                            # Keep 100% of the edital if it's within 150k chars (~35-50 pages)
                            retrieved_context.append("=== CONTEÚDO DO EDITAL DE REFERÊNCIA ===\n" + edital_text)
                        else:
                            # Use generous BM25 RAG for large editais (200+ pages)
                            all_chunks = DocumentRetriever.chunk_text(edital_text)
                            edital_chunks = DocumentRetriever.retrieve(edital_text, retrieval_query, top_k=25)
                            
                            # Guarantee inclusion of first chunk (header/object) and last chunk (disposições finais/prazos)
                            if all_chunks:
                                first_chunk = all_chunks[0]
                                last_chunk = all_chunks[-1]
                                if first_chunk not in edital_chunks:
                                    edital_chunks.insert(0, first_chunk)
                                if last_chunk not in edital_chunks and len(all_chunks) > 1:
                                    edital_chunks.append(last_chunk)
                                    
                            if edital_chunks:
                                retrieved_context.append("=== TRECHOS RELEVANTES DO EDITAL (RECUPERAÇÃO SEMÂNTICA BM25) ===\n" + "\n---\n".join(edital_chunks))
                                
                    if annexes:
                        annex_chunks_list = []
                        for a in annexes:
                            a_name = a.get('name', 'Anexo')
                            a_content = a.get('content', '')
                            if not a_content:
                                continue
                            if len(a_content) <= 8000:
                                # Keep small and medium annexes fully
                                annex_chunks_list.append(f"Anexo: {a_name}\n{a_content}")
                            else:
                                # Use RAG for larger annexes
                                chunks = DocumentRetriever.retrieve(a_content, retrieval_query, top_k=5)
                                if chunks:
                                    annex_chunks_list.append(f"Anexo: {a_name}\n" + "\n---\n".join(chunks))
                        if annex_chunks_list:
                            retrieved_context.append("=== TRECHOS RELEVANTES DOS ANEXOS EXTRAS ===\n" + "\n---\n".join(annex_chunks_list))
                            
                    if retrieved_context:
                        context_str = "\n\n".join(retrieved_context)
                        prompt = f"{prompt}\n\n[CONTEXTO RELEVANTE RECUPERADO (RAG)]:\n{context_str}"
                
                # --- TRUNCAMENTO FINAL DO PROMPT ---
                if len(prompt) > MAX_FINAL_PROMPT_CHARS:
                    print(f"[SERVER][WARN] Prompt final truncado: {len(prompt)} -> {MAX_FINAL_PROMPT_CHARS} chars")
                    prompt = prompt[:MAX_FINAL_PROMPT_CHARS]
                
                # --- LOG DE DEPURAÇÃO ---
                print(f"[SERVER][DEBUG] /api/llm/generate | Modelo: {model} | Prompt final: {len(prompt)} chars | Cache: {use_cache}")
                
                # Call the gateway
                if stream:
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/event-stream')
                    self.send_header('Cache-Control', 'no-cache')
                    self.send_header('Connection', 'keep-alive')
                    self.end_headers()
                    try:
                        for chunk in gateway.stream_generate(
                            provider_name=provider,
                            model=model,
                            api_key=api_key,
                            prompt=prompt,
                            system_instruction=system_instruction,
                            ollama_url=ollama_url,
                            use_cache=use_cache,
                            response_schema=response_schema
                        ):
                            event_data = f"data: {json.dumps({'text': chunk})}\n\n"
                            self.wfile.write(event_data.encode('utf-8'))
                            self.wfile.flush()
                        self.wfile.write(b"data: [DONE]\n\n")
                        self.wfile.flush()
                    except Exception as stream_err:
                        print(f"[SERVER][STREAM][ERROR] {stream_err}")
                        error_data = f"data: {json.dumps({'error': str(stream_err)})}\n\n"
                        self.wfile.write(error_data.encode('utf-8'))
                        self.wfile.write(b"data: [DONE]\n\n")
                        self.wfile.flush()
                    return
                else:
                    gateway_response = gateway.generate(
                        provider_name=provider,
                        model=model,
                        api_key=api_key,
                        prompt=prompt,
                        system_instruction=system_instruction,
                        ollama_url=ollama_url,
                        use_cache=use_cache,
                        response_schema=response_schema
                    )
                    self.send_json_response(200, {"text": gateway_response})
            except TimeoutError as e:
                print(f"[SERVER][TIMEOUT] {str(e)}")
                self.send_json_response(504, {"error": f"Timeout: {str(e)}"})
            except urllib.error.HTTPError as e:
                import traceback
                traceback.print_exc()
                try:
                    error_body = e.read().decode('utf-8')
                except Exception as ex:
                    error_body = str(e)
                if e.code == 429:
                    self.send_json_response(429, {"error": "Limite de requisições do Gemini excedido (HTTP 429). Por favor, aguarde alguns instantes."})
                elif e.code == 400:
                    self.send_json_response(400, {"error": "Requisição inválida para a API do Gemini (HTTP 400). Verifique a chave de API ou as regras configuradas."})
                else:
                    self.send_json_response(500, {"error": f"Erro na API do Provedor (HTTP {e.code}): {error_body}"})
            except Exception as e:
                import traceback
                traceback.print_exc()
                if "429" in str(e):
                    self.send_json_response(429, {"error": "Limite de requisições do Gemini excedido (HTTP 429). Por favor, aguarde alguns instantes."})
                else:
                    self.send_json_response(500, {"error": f"Erro no LLM Gateway: {str(e)}"})
        
        else:
            self.send_json_response(404, {"error": "Rota de API não encontrada."})

    def send_json_response(self, status_code, data_dict):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        response_bytes = json.dumps(data_dict).encode('utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)


def start_auto_reloader():
    """
    Monitora arquivos Python e serviços do projeto.
    Caso ocorra uma atualização massiva de código na IDE, recarrega o servidor
    automaticamente em segundo plano, evitando travamentos e processos zumbis.
    """
    def _watcher():
        script_dir = os.path.dirname(os.path.abspath(__file__))
        watched_files = {}
        
        def _scan_files():
            mtimes = {}
            for root, _, files in os.walk(script_dir):
                if any(ignored in root for ignored in ['.venv', '__pycache__', '.git']):
                    continue
                for f in files:
                    if f.endswith('.py'):
                        fp = os.path.join(root, f)
                        try:
                            mtimes[fp] = os.path.getmtime(fp)
                        except OSError:
                            pass
            return mtimes

        watched_files = _scan_files()
        while True:
            time.sleep(2.0)
            current_mtimes = _scan_files()
            for fp, mtime in current_mtimes.items():
                if fp in watched_files and mtime > watched_files[fp]:
                    print(f"[RELOADER] Alteração detectada em {os.path.basename(fp)}. Recarregando servidor...")
                    time.sleep(0.3)
                    venv_py = os.path.join(script_dir, ".venv", "Scripts", "python.exe")
                    py_exec = venv_py if os.path.exists(venv_py) else sys.executable
                    os.execv(py_exec, [py_exec, "-X", "utf8", "-u", os.path.join(script_dir, "server.py")])
            watched_files = current_mtimes

    t = threading.Thread(target=_watcher, daemon=True)
    t.start()


def main():
    # Garante que serve a pasta atual (onde index.html está localizado)
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    ThreadingHTTPServer.allow_reuse_address = True
    host = os.environ.get('HOST', '0.0.0.0')
    server_address = (host, PORT)
    httpd = ThreadingHTTPServer(server_address, CustomHTTPRequestHandler)
    print(f"Servidor EditalAudit AI rodando em http://{host}:{PORT}/", flush=True)
    
    # Inicia o auto-reloader de código
    start_auto_reloader()
    
    try:
        httpd.serve_forever()
    except (KeyboardInterrupt, SystemExit):
        print("\nServidor encerrado.")
    except Exception as e:
        print(f"\n[SERVER][FATAL] Erro no servidor: {e}")

if __name__ == '__main__':
    main()
