import os
import re
import json
import socket
import urllib.request
import urllib.error
import time
import hashlib

# ----------------------------------------------------
# 1. Semantic Cache & Similarity Utilities (FinOps)
# ----------------------------------------------------
class SemanticCache:
    def __init__(self):
        self.cache = [] # List of dicts: {"prompt_hash": str, "prompt": str, "response": str}

    def lookup(self, prompt, threshold=0.85):
        # First check direct hash matching (instant)
        prompt_hash = hashlib.md5(prompt.encode('utf-8')).hexdigest()
        for item in self.cache:
            if item["prompt_hash"] == prompt_hash:
                print("[CACHE] Direct match hit.")
                return item["response"]
        
        return None

    def store(self, prompt, response):
        prompt_hash = hashlib.md5(prompt.encode('utf-8')).hexdigest()
        self.cache.append({
            "prompt_hash": prompt_hash,
            "prompt": prompt,
            "response": response
        })
        print("[CACHE] Item stored in semantic cache.")


# ----------------------------------------------------
# 2. Document Chunking & BM25-Weighted Retrieval (RAG)
# ----------------------------------------------------
class DocumentRetriever:
    SECTION_HEADER_PATTERN = re.compile(
        r'^(?:(?:CAP[ÍI]TULO|SE[ÇC][ÃA]O|T[ÍI]TULO|ANEXO|CL[ÁA]USULA|ITEM|ARTIGO|Art\.|§)\s*[\d\.\w\-]+|#{1,4}\s+.+|[A-Z0-9\s\-]{4,50}:)',
        re.MULTILINE | re.IGNORECASE
    )

    COMPLIANCE_BOOST_TERMS = {
        "r$", "orcamento", "orçamento", "limite", "teto", "custos", "administrativo",
        "gestao", "gestão", "coordenacao", "coordenação", "acessibilidade", "libras",
        "audiodescricao", "audiodescrição", "cotas", "afirmativa", "certidao", "certidão",
        "cnd", "cndt", "fgts", "ecad", "sisgen", "contrapartida", "cronograma", "prazo",
        "penalidade", "glosa", "habilitacao", "habilitação", "desclassificacao", "desclassificação",
        "vedado", "vedada", "vedacao", "vedação", "inelegivel", "inelegível", "priorizacao",
        "priorização", "criterio", "critério", "barema", "pontuacao", "pontuação"
    }

    _CHUNK_CACHE = {}  # In-memory LRU-style cache for semantic chunks

    @classmethod
    def chunk_text(cls, text, chunk_size=1400, overlap=200):
        """
        Semantic chunker with instant in-memory memoization that:
        1. Preserves table blocks (Markdown & HTML) without splitting them mid-row
        2. Respects section headers and natural paragraph boundaries
        3. Maintains an overlap across chunk boundaries
        """
        if not text or not text.strip():
            return []

        # Check cache
        cache_key = hashlib.md5(f"{len(text)}:{chunk_size}:{overlap}:{text[:200]}".encode('utf-8')).hexdigest()
        if cache_key in cls._CHUNK_CACHE:
            return cls._CHUNK_CACHE[cache_key]

        # Split text into logical semantic blocks (tables, paragraphs, sections)
        raw_paragraphs = re.split(r'\n\s*\n', text)
        blocks = []
        current_section = "Introdução / Disposições Iniciais"
        
        in_html_table = False
        table_buffer = []

        for para in raw_paragraphs:
            p = para.strip()
            if not p:
                continue

            # Detect section header
            first_line = p.split('\n')[0].strip()
            if cls.SECTION_HEADER_PATTERN.match(first_line):
                current_section = first_line[:80]

            # Detect HTML tables
            if "<table" in p.lower():
                in_html_table = True
            
            if in_html_table:
                table_buffer.append(p)
                if "</table>" in p.lower():
                    in_html_table = False
                    blocks.append({
                        "text": "\n\n".join(table_buffer),
                        "section": current_section,
                        "is_table": True
                    })
                    table_buffer = []
                continue

            # Detect Markdown tables
            is_md_table = sum(1 for line in p.split('\n') if '|' in line) >= 2
            if is_md_table:
                blocks.append({
                    "text": p,
                    "section": current_section,
                    "is_table": True
                })
                continue

            blocks.append({
                "text": p,
                "section": current_section,
                "is_table": False
            })

        if table_buffer:
            blocks.append({
                "text": "\n\n".join(table_buffer),
                "section": current_section,
                "is_table": True
            })

        # Assemble chunks with size constraints and overlap
        chunks = []
        current_chunk_blocks = []
        current_chunk_len = 0
        current_chunk_section = current_section

        for block in blocks:
            b_text = block["text"]
            b_len = len(b_text)

            # If a single table/block is very large, keep it intact or cleanly split
            if b_len > chunk_size and not current_chunk_blocks:
                chunks.append(f"[{block['section']}]\n{b_text}")
                continue

            if current_chunk_len + b_len > chunk_size and current_chunk_blocks:
                chunk_str = f"[{current_chunk_section}]\n" + "\n\n".join(current_chunk_blocks)
                chunks.append(chunk_str)

                # Keep the last block for overlap if small enough
                last_block = current_chunk_blocks[-1]
                if len(last_block) <= overlap:
                    current_chunk_blocks = [last_block, b_text]
                    current_chunk_len = len(last_block) + b_len
                else:
                    current_chunk_blocks = [b_text]
                    current_chunk_len = b_len
                current_chunk_section = block["section"]
            else:
                if not current_chunk_blocks:
                    current_chunk_section = block["section"]
                current_chunk_blocks.append(b_text)
                current_chunk_len += b_len

        if current_chunk_blocks:
            chunk_str = f"[{current_chunk_section}]\n" + "\n\n".join(current_chunk_blocks)
            chunks.append(chunk_str)

        # Store in LRU cache (limit size to 50 items)
        if len(cls._CHUNK_CACHE) > 50:
            cls._CHUNK_CACHE.clear()
        cls._CHUNK_CACHE[cache_key] = chunks

        return chunks

    @classmethod
    def retrieve(cls, document_text, query_text, top_k=15):
        """
        BM25-weighted retriever with query expansion and domain-specific boosting
        for regulatory compliance keywords.
        """
        if not document_text or not query_text:
            return []

        chunks = cls.chunk_text(document_text)
        if not chunks:
            return []
        
        if len(chunks) <= top_k:
            return chunks

        # Tokenize query and chunks
        import math
        tokenize = lambda t: re.findall(r'[a-zA-Z0-9áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ$%\.]+', t.lower())
        
        query_tokens = tokenize(query_text)
        if not query_tokens:
            return chunks[:top_k]

        doc_tokens_list = [tokenize(c) for c in chunks]
        N = len(chunks)
        avgdl = sum(len(dt) for dt in doc_tokens_list) / (N or 1)

        # Compute document frequencies
        df = {}
        for dt in doc_tokens_list:
            seen = set(dt)
            for token in seen:
                df[token] = df.get(token, 0) + 1

        # Calculate BM25 score for each chunk
        k1 = 1.5
        b = 0.75
        scored_chunks = []

        for idx, (chunk, doc_tokens) in enumerate(zip(chunks, doc_tokens_list)):
            doc_len = len(doc_tokens)
            doc_tf = {}
            for t in doc_tokens:
                doc_tf[t] = doc_tf.get(t, 0) + 1

            score = 0.0
            for qt in query_tokens:
                if qt in doc_tf:
                    freq = doc_tf[qt]
                    # IDF
                    doc_freq = df.get(qt, 0)
                    idf = math.log(1 + (N - doc_freq + 0.5) / (doc_freq + 0.5))
                    
                    # Boost critical compliance terms
                    boost = 2.5 if qt in cls.COMPLIANCE_BOOST_TERMS else 1.0
                    
                    # BM25 term score
                    num = freq * (k1 + 1)
                    denom = freq + k1 * (1 - b + b * (doc_len / (avgdl or 1)))
                    score += idf * (num / (denom or 1)) * boost

            # Boost chunks containing tables or percentage limits
            if "%" in chunk or "R$" in chunk:
                score += 1.5

            scored_chunks.append((score, idx, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        # Return the top K unique chunks, maintaining natural reading order for top hits
        top_entries = scored_chunks[:top_k]
        top_entries.sort(key=lambda x: x[1]) # re-sort by document order for coherence
        
        return [chunk for _, _, chunk in top_entries]


# ----------------------------------------------------
# 3. Agnostic LLM Gateway (Abstract & Providers)
# ----------------------------------------------------
class LLMProvider:
    def generate(self, prompt, model, api_key, system_instruction=None, ollama_url=None, response_schema=None):
        raise NotImplementedError

class GeminiProvider(LLMProvider):
    MAX_PROMPT_CHARS = 300000  # ~75k tokens safety limit
    API_TIMEOUT = 180  # seconds — generous window for complex financial and regulatory calculations
    def generate(self, prompt, model, api_key, system_instruction=None, ollama_url=None, response_schema=None):
        # Default to gemini-3.5-flash if model not supplied or using deprecated/legacy model strings
        deprecated_models = {"gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-2.5-flash"}
        primary_model = model if (model and model not in deprecated_models) else "gemini-3.5-flash"
        
        # --- TRUNCAMENTO DE SEGURANÇA ---
        if len(prompt) > self.MAX_PROMPT_CHARS:
            print(f"[GEMINI][WARN] Prompt truncado de {len(prompt)} para {self.MAX_PROMPT_CHARS} chars.")
            prompt = prompt[:self.MAX_PROMPT_CHARS] + "\n\n[TEXTO TRUNCADO POR LIMITE DE SEGURANÇA]"
        
        contents = [{"parts": [{"text": prompt}]}]
        if system_instruction:
            # Truncate system instruction too
            si_text = system_instruction[:8000] if len(system_instruction) > 8000 else system_instruction
            system_instruction_payload = {"parts": [{"text": si_text}]}
        else:
            system_instruction_payload = None
            
        payload = {"contents": contents}
        if system_instruction_payload:
            payload["systemInstruction"] = system_instruction_payload
            
        # Setup generation config with JSON schema if requested
        generation_config = {"maxOutputTokens": 65536}
        if response_schema:
            generation_config["responseMimeType"] = "application/json"
            generation_config["responseSchema"] = response_schema
        payload["generationConfig"] = generation_config
            
        headers = {"Content-Type": "application/json"}
        req_data = json.dumps(payload).encode('utf-8')
        
        # Models to try: primary first, fallback to active gemini-3.x models
        models_to_try = [primary_model]
        for fallback in ["gemini-3.5-flash", "gemini-3.1-flash-lite"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)
                
        last_error = None
        max_retries = 3
        
        for current_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
            model_failed = False
            
            for attempt in range(max_retries):
                print(f"[GEMINI][DEBUG] Tentando modelo: {current_model} | Tentativa: {attempt+1}/{max_retries} | Payload: {len(req_data)} bytes | Prompt: {len(prompt)} chars")
                req = urllib.request.Request(url, data=req_data, headers=headers, method='POST')
                try:
                    with urllib.request.urlopen(req, timeout=self.API_TIMEOUT) as response:
                        res_json = json.loads(response.read().decode('utf-8'))
                        text = res_json['candidates'][0]['content']['parts'][0]['text']
                        print(f"[GEMINI][OK] Resposta recebida com modelo {current_model}: {len(text)} chars")
                        return text
                except socket.timeout:
                    if attempt < max_retries - 1:
                        sleep_time = 2 ** attempt
                        print(f"[GEMINI][WARN] Timeout de conexão. Aguardando {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                    last_error = TimeoutError(f"A API do Gemini não respondeu em {self.API_TIMEOUT}s com o modelo {current_model}.")
                    model_failed = True
                    break
                except urllib.error.HTTPError as e:
                    last_error = e
                    try:
                        err_body = e.read().decode('utf-8', errors='ignore')
                        print(f"[GEMINI][ERROR] HTTPError body para {current_model}: {err_body}")
                    except Exception:
                        err_body = ""
                    # Retry on rate limit (429) or server errors (503, 504)
                    if e.code in [429, 503, 504]:
                        if attempt < max_retries - 1:
                            retry_after = e.headers.get("Retry-After")
                            if retry_after:
                                try:
                                    sleep_time = int(retry_after)
                                except ValueError:
                                    sleep_time = 2 ** (attempt + 1)
                            else:
                                sleep_time = 2 ** (attempt + 1)
                            print(f"[GEMINI][WARN] Erro HTTP {e.code}. Aguardando {sleep_time}s antes de tentar novamente...")
                            time.sleep(sleep_time)
                            continue
                    elif e.code == 404:
                        print(f"[GEMINI][WARN] Modelo {current_model} retornou 404 (Não Encontrado). Tentando próximo modelo da fila...")
                    else:
                        print(f"[GEMINI][ERROR] Erro HTTP {e.code} com modelo {current_model}. Tentando próximo modelo...")
                    model_failed = True
                    break
                except urllib.error.URLError as e:
                    last_error = e
                    if isinstance(e.reason, socket.timeout):
                        if attempt < max_retries - 1:
                            sleep_time = 2 ** attempt
                            print(f"[GEMINI][WARN] Timeout de conexão (URLError). Aguardando {sleep_time}s...")
                            time.sleep(sleep_time)
                            continue
                        last_error = TimeoutError(f"Timeout de conexão com Gemini ({self.API_TIMEOUT}s) no modelo {current_model}.")
                    else:
                        print(f"[GEMINI][ERROR] Erro de URL {e.reason} com modelo {current_model}.")
                    model_failed = True
                    break

            if model_failed:
                continue

        if last_error:
            raise last_error

    def stream_generate(self, prompt, model, api_key, system_instruction=None, response_schema=None):
        deprecated_models = {"gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-2.5-flash"}
        primary_model = model if (model and model not in deprecated_models) else "gemini-3.5-flash"
            
        # --- TRUNCAMENTO DE SEGURANÇA ---
        if len(prompt) > self.MAX_PROMPT_CHARS:
            print(f"[GEMINI][WARN] Prompt truncado de {len(prompt)} para {self.MAX_PROMPT_CHARS} chars.")
            prompt = prompt[:self.MAX_PROMPT_CHARS] + "\n\n[TEXTO TRUNCADO POR LIMITE DE SEGURANÇA]"
            
        contents = [{"parts": [{"text": prompt}]}]
        if system_instruction:
            si_text = system_instruction[:8000] if len(system_instruction) > 8000 else system_instruction
            system_instruction_payload = {"parts": [{"text": si_text}]}
        else:
            system_instruction_payload = None
            
        payload = {"contents": contents}
        if system_instruction_payload:
            payload["systemInstruction"] = system_instruction_payload
            
        # Setup generation config with JSON schema if requested
        generation_config = {"maxOutputTokens": 65536}
        if response_schema:
            generation_config["responseMimeType"] = "application/json"
            generation_config["responseSchema"] = response_schema
        payload["generationConfig"] = generation_config
            
        headers = {"Content-Type": "application/json"}
        req_data = json.dumps(payload).encode('utf-8')
        
        # Models to try: primary first, fallback to active gemini-3.x models
        models_to_try = [primary_model]
        for fallback in ["gemini-3.5-flash", "gemini-3.1-flash-lite"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)
                
        last_error = None
        max_retries = 3
        
        for current_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:streamGenerateContent?key={api_key}"
            model_failed = False
            
            for attempt in range(max_retries):
                print(f"[GEMINI-STREAM][DEBUG] Tentando modelo: {current_model} | Tentativa: {attempt+1}/{max_retries} | Payload: {len(req_data)} bytes | Prompt: {len(prompt)} chars")
                req = urllib.request.Request(url, data=req_data, headers=headers, method='POST')
                try:
                    with urllib.request.urlopen(req, timeout=self.API_TIMEOUT) as response:
                        decoder = json.JSONDecoder()
                        buffer = ""
                        for line in response:
                            buffer += line.decode('utf-8', errors='ignore')
                            
                            while True:
                                buffer = buffer.lstrip(' \n\r\t,[')
                                if not buffer:
                                    break
                                
                                try:
                                    obj, idx = decoder.raw_decode(buffer)
                                    buffer = buffer[idx:]
                                    
                                    if 'error' in obj:
                                        err_detail = obj['error']
                                        err_msg = f"API Gemini Erro ({err_detail.get('code', '?')}): {err_detail.get('message', 'Erro desconhecido')}"
                                        raise Exception(err_msg)
                                    if 'candidates' in obj and obj['candidates']:
                                        cand = obj['candidates'][0]
                                        if 'content' in cand and 'parts' in cand['content'] and cand['content']['parts']:
                                            text = cand['content']['parts'][0].get('text', '')
                                            if text:
                                                yield text
                                except json.JSONDecodeError:
                                    break
                        return # Success, exit
                except socket.timeout:
                    if attempt < max_retries - 1:
                        sleep_time = 2 ** attempt
                        print(f"[GEMINI-STREAM][WARN] Timeout de conexão. Aguardando {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                    last_error = TimeoutError(f"A API do Gemini não respondeu em {self.API_TIMEOUT}s com o modelo {current_model} (stream).")
                    model_failed = True
                    break
                except urllib.error.HTTPError as e:
                    last_error = e
                    try:
                        err_body = e.read().decode('utf-8', errors='ignore')
                        print(f"[GEMINI-STREAM][ERROR] HTTPError body para {current_model}: {err_body}")
                    except Exception:
                        err_body = ""
                    if e.code in [429, 503, 504]:
                        if attempt < max_retries - 1:
                            retry_after = e.headers.get("Retry-After")
                            if retry_after:
                                try:
                                    sleep_time = int(retry_after)
                                except ValueError:
                                    sleep_time = 2 ** (attempt + 1)
                            else:
                                sleep_time = 2 ** (attempt + 1)
                            print(f"[GEMINI-STREAM][WARN] Erro HTTP {e.code}. Aguardando {sleep_time}s antes de tentar novamente...")
                            time.sleep(sleep_time)
                            continue
                    elif e.code == 404:
                        print(f"[GEMINI-STREAM][WARN] Modelo {current_model} retornou 404. Tentando próximo da fila...")
                    else:
                        print(f"[GEMINI-STREAM][ERROR] Erro HTTP {e.code} com modelo {current_model} (stream).")
                    model_failed = True
                    break
                except urllib.error.URLError as e:
                    last_error = e
                    if isinstance(e.reason, socket.timeout):
                        if attempt < max_retries - 1:
                            sleep_time = 2 ** attempt
                            print(f"[GEMINI-STREAM][WARN] Timeout de conexão (URLError). Aguardando {sleep_time}s...")
                            time.sleep(sleep_time)
                            continue
                        last_error = TimeoutError(f"Timeout de conexão com Gemini ({self.API_TIMEOUT}s) no modelo {current_model} (stream).")
                    else:
                        print(f"[GEMINI-STREAM][ERROR] Erro de URL {e.reason} com modelo {current_model} (stream).")
                    model_failed = True
                    break

            if model_failed:
                continue
                    
        if last_error:
            raise last_error


# ----------------------------------------------------
# 4. Gateway Manager (LLM Gateway Router)
# ----------------------------------------------------
class LLMGateway:
    def __init__(self):
        self.providers = {
            "gemini": GeminiProvider()
        }
        self.cache = SemanticCache()

    def generate(self, provider_name, model, api_key, prompt, system_instruction=None, 
                 ollama_url=None, use_cache=True, response_schema=None, threshold=0.85):
        
        provider = self.providers.get("gemini")
            
        if use_cache:
            # Check cache with prompt + model + provider combined to avoid mixing context
            cache_key = f"[gemini:{model}] System: {system_instruction or ''}\nPrompt: {prompt}"
            cached_response = self.cache.lookup(cache_key, threshold=threshold)
            if cached_response:
                return cached_response

        # Execute generation
        response_text = provider.generate(
            prompt=prompt,
            model=model,
            api_key=api_key,
            system_instruction=system_instruction,
            ollama_url=ollama_url,
            response_schema=response_schema
        )
        
        if use_cache:
            cache_key = f"[gemini:{model}] System: {system_instruction or ''}\nPrompt: {prompt}"
            self.cache.store(cache_key, response_text)
            
        return response_text

    def stream_generate(self, provider_name, model, api_key, prompt, system_instruction=None, 
                        ollama_url=None, use_cache=True, response_schema=None, threshold=0.85):
        provider = self.providers.get("gemini")
        if use_cache:
            cache_key = f"[gemini:{model}] System: {system_instruction or ''}\nPrompt: {prompt}"
            cached_response = self.cache.lookup(cache_key, threshold=threshold)
            if cached_response:
                yield cached_response
                return

        full_text = ""
        for chunk in provider.stream_generate(
            prompt=prompt,
            model=model,
            api_key=api_key,
            system_instruction=system_instruction,
            response_schema=response_schema
        ):
            full_text += chunk
            yield chunk
            
        if use_cache and full_text:
            cache_key = f"[gemini:{model}] System: {system_instruction or ''}\nPrompt: {prompt}"
            self.cache.store(cache_key, full_text)
