# test_encoding_and_profile.py
import sys
import io
from server import fix_double_encoded_utf8, make_reportlab_safe

# Ensure stdout uses utf-8 encoding on Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_encoding_fixes():
    print("[TEST] Iniciar testes de encoding e ReportLab safe...")
    
    # Test 1: Double-encoded UTF-8 Portuguese text ("Captação")
    raw_mojibake = "Capta\u00c3\u00a7\u00c3\u00a3o de Recursos para Projetos Culturais"
    fixed = fix_double_encoded_utf8(raw_mojibake)
    print(f"Original: {raw_mojibake}")
    print(f"Fixed:    {fixed}")
    assert "Captação de Recursos" in fixed, f"Falha na correção de mojibake: {fixed}"

    # Test 2: Smart quotes, dashes and bullets for ReportLab
    word_text = "\u201cProjeto Tambores Esperan\u00e7a\u201d \u2013 Edital Rio Doce \u2022 Acessibilidade em Libras\u2026"
    safe_text = make_reportlab_safe(word_text)
    print(f"Word input: {word_text}")
    print(f"Safe PDF:   {safe_text}")
    assert '"Projeto Tambores Esperança"' in safe_text, f"Falha nas aspas inteligentes: {safe_text}"
    assert " - Edital" in safe_text, f"Falha nos traços: {safe_text}"
    assert " * Acessibilidade" in safe_text, f"Falha nos marcadores: {safe_text}"
    assert "..." in safe_text, f"Falha nas reticências: {safe_text}"

    print("✅ Todos os testes de encoding e ReportLab passaram com 100% de sucesso!")

if __name__ == '__main__':
    test_encoding_fixes()
