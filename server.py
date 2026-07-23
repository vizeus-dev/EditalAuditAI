#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Servidor Customizado HTTP para EditalAudit AI
Suporta servir arquivos estáticos e atua como Proxy para carregamento de links de editais.
"""

import os
import json
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

# ReportLab imports at top-level
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Global divider helper for ReportLab reports
def get_divider():
    line = Table([['']], colWidths=[487], rowHeights=[1])
    line.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    return line

gateway = LLMGateway()

def safe_encode_cp1252(s):
    b = bytearray()
    for char in s:
        cp = ord(char)
        if 0x80 <= cp <= 0x9f:
            try:
                b.extend(char.encode('cp1252'))
            except UnicodeEncodeError:
                b.append(cp)
        else:
            b.extend(char.encode('cp1252'))
    return bytes(b)

def fix_double_encoded_utf8(text):
    if not isinstance(text, str) or not text:
        return text
    
    if any(c in text for c in ('Ã', 'Â', 'â', 'Ê', 'Ô')):
        for enc in ('cp1252', 'latin-1'):
            try:
                if enc == 'cp1252':
                    return safe_encode_cp1252(text).decode('utf-8')
                else:
                    return text.encode(enc).decode('utf-8')
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
            
    def _sub_fix(match):
        for enc in ('cp1252', 'latin-1'):
            try:
                if enc == 'cp1252':
                    return safe_encode_cp1252(match.group(0)).decode('utf-8')
                else:
                    return match.group(0).encode(enc).decode('utf-8')
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
        return match.group(0)

    # In cp1252/latin-1 double-encoding:
    # 2-byte UTF-8 starts with 0xc2-0xdf, followed by continuation byte
    # 3-byte UTF-8 starts with 0xe0-0xef, followed by two continuation bytes
    pattern = re.compile(r'[\u00c2-\u00df].|[\u00e0-\u00ef].{2}')
    text = pattern.sub(_sub_fix, text)
    return text

def clean_html_tags(temp_text):
    if not temp_text:
        return ""
    # 1. Strip HTML comments
    temp_text = re.sub(r'<!--[\s\S]*?-->', '', temp_text)
    # 2. Strip style and script tags and contents
    temp_text = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', temp_text, flags=re.IGNORECASE)
    # 3. Headers to bold + br
    temp_text = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'<br/><b>\1</b><br/>', temp_text, flags=re.DOTALL | re.IGNORECASE)
    # 4. List items to bullets
    temp_text = re.sub(r'<li[^>]*>(.*?)</li>', r'• \1<br/>', temp_text, flags=re.DOTALL | re.IGNORECASE)
    temp_text = re.sub(r'</?(?:ul|ol)[^>]*>', r'<br/>', temp_text, flags=re.IGNORECASE)
    
    # 5. Table cells and headers
    temp_text = re.sub(r'<th[^>]*>(.*?)</th>', r' | <b>\1</b> ', temp_text, flags=re.DOTALL | re.IGNORECASE)
    temp_text = re.sub(r'<td[^>]*>(.*?)td>', r' | \1 ', temp_text, flags=re.DOTALL | re.IGNORECASE)
    temp_text = re.sub(r'<tr[^>]*>', '', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</tr>', '<br/>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</?(?:table|tbody|thead|tfoot)[^>]*>', '<br/>', temp_text, flags=re.IGNORECASE)
    
    # 6. Strong / em to b / i
    temp_text = re.sub(r'<strong[^>]*>', '<b>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</strong>', '</b>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'<em[^>]*>', '<i>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</em>', '</i>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</?(?:p|div|section|article|header|footer)[^>]*>', r'<br/>', temp_text, flags=re.IGNORECASE)
    
    # 7. Strip any other tag except ReportLab allowed: b, i, u, sub, sup, font, a, br
    allowed_prefixes = ('<b', '</b', '<i', '</i', '<u', '</u', '<sub', '</sub', '<sup', '</sup', '<font', '</font', '<a', '</a', '<br', '</br')
    def strip_unallowed(m):
        tag = m.group(0)
        tag_lower = tag.lower()
        if any(tag_lower.startswith(prefix) for prefix in allowed_prefixes):
            return tag
        return ''
        
    temp_text = re.sub(r'<[^>]+>', strip_unallowed, temp_text)
    return temp_text

def append_html_content_to_story(html_content, story, body_style, h2_style):
    if not html_content:
        return

    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html_content)
    clean_html = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', clean_html, flags=re.IGNORECASE)
    clean_html = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', clean_html, flags=re.IGNORECASE)

    table_pattern = re.compile(r'(<table[\s\S]*?>[\s\S]*?</table>)', re.IGNORECASE)
    blocks = table_pattern.split(clean_html)

    for block in blocks:
        block_str = block.strip()
        if not block_str:
            continue

        if block_str.lower().startswith('<table'):
            parser = HTMLTableParser()
            parser.feed(block_str)
            rows = parser.rows
            if rows:
                N = max(len(r) for r in rows)
                col_widths = [487.0 / N] * N
                table_content = []
                for row in rows:
                    row_cells = []
                    for cell in row:
                        cell_text = make_reportlab_safe(cell["text"])
                        if cell["is_header"]:
                            cell_p = Paragraph(f"<b>{cell_text}</b>", ParagraphStyle('ThCustom', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#0f172a')))
                        else:
                            cell_p = Paragraph(cell_text, body_style)
                        row_cells.append(cell_p)
                    while len(row_cells) < N:
                        row_cells.append(Paragraph("", body_style))
                    table_content.append(row_cells)

                report_table = Table(table_content, colWidths=col_widths)
                t_style = TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 5),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ])
                for r_idx in range(1, len(table_content)):
                    if r_idx % 2 == 1:
                        t_style.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#f8fafc'))
                report_table.setStyle(t_style)
                story.append(Spacer(1, 4))
                story.append(report_table)
                story.append(Spacer(1, 6))
        else:
            temp_text = clean_html_tags(block_str)
            parts = re.split(r'<br/>|<br>', temp_text)
            for part in parts:
                clean_part = part.strip()
                if clean_part:
                    safe_part = make_reportlab_safe(clean_part)
                    if safe_part.strip():
                        if safe_part.startswith('<b>') and safe_part.endswith('</b>') and len(safe_part) < 100:
                            story.append(Paragraph(safe_part, h2_style))
                        else:
                            try:
                                story.append(Paragraph(safe_part, body_style))
                            except Exception as pe:
                                plain_text = re.sub(r'<[^>]+>', '', safe_part)
                                story.append(Paragraph(html.escape(plain_text), body_style))


def make_reportlab_safe(text):
    if not text:
        return ""
    text = str(text)
    
    # Fix double-encoded UTF-8 first
    text = fix_double_encoded_utf8(text)
    
    # Replace common MS Word / Unicode smart quotes, dashes, bullets and special characters
    replacements = {
        '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"', '\u2033': '"', '\u2036': '"',
        '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'", '\u2032': "'", '\u2035': "'",
        '\u2012': '-', '\u2013': '-', '\u2014': '-', '\u2015': '-',
        '\u2022': '*', '\u2023': '*', '\u2043': '*', '\u204c': '*', '\u204d': '*', '\u2219': '*', '\u25aa': '*', '\u25ab': '*',
        '\u2026': '...',
        '\u00a0': ' ',
        '\u200b': '', '\u200c': '', '\u200d': '', '\ufeff': '',
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
        
    # Decode HTML entities if any
    text = html.unescape(text)
    # Escape HTML special characters (< and >) safely without turning quotes into &quot;
    text = html.escape(text, quote=False)
    
    # Restore allowed ReportLab tags
    text = text.replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")
    text = text.replace("&lt;i&gt;", "<i>").replace("&lt;/i&gt;", "</i>")
    text = text.replace("&lt;u&gt;", "<u>").replace("&lt;/u&gt;", "</u>")
    text = text.replace("&lt;sub&gt;", "<sub>").replace("&lt;/sub&gt;", "</sub>")
    text = text.replace("&lt;sup&gt;", "<sup>").replace("&lt;/sup&gt;", "</sup>")
    text = text.replace("&lt;br&gt;", "<br/>").replace("&lt;br/&gt;", "<br/>").replace("&lt;br /&gt;", "<br/>")
    
    # Restore font tags: &lt;font (.*?)&gt; -> <font \1>
    text = re.sub(r'&lt;font\s+(.*?)&gt;', r'<font \1>', text, flags=re.IGNORECASE)
    text = text.replace("&lt;/font&gt;", "</font>").replace("&lt;/FONT&gt;", "</font>")
    
    # Restore a tags: &lt;a\s+(.*?)&gt; -> <a \1>
    text = re.sub(r'&lt;a\s+(.*?)&gt;', r'<a \1>', text, flags=re.IGNORECASE)
    text = text.replace("&lt;/a&gt;", "</a>").replace("&lt;/A&gt;", "</a>")
    
    return text

PORT = 8085

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
]

def search_ddg(query):
    import random
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
    }
    
    # Tentativa 1: DuckDuckGo HTML
    url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
            results = []
            pattern = re.compile(r'<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>')
            matches = pattern.findall(html_content)
            
            for href, title in matches:
                title_clean = re.sub(r'<[^>]+>', '', title).strip()
                title_clean = html.unescape(title_clean)
                if "/l/?kh=" in href or "uddg=" in href:
                    parsed_url = urllib.parse.urlparse(href)
                    qs = urllib.parse.parse_qs(parsed_url.query)
                    if 'uddg' in qs:
                        href = qs['uddg'][0]
                results.append({"title": title_clean, "url": href, "snippet": ""})
            
            snippet_pattern = re.compile(r'<a class="result__snippet"[^>]*>([\s\S]*?)</a>')
            snippets = snippet_pattern.findall(html_content)
            for i, snip in enumerate(snippets):
                if i < len(results):
                    snippet_clean = re.sub(r'<[^>]+>', '', snip).strip()
                    snippet_clean = html.unescape(snippet_clean)
                    results[i]["snippet"] = snippet_clean
                    
            if results:
                return results[:15]
    except Exception as e:
        print(f"[SEARCH][WARN] DuckDuckGo HTML falhou: {e}. Tentando fallback Lite...")

    # Tentativa 2: DuckDuckGo Lite Fallback
    try:
        lite_url = "https://lite.duckduckgo.com/lite/?" + urllib.parse.urlencode({"q": query})
        req_lite = urllib.request.Request(lite_url, headers=headers)
        with urllib.request.urlopen(req_lite, timeout=12) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
            results = []
            link_matches = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', html_content)
            for href, title in link_matches:
                title_clean = html.unescape(re.sub(r'<[^>]+>', '', title).strip())
                if href.startswith('http') and len(title_clean) > 5:
                    results.append({"title": title_clean, "url": href, "snippet": "Diretriz / Edital de fomento cultural público."})
            return results[:15]
    except Exception as e2:
        print(f"[SEARCH][ERROR] Fallback DuckDuckGo Lite falhou: {e2}")
        return []

def extract_document_links(html_content, base_url):
    link_pattern = re.compile(r'<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', re.IGNORECASE)
    matches = link_pattern.findall(html_content)
    
    links = []
    seen_urls = set()
    
    doc_extensions = ('.pdf', '.docx', '.doc', '.txt', '.odt')
    
    for href, text in matches:
        href = href.strip()
        href = href.replace('&amp;', '&')
        full_url = urllib.parse.urljoin(base_url, href)
        
        parsed = urllib.parse.urlparse(full_url)
        if parsed.scheme not in ('http', 'https'):
            continue
            
        text_clean = re.sub(r'<[^>]+>', '', text).strip()
        text_clean = " ".join(text_clean.split())
        text_clean = text_clean.replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'")
        
        if not text_clean:
            text_clean = os.path.basename(parsed.path) or "Documento"
            
        is_doc = any(parsed.path.lower().endswith(ext) for ext in doc_extensions)
        contains_keywords = any(kw in text_clean.lower() or kw in parsed.path.lower() for kw in ['edital', 'regulamento', 'anexo', 'chamada', 'retificacao', 'cronograma', 'contrato'])
        
        if (is_doc or contains_keywords) and full_url not in seen_urls:
            seen_urls.add(full_url)
            links.append({
                "name": text_clean,
                "url": full_url,
                "is_direct_doc": is_doc
            })
            
    return links

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.ignored_tags = set()

    def handle_starttag(self, tag, attrs):
        if tag in ["script", "style", "head", "title", "meta", "link"]:
            self.ignored_tags.add(tag)

    def handle_endtag(self, tag):
        if tag in ["script", "style", "head", "title", "meta", "link"]:
            self.ignored_tags.discard(tag)

    def handle_data(self, data):
        if not self.ignored_tags:
            self.text.append(data)

    def get_clean_text(self):
        full_text = " ".join(self.text)
        return " ".join(full_text.split())


class HTMLTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.current_row = []
        self.current_cell = []
        self.in_cell = False
        self.is_header = False

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.current_row = []
        elif tag in ['td', 'th']:
            self.in_cell = True
            self.is_header = (tag == 'th')
            self.current_cell = []

    def handle_endtag(self, tag):
        if tag == 'tr':
            if self.current_row:
                self.rows.append(self.current_row)
        elif tag in ['td', 'th']:
            self.in_cell = False
            cell_text = "".join(self.current_cell).strip()
            self.current_row.append({"text": cell_text, "is_header": self.is_header})

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell.append(data)


class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def send_header(self, keyword, value):
        if keyword.lower() == 'content-type':
            if any(text_type in value.lower() for text_type in ['text/html', 'text/javascript', 'application/javascript', 'text/css', 'application/json']):
                if 'charset' not in value.lower():
                    value += '; charset=utf-8'
        super().send_header(keyword, value)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/fetch-url':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                url = data.get('url')
                
                if not url:
                    self.send_json_response(400, {"error": "URL ausente no corpo da requisição."})
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
                            except Exception:
                                html_content = content.decode('latin1', errors='replace')
                        else:
                            try:
                                html_content = content.decode(raw_charset)
                            except Exception:
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
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                query = data.get('query')
                if not query:
                    self.send_json_response(400, {"error": "Termo de busca (query) ausente."})
                    return
                
                results = search_ddg(query)
                self.send_json_response(200, {"results": results})
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao pesquisar: {str(e)}"})
                
        elif self.path == '/api/parse-portal-page':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                url = data.get('url')
                if not url:
                    self.send_json_response(400, {"error": "URL ausente."})
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
                            except Exception:
                                html_content = content.decode('latin1', errors='replace')
                        else:
                            try:
                                html_content = content.decode(raw_charset)
                            except Exception:
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
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                project_title = data.get('project_title', 'Projeto Cultural')
                institution = data.get('institution', 'Não Especificada')
                proponent = data.get('proponent', 'Não Especificado')
                budget = str(data.get('budget', '0'))
                score = str(data.get('score') or '0')
                nota_tecnica = str(data.get('nota_tecnica', '0'))
                nota_priorizacao = str(data.get('nota_priorizacao', '0'))
                relatorio_analitico = data.get('relatorio_analitico', '')
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
                except:
                    pass
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
                    except:
                        nota_atrib = 0
                    try:
                        nota_max = int(crit.get('nota_maxima', 25) or 25)
                    except:
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
                
                def add_footer(canvas, doc):
                    canvas.saveState()
                    canvas.setFont('Helvetica', 8)
                    canvas.setFillColor(colors.HexColor('#64748b'))
                    import datetime
                    date_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
                    canvas.drawString(54, 30, f"Gerado por EditalAudit AI em {date_str}")
                    canvas.drawRightString(A4[0] - 54, 30, f"Página {doc.page}")
                    canvas.restoreState()
                    
                doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
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
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                project_title = data.get('project_title', 'Projeto Cultural')
                institution = data.get('institution', 'Não Especificada')
                report_content = data.get('report_content', '')
                
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
                
                def add_revisor_footer(canvas, doc):
                    canvas.saveState()
                    canvas.setFont('Helvetica', 8)
                    canvas.setFillColor(colors.HexColor('#64748b'))
                    import datetime
                    date_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
                    canvas.drawString(54, 30, f"Gerado por EditalAudit AI em {date_str}")
                    canvas.drawRightString(A4[0] - 54, 30, f"Página {doc.page}")
                    canvas.restoreState()
                    
                doc.build(story, onFirstPage=add_revisor_footer, onLaterPages=add_revisor_footer)
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
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                project_title = data.get('project_title', 'Projeto Cultural')
                proponent = data.get('proponent', 'Não Especificado')
                institution = data.get('institution', 'Não Especificada')
                budget = str(data.get('budget', '0'))
                table_html = data.get('table_html', '')
                
                # Parse HTML Table rows
                parser = HTMLTableParser()
                parser.feed(table_html)
                rows = parser.rows
                
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
                    spaceAfter=4
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
                body_style = ParagraphStyle(
                    'TableBodyText',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=8.5,
                    leading=11,
                    textColor=colors.HexColor('#334155')
                )
                
                story = []
                
                safe_title = make_reportlab_safe("PLANILHA ORÇAMENTÁRIA DE CUSTOS")
                safe_proj_title = make_reportlab_safe(project_title)
                safe_proponent = make_reportlab_safe(proponent)
                safe_institution = make_reportlab_safe(institution)
                
                story.append(Paragraph(safe_title, title_style))
                story.append(Paragraph(f"Projeto: <b>{safe_proj_title}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Proponente: {safe_proponent}", subtitle_style))
                story.append(Spacer(1, 10))
                
                # Create executive summary table for finance header
                summary_data = [
                    [
                        Paragraph("<b>Fomento:</b>", body_style), Paragraph(safe_institution, body_style),
                        Paragraph("<b>Orçamento Previsto:</b>", body_style), Paragraph(f"R$ {budget}", body_style)
                    ]
                ]
                summary_table = Table(summary_data, colWidths=[60, 180, 110, 137])
                summary_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 8),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ]))
                story.append(summary_table)
                story.append(Spacer(1, 15))
                
                if rows:
                    N = max(len(row) for row in rows)
                    col_widths = [487.0 / N] * N
                    
                    table_content = []
                    for row in rows:
                        row_cells = []
                        for cell in row:
                            cell_text = make_reportlab_safe(cell["text"])
                            if cell["is_header"]:
                                cell_p = Paragraph(f"<b>{cell_text}</b>", ParagraphStyle('ThFinance', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))
                            else:
                                cell_p = Paragraph(cell_text, body_style)
                            row_cells.append(cell_p)
                        while len(row_cells) < N:
                            row_cells.append(Paragraph("", body_style))
                        table_content.append(row_cells)
                        
                    finance_table = Table(table_content, colWidths=col_widths, repeatRows=1)
                    t_style = TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4f46e5')),
                        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                        ('PADDING', (0,0), (-1,-1), 6),
                        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ])
                    # Alternating row colors
                    for r_idx in range(1, len(table_content)):
                        if r_idx % 2 == 0:
                            t_style.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#f8fafc'))
                    finance_table.setStyle(t_style)
                    story.append(finance_table)
                    story.append(Spacer(1, 15))
                
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
                story.append(Paragraph("Este orçamento é uma projeção gerada por IA baseada na planilha orçamentária da proposta.", disclaimer_style))
                
                def add_finance_footer(canvas, doc):
                    canvas.saveState()
                    canvas.setFont('Helvetica', 8)
                    canvas.setFillColor(colors.HexColor('#64748b'))
                    import datetime
                    date_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
                    canvas.drawString(54, 30, f"Gerado por EditalAudit AI em {date_str}")
                    canvas.drawRightString(A4[0] - 54, 30, f"Página {doc.page}")
                    canvas.restoreState()
                    
                doc.build(story, onFirstPage=add_finance_footer, onLaterPages=add_finance_footer)
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
        
        elif self.path == '/api/save-audit-report':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                with open('relatorio_auditoria.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.send_json_response(200, {"success": True, "message": "Relatório salvo no backend."})
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao salvar relatório no backend: {str(e)}"})

        elif self.path == '/api/load-audit-report':
            try:
                if os.path.exists('relatorio_auditoria.json'):
                    with open('relatorio_auditoria.json', 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    self.send_json_response(200, data)
                else:
                    self.send_json_response(404, {"error": "Relatório não encontrado no backend."})
            except Exception as e:
                self.send_json_response(500, {"error": f"Erro ao carregar relatório: {str(e)}"})

        elif self.path == '/api/analyze-edital-context':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                edital_text = data.get('editalRefText', '')
                annexes = data.get('annexes', [])
                api_key = data.get('api_key', '')
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

                analyze_prompt = f"""Você é o Auditor-Geral e Analista Estrutural de editais públicos e privados de cultura.
