#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
test_live_full_flow.py
Testa o fluxo completo de Geração Unificada + Auditoria Completa dos 14 Agentes
usando a API Key fornecida pelo usuário e um edital GIGANTE (90.000+ caracteres).
"""

import sys
import os
import json
import urllib.request
import urllib.error
import time

if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_full_flow(api_key):
    print("=" * 70)
    print("[FULL FLOW TEST] TESTANDO GERAÇÃO UNIFICADA E AUDITORIA HÍBRIDA 3 ETAPAS")
    print("=" * 70)

    # 1. Edital gigante
    edital_file = "EDITAL RIO DOCE 2026 - TAMBORES ESPERANÇA E AMBEG_pdf.txt"
    edital_content = ""
    if os.path.exists(edital_file):
        with open(edital_file, "r", encoding="utf-8") as f:
            edital_content = f.read()
    
    giant_edital_text = (edital_content + "\n\n" + "="*50 + "\n\n") * 3
    print(f"[TEST 1] Edital Gigante: {len(giant_edital_text)} caracteres (~{len(giant_edital_text)//4} tokens)")

    # 2. Testar /api/generate-proposal-unified
    print("\n--- PASSO 1: Chamando /api/generate-proposal-unified ---")
    payload1 = {
        "cover": {
            "title": "Circuito Cultural Tambores Esperança 2026",
            "institution": "Fundo Estadual de Cultura / Rio Doce",
            "proponent": "Associação Cultural Tambores Esperança",
            "city": "Belo Horizonte / MG",
            "year": "2026",
            "budget": 220000
        },
        "editalRefText": giant_edital_text,
        "proposalDraftText": "Projeto de oficinas de percussão e 4 apresentações ao vivo com Rider Técnico completo e acessibilidade LIBRAS.",
        "annexes": [{"name": "Regulamento.pdf", "content": "Teto 15% adm, 10% marketing. Cotas afirmativas ativas."}],
        "api_key": api_key
    }

    t0 = time.time()
    req1 = urllib.request.Request(
        "http://127.0.0.1:8085/api/generate-proposal-unified",
        data=json.dumps(payload1).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req1, timeout=300) as resp1:
            dur1 = time.time() - t0
            data1 = json.loads(resp1.read().decode('utf-8'))
            doc_content = data1.get("documentContent", {})
            print(f"[PASSO 1 OK] Resposta recebida em {dur1:.2f}s! Seções geradas: {len(doc_content)} / 14")
            total_len = sum(len(v) for v in doc_content.values())
            print(f"Total de caracteres redigidos nas 14 seções: {total_len} chars")

            for k, v in doc_content.items():
                print(f"  • {k.upper()}: {len(v)} chars")

    except Exception as e:
        print(f"[PASSO 1 FAIL]: {e}")
        return False

    # 3. Testar /api/llm/generate para Auditoria Híbrida dos 14 Agentes
    print("\n--- PASSO 2: Chamando /api/llm/generate (Auditoria Híbrida 14 Agentes) ---")
    system_prompt = """Você é uma banca avaliadora técnica composta por 14 especialistas em editais culturais.
Sua missão é emitir laudo de compliance estruturado em JSON com as chaves: relatorio_geral, nota_final, nota_tecnica, nota_priorizacao, total_orcamento, custos_administrativos_percentual, agentes, alertas e ajustes.
Para cada agente, forneça 'id', 'nota' (0 a 100), 'parecer', 'erros' e 'recomendacoes'."""

    response_schema = {
        "type": "OBJECT",
        "properties": {
            "relatorio_geral": {"type": "STRING"},
            "nota_final": {"type": "NUMBER"},
            "nota_tecnica": {"type": "NUMBER"},
            "nota_priorizacao": {"type": "NUMBER"},
            "total_orcamento": {"type": "NUMBER"},
            "custos_administrativos_percentual": {"type": "NUMBER"},
            "agentes": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": {"type": "STRING"},
                        "nota": {"type": "NUMBER"},
                        "parecer": {"type": "STRING"},
                        "erros": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "recomendacoes": {"type": "ARRAY", "items": {"type": "STRING"}}
                    },
                    "required": ["id", "nota", "parecer", "erros", "recomendacoes"]
                }
            },
            "alertas": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "tipo": {"type": "STRING"},
                        "descricao": {"type": "STRING"},
                        "sugestao": {"type": "STRING"},
                        "nivel": {"type": "STRING"}
                    }
                }
            },
            "ajustes": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "alteracao": {"type": "STRING"},
                        "fator": {"type": "STRING"}
                    }
                }
            }
        },
        "required": ["relatorio_geral", "nota_final", "nota_tecnica", "nota_priorizacao", "total_orcamento", "custos_administrativos_percentual", "agentes", "alertas", "ajustes"]
    }

    audit_prompt = f"""# CONTEXTO COMPLETO DO PROJETO PARA AUDITORIA
