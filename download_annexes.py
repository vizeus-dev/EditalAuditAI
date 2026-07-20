import urllib.request
import pypdf
import os

def download_and_parse(url, filename, txt_filename):
    print(f"Downloading from {url}...")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"Download complete: {filename}")
        
        reader = pypdf.PdfReader(filename)
        all_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            all_text.append(f"--- PAGE {i+1} ---\n{text}")
            
        full_text = "\n".join(all_text)
        with open(txt_filename, "w", encoding="utf-8") as f:
            f.write(full_text)
        print(f"Saved text to {txt_filename}")
        print("-" * 40)
    except Exception as e:
        print(f"Error for {filename}: {e}")

def main():
    anexo_7_url = "http://fbb.org.br/wp-content/uploads/2026/05/Anexo-7-Criterio-Tecnicos-de-Pontuacao-Retificado.pdf"
    anexo_8_url = "http://fbb.org.br/wp-content/uploads/2026/05/Anexo-8-Criterios-de-Priorizacao-de-Pontuacao-Retificado.pdf"
    
    download_and_parse(anexo_7_url, "anexo_7.pdf", "anexo_7_text.txt")
    download_and_parse(anexo_8_url, "anexo_8.pdf", "anexo_8_text.txt")

if __name__ == "__main__":
    main()
