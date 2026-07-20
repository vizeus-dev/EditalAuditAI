import urllib.request
import urllib.parse
import re

def search_ddg(query):
    url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            print(f"HTML length: {len(html)}")
            
            # Let's inspect where result__snippet appears and print 500 characters before it
            first_snippet_idx = html.find('result__snippet')
            if first_snippet_idx != -1:
                start = max(0, first_snippet_idx - 600)
                end = min(len(html), first_snippet_idx + 200)
                print("HTML Snippet Context:")
                print(html[start:end])
                print("="*40)
            
            results = []
            
            # Let's search for a tag class containing result__url or similar
            # For now, let's find all href and text of links inside result__title
            # In DuckDuckGo HTML, the title is usually:
            # <h2 class="result__title">
            #   <a class="result__a" rel="nofollow" href="...">Title Text</a>
            # </h2>
            # Let's try matching result__a with rel="nofollow" or general result__a class
            pattern = re.compile(r'<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>')
            matches = pattern.findall(html)
            print(f"Matches found (lax pattern): {len(matches)}")
            
            for href, title in matches:
                title_clean = re.sub(r'<[^>]+>', '', title).strip()
                if "/l/?kh=" in href or "uddg=" in href:
                    parsed_url = urllib.parse.urlparse(href)
                    qs = urllib.parse.parse_qs(parsed_url.query)
                    if 'uddg' in qs:
                        href = qs['uddg'][0]
                
                results.append({
                    "title": title_clean,
                    "url": href,
                    "snippet": ""
                })
            
            snippet_pattern = re.compile(r'<a class="result__snippet"[^>]*>([\s\S]*?)</a>')
            snippets = snippet_pattern.findall(html)
            print(f"Snippets found: {len(snippets)}")
            for i, snip in enumerate(snippets):
                if i < len(results):
                    results[i]["snippet"] = re.sub(r'<[^>]+>', '', snip).strip()
                    
            return results[:10]
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
        return []

if __name__ == "__main__":
    query = "editais abertos cultura 2026"
    print(f"Searching for: {query}")
    res = search_ddg(query)
    for i, r in enumerate(res):
        print(f"{i+1}. {r['title']}\n   URL: {r['url']}\n   Snippet: {r['snippet']}\n")
