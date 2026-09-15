@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title EditalAudit AI - Portal SaaS Launcher

echo ========================================================
echo   EditalAudit AI v3.0 - Portal SaaS (Custo Zero)
echo   Motor Hibrido + 14 Pareceristas M.U.S.A. + Supabase
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"
set "PY_EXEC=%ROOT_DIR%.venv\Scripts\python.exe"

if not exist "%PY_EXEC%" (
    echo [ERRO] Ambiente virtual Python nao encontrado em:
    echo        %PY_EXEC%
    echo.
    echo Por favor, certifique-se de que a pasta .venv esta presente.
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%web\node_modules" (
    echo [AVISO] Dependencias do frontend web nao instaladas.
    echo Instalando dependencias do web - aguarde alguns segundos...
    npm --prefix "%ROOT_DIR%web" install
)

echo [1/2] Iniciando Servidor Backend Python na porta 8085...
start "EditalAudit Backend (Porta 8085)" /d "%ROOT_DIR%" cmd /k ""%PY_EXEC%" server.py"

echo [2/2] Iniciando Servidor Frontend Vite na porta 5173...
start "EditalAudit Frontend (Porta 5173)" /d "%ROOT_DIR%web" cmd /k "npm run dev"

echo.
echo ========================================================
echo   Servidores inicializados com sucesso!
echo   Aguardando 3 segundos e abrindo o navegador...
echo ========================================================
echo.

ping 127.0.0.1 -n 4 > nul 2>&1
start http://localhost:5173

echo O portal esta pronto para uso!
echo Voce pode minimizar esta janela.
ping 127.0.0.1 -n 4 > nul 2>&1
exit /b 0
