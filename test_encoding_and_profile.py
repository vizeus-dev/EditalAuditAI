# test_encoding_and_profile.py
import sys
import io
from server import fix_double_encoded_utf8, make_reportlab_safe, clean_html_tags

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

    # Test 3: Emojis and CP1252 undefined control chars (mojibake from Windows-1252)
    emoji_mojibake = "âœ¨ Versão Sugerida pela IA"
    fixed_emoji = fix_double_encoded_utf8(emoji_mojibake)
    print(f"Emoji mojibake input: {emoji_mojibake}")
    print(f"Emoji fixed:         {fixed_emoji}")
    assert "✨ Versão Sugerida pela IA" == fixed_emoji, f"Falha na correção de emoji mojibake: {fixed_emoji}"

    complex_mojibake = "â€œTambores EsperanÃ§aâ€\u009d"
    fixed_complex = fix_double_encoded_utf8(complex_mojibake)
    print(f"Complex mojibake input: {complex_mojibake}")
    print(f"Complex fixed:         {fixed_complex}")
    assert "“Tambores Esperança”" == fixed_complex, f"Falha na correção de mojibake complexo: {fixed_complex}"

    # Test 4: Multi-line HTML Table cleaning in server.py
    html_input = """
    <tr style="background:#f1f5f9; text-align:left;">
      <td>Item 1</td>
      <td>R$ 10.000,00</td>
    </tr>
    """
    cleaned_html = clean_html_tags(html_input)
    print(f"HTML cleanup input: {html_input.strip()}")
    print(f"HTML cleanup output: {cleaned_html.strip()}")
    assert "style=\"background" not in cleaned_html, "Falha: tr style não foi removido!"
    assert "<tr" not in cleaned_html, "Falha: tag tr não foi removida!"
    assert "Item 1" in cleaned_html, "Falha: conteúdo se perdeu!"

    print("✅ Todos os testes de encoding e ReportLab passaram com 100% de sucesso!")

if __name__ == '__main__':
    test_encoding_fixes()
