import os
import glob

def main():
    txt_files = glob.glob(r"C:\Users\victo\Downloads\*.pdf.txt")
    keywords = ["doce", "mariana", "rio", "bacia", "bb", "fundação", "participação", "fundo"]
    
    for txt_path in txt_files:
        with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        found = []
        for kw in keywords:
            if kw.lower() in content.lower():
                found.append(kw)
        
        if found:
            print(f"File matches: {os.path.basename(txt_path)} (Matched: {found})")
            # Print a snippet
            idx = content.lower().find(found[0].lower())
            start = max(0, idx - 100)
            end = min(len(content), idx + 200)
            print(f"  Snippet: ...{content[start:end].replace(chr(10), ' ')}...")
            print("-" * 50)

if __name__ == "__main__":
    main()
