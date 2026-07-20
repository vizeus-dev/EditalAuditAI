import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespace for wordprocessingml
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            
            full_text = "\n".join(paragraphs)
            print(f"--- Document: {os.path.basename(file_path)} ---")
            print(full_text[:5000]) # First 5000 chars
            print("--- End of Preview ---")
            
            # Save to a text file for complete viewing
            out_path = file_path + ".txt"
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(full_text)
            print(f"Full text saved to {out_path}")
    except Exception as e:
        print(f"Error reading docx: {e}")

if __name__ == "__main__":
    read_docx(r"C:\Users\victo\Downloads\Aqui está a proposta final ajustada cirurgicamente para bater cravado o teto de R$ 250k.docx")
