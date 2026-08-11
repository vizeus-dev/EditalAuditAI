@echo off
title EditalAudit AI - Enterprise Launcher
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
) else (
    set "PY_CMD=python"
)

"%PY_CMD%" launcher.py
exit /b 0
