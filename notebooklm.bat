@echo off
set "NOTEBOOKLM_EXE=c:\Users\victo\.gemini\antigravity-ide\scratch\nativaram-portal\tools\notebooklm-py\.venv\Scripts\notebooklm.exe"
if exist "%NOTEBOOKLM_EXE%" (
    "%NOTEBOOKLM_EXE%" %*
) else (
    echo Erro: executavel notebooklm.exe nao encontrado no caminho do ambiente virtual.
    exit /b 1
)
