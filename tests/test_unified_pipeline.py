#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script for the unified proposal generation backend API route.
"""

import sys
import os
import json
import urllib.request
import urllib.error

def run_test(api_key):
    print("=== TESTE DA API UNIFICADA DE GERAÇÃO DE PROPOSTA ===")
    
    # 1. Carregar dados de teste locais
    edital_path = "EDITAL RIO DOCE 2026 - TAMBORES ESPERANÇA E AMBEG_pdf.txt"
    edital_text = ""
    if os.path.exists(edital_path):
        with open(edital_path, "r", encoding="utf-8") as f:
            edital_text = f.read()
    else:
        edital_text = "Edital de teste para fomento cultural de até R$ 250.000,00."
    
    # Payload mockado de workspaceState
    payload = {
        "cover": {
            "title": "Circuito Cultural de Tambores Esperança",
            "institution": "Rio Doce 2026",
            "proponent": "Associação de Tambores Esperança",
            "city": "Belo Horizonte / MG",
            "year": "2026",
            "budget": 220000
        },
        "editalRefText": edital_text[:10000], # Limitar tamanho para o teste ser rápido
        "proposalDraftText": "Queremos fazer oficinas de tambor e apresentações culturais.",
        "annexes": [
            {
                "name": "Anexo de Proposta Técnica",
                "content": "Requisitos de cronograma e metas de público mínimas."
            }
        ],
        "historicalMemories": [
            {
                "date": "2025-10-10",
                "project": "Tambores e Ritmos",
                "activity": "Oficinas em escolas públicas"
            }
        ],
        "api_key": api_key,
        "model": "gemini-2.0-flash"
    }

    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(payload).encode('utf-8')
    
    req = urllib.request.Request(
        "http://127.0.0.1:8085/api/generate-proposal-unified",
        data=req_data,
        headers=headers,
        method="POST"
    )
    
    try:
        print("[TEST] Enviando requisição para http://127.0.0.1:8085/api/generate-proposal-unified...")
        with urllib.request.urlopen(req, timeout=180) as response:
            res_json = json.loads(response.read().decode('utf-8'))
            
            print("[TEST] Resposta recebida com sucesso!")
            
            # Verificar se as chaves principais estão presentes
            doc_content = res_json.get("documentContent", {})
            audit = res_json.get("auditoria", {})
            
            print("\n--- SEÇÕES DA PROPOSTA GERADAS ---")
            for sec_key, content in doc_content.items():
                print(f"-> {sec_key.upper()}: {len(content)} caracteres")
                
            print("\n--- LAUDO DE COMPLIANCE / AUDITORIA ---")
            print(f"Nota Final: {audit.get('nota_final')}")
            print(f"Total Orçamento: R$ {audit.get('total_orcamento')}")
            print(f"Custos Administrativos: {audit.get('custos_administrativos_percentual')}%")
            print(f"Alertas: {len(audit.get('alertas', []))}")
            print(f"Ajustes: {len(audit.get('ajustes', []))}")
            print(f"Agentes de Conformidade executados: {[ag.get('id') for ag in audit.get('agentes', [])]}")
            
            print("\n[SUCCESS] Teste concluído com sucesso!")
            
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[TEST][FAIL] Erro HTTP {e.code}: {body}")
        sys.exit(1)
    except Exception as e:
        print(f"[TEST][FAIL] Erro na execução do teste: {e}")
        sys.exit(1)

if __name__ == "__main__":
    api_key = sys.argv[1] if len(sys.argv) > 1 else ""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY", "")
    
    if not api_key:
        print("Erro: Forneça a chave de API como argumento ou defina a variável GEMINI_API_KEY.")
        sys.exit(1)
        
    run_test(api_key)
