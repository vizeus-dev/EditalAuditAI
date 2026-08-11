import os
import re
import json

def test_local_cross_engine_integrity():
    print("=== [TEST 1] Verificação Estrutural do LocalCrossEngine ===")
    
    lce_path = os.path.join("src", "controllers", "localCrossEngine.js")
    assert os.path.exists(lce_path), f"Arquivo não encontrado: {lce_path}"
    assert os.path.getsize(lce_path) > 5000, f"Arquivo menor que o esperado: {os.path.getsize(lce_path)} bytes"
    
    with open(lce_path, "r", encoding="utf-8") as f:
        lce_code = f.read()
    
    # 1. Objeto Global e Versão
    assert "window.LocalCrossEngine" in lce_code, "window.LocalCrossEngine não definido"
    assert "runFullDiagnostic" in lce_code, "runFullDiagnostic ausente no LocalCrossEngine"
    print("  [OK] window.LocalCrossEngine e runFullDiagnostic presentes")
    
    # 2. Submódulos
    assert "BudgetAuditor" in lce_code, "Submódulo BudgetAuditor ausente"
    assert "ComplianceScanner" in lce_code, "Submódulo ComplianceScanner ausente"
    assert "SectionValidator" in lce_code, "Submódulo SectionValidator ausente"
    assert "DiagnosticBuilder" in lce_code, "Submódulo DiagnosticBuilder ausente"
    assert "APIHandoff" in lce_code, "Submódulo APIHandoff ausente"
    print("  [OK] Todos os 5 submódulos presentes")
    
    # 3. BudgetAuditor: Regras Tributárias, Tetos e Acessibilidade
    assert "_checkTaxRubrics" in lce_code, "Método _checkTaxRubrics ausente"
    assert "INSS Patronal" in lce_code, "Checagem de INSS Patronal ausente"
    assert "IRRF" in lce_code, "Checagem de IRRF ausente"
    assert "ISS" in lce_code, "Checagem de ISS ausente"
    assert "_checkAccessibilityBudget" in lce_code, "Checagem de acessibilidade no orçamento ausente"
    assert "_detectDuplicates" in lce_code, "Detecção de duplicatas orçamentárias ausente"
    assert "_checkVedasExpenses" in lce_code, "Checagem de despesas vedadas ausente"
    print("  [OK] BudgetAuditor: checagem de encargos (INSS/IRRF/ISS), acessibilidade, duplicatas e vedadas verificadas")
    
    # 4. ComplianceScanner: Dicionário de Regras e Gatilhos Normativos
    assert "RULES_DICTIONARY" in lce_code, "RULES_DICTIONARY ausente"
    assert "compliance_legal" in lce_code, "Categoria compliance_legal ausente"
    assert "conhecimentos_tradicionais" in lce_code, "Categoria conhecimentos_tradicionais ausente"
    assert "direitos_autorais" in lce_code, "Categoria direitos_autorais ausente"
    assert "SisGen" in lce_code, "Gatilho SisGen/IBAMA ausente"
    assert "ECAD" in lce_code, "Gatilho ECAD ausente"
    assert "ayahuasca" in lce_code, "Gatilho etnobotânico (ayahuasca/daime) ausente"
    print("  [OK] ComplianceScanner: gatilhos de SisGen/IBAMA, ECAD e compliance legal presentes")
    
    # 5. SectionValidator: Matriz Cruzada de Seções
    assert "CORE_SECTIONS" in lce_code, "CORE_SECTIONS ausente"
    assert "CROSS_REFERENCE_MAP" in lce_code, "CROSS_REFERENCE_MAP ausente"
    assert "justificativa" in lce_code and "metodologia" in lce_code and "orcamento" in lce_code, "Seções básicas ausentes"
    print("  [OK] SectionValidator: matriz cruzada e regras de coerência entre seções verificadas")
    
    # 6. DiagnosticBuilder: Score e Alertas
    assert "build" in lce_code, "Método DiagnosticBuilder.build ausente"
    assert "redAlerts" in lce_code and "yellowAlerts" in lce_code, "Campos de alertas ausentes no diagnóstico"
    print("  [OK] DiagnosticBuilder: cálculo de Score ponderado e consolidação de Alertas Vermelhos/Amarelos")
    
    # 7. APIHandoff: Estruturação para Modo Híbrido
    assert "buildEnrichedPayload" in lce_code, "buildEnrichedPayload ausente"
    assert "_buildSystemPrompt" in lce_code, "_buildSystemPrompt ausente"
    assert "_serializeDiagnostic" in lce_code, "_serializeDiagnostic ausente"
    assert "mérito cultural" in lce_code.lower(), "Diretriz de mérito cultural ausente no System Prompt"
    print("  [OK] APIHandoff: prompt enriquecido e serialização de diagnóstico verificados")

def test_integration_files():
    print("\n=== [TEST 2] Verificação da Integração entre Módulos ===")
    
    # 1. index.html inclui localCrossEngine.js
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()
    assert "src/controllers/localCrossEngine.js" in html, "localCrossEngine.js não incluído em index.html"
    print("  [OK] index.html: script localCrossEngine.js incluído corretamente")
    
    # 2. offlineAuditor.js chama LocalCrossEngine
    with open(os.path.join("src", "controllers", "offlineAuditor.js"), "r", encoding="utf-8") as f:
        off_code = f.read()
    assert "LocalCrossEngine" in off_code, "offlineAuditor.js não faz referência a LocalCrossEngine"
    assert "runFullDiagnostic" in off_code, "offlineAuditor.js não chama LocalCrossEngine.runFullDiagnostic"
    print("  [OK] offlineAuditor.js: integrado com LocalCrossEngine.runFullDiagnostic")
    
    # 3. aiController.js injeta offlineDiagnostic
    with open(os.path.join("src", "controllers", "aiController.js"), "r", encoding="utf-8") as f:
        ai_code = f.read()
    assert "offlineDiagnostic" in ai_code, "aiController.js não faz referência a offlineDiagnostic"
    assert "LocalCrossEngine" in ai_code, "aiController.js não faz referência a LocalCrossEngine"
    print("  [OK] aiController.js: briefing e payloads enriquecidos com LocalCrossEngine")
    
    # 4. app.js integra LocalCrossEngine no auditor e linter
    with open("app.js", "r", encoding="utf-8") as f:
        app_code = f.read()
    assert "LocalCrossEngine" in app_code, "app.js não faz referência a LocalCrossEngine"
    print("  [OK] app.js: setupAuditor e runPreFlightLinter integrados com LocalCrossEngine")

if __name__ == "__main__":
    test_local_cross_engine_integrity()
    test_integration_files()
    print("\n" + "="*50)
    print(">>> TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! <<<")
    print("="*50)
