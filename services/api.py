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
# 2. Document Chunking & BM25-lite Retrieval (RAG)
# ----------------------------------------------------
class DocumentRetriever:
    @staticmethod
    def chunk_text(text, chunk_size=1200, overlap=200):
        if not text:
            return []
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
            if start >= len(text) or chunk_size - overlap <= 0:
                break
        return chunks

    @classmethod
    def retrieve(cls, document_text, query_text, top_k=3):
        if not document_text or not query_text:
            return []
        chunks = cls.chunk_text(document_text)
        if not chunks:
            return []
        
        # Simple TF-IDF/Jaccard scoring for retrieval
        query_words = set(re.findall(r'\w+', query_text.lower()))
        scored_chunks = []
        
        for chunk in chunks:
            chunk_words = set(re.findall(r'\w+', chunk.lower()))
            overlap = query_words.intersection(chunk_words)
            # Score is word overlap normalized by chunk word count (prioritizing density)
            score = len(overlap) / (len(chunk_words) or 1)
            scored_chunks.append((score, chunk))
            
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        # Return top K chunks
        return [chunk for score, chunk in scored_chunks[:top_k]]


# ----------------------------------------------------
# 3. Agnostic LLM Gateway (Abstract & Providers)
# ----------------------------------------------------
class LLMProvider:
    def generate(self, prompt, model, api_key, system_instruction=None, ollama_url=None, response_schema=None):
        raise NotImplementedError

class GeminiProvider(LLMProvider):
    MAX_PROMPT_CHARS = 300000  # ~75k tokens safety limit
    API_TIMEOUT = 120  # seconds — increased to handle large structured JSON output

    def generate(self, prompt, model, api_key, system_instruction=None, ollama_url=None, response_schema=None):
        # Default to gemini-2.0-flash if model not supplied or using legacy gemini-2.5-flash string
        primary_model = model if (model and model != "gemini-2.5-flash") else "gemini-2.0-flash"
        
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
        
        # Models to try: primary first, fallback to active gemini-2.0 models
        models_to_try = [primary_model]
        for fallback in ["gemini-2.0-flash", "gemini-2.0-flash-lite"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)
                
        last_error = None
        max_retries = 3
        
        for current_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
            model_failed_404 = False
            
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
                    last_error = TimeoutError(f"A API do Gemini não respondeu em {self.API_TIMEOUT}s. Requisição abortada para preservar créditos.")
                except urllib.error.HTTPError as e:
                    last_error = e
                    # Retry on rate limit (429) or server errors (503, 504)
                    if e.code in [429, 503, 504]:
                        if attempt < max_retries - 1:
                            sleep_time = 2 ** attempt
                            print(f"[GEMINI][WARN] Erro HTTP {e.code}. Aguardando {sleep_time}s antes de tentar novamente...")
                            time.sleep(sleep_time)
                            continue
                    elif e.code == 404:
                        print(f"[GEMINI][WARN] Modelo {current_model} retornou 404 (Não Encontrado). Tentando próximo modelo da fila...")
                        model_failed_404 = True
                        break
                    raise
                except urllib.error.URLError as e:
                    last_error = e
                    if isinstance(e.reason, socket.timeout):
                        if attempt < max_retries - 1:
                            sleep_time = 2 ** attempt
                            print(f"[GEMINI][WARN] Timeout de conexão (URLError). Aguardando {sleep_time}s...")
                            time.sleep(sleep_time)
                            continue
                        last_error = TimeoutError(f"Timeout de conexão com Gemini ({self.API_TIMEOUT}s). Verifique sua conexão ou tente novamente.")
                    raise

            if model_failed_404:
                continue

        if last_error:
            raise last_error

    def stream_generate(self, prompt, model, api_key, system_instruction=None, response_schema=None):
        primary_model = model if (model and model != "gemini-2.5-flash") else "gemini-2.0-flash"
            
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
        
        models_to_try = [primary_model]
        for fallback in ["gemini-2.0-flash", "gemini-2.0-flash-lite"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)
                
        last_error = None
        max_retries = 3
        
        for current_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:streamGenerateContent?key={api_key}"
            model_failed_404 = False
            
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
                                # Remove espaços, quebras de linha e o caractere de início de array '[' ou separador ','
                                buffer = buffer.lstrip(' \n\r\t,[')
                                if not buffer:
                                    break
                                
                                try:
                                    obj, idx = decoder.raw_decode(buffer)
                                    # Avança o buffer
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
                                    # Objeto incompleto, aguarda mais dados da rede
                                    break
                        return # Success, exit from retries/models loop
                except socket.timeout:
                    if attempt < max_retries - 1:
                        sleep_time = 2 ** attempt
                        print(f"[GEMINI-STREAM][WARN] Timeout de conexão. Aguardando {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                    last_error = TimeoutError(f"A API do Gemini não respondeu em {self.API_TIMEOUT}s. Requisição abortada para preservar créditos.")
                except urllib.error.HTTPError as e:
                    last_error = e
                    if e.code in [429, 503, 504]:
                        if attempt < max_retries - 1:
                            sleep_time = 2 ** attempt
                            print(f"[GEMINI-STREAM][WARN] Erro HTTP {e.code}. Aguardando {sleep_time}s antes de tentar novamente...")
                            time.sleep(sleep_time)
                            continue
                    elif e.code == 404:
                        print(f"[GEMINI-STREAM][WARN] Modelo {current_model} retornou 404. Tentando próximo da fila...")
                        model_failed_404 = True
                        break
                    raise
                except urllib.error.URLError as e:
                    last_error = e
                    if isinstance(e.reason, socket.timeout):
                        if attempt < max_retries - 1:
                            sleep_time = 2 ** attempt
                            print(f"[GEMINI-STREAM][WARN] Timeout de conexão (URLError). Aguardando {sleep_time}s...")
                            time.sleep(sleep_time)
                            continue
                        last_error = TimeoutError(f"Timeout de conexão com Gemini ({self.API_TIMEOUT}s). Verifique sua conexão ou tente novamente.")
                    raise

            if model_failed_404:
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
