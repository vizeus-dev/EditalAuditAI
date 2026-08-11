import os
import sys
import time
import json
import urllib.request
import urllib.error
import subprocess
import shutil

PORT = 8085
BASE_URL = f"http://127.0.0.1:{PORT}"
HEALTH_URL = f"{BASE_URL}/api/health"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def get_server_health():
    """
    Verifica a saúde do backend em /api/health.
    Retorna o dicionário de status ou None se inativo/travado.
    """
    try:
        req = urllib.request.Request(HEALTH_URL, headers={'User-Agent': 'EditalAuditLauncher/3.0'})
        with urllib.request.urlopen(req, timeout=1.2) as response:
            if response.status == 200:
                return json.loads(response.read().decode('utf-8'))
    except Exception:
        pass
    return None

def kill_stale_port_processes():
    """
    Finaliza qualquer processo zumbi ou travado que esteja segurando a porta 8085.
    """
    if os.name == 'nt':
        ps_cmd = (
            "$procs = Get-NetTCPConnection -LocalPort 8085 -State Listen -ErrorAction SilentlyContinue | "
            "Select-Object -ExpandProperty OwningProcess -Unique; "
            "if ($procs) { foreach ($p in $procs) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }"
        )
        try:
            subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, timeout=5)
            time.sleep(0.5)
        except Exception:
            pass

def get_latest_code_mtime():
    """
    Obtém a data de modificação mais recente dos arquivos de código do projeto.
    """
    max_mtime = 0
    for root, _, files in os.walk(SCRIPT_DIR):
        if any(ign in root for ign in ['.venv', '__pycache__', '.git']):
            continue
        for f in files:
            if f.endswith(('.py', '.html', '.css', '.js')):
                fp = os.path.join(root, f)
                try:
                    mt = os.path.getmtime(fp)
                    if mt > max_mtime:
                        max_mtime = mt
                except OSError:
                    pass
    return max_mtime

def start_server():
    health = get_server_health()
    latest_code_time = get_latest_code_mtime()

    # Se o servidor já estiver rodando, verifica se o código foi atualizado após a inicialização dele
    if health and health.get("status") == "healthy":
        server_start = health.get("server_start_time", 0)
        
        # Se houve atualização massiva de código após a inicialização do servidor, reinicia-o
        if latest_code_time > (server_start + 1.0):
            print("[>] Atualização de código detectada na IDE. Reiniciando servidor para aplicar alterações...")
            try:
                urllib.request.urlopen(f"{BASE_URL}/api/restart", timeout=1.0)
                time.sleep(1.0)
            except Exception:
                kill_stale_port_processes()
        else:
            print("[*] Servidor EditalAudit AI ativo e 100% atualizado na porta 8085.")
            return True

    # Se não estiver saudável ou estiver travado, limpa portas zumbis
    if not get_server_health():
        kill_stale_port_processes()

    print("[>] Inicializando backend Python em segundo plano...")
    
    # Identifica interpretador Python (venv ou global)
    venv_pyw = os.path.join(SCRIPT_DIR, ".venv", "Scripts", "pythonw.exe")
    venv_py = os.path.join(SCRIPT_DIR, ".venv", "Scripts", "python.exe")
    
    if os.path.exists(venv_pyw):
        py_exec = venv_pyw
    elif os.path.exists(venv_py):
        py_exec = venv_py
    else:
        py_exec = sys.executable or "python"

    log_path = os.path.join(SCRIPT_DIR, "server_run.log")
    server_py = os.path.join(SCRIPT_DIR, "server.py")

    with open(log_path, "a", encoding="utf-8") as log_file:
        log_file.write(f"\n--- Sessão Iniciada em {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")

    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"

    # Start detached daemon process on Windows
    if os.name == 'nt':
        CREATE_NO_WINDOW = 0x08000000
        DETACHED_PROCESS = 0x00000008
        CREATE_BREAKAWAY_FROM_JOB = 0x01000000
        flags = CREATE_NO_WINDOW | DETACHED_PROCESS | CREATE_BREAKAWAY_FROM_JOB
        try:
            with open(log_path, "a", encoding="utf-8") as out:
                subprocess.Popen(
                    [py_exec, "-X", "utf8", "-u", server_py],
                    cwd=SCRIPT_DIR,
                    env=env,
                    stdout=out,
                    stderr=subprocess.STDOUT,
                    creationflags=flags
                )
        except Exception:
            flags = CREATE_NO_WINDOW | DETACHED_PROCESS
            with open(log_path, "a", encoding="utf-8") as out:
                subprocess.Popen(
                    [py_exec, "-X", "utf8", "-u", server_py],
                    cwd=SCRIPT_DIR,
                    env=env,
                    stdout=out,
                    stderr=subprocess.STDOUT,
                    creationflags=flags
                )
    else:
        with open(log_path, "a", encoding="utf-8") as out:
            subprocess.Popen([py_exec, "-X", "utf8", "-u", server_py], cwd=SCRIPT_DIR, env=env, stdout=out, stderr=subprocess.STDOUT)

    # Aguarda o servidor responder na rota de saúde (até 6 segundos)
    for _ in range(30):
        time.sleep(0.2)
        if get_server_health():
            print("[+] Backend conectado e saudável!")
            return True

    print("[!] Backend em fase de inicialização, abrindo interface...")
    return True

def open_app_window():
    # Detecta Chrome ou Edge para Modo Aplicativo Desktop (janela nativa sem barra de endereços)
    chrome_paths = [
        shutil.which("chrome"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
    ]
    
    edge_paths = [
        shutil.which("msedge"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
    ]

    for p in chrome_paths:
        if p and os.path.exists(p):
            print(f"[>] Abrindo em Modo Aplicativo Desktop (Chrome)...")
            subprocess.Popen([p, f"--app={BASE_URL}", "--disable-extensions"])
            return

    for p in edge_paths:
        if p and os.path.exists(p):
            print(f"[>] Abrindo em Modo Aplicativo Desktop (Edge)...")
            subprocess.Popen([p, f"--app={BASE_URL}"])
            return

    # Fallback para navegador padrão
    print(f"[>] Abrindo no navegador padrão...")
    if os.name == 'nt':
        os.startfile(BASE_URL)
    else:
        import webbrowser
        webbrowser.open(BASE_URL)

def main():
    os.chdir(SCRIPT_DIR)
    start_server()
    open_app_window()

if __name__ == "__main__":
    main()
