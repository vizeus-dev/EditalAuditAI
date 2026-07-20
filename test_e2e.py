"""
Test End-to-End: Simula uma chamada completa de LLM Gateway via backend streaming
e valida se o JSON estruturado é retornado e parseável corretamente.
"""
import urllib.request
import json
import sys
import os

PORT = 8085
BASE_URL = f"http://127.0.0.1:{PORT}"

# Tenta obter API key do ambiente ou argumento
API_KEY = os.environ.get("GEMINI_API_KEY", "")
if len(sys.argv) > 1:
    API_KEY = sys.argv[1]

def test_server_alive():
    """Verifica se o servidor está respondendo."""
    print("=" * 60)
    print("TEST 1: Server Health Check")
    print("=" * 60)
    try:
        req = urllib.request.Request(f"{BASE_URL}/", method='GET')
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            print(f"  ✓ Server alive: HTTP {resp.status}")
            return True
    except Exception as e:
        print(f"  ✗ Server NOT reachable: {e}")
        return False

def test_search_api():
    """Testa o endpoint de busca web."""
    print("\n" + "=" * 60)
    print("TEST 2: Web Search API (/api/search-web-editais)")
    print("=" * 60)
    try:
        payload = json.dumps({"query": "edital cultura 2026"}).encode('utf-8')
        req = urllib.request.Request(
            f"{BASE_URL}/api/search-web-editais",
            data=payload,
            headers={"Content-Type": "application/json"},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get("results", [])
            assert isinstance(results, list), "results should be a list"
            print(f"  ✓ Search returned {len(results)} results")
            if results:
                print(f"    First result: {results[0].get('title', 'N/A')[:60]}")
            return True
    except Exception as e:
        print(f"  ✗ Search API failed: {e}")
        return False

def test_llm_gateway_streaming(api_key):
    """Testa a chamada ao LLM Gateway com streaming e schema estruturado."""
    print("\n" + "=" * 60)
    print("TEST 3: LLM Gateway Streaming (/api/llm/generate)")
    print("=" * 60)
    if not api_key:
        print("  ⚠ SKIPPED: No API key provided. Pass key as argument or set GEMINI_API_KEY env var.")
        return None

    # Usa o mesmo schema que o frontend usa para propostas
    response_schema = {
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

    payload = json.dumps({
        "provider": "gemini",
        "api_key": api_key,
        "prompt": "Gere uma proposta cultural simples para um festival de teatro em Vitória-ES com orçamento de R$50.000. Preencha todas as 14 seções com conteúdo em HTML (tags p, h3, ul, li). Retorne como JSON estruturado.",
        "system_instruction": "Você é um redator de projetos culturais. Retorne estritamente um JSON.",
        "stream": True,
        "use_cache": False,
        "use_chunking": False,
        "edital_text": "",
        "annexes": [],
        "response_schema": response_schema
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{BASE_URL}/api/llm/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            print(f"  ✓ HTTP {resp.status} - Streaming response started")

            # Read full SSE stream
            accumulated_text = ""
            raw_body = resp.read().decode('utf-8')
            lines = raw_body.split("\n")
            chunk_count = 0
            for line in lines:
                clean = line.strip()
                if clean.startswith("data: "):
                    data_str = clean[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        if "text" in chunk:
                            accumulated_text += chunk["text"]
                            chunk_count += 1
                    except json.JSONDecodeError:
                        pass

            print(f"  ✓ Received {chunk_count} SSE chunks, total text: {len(accumulated_text)} chars")

            if not accumulated_text.strip():
                print("  ✗ EMPTY RESPONSE from LLM Gateway!")
                return False

            # Now test if safeParseJSON logic would work
            clean = accumulated_text.strip()
            brace_start = clean.find('{')
            brace_end = clean.rfind('}')

            if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
                json_str = clean[brace_start:brace_end + 1]
                
                # Escape raw newlines inside JSON strings (same as escapeRawNewlinesInJSON)
                result = []
                in_string = False
                escape = False
                for char in json_str:
                    if escape:
                        result.append(char)
                        escape = False
                    elif char == '\\':
                        result.append(char)
                        escape = True
                    elif char == '"':
                        result.append(char)
                        in_string = not in_string
                    elif (char == '\n' or char == '\r') and in_string:
                        result.append('\\n' if char == '\n' else '\\r')
                    else:
                        result.append(char)
                escaped_str = "".join(result)

                try:
                    parsed = json.loads(escaped_str)
                    print(f"  ✓ JSON parsed successfully!")
                    
                    required_keys = [
                        "justificativa", "objetivos", "metodologia", "cronograma", "orcamento", "acessibilidade",
                        "publico", "contrapartida", "comunicacao", "ficha_tecnica", "monitoramento", "compliance",
                        "sustentabilidade", "rider"
                    ]
                    missing = [k for k in required_keys if k not in parsed]
                    if missing:
                        print(f"  ✗ Missing keys in parsed JSON: {missing}")
                        return False
                    
                    for key in required_keys:
                        val = parsed[key]
                        print(f"    {key}: {len(val)} chars {'✓' if len(val) > 20 else '✗ TOO SHORT'}")
                    
                    all_ok = all(len(parsed[k]) > 20 for k in required_keys)
                    if all_ok:
                        print(f"  ✓ ALL SECTIONS have substantial content!")
                    else:
                        print(f"  ✗ Some sections are too short/empty")
                    return all_ok
                    
                except json.JSONDecodeError as e:
                    print(f"  ✗ JSON parse FAILED even after escaping: {e}")
                    print(f"    First 200 chars of escaped: {escaped_str[:200]}")
                    return False
            else:
                print(f"  ✗ No JSON braces found in accumulated text")
                print(f"    First 200 chars: {accumulated_text[:200]}")
                return False

    except Exception as e:
        print(f"  ✗ LLM Gateway request failed: {e}")
        return False


def test_llm_gateway_subagent(api_key):
    """Testa chamada de sub-agente (nota + parecer)."""
    print("\n" + "=" * 60)
    print("TEST 4: Sub-Agent Schema (nota + parecer)")
    print("=" * 60)
    if not api_key:
        print("  ⚠ SKIPPED: No API key.")
        return None

    response_schema = {
        "type": "OBJECT",
        "properties": {
            "nota": {"type": "NUMBER"},
            "parecer": {"type": "STRING"}
        },
        "required": ["nota", "parecer"]
    }

    payload = json.dumps({
        "provider": "gemini",
        "api_key": api_key,
        "prompt": "Analise esta proposta cultural simples: 'Festival de teatro em Vitória com oficinas gratuitas de 20 horas para escolas públicas.' Dê uma nota de 0 a 100 e um parecer técnico curto em HTML.",
        "system_instruction": "Você é um auditor de projetos culturais. Retorne um JSON com nota (number) e parecer (string HTML).",
        "stream": True,
        "use_cache": False,
        "use_chunking": False,
        "edital_text": "",
        "annexes": [],
        "response_schema": response_schema
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{BASE_URL}/api/llm/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw_body = resp.read().decode('utf-8')
            accumulated_text = ""
            for line in raw_body.split("\n"):
                clean = line.strip()
                if clean.startswith("data: "):
                    data_str = clean[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        if "text" in chunk:
                            accumulated_text += chunk["text"]
                    except:
                        pass

            if not accumulated_text.strip():
                print("  ✗ EMPTY RESPONSE!")
                return False

            # Escape + parse
            clean = accumulated_text.strip()
            bs = clean.find('{')
            be = clean.rfind('}')
            if bs != -1 and be != -1:
                jstr = clean[bs:be+1]
                # escape raw newlines
                res = []
                in_s = False
                esc = False
                for c in jstr:
                    if esc: res.append(c); esc = False
                    elif c == '\\': res.append(c); esc = True
                    elif c == '"': res.append(c); in_s = not in_s
                    elif (c == '\n' or c == '\r') and in_s: res.append('\\n' if c == '\n' else '\\r')
                    else: res.append(c)
                escaped = "".join(res)

                parsed = json.loads(escaped)
                nota = parsed.get("nota")
                parecer = parsed.get("parecer", "")
                print(f"  ✓ Nota: {nota}")
                print(f"  ✓ Parecer: {len(parecer)} chars")
                if nota is not None and len(parecer) > 10:
                    print(f"  ✓ Sub-agent schema WORKS correctly!")
                    return True
                else:
                    print(f"  ✗ Incomplete response")
                    return False
            else:
                print(f"  ✗ No JSON found: {accumulated_text[:100]}")
                return False
    except Exception as e:
        print(f"  ✗ Sub-agent test failed: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("   EditalAudit AI - End-to-End Integration Test Suite")
    print("=" * 60)
    print()

    results = {}
    results["server"] = test_server_alive()
    results["search"] = test_search_api()
    results["llm_proposal"] = test_llm_gateway_streaming(API_KEY)
    results["llm_subagent"] = test_llm_gateway_subagent(API_KEY)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, result in results.items():
        if result is True:
            icon = "✓ PASS"
        elif result is False:
            icon = "✗ FAIL"
        else:
            icon = "⚠ SKIP"
        print(f"  {icon}: {name}")

    failures = sum(1 for v in results.values() if v is False)
    skips = sum(1 for v in results.values() if v is None)
    passes = sum(1 for v in results.values() if v is True)
    print(f"\n  Total: {passes} passed, {failures} failed, {skips} skipped")

    if failures > 0:
        sys.exit(1)
