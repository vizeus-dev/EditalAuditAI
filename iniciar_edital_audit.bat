@echo off
:: Navega para o diretório do projeto
cd /d "c:\Users\victo\.gemini\antigravity-ide\scratch\edital-audit"

:: Verifica se a porta 8085 já está em uso (servidor já rodando)
netstat -ano | findstr /R "8085.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo Servidor ja esta em execucao na porta 8085.
) else (
    echo Iniciando o servidor Python...
    start cmd /k "set PYTHONUTF8=1& .\.venv\Scripts\python.exe -X utf8 -u server.py > server_run.log 2>&1"
    :: Aguarda 2 segundos para o servidor inicializar
    ping 127.0.0.1 -n 3 >nul
)

echo Abrindo o navegador em http://127.0.0.1:8085...
:: Abre o navegador padrão no endereço do servidor
start "" "http://127.0.0.1:8085"