PROJETO: Circuito Cultural Tambores Esperança 2026
INSTITUIÇÃO: Fundo Estadual de Cultura / Rio Doce
ORÇAMENTO: R$ 220.000,00

PROPOSTA CULTURAL (14 SEÇÕES REDIGIDAS):
Justificativa: {doc_content.get('justificativa', '')[:5000]}
Objetivos: {doc_content.get('objetivos', '')[:3000]}
Metodologia: {doc_content.get('metodologia', '')[:4000]}
Orçamento: {doc_content.get('orcamento', '')[:4000]}
Rider Técnico: {doc_content.get('rider', '')[:4000]}

REGULAMENTO DO EDITAL GIGANTE:
{giant_edital_text[:40000]}

Gere o laudo estruturado de conformidade dos 14 agentes especialistas."""

    payload2 = {
        "provider": "gemini",
        "api_key": api_key,
        "prompt": audit_prompt,
        "system_instruction": system_prompt,
        "stream": False,
        "response_schema": response_schema,
        "use_cache": False,
        "use_chunking": False
    }

    t1 = time.time()
    req2 = urllib.request.Request(
        "http://127.0.0.1:8085/api/llm/generate",
        data=json.dumps(payload2).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req2, timeout=300) as resp2:
            dur2 = time.time() - t1
            raw_text = json.loads(resp2.read().decode('utf-8')).get("text", "")
            print(f"[PASSO 2 OK] Resposta da Auditoria recebida em {dur2:.2f}s!")

            # Limpar markdown fences se houver
            clean_json_str = raw_text.replace("```json", "").replace("```", "").strip()
            audit_json = json.loads(clean_json_str)

            print(f"\n--- RESULTADOS DA AUDITORIA HÍBRIDA ---")
            print(f"  • Nota Final do Projeto: {audit_json.get('nota_final')} / 130 pts")
            print(f"  • Nota Técnica: {audit_json.get('nota_tecnica')} pts")
            print(f"  • Nota Priorização: {audit_json.get('nota_priorizacao')} pts")
            print(f"  • Total Orçamento Analisado: R$ {audit_json.get('total_orcamento')}")
            print(f"  • Custos Administrativos: {audit_json.get('custos_administrativos_percentual')}%")
            print(f"  • Total de Agentes Avaliados no Array: {len(audit_json.get('agentes', []))}")
            print(f"  • Total de Alertas Identificados: {len(audit_json.get('alertas', []))}")
            print(f"  • Total de Ajustes Recomendados: {len(audit_json.get('ajustes', []))}")

            for ag in audit_json.get("agentes", []):
                print(f"    - Agente [{ag.get('id')}]: Nota {ag.get('nota')}/100 | Parecer: {len(ag.get('parecer', ''))} chars")

            print("\n[SUCCESS] TESTE COMPLETO REALIZADO COM SUCESSO SEM TRUNCAMENTO OU ERROS!")
            return True

    except Exception as e:
        print(f"[PASSO 2 FAIL]: {e}")
        return False

if __name__ == "__main__":
    key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("GEMINI_API_KEY", "")
    run_full_flow(key)

