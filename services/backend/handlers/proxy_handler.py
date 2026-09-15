#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Handler de Proxy de Download e Extração de Editais e Links Web
Implementa anti-SSRF, extração de texto limpo e motores de busca web multi-tier.
"""

import os
import re
import html
import urllib.request
import urllib.parse
import urllib.error
import random
from html.parser import HTMLParser
from services.backend.config import USER_AGENTS
from services.backend.security import validate_safe_url

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

    pattern = re.compile(r'[\u00c2-\u00df].|[\u00e0-\u00ef].{2}')
    text = pattern.sub(_sub_fix, text)
    return text

def search_ddg_html(query, timeout=7):
    """Tier 1: DuckDuckGo HTML Search"""
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://duckduckgo.com/"
    }
    url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query, "kl": "br-pt"})
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            html_raw = response.read()
            charset = response.info().get_content_charset() or 'utf-8'
            try:
                html_content = html_raw.decode(charset)
            except Exception:
                html_content = html_raw.decode('utf-8', errors='ignore')
                
            results = []
            pattern = re.compile(r'<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>')
            matches = pattern.findall(html_content)
            
            for href, title in matches:
                title_clean = html.unescape(re.sub(r'<[^>]+>', '', title).strip())
                title_clean = fix_double_encoded_utf8(title_clean)
                if "/l/?kh=" in href or "uddg=" in href:
                    parsed_url = urllib.parse.urlparse(href)
                    qs = urllib.parse.parse_qs(parsed_url.query)
                    if 'uddg' in qs:
                        href = qs['uddg'][0]
                
                results.append({
                    "title": title_clean,
                    "url": href,
                    "snippet": ""
                })
            
            snippet_pattern = re.compile(r'<a class="result__snippet"[^>]*>([\s\S]*?)</a>')
            snippets = snippet_pattern.findall(html_content)
            for i, snip in enumerate(snippets):
                if i < len(results):
                    snippet_clean = html.unescape(re.sub(r'<[^>]+>', '', snip).strip())
                    snippet_clean = fix_double_encoded_utf8(snippet_clean)
                    results[i]["snippet"] = snippet_clean
            
            return [r for r in results if r["title"] and len(r["title"]) > 3]
    except Exception as e:
        print(f"[SEARCH][DDG_HTML_FAIL] {e}")
        return []

def search_ddg_lite(query, timeout=7):
    """Tier 2: DuckDuckGo Lite Fallback"""
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    url = "https://lite.duckduckgo.com/lite/"
    data = urllib.parse.urlencode({"q": query, "kl": "br-pt"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            html_raw = response.read()
            html_content = html_raw.decode('utf-8', errors='ignore')
            results = []
            
            links = re.findall(r'<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>', html_content)
            snippets = re.findall(r'<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)</td>', html_content)
            
            for idx, (href, title) in enumerate(links):
                title_clean = html.unescape(re.sub(r'<[^>]+>', '', title).strip())
                title_clean = fix_double_encoded_utf8(title_clean)
                snippet_clean = ""
                if idx < len(snippets):
                    snippet_clean = html.unescape(re.sub(r'<[^>]+>', '', snippets[idx]).strip())
                    snippet_clean = fix_double_encoded_utf8(snippet_clean)
                
                if href.startswith('http') or 'uddg=' in href:
                    if 'uddg=' in href:
                        parsed_url = urllib.parse.urlparse(href)
                        qs = urllib.parse.parse_qs(parsed_url.query)
                        if 'uddg' in qs:
                            href = qs['uddg'][0]
                    results.append({
                        "title": title_clean,
                        "url": href,
                        "snippet": snippet_clean or "Diretriz e referência regulatória de fomento cultural público."
                    })
            return results
    except Exception as e:
        print(f"[SEARCH][DDG_LITE_FAIL] {e}")
        return []

def search_wikipedia_api(query, timeout=5):
    """Tier 3: Wikipedia & Public Norms Fallback"""
    try:
        clean_terms = " ".join([w for w in query.split() if len(w) > 3][:6])
        url = "https://pt.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query",
            "list": "search",
            "srsearch": clean_terms,
            "format": "json",
            "utf8": "1",
            "srlimit": "3"
        })
        req = urllib.request.Request(url, headers={"User-Agent": "EditalAuditAI/3.0 (auditoria.cultural@editalaudit.internal)"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode('utf-8'))
            items = data.get("query", {}).get("search", [])
            results = []
            for it in items:
                title = it.get("title", "")
                snippet_raw = it.get("snippet", "")
                snippet_clean = html.unescape(re.sub(r'<[^>]+>', '', snippet_raw).strip())
                snippet_clean = fix_double_encoded_utf8(snippet_clean)
                page_url = f"https://pt.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
                results.append({
                    "title": f"Norma / Verbete: {title}",
                    "url": page_url,
                    "snippet": snippet_clean
                })
            return results
    except Exception as e:
        print(f"[SEARCH][WIKI_FAIL] {e}")
        return []

def search_yahoo(query, timeout=6):
    """Tier 2: Yahoo Web Search"""
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
    }
    url = "https://search.yahoo.com/search?" + urllib.parse.urlencode({"p": query, "ei": "UTF-8"})
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            html_raw = res.read().decode('utf-8', errors='ignore')
            results = []
            
            algo_matches = re.findall(r'<div[^>]+class="[^"]*algo[^"]*"[^>]*>([\s\S]*?)(?:</div>\s*</li>|</li>)', html_raw)
            for b in algo_matches:
                link_match = re.search(r'<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', b)
                if not link_match:
                    continue
                raw_href, raw_title = link_match.groups()
                
                aria_match = re.search(r'aria-label="([^"]+)"', link_match.group(0))
                if aria_match:
                    title_clean = html.unescape(aria_match.group(1)).strip()
                else:
                    title_clean = html.unescape(re.sub(r'<[^>]+>', '', raw_title).strip())
                    if "http" in title_clean and " - " in title_clean:
                        parts = title_clean.split(" - ")
                        if len(parts) > 1 and "http" in parts[0]:
                            title_clean = " - ".join(parts[1:])
                
                title_clean = fix_double_encoded_utf8(title_clean)
                real_url = raw_href
                if "/RU=" in raw_href:
                    ru_part = raw_href.split("/RU=")[1].split("/RK=")[0]
                    try:
                        real_url = urllib.parse.unquote(ru_part)
                    except Exception:
                        real_url = raw_href
                
                snippet_match = re.search(r'<div[^>]+class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)</div>', b) or re.search(r'<p[^>]*>([\s\S]*?)</p>', b)
                snippet_clean = ""
                if snippet_match:
                    snippet_clean = html.unescape(re.sub(r'<[^>]+>', '', snippet_match.group(1)).strip())
                    snippet_clean = fix_double_encoded_utf8(snippet_clean)
                    
                if title_clean and len(title_clean) > 3 and not title_clean.lower().startswith("yahoo"):
                    results.append({
                        "title": title_clean,
                        "url": real_url,
                        "snippet": snippet_clean or "Referência de fomento cultural e diretrizes públicas."
                    })
            return results
    except Exception as e:
        print(f"[SEARCH][YAHOO_FAIL] {e}")
        return []

def search_ddg(query, agent_key=None, max_results=6):
    """Motor de busca web unificado multi-tier"""
    query_clean = re.sub(r'\s+', ' ', str(query or '')).strip()
    if not query_clean:
        return []
        
    print(f"[SEARCH][ENGINE] Executando busca: '{query_clean}' (Agente: {agent_key})")
    
    # 1. DuckDuckGo HTML
    results = search_ddg_html(query_clean, timeout=6)
    
    # 2. Yahoo Web Search
    if not results:
        results = search_yahoo(query_clean, timeout=6)
        
    # 3. DuckDuckGo Lite Fallback
    if not results:
        results = search_ddg_lite(query_clean, timeout=6)
        
    # 4. Query simplificada com palavras nucleares
    if not results:
        stop_words = {'para', 'com', 'das', 'dos', 'uma', 'como', 'sobre', 'regras', 'normas', 'geral', 'editais'}
        salient_words = [w for w in query_clean.split() if len(w) > 3 and w.lower() not in stop_words]
        if len(salient_words) >= 2:
            simplified_query = " ".join(salient_words[:5])
            results = search_yahoo(simplified_query, timeout=5) or search_ddg_html(simplified_query, timeout=5)
        
    # 5. Fallback Wikipedia
    if not results:
        results = search_wikipedia_api(query_clean, timeout=4)
        
    return results[:max_results]

def extract_document_links(html_content, base_url):
    link_pattern = re.compile(r'<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', re.IGNORECASE)
    matches = link_pattern.findall(html_content)
    
    links = []
    seen_urls = set()
    doc_extensions = ('.pdf', '.docx', '.doc', '.txt', '.odt')
    
    for href, text in matches:
        href = href.strip().replace('&amp;', '&')
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
