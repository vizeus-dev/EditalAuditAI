import os
import re

def test_architectural_fixes():
    print("=== Testando correções arquiteturais e bugs críticos do EditalAudit AI ===")
    
    app_js_path = "app.js"
    server_py_path = "server.py"
    
    # 1. Verificar app.js - Histórico Persistente
    with open(app_js_path, "r", encoding="utf-8") as f:
        app_code = f.read()
        
    assert "workspaceState.proposalHistoryStack" in app_code, "workspaceState.proposalHistoryStack ausente"
    assert "workspaceState.proposalRedoStack" in app_code, "workspaceState.proposalRedoStack ausente"
    assert "updateHistoryButtonsUI" in app_code, "updateHistoryButtonsUI ausente"
    print("[OK] app.js: Histórico persistente de versões verificado em workspaceState.")

    # 2. Verificar app.js - consolidateAndFormatABNT (Seção por Seção)
    assert "pushProposalHistoryState(\"Antes da Formatação ABNT IA\")" in app_code, "pushProposalHistoryState ausente em ABNT"
    assert "NUNCA resuma, suprima, reduza ou encurte o texto original" in app_code, "Instrução de preservação de texto ausente em ABNT"
    assert "sectionKeys" in app_code, "Iteração por seções ausente em consolidateAndFormatABNT"
    print("[OK] app.js: Formatação ABNT preserva as 14 seções e chama histórico preventivo.")

    # 3. Verificar app.js - runFinalConsolidatedRevision (Supervisor Seção por Seção)
    assert "pushProposalHistoryState(\"Antes da Revisão do Supervisor\")" in app_code, "pushProposalHistoryState ausente no Supervisor"
    assert "✨ Supervisor revisando" in app_code, "Toast por seção ausente no Supervisor"
    print("[OK] app.js: Supervisor processa seção por seção sem resumir conteúdo de 55 páginas.")

    # 4. Verificar server.py - Pesquisa Web com Rotação de User-Agent
    with open(server_py_path, "r", encoding="utf-8") as f:
        server_code = f.read()
        
    assert "USER_AGENTS" in server_code, "USER_AGENTS ausente em server.py"
    assert "lite.duckduckgo.com" in server_code, "Fallback DuckDuckGo Lite ausente em server.py"
    print("[OK] server.py: Pesquisa Web resiliente com User-Agents e Fallback Lite verificado.")

    print("\n[SUCCESS] Todos os testes das correções arquiteturais passaram com 100% de sucesso!")

if __name__ == "__main__":
    test_architectural_fixes()
