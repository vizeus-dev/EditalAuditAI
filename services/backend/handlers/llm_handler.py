#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Handler de Requisições de IA e Streaming SSE (Multi-Provider: Gemini + Groq + BYOK)
"""

import os
import json
from services.api import LLMGateway, DocumentRetriever

# Instância singleton do Gateway Multi-Provider
llm_gateway = LLMGateway()

def handle_llm_generate(post_data_bytes, headers=None):
    """
    Processa chamada de geração síncrona com suporte a BYOK (X-User-API-Key)
    e seleção de modelo/provedor com fallback automático.
    """
    data = json.loads(post_data_bytes.decode('utf-8'))
    
    # Suporte a BYOK via header ou corpo da requisição
    user_key_header = headers.get('X-User-API-Key', '') if headers else ''
    api_key = user_key_header or data.get('api_key') or os.environ.get('GEMINI_API_KEY', '')
    
    provider = data.get('provider') or ('groq' if data.get('model', '').startswith('llama') else 'gemini')
    model = data.get('model') or ('llama-3.3-70b-versatile' if provider == 'groq' else 'gemini-3.5-flash')
    
    prompt = data.get('prompt', '')
    system_instruction = data.get('system_instruction', None)
    ollama_url = data.get('ollama_url', None)
    use_cache = data.get('use_cache', True)
    use_chunking = data.get('use_chunking', True)
    response_schema = data.get('response_schema', None)
    
    # RAG: Chunking & BM25 retrieval se o texto for grande
    edital_context = data.get('edital_text', '')
    if edital_context and use_chunking and len(edital_context) > 4000:
        relevant_chunks = DocumentRetriever.retrieve(
            query=prompt,
            full_text=edital_context,
            top_k=4,
            chunk_size=1500,
            overlap=200
        )
        if relevant_chunks:
            context_block = "\n---\n[TRECHOS RELEVANTES DO EDITAL]:\n" + "\n\n".join(relevant_chunks) + "\n---\n"
            prompt = f"{context_block}\n\n[SOLICITAÇÃO]:\n{prompt}"
            
    response_text = llm_gateway.generate(
        provider_name=provider,
        model=model,
        api_key=api_key,
        prompt=prompt,
        system_instruction=system_instruction,
        ollama_url=ollama_url,
        use_cache=use_cache,
        response_schema=response_schema
    )
    
    return {
        "response": response_text,
        "provider": provider,
        "model": model
    }

def handle_llm_stream(post_data_bytes, headers=None):
    """
    Gera um gerador (generator) de chunks para resposta via Server-Sent Events (SSE).
    """
    data = json.loads(post_data_bytes.decode('utf-8'))
    user_key_header = headers.get('X-User-API-Key', '') if headers else ''
    api_key = user_key_header or data.get('api_key') or os.environ.get('GEMINI_API_KEY', '')
    
    provider = data.get('provider') or ('groq' if data.get('model', '').startswith('llama') else 'gemini')
    model = data.get('model') or ('llama-3.3-70b-versatile' if provider == 'groq' else 'gemini-3.5-flash')
    
    prompt = data.get('prompt', '')
    system_instruction = data.get('system_instruction', None)
    ollama_url = data.get('ollama_url', None)
    use_cache = data.get('use_cache', True)
    response_schema = data.get('response_schema', None)
    
    return llm_gateway.stream_generate(
        provider_name=provider,
        model=model,
        api_key=api_key,
        prompt=prompt,
        system_instruction=system_instruction,
        ollama_url=ollama_url,
        use_cache=use_cache,
        response_schema=response_schema
    )
