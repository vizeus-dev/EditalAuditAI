"""Quick test: non-streaming + streaming through the backend."""
import urllib.request, json, http.client, sys

key = sys.argv[1] if len(sys.argv) > 1 else ""
if not key:
    print("Usage: python test_quick_api.py <API_KEY>")
    sys.exit(1)

# Test 1: Non-streaming
print("=== TEST 1: Non-streaming backend call ===")
payload = json.dumps({
    "provider": "gemini",
    "api_key": key,
    "prompt": "Diga apenas: Estou funcionando!",
    "system_instruction": "Responda de forma curta.",
    "stream": False,
    "use_cache": False,
    "use_chunking": False
}).encode("utf-8")

req = urllib.request.Request(
    "http://127.0.0.1:8085/api/llm/generate",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"  OK: {json.dumps(data, ensure_ascii=False)[:200]}")
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="ignore")[:500]
    print(f"  HTTP ERROR {e.code}: {body}")
except Exception as e:
    print(f"  FAILED: {e}")

# Test 2: Streaming via raw HTTP
print()
print("=== TEST 2: Streaming backend call (raw HTTP) ===")
conn = http.client.HTTPConnection("127.0.0.1", 8085, timeout=60)
payload2 = json.dumps({
    "provider": "gemini",
    "api_key": key,
    "prompt": "Diga: Teste OK",
    "system_instruction": "Responda curto.",
    "stream": True,
    "use_cache": False,
    "use_chunking": False
})
conn.request("POST", "/api/llm/generate", body=payload2, headers={"Content-Type": "application/json"})
resp = conn.getresponse()
print(f"  Status: {resp.status}")
accumulated = ""
chunk_count = 0
while True:
    line = resp.readline()
    if not line:
        break
    decoded = line.decode("utf-8", errors="ignore").strip()
    if decoded.startswith("data: "):
        data_str = decoded[6:].strip()
        if data_str == "[DONE]":
            print("  Got [DONE] marker")
            break
        try:
            chunk = json.loads(data_str)
            if "text" in chunk:
                accumulated += chunk["text"]
                chunk_count += 1
            if "error" in chunk:
                print(f"  ERROR chunk: {chunk['error']}")
        except json.JSONDecodeError:
            pass
print(f"  Chunks: {chunk_count}")
print(f"  Text: {accumulated[:200]}")
conn.close()

# Test 3: Streaming with structured schema
print()
print("=== TEST 3: Streaming with response_schema ===")
conn2 = http.client.HTTPConnection("127.0.0.1", 8085, timeout=60)
payload3 = json.dumps({
    "provider": "gemini",
    "api_key": key,
    "prompt": "Crie uma proposta cultural simples para um festival de teatro.",
    "system_instruction": "Retorne JSON estruturado.",
    "stream": True,
    "use_cache": False,
    "use_chunking": False,
    "response_schema": {
        "type": "OBJECT",
        "properties": {
            "justificativa": {"type": "STRING"},
            "objetivos": {"type": "STRING"}
        },
        "required": ["justificativa", "objetivos"]
    }
})
conn2.request("POST", "/api/llm/generate", body=payload3, headers={"Content-Type": "application/json"})
resp2 = conn2.getresponse()
print(f"  Status: {resp2.status}")
accumulated2 = ""
chunk_count2 = 0
while True:
    line = resp2.readline()
    if not line:
        break
    decoded = line.decode("utf-8", errors="ignore").strip()
    if decoded.startswith("data: "):
        data_str = decoded[6:].strip()
        if data_str == "[DONE]":
            print("  Got [DONE] marker")
            break
        try:
            chunk = json.loads(data_str)
            if "text" in chunk:
                accumulated2 += chunk["text"]
                chunk_count2 += 1
            if "error" in chunk:
                print(f"  ERROR chunk: {chunk['error']}")
        except json.JSONDecodeError:
            pass
print(f"  Chunks: {chunk_count2}")
print(f"  Text preview: {accumulated2[:300]}")
if accumulated2.strip():
    try:
        parsed = json.loads(accumulated2)
        print(f"  JSON parsed OK! Keys: {list(parsed.keys())}")
    except json.JSONDecodeError as e:
        print(f"  JSON parse failed: {e}")
conn2.close()
