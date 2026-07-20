import urllib.request
import pypdf
import os

def download_and_parse():
    pdf_url = "https://fbb.org.br/wp-content/uploads/2026/05/Edital-Rio-Doce-Participativo-e-Comunitario-Chamada-Publica-no-2026-011-Retificado-1.pdf"
    pdf_path = "edital.pdf"
    
    print(f"Downloading from {pdf_url}...")
    try:
        # Download the file
        urllib.request.urlretrieve(pdf_url, pdf_path)
        print("Download complete.")
        
        # Parse it
        reader = pypdf.PdfReader(pdf_path)
        print(f"Total pages: {len(reader.pages)}")
        
        # Extract and write all text to a file for review
        all_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            all_text.append(f"--- PAGE {i+1} ---\n{text}")
            
        full_text = "\n".join(all_text)
        with open("edital_rules.txt", "w", encoding="utf-8") as f:
            f.write(full_text)
        print("Saved edital text to edital_rules.txt")
        
        # Print basic stats or search for budget limits
        for keyword in ["25%", "teto", "máxima", "gestão", "administração", "equipamento", "Libras", "município", "anexo"]:
            count = full_text.lower().count(keyword.lower())
            print(f"Keyword '{keyword}' appears {count} times.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    download_and_parse()
