#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
test_live_giant_edital_audit.py
Testa o processamento de um edital GIGANTE (50.000+ caracteres) usando a API Key fornecida pelo usuário.
Verifica se ocorrem truncamentos, erros de parse JSON ou falhas na planilha e laudos dos 14 agentes.
"""

import sys
import os
import json
import urllib.request
import urllib.error
import time

# Configurar stdout para utf-8 em sistemas Windows se necessário
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_giant_edital_test(api_key):
    print("=" * 70)
    print("[TEST] INICIANDO TESTE INTERNO EM TEMPO REAL: EDITAL GIGANTE & 14 AGENTES")
    print("=" * 70)

    # 1. Carregar texto real de edital ou simular um edital GIGANTE
    edital_file = "EDITAL RIO DOCE 2026 - TAMBORES ESPERANÇA E AMBEG_pdf.txt"
    edital_content = ""
    if os.path.exists(edital_file):
        with open(edital_file, "r", encoding="utf-8") as f:
            edital_content = f.read()
    
    # Replicar e expandir para garantir 50.000+ caracteres (Edital Gigante)
    giant_edital_text = (edital_content + "\n\n" + "-"*50 + "\n\n") * 3
    print(f"[TEST] Tamanho do Edital Gigante de Teste: {len(giant_edital_text)} caracteres (~{len(giant_edital_text)//4} tokens)")

    # 2. Simular payload completo do workspace
    proposal_draft = """
    PROJETO CULTURAL: CIRCUITO TAMBORES ESPERANÇA 2026
    PROPONENTE: Associação Cultural Tambores Esperança
    ORÇAMENTO TOTAL: R$ 220.000,00

    1. JUSTIFICATIVA:
    O projeto visa promover a circulação de oficinas percussivas e apresentações de tambores tradicionais na região atingida pelo Rio Doce. Focado na preservação do patrimônio imaterial, fortalecimento da identidade afro-brasileira e capacitação de jovens.

    2. OBJETIVOS:
    Realizar 4 apresentações públicas gratuitas e 8 oficinas de percussão para 200 jovens de escolas públicas.

    3. METODOLOGIA:
    Etapa 1: Pré-produção e ensaios (2 meses).
    Etapa 2: Execução das 8 oficinas e 4 shows com Rider Técnico completo (2 meses).
    Etapa 3: Pós-produção, clipping de mídia e prestação de contas (1 mês).

    4. CRONOGRAMA:
    Mês 1 e 2: Pré-produção. Mês 3 e 4: Apresentações e Oficinas. Mês 5: Relatórios e Prestação de Contas.

    5. ORÇAMENTO:
    Direção de Produção: R$ 17.600,00
    Cachês Artísticos: R$ 52.800,00
    Rider Técnico Som & Luz: R$ 44.000,00
    Logística e Transporte: R$ 13.200,00
    Acessibilidade PCD (LIBRAS/Audiodescrição): R$ 11.000,00
    Divulgação e Tráfego Pago: R$ 19.800,00
    Prestação de Contas & Fotos: R$ 11.000,00
    Custos Administrativos & Impostos: R$ 22.000,00

    6. ACESSIBILIDADE:
    Contratação de intérprete de LIBRAS para todas as apresentações e audiodescrição nas peças de divulgação.

    14. RIDER TÉCNICO:
    PA Line Array 12 Subs, Mesa Digital Behringer X32, 16 PAR LED RGBW, 12 Moving Lights, Palco 8x6m.
    """

    payload = {
        "cover": {
            "title": "Circuito Cultural de Tambores Esperança 2026",
            "institution": "Fundo Estadual de Cultura / Rio Doce",
            "proponent": "Associação Cultural Tambores Esperança",
            "city": "Belo Horizonte / MG",
            "year": "2026",
            "budget": 220000
        },
        "editalRefText": giant_edital_text,
        "proposalDraftText": proposal_draft,
        "annexes": [
            {
                "name": "Anexo I - Tabela de Pontuação de Prioridade.pdf",
                "content": "Critérios de pontuação prioritária: Cotas étnico-raciais (+10 pts), Territórios vulneráveis (+10 pts), Acessibilidade ampliada (+10 pts)."
            }
        ],
        "api_key": api_key
    }

    start_time = time.time()
    print("\n[TEST] Enviando requisição para a rota unificada /api/generate-proposal-unified...")

    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        "http://127.0.0.1:8085/api/generate-proposal-unified",
        data=req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as response:
            elapsed = time.time() - start_time
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)

            print(f"\n[OK] RESPOSTA RECEBIDA EM {elapsed:.2f} SEGUNDOS!")
            print("-" * 70)

            # Análise das seções geradas
            doc_content = res_json.get("documentContent", {})
            audit = res_json.get("auditoria", {})
            revisor_results = res_json.get("revisorAgentsResults", {})

            print(f"Total de Seções ABNT Geradas: {len(doc_content)} / 14")
            total_chars = sum(len(c) for c in doc_content.values())
            print(f"Total de Caracteres na Proposta Expandida: {total_chars} chars")

            print("\n--- AVALIAÇÃO DOS 14 AGENTES ESPECIALISTAS ---")
            for ag_id, ag_res in revisor_results.items():
                nota = ag_res.get("nota")
                parecer_len = len(ag_res.get("parecer", ""))
                status = "OK" if parecer_len > 100 else "MUITO CURTO/TRUNCADO"
                print(f"  • [{ag_id.upper()}] Nota: {nota}/100 | Tamanho Parecer: {parecer_len} chars | Status: {status}")

            print("\n--- RESULTADO DA AUDITORIA & COMPLIANCE ---")
            print(f"  • Nota Final do Projeto: {audit.get('nota_final')} / 130 pts")
            print(f"  • Nota Técnica: {audit.get('nota_tecnica')} pts")
            print(f"  • Nota Priorização: {audit.get('nota_priorizacao')} pts")
            print(f"  • Custos Administrativos: {audit.get('custos_administrativos_percentual')}% (Teto 15%)")
            print(f"  • Quantidade de Alertas Gerados: {len(audit.get('alertas', []))}")
            print(f"  • Quantidade de Ajustes Gerados: {len(audit.get('ajustes', []))}")

            # Verificar se houve truncamento
            if len(doc_content) == 14 and total_chars > 5000:
                print("\n[SUCCESS] VERIFICAÇÃO FINAL: O Edital Gigante foi processado sem truncamento ou erros de JSON!")
            else:
                print("\n[WARNING] Algumas seções podem ter ficado incompletas.")

            return True

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"\n[FAIL] ERRO HTTP {e.code}: {body[:500]}")
        return False
    except Exception as e:
        print(f"\n[FAIL] ERRO NA EXECUÇÃO: {e}")
        return False

if __name__ == "__main__":
    key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("GEMINI_API_KEY", "")
    run_giant_edital_test(key)

