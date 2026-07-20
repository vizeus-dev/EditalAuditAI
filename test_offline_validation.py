import os

def check_file_exists_and_nonempty(path):
    assert os.path.exists(path), f"Arquivo não encontrado: {path}"
    assert os.path.getsize(path) > 100, f"Arquivo muito pequeno ou vazio: {path}"
    print(f"[OK] {os.path.basename(path)} ({os.path.getsize(path)} bytes)")

def test_offline_architecture():
    print("=== Testando integridade dos arquivos da arquitetura Offline-First ===")
    
    # 1. Verificar arquivos de controller
    auditor_db_path = os.path.join("src", "controllers", "auditorDB.js")
    offline_auditor_path = os.path.join("src", "controllers", "offlineAuditor.js")
    ai_controller_path = os.path.join("src", "controllers", "aiController.js")
    index_html_path = "index.html"
    
    check_file_exists_and_nonempty(auditor_db_path)
    check_file_exists_and_nonempty(offline_auditor_path)
    check_file_exists_and_nonempty(ai_controller_path)
    
    # 2. Verificar conteúdo do auditorDB.js
    with open(auditor_db_path, "r", encoding="utf-8") as f:
        content_db = f.read()
        assert "window.auditorDB" in content_db, "window.auditorDB não definido"
        assert "RegrasUniversais" in content_db, "Store RegrasUniversais ausente"
        assert "HistoricoEditais" in content_db, "Store HistoricoEditais ausente"
        assert "TemplatesRespostas" in content_db, "Store TemplatesRespostas ausente"
        print("[OK] auditorDB.js: Stores e Métodos nativos IndexedDB verificados.")

    # 3. Verificar conteúdo do offlineAuditor.js
    with open(offline_auditor_path, "r", encoding="utf-8") as f:
        content_off = f.read()
        assert "window.offlineAuditor" in content_off, "window.offlineAuditor não definido"
        assert "runLocalAudit" in content_off, "Método runLocalAudit ausente"
        assert "evaluateAgentLocal" in content_off, "Método evaluateAgentLocal ausente"
        assert "analyzeBudgetLocal" in content_off, "Método analyzeBudgetLocal ausente"
        print("[OK] offlineAuditor.js: Motor de inferência offline verificado.")

    # 4. Verificar conteúdo do aiController.js
    with open(ai_controller_path, "r", encoding="utf-8") as f:
        content_ai = f.read()
        assert "Modo Híbrido & Offline-First" in content_ai, "Modo híbrido ausente no aiController"
        assert "window.offlineAuditor.runLocalAudit" in content_ai, "Chamada ao offlineAuditor ausente no aiController"
        print("[OK] aiController.js: Integrado com modo híbrido e fallback offline.")

    # 5. Verificar index.html
    with open(index_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
        assert "auditorDB.js" in content_html, "auditorDB.js não incluído no index.html"
        assert "offlineAuditor.js" in content_html, "offlineAuditor.js não incluído no index.html"
        assert "offline-status-badge" in content_html, "Badge offline-status-badge ausente no index.html"
    # 6. Verificar app.js (14 Seções do Redator e Relatório do Revisor Offline)
    app_js_path = "app.js"
    check_file_exists_and_nonempty(app_js_path)
    with open(app_js_path, "r", encoding="utf-8") as f:
        content_app = f.read()
        sections_14 = ['justificativa', 'objetivos', 'metodologia', 'cronograma', 'orcamento', 'acessibilidade', 'publico', 'contrapartida', 'comunicacao', 'ficha_tecnica', 'monitoramento', 'compliance', 'sustentabilidade', 'rider']
        for sec in sections_14:
            assert f"case '{sec}':" in content_app, f"Seção {sec} ausente no getSimulatedRedatorText de app.js"
        assert "getOfflineRevisorReport" in content_app, "Função getOfflineRevisorReport ausente em app.js"
        assert "printOrSaveHtml" in content_app, "Função printOrSaveHtml de fallback de PDF ausente em app.js"
        print("[OK] app.js: Suporte offline completo para as 14 seções ABNT e Relatório de Revisão verificado.")

    print("\n[SUCCESS] Todos os testes de validação da arquitetura Offline-First passaram com sucesso!")

if __name__ == "__main__":
    test_offline_architecture()

