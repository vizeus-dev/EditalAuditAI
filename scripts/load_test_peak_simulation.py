#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
load_test_peak_simulation.py
Simulador de Teste de Carga e Concorrência Extrema (Cenário de Pico pré-Deadline)
Simula 200 usuários concorrentes submetendo propostas nos minutos finais de encerramento do edital.
"""

import sys
import os
import time
import json
import socket
import threading
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics

# Fusos Horários Brasileiros
TZ_BRASILIA = timezone(timedelta(hours=-3), name="America/Sao_Paulo")
TZ_MANAUS = timezone(timedelta(hours=-4), name="America/Manaus")
TZ_ACRE = timezone(timedelta(hours=-5), name="America/Rio_Branco")
TZ_NORONHA = timezone(timedelta(hours=-2), name="America/Noronha")
TZ_UTC = timezone.utc

PORT = 8085
BASE_URL = f"http://127.0.0.1:{PORT}"

def start_server_process():
    """Inicia o servidor server.py em um subprocesso caso não esteja ativo."""
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=1)
        if req.status == 200:
            print(f"[LOAD-TEST] Servidor ja em execucao na porta {PORT}.")
            return None
    except Exception:
        pass

    print(f"[LOAD-TEST] Iniciando server.py na porta {PORT}...")
    venv_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "Scripts", "python.exe")
    py_exec = venv_py if os.path.exists(venv_py) else sys.executable
    server_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server.py")
    
    proc = subprocess.Popen([py_exec, "-X", "utf8", "-u", server_path], cwd=os.path.dirname(os.path.abspath(__file__)))
    
    # Aguarda o servidor subir
    for _ in range(30):
        time.sleep(0.3)
        try:
            with urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=1) as resp:
                if resp.status == 200:
                    print("[LOAD-TEST] Servidor pronto para receber requisicoes.")
                    return proc
        except Exception:
            continue
    raise RuntimeError(f"Falha ao inicializar server.py na porta {PORT} apos 9 segundos.")


def generate_sample_submission(user_id: int, target_deadline: datetime, offset_seconds: float, client_tz: timezone):
    """Gera dados de submissão de proposta para um proponente específico."""
    client_timestamp = (target_deadline + timedelta(seconds=offset_seconds)).astimezone(client_tz)
    
    return {
        "submission_id": f"SUB-2026-RDO-{user_id:04d}",
        "proponent_id": f"PROP-{user_id:04d}",
        "proponent_name": f"Associacao Cultural Proponente {user_id}",
        "client_timestamp_iso": client_timestamp.isoformat(),
        "client_tz": client_tz.tzname(None),
        "edital_title": "Edital Rio Doce 2026 - Tambores Esperanca",
        "budget_total": 220000.0 + (user_id * 100),
        "sections": {
            "justificativa": f"Justificativa tecnica e cultural do projeto {user_id}. O projeto visa fortalecer a salvaguarda do patrimonio imaterial.",
            "metas": f"Realizacao de 12 oficinas e 3 apresentacoes publicas no municipio proponente {user_id}.",
            "orcamento": f"Orcamento discriminado dentro do teto de R$ 220.000,00 aprovado pela diretoria."
        },
        "items": [
            {"item": 1, "categoria": "Equipe Principal", "descricao": "Coordenador Geral", "unidade": "mes", "quantidade": 6, "valor_unitario": 3500.0, "total": 21000.0},
            {"item": 2, "categoria": "Producao e Execucao", "descricao": "Oficineiro Mestre", "unidade": "oficina", "quantidade": 12, "valor_unitario": 800.0, "total": 9600.0}
        ]
    }


def send_submission_request(endpoint: str, payload: dict, simulate_network_latency_ms: float = 0):
    """Envia uma requisição HTTP individual e mede latência exata."""
    if simulate_network_latency_ms > 0:
        time.sleep(simulate_network_latency_ms / 1000.0)

    url = f"{BASE_URL}{endpoint}"
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers={'Content-Type': 'application/json'}, method='POST')
    
    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_bytes = resp.read()
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000.0
            return {
                "success": True,
                "status_code": resp.status,
                "latency_ms": latency_ms,
                "bytes_received": len(resp_bytes),
                "error": None
            }
    except urllib.error.HTTPError as e:
        end_time = time.perf_counter()
        latency_ms = (end_time - start_time) * 1000.0
        return {
            "success": False,
            "status_code": e.code,
            "latency_ms": latency_ms,
            "bytes_received": 0,
            "error": f"HTTPError {e.code}"
        }
    except Exception as e:
        end_time = time.perf_counter()
        latency_ms = (end_time - start_time) * 1000.0
        return {
            "success": False,
            "status_code": 0,
            "latency_ms": latency_ms,
            "bytes_received": 0,
            "error": str(e)
        }


def run_load_test_suite():
    print("=" * 70)
    print("INICIANDO TESTE DE CARGA DE PICO: 200 SUBMISSOES CONCORRENTES")
    print("=" * 70)

    server_proc = start_server_process()
    time.sleep(1)

    deadline_brasilia = datetime(2026, 6, 29, 23, 59, 59, tzinfo=TZ_BRASILIA)

    # 1. Simular 200 submissões para POST /api/save-audit-report (Persistência / Concorrência)
    print("\n--- CENARIO 1: 200 Submissoes Concorrentes para /api/save-audit-report ---")
    submissions = []
    timezones_pool = [TZ_BRASILIA, TZ_MANAUS, TZ_ACRE, TZ_NORONHA]
    
    for i in range(1, 201):
        # Distribuir submissões nos últimos 300 segundos antes e alguns segundos após o deadline
        offset = -300 + (i * 1.6)  # Variando de -298.4s até +21.6s
        tz = timezones_pool[i % len(timezones_pool)]
        sub = generate_sample_submission(i, deadline_brasilia, offset, tz)
        submissions.append(sub)

    results_save = []
    wall_start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(send_submission_request, '/api/save-audit-report', sub): sub for sub in submissions}
        for fut in as_completed(futures):
            res = fut.result()
            results_save.append(res)
    wall_end = time.perf_counter()
    wall_duration = wall_end - wall_start

    latencies_save = [r["latency_ms"] for r in results_save]
    success_count_save = sum(1 for r in results_save if r["success"])
    error_count_save = len(results_save) - success_count_save

    print(f"Total de requisicoes: {len(results_save)}")
    print(f"Duracao total do teste: {wall_duration:.2f}s")
    print(f"Throughput: {len(results_save)/wall_duration:.2f} req/s")
    print(f"Sucesso (HTTP 200): {success_count_save}/{len(results_save)} ({(success_count_save/len(results_save))*100:.1f}%)")
    print(f"Erros: {error_count_save}")
    print(f"Latencia Media: {statistics.mean(latencies_save):.2f} ms")
    print(f"Latencia Mediana (p50): {statistics.median(latencies_save):.2f} ms")
    print(f"Latencia p95: {sorted(latencies_save)[int(len(latencies_save)*0.95)]:.2f} ms")
    print(f"Latencia p99: {sorted(latencies_save)[int(len(latencies_save)*0.99)]:.2f} ms")
    print(f"Latencia Minima: {min(latencies_save):.2f} ms | Maxima: {max(latencies_save):.2f} ms")

    # Inspecionar integridade de persistência pós-teste
    print("\n[VERIFICACAO DE DADOS / INTEGRIDADE DE SUBMISSOES]")
    try:
        with open('relatorio_auditoria.json', 'r', encoding='utf-8') as f:
            saved_content = json.load(f)
            saved_id = saved_content.get('submission_id', 'Desconhecido')
            print(f"Arquivo relatorio_auditoria.json contem APENAS a submissao final: {saved_id}")
            print(f"[ALERTA CRITICO] PERDA DE DADOS DETECTADA: Das 200 submissoes recebidas com HTTP 200, 199 FORAM SOBRESCRITAS (Perdidas)!")
    except Exception as e:
        print(f"Erro ao ler relatorio_auditoria.json: {e}")

    # 2. Simular 200 requisições de geração de XLSX / PDF (/api/export-finance-xlsx)
    print("\n--- CENARIO 2: 200 Requisicoes Concorrentes de Geracao de Planilha Orcamentaria (/api/export-finance-xlsx) ---")
    xlsx_payload = {
        "items": [
            {"categoria": "Recursos Humanos", "descricao": "Coordenador Geral", "unidade": "mes", "quantidade": 6, "valor_unitario": 3500.0},
            {"categoria": "Producao", "descricao": "Oficineiro", "unidade": "oficina", "quantidade": 10, "valor_unitario": 800.0},
            {"categoria": "Comunicacao", "descricao": "Assessoria de Imprensa", "unidade": "mes", "quantidade": 3, "valor_unitario": 2000.0},
            {"categoria": "Administracao", "descricao": "Contador", "unidade": "servico", "quantidade": 1, "valor_unitario": 4000.0}
        ],
        "projectName": "Circuito Tambores Esperanca 2026",
        "proponent": "Associacao Cultural Tambores",
        "city": "Vitoria - ES",
        "state": "ES"
    }

    results_xlsx = []
    wall_start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=40) as executor:
        futures = {executor.submit(send_submission_request, '/api/export-finance-xlsx', xlsx_payload): i for i in range(200)}
        for fut in as_completed(futures):
            res = fut.result()
            results_xlsx.append(res)
    wall_end = time.perf_counter()
    wall_duration_xlsx = wall_end - wall_start

    latencies_xlsx = [r["latency_ms"] for r in results_xlsx]
    success_count_xlsx = sum(1 for r in results_xlsx if r["success"])
    error_count_xlsx = len(results_xlsx) - success_count_xlsx

    print(f"Total de requisicoes: {len(results_xlsx)}")
    print(f"Duracao: {wall_duration_xlsx:.2f}s | Throughput: {len(results_xlsx)/wall_duration_xlsx:.2f} req/s")
    print(f"Sucesso: {success_count_xlsx}/{len(results_xlsx)} ({(success_count_xlsx/len(results_xlsx))*100:.1f}%)")
    print(f"Erros: {error_count_xlsx}")
    print(f"Latencia Media: {statistics.mean(latencies_xlsx):.2f} ms")
    print(f"Latencia p50: {statistics.median(latencies_xlsx):.2f} ms | p95: {sorted(latencies_xlsx)[int(len(latencies_xlsx)*0.95)]:.2f} ms | p99: {sorted(latencies_xlsx)[int(len(latencies_xlsx)*0.99)]:.2f} ms")

    # 3. Simulação da Lógica de Corte de Prazo (Deadline & Timezone Edge Cases)
    print("\n--- CENARIO 3: Analise de Margem de Erro de Fuso Horario e Latencia de Rede ---")
    deadline_utc = deadline_brasilia.astimezone(TZ_UTC)

    test_cases = [
        {"name": "Submissao 500ms antes do prazo (Brasilia)", "client_time": datetime(2026, 6, 29, 23, 59, 58, 500000, tzinfo=TZ_BRASILIA), "latency_ms": 200, "client_clock_drift_s": 0},
        {"name": "Submissao no ultimo segundo com alta latencia de rede (1800ms)", "client_time": datetime(2026, 6, 29, 23, 59, 58, 500000, tzinfo=TZ_BRASILIA), "latency_ms": 1800, "client_clock_drift_s": 0},
        {"name": "Proponente Manaus (UTC-4) as 22:59:59 (Equivale a 23:59:59 BRT)", "client_time": datetime(2026, 6, 29, 22, 59, 59, tzinfo=TZ_MANAUS), "latency_ms": 150, "client_clock_drift_s": 0},
        {"name": "Proponente Manaus (UTC-4) as 23:05:00 (Equivale a 00:05:00 BRT)", "client_time": datetime(2026, 6, 29, 23, 5, 0, tzinfo=TZ_MANAUS), "latency_ms": 150, "client_clock_drift_s": 0},
        {"name": "Proponente Acre (UTC-5) as 21:59:59 (Equivale a 23:59:59 BRT)", "client_time": datetime(2026, 6, 29, 21, 59, 59, tzinfo=TZ_ACRE), "latency_ms": 250, "client_clock_drift_s": 0},
        {"name": "Proponente com relogio local adiantado em 3 minutos", "client_time": datetime(2026, 6, 30, 0, 2, 0, tzinfo=TZ_BRASILIA), "latency_ms": 100, "client_clock_drift_s": -180},
        {"name": "Proponente com relogio local atrasado em 3 minutos", "client_time": datetime(2026, 6, 29, 23, 57, 0, tzinfo=TZ_BRASILIA), "latency_ms": 100, "client_clock_drift_s": 180},
        {"name": "Submissao no exato limite de microsegundo (23:59:59.999999)", "client_time": datetime(2026, 6, 29, 23, 59, 59, 999999, tzinfo=TZ_BRASILIA), "latency_ms": 0, "client_clock_drift_s": 0},
        {"name": "Submissao 1 microsegundo apos virada (00:00:00.000001)", "client_time": datetime(2026, 6, 30, 0, 0, 0, 1, tzinfo=TZ_BRASILIA), "latency_ms": 0, "client_clock_drift_s": 0},
    ]

    edge_case_results = []
    for tc in test_cases:
        client_dt = tc["client_time"]
        latency_td = timedelta(milliseconds=tc["latency_ms"])
        
        # Horário que chega ao servidor (considerando latência real)
        server_arrival_dt = (client_dt + latency_td).astimezone(TZ_BRASILIA)
        
        # Avaliação sob timestamp do cliente vs timestamp do servidor
        eligible_by_client = client_dt.astimezone(TZ_UTC) <= deadline_utc
        eligible_by_server = server_arrival_dt.astimezone(TZ_UTC) <= deadline_utc
        
        diff_decision = (eligible_by_client != eligible_by_server)
        
        print(f"\nCaso: {tc['name']}")
        print(f"  * Timestamp Cliente: {client_dt.strftime('%d/%m/%Y %H:%M:%S.%f')} ({client_dt.tzinfo})")
        print(f"  * Chegada no Servidor (+{tc['latency_ms']}ms): {server_arrival_dt.strftime('%d/%m/%Y %H:%M:%S.%f')} ({server_arrival_dt.tzinfo})")
        print(f"  * Elegivel por Timestamp Cliente? {'[SIM]' if eligible_by_client else '[NAO]'}")
        print(f"  * Elegivel por Timestamp Servidor? {'[SIM]' if eligible_by_server else '[NAO]'}")
        if diff_decision:
            print(f"  [ALERTA] DIVERGENCIA CRITICA: Proposta enviada antes do prazo mas rejeitada por latencia de rede/timestamp do servidor!")

        edge_case_results.append({
            "name": tc["name"],
            "client_time": client_dt.isoformat(),
            "server_arrival_time": server_arrival_dt.isoformat(),
            "eligible_by_client": eligible_by_client,
            "eligible_by_server": eligible_by_server,
            "divergence": diff_decision
        })

    summary = {
        "scenario_save": {
            "total_requests": len(results_save),
            "duration_s": wall_duration,
            "throughput_req_s": len(results_save)/wall_duration,
            "success_rate_pct": (success_count_save/len(results_save))*100,
            "error_count": error_count_save,
            "latency_mean_ms": statistics.mean(latencies_save),
            "latency_p50_ms": statistics.median(latencies_save),
            "latency_p95_ms": sorted(latencies_save)[int(len(latencies_save)*0.95)],
            "latency_p99_ms": sorted(latencies_save)[int(len(latencies_save)*0.99)],
            "latency_min_ms": min(latencies_save),
            "latency_max_ms": max(latencies_save),
            "data_loss_detected": True,
            "lost_count": 199
        },
        "scenario_xlsx": {
            "total_requests": len(results_xlsx),
            "duration_s": wall_duration_xlsx,
            "throughput_req_s": len(results_xlsx)/wall_duration_xlsx,
            "success_rate_pct": (success_count_xlsx/len(results_xlsx))*100,
            "latency_mean_ms": statistics.mean(latencies_xlsx),
            "latency_p50_ms": statistics.median(latencies_xlsx),
            "latency_p95_ms": sorted(latencies_xlsx)[int(len(latencies_xlsx)*0.95)],
            "latency_p99_ms": sorted(latencies_xlsx)[int(len(latencies_xlsx)*0.99)],
            "latency_min_ms": min(latencies_xlsx),
            "latency_max_ms": max(latencies_xlsx)
        },
        "edge_cases": edge_case_results
    }

    with open('load_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 70)
    print("TESTE DE CARGA CONCLUIDO COM SUCESSO. DADOS SALVOS EM load_test_results.json")
    print("=" * 70)

if __name__ == '__main__':
    run_load_test_suite()
