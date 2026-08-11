import os
import glob
import zipfile
import xml.etree.ElementTree as ET

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            paragraphs = []
            for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs)
    except Exception:
        return ""

def read_pdf(file_path):
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception:
        return ""

def main():
    dirs = [
        r"C:\Users\victo\Downloads",
        r"C:\Users\victo\Documents",
        r"C:\Users\victo\Desktop"
    ]
    
    keywords = ["edital", "regulamento", "teto", "BB", "Fundação Banco do Brasil", "250.000", "250k"]
    
    for d in dirs:
        print(f"Scanning directory: {d}")
        for ext in ["*.pdf", "*.docx", "*.txt", "*.md"]:
            for file_path in glob.glob(os.path.join(d, ext)):
                text = ""
                if file_path.endswith(".docx"):
                    text = read_docx(file_path)
                elif file_path.endswith(".pdf"):
                    text = read_pdf(file_path)
                elif file_path.endswith((".txt", ".md")):
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            text = f.read()
                    except Exception:
                        pass
                
                if not text:
                    continue
                
                # Check for keywords
                found_kws = []
                for kw in keywords:
                    if kw.lower() in text.lower():
                        found_kws.append(kw)
                
                if found_kws:
                    print(f"File matches: {os.path.basename(file_path)} (Matched: {found_kws})")
                    # Find a snippet around 'edital' or first matched keyword
                    first_kw = found_kws[0]
                    idx = text.lower().find(first_kw.lower())
                    start = max(0, idx - 150)
                    end = min(len(text), idx + 250)
                    print(f"  Snippet: ...{text[start:end].replace(chr(10), ' ')}...")
                    print("-" * 50)

if __name__ == "__main__":
    main()
