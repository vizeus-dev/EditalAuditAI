# ========================================================
# EditalAudit AI v3.0 — Script de Inicializacao PowerShell
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  EditalAudit AI - Portal SaaS (Custo Zero)" -ForegroundColor Yellow
Write-Host "  Motor Hibrido + 14 Pareceristas M.U.S.A. + Supabase" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
if (-not $scriptDir) { $scriptDir = "C:\Users\victo\.gemini\antigravity-ide\scratch\edital-audit" }
Set-Location $scriptDir

# 1. Verifica Python na .venv
$pyExec = Join-Path $scriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $pyExec)) {
    Write-Host "[ERRO] Ambiente virtual Python nao encontrado em: $pyExec" -ForegroundColor Red
    Write-Host "Certifique-se de que a pasta .venv esta presente." -ForegroundColor Red
    pause
    exit 1
}

# 2. Verifica dependências do frontend
if (-not (Test-Path "$scriptDir\web\node_modules")) {
    Write-Host "[AVISO] Dependencias do frontend web nao instaladas. Instalando agora..." -ForegroundColor Yellow
    npm --prefix "$scriptDir\web" install
}

# 3. Inicia o Backend em uma nova janela do PowerShell
Write-Host "[1/2] Iniciando Backend Python (Porta 8085)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir'; & '.\.venv\Scripts\python.exe' server.py"

# 4. Inicia o Frontend Vite
Write-Host "[2/2] Iniciando Frontend React + Vite (Porta 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\web'; npm run dev"

# 4. Aguarda e abre o navegador
Write-Host ""
Write-Host "Abrindo portal no navegador em 3 segundos..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "Concluido! O portal esta online em http://localhost:5173" -ForegroundColor Green