Sua missão é analisar minuciosamente o Edital principal e seus Anexos fornecidos abaixo para mapear e extrair o perfil estrutural e as regras de conformidade que devem governar todo e qualquer texto ou proposta gerada para este edital.

[CONTEÚDO DO EDITAL DE REFERÊNCIA]:
{edital_text[:150000]}

[ANEXOS ADICIONAIS]:
{annexes_context}

Mapeie e estruture as informações em um objeto JSON contendo exatamente as seguintes chaves:
1. fomento: Nome da lei de incentivo ou linha de fomento (ex: Lei Rouanet, Lei Paulo Gustavo, Lei Aldir Blanc, Fomento Direto, Fomento Privado, etc.).
2. objetivos: Resumo curto e claro do foco temático, objetivos principais do edital e tipos de projetos elegíveis.
3. tetos_e_limites: Valores máximos (teto por projeto) e limites percentuais para rubricas (ex: limite de custos administrativos, divulgação/marketing, assessoria, etc.).
4. acessibilidade_e_cotas: Regras obrigatórias de acessibilidade (libras, audiodescrição) e políticas de ação afirmativa/cotas (raça, gênero, PCD, territórios).
5. prioridades_critérios: Critérios de prioridade, desempate e avaliação (ex: proponentes estreantes, interiorização, descentralização, diversidade).
6. anexos_analisados: Lista compacta dos anexos enviados e a importância de cada um para o projeto.
7. secoes_exigidas: Lista contendo apenas as chaves das seções especificamente exigidas ou necessárias conforme o edital e anexos (escolhidas estritamente entre: "justificativa", "objetivos", "metodologia", "cronograma", "orcamento", "acessibilidade", "publico", "contrapartida", "comunicacao", "ficha_tecnica", "monitoramento", "compliance", "sustentabilidade", "rider").

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
                        }
                    },
                    "required": ["fomento", "objetivos", "tetos_e_limites", "acessibilidade_e_cotas", "prioridades_critérios", "anexos_analisados", "secoes_exigidas"]
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
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                cover = data.get('cover', {})
                editalRefText = data.get('editalRefText', '')
                proposalDraftText = data.get('proposalDraftText', '')
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
                
                memories_context = "\n".join([
                    f"- [{m.get('date', '')}] Projeto: {m.get('project', '')} -> {m.get('activity', '')}"
                    for m in historicalMemories
                ]) if historicalMemories else "Nenhuma memória anterior."
                
                # Single Prompt focused on proposal generation (Tarefa 1)
                unified_prompt = f"""Você é uma inteligência artificial de elite especialista em captação de recursos públicos e editais de cultura (Lei Rouanet, Lei Aldir Blanc, IN MinC, editais estaduais e municipais do Brasil).
Sua missão é realizar um cruzamento exaustivo e rigoroso entre os dados do edital, seus anexos, a memória de aprendizado e o rascunho fornecido para redigir uma proposta cultural completa de altíssimo nível.

**INSTRUÇÕES CRÍTICAS DE REDAÇÃO (EVITE RESPOSTAS GENÉRICAS):**
- Redija cada seção de forma densa, completa, profissional e contextualizada para o projeto. Não faça resumos, resenhas ou redações rasas.
- Incorpore profundamente o conteúdo e as ideias presentes no [RASCUNHO DO PROPONENTE]. Use suas informações específicas como base e enriqueça-as tecnicamente.
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

[MEMÓRIA DE APRENDIZADO (Projetos anteriores)]:
{memories_context}

[RASCUNHO DO PROPONENTE]:
{proposalDraftText[:50000]}

---

### MISSÃO: REDIGIR AS 14 SEÇÕES DA PROPOSTA CULTURAL
Gere a redação das seguintes 14 seções (deve conter tags HTML de cabeçalho h3 ou h4 e parágrafos dentro de cada texto):
1. justificativa: Justificativa longa, detalhada e persuasiva defendendo o mérito cultural, relevância social e impacto no território.
2. objetivos: Objetivo geral claro e objetivos específicos listados como itens de realizações físicas e pedagógicas quantificáveis.
3. metodologia: Descreva a metodologia detalhando passo-a-passo e de forma operacional as fases de Pré-produção, Execução e Pós-produção.
4. cronograma: Formate obrigatoriamente como tabela HTML (<table>, <tr>, <td>) organizada por meses (Mês 1 a Mês 6).
5. orcamento: Formate orçamentária como tabela HTML (<table>, <tr>, <td>) com colunas: Item, Quantidade, Unidade, Valor Unitário (R$), Valor Total (R$). Respeite rigorosamente as regras de limite (máx 15% para custos administrativos e máx 10% para divulgação) aplicadas sobre o teto do projeto.
6. acessibilidade: Descreva o plano de acessibilidade física, atitudinal e sensorial/comunicacional (como contratação de LIBRAS/audiodescrição) e as cotas afirmativas do projeto.
7. publico: Público-Alvo e Perfil demográfico, social e etário detalhado dos beneficiários.
8. contrapartida: Contrapartida Social e Legado duradouro oferecido gratuitamente à comunidade.
9. comunicacao: Plano de Comunicação e Divulgação nas mídias sociais, imprensa e peças gráficas.
10. ficha_tecnica: Ficha Técnica com minibios e cargos da equipe principal para atestar a exequibilidade operacional.
11. monitoramento: Plano de Monitoramento, Avaliação e Indicadores de sucesso quantitativos e qualitativos (Matriz Lógica).
12. compliance: Mecanismos de compliance legal, certidões negativas necessárias, Ecad, SisGen e direitos autorais.
13. sustentabilidade: Plano de Sustentabilidade e práticas ESG para mitigação de impactos ambientais.
14. rider: Rider Técnico detalhando necessidades físicas, mapa de palco, rider de som/luz, montagem e logística de transporte/hospedagem.

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
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
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
                MAX_FINAL_PROMPT_CHARS = 300000
                
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
                        if len(edital_text) <= 120000:
                            # Keep 100% of the edital if it's within 120k chars (~30-40 pages)
                            retrieved_context.append("=== CONTEÚDO DO EDITAL DE REFERÊNCIA ===\n" + edital_text)
                        else:
                            # Use generous RAG for larger editais
                            edital_chunks = DocumentRetriever.retrieve(edital_text, retrieval_query, top_k=15)
                            if edital_chunks:
                                retrieved_context.append("=== TRECHOS RELEVANTES DO EDITAL ===\n" + "\n---\n".join(edital_chunks))
                                
                    if annexes:
                        annex_chunks_list = []
                        for a in annexes:
                            a_name = a.get('name', 'Anexo')
                            a_content = a.get('content', '')
                            if not a_content:
                                continue
                            if len(a_content) <= 4000:
                                # Keep small annexes fully
                                annex_chunks_list.append(f"Anexo: {a_name}\n{a_content}")
                            else:
                                # Use RAG for larger annexes
                                chunks = DocumentRetriever.retrieve(a_content, retrieval_query, top_k=3)
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
                except:
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


def main():
    # Garante que serve a pasta atual (onde index.html está localizado)
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    server_address = ('127.0.0.1', PORT)
    httpd = ThreadingHTTPServer(server_address, CustomHTTPRequestHandler)
    print(f"Servidor EditalAudit AI rodando em http://127.0.0.1:{PORT}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")

if __name__ == '__main__':
    main()
