@echo off
title EditalAudit AI - Encerrar Servidor
cd /d "%~dp0"

powershell -NoProfile -Command "$procs = Get-NetTCPConnection -LocalPort 8085 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($procs) { foreach ($p in $procs) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host ('[OK] Processo finalizado PID: ' + $p); } } else { Write-Host '[i] Nenhum servidor rodando na porta 8085.'; }"
exit /b 0
