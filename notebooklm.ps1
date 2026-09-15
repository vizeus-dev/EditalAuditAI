$notebookLmExe = "c:\Users\victo\.gemini\antigravity-ide\scratch\nativaram-portal\tools\notebooklm-py\.venv\Scripts\notebooklm.exe"
if (Test-Path $notebookLmExe) {
    & $notebookLmExe @args
} else {
    Write-Error "Erro: Executável do NotebookLM não encontrado em '$notebookLmExe'."
}
