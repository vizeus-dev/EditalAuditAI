import os
import glob

# Let's see if we can import common PDF libraries
def extract_text_from_pdf(pdf_path):
    # Try PyPDF/pypdf first
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except ImportError:
        pass
        
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except ImportError:
        pass

    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except ImportError:
        pass

    try:
        from pdfminer.high_level import extract_text
        return extract_text(pdf_path)
    except ImportError:
        pass

    return None

def main():
    pdf_files = glob.glob(r"C:\Users\victo\Downloads\*.pdf")
    for pdf_path in pdf_files:
        print(f"Checking PDF: {os.path.basename(pdf_path)}")
        text = extract_text_from_pdf(pdf_path)
        if text is None:
            print("  No PDF parsing library available or failed.")
            continue
        
        # Search for keyword
        for word in ["edital", "teto", "regras", "Fundão", "reparação", "250.000", "250k"]:
            count = text.lower().count(word.lower())
            if count > 0:
                print(f"  Keyword '{word}' found {count} times.")
                # print a snippet
                idx = text.lower().find(word.lower())
                start = max(0, idx - 100)
                end = min(len(text), idx + 200)
                print(f"    Snippet: ...{text[start:end].replace(chr(10), ' ')}...")
                
        # Write to txt file for convenience
        txt_path = pdf_path + ".txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  Saved full text to {txt_path}")

if __name__ == "__main__":
    main()
