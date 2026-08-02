import re

def check_js_file(filename):
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        code = f.read()

    # Simple tokenizer / bracket validator that recognizes JS regexes, template strings, comments
    i = 0
    n = len(code)
    line = 1
    stack = []
    errors = []
    
    # State tracking
    while i < n:
        ch = code[i]
        
        # Newlines
        if ch == '\n':
            line += 1
            i += 1
            continue

        # Single line comment
        if ch == '/' and i + 1 < n and code[i+1] == '/':
            i += 2
            while i < n and code[i] != '\n':
                i += 1
            continue

        # Multiline comment
        if ch == '/' and i + 1 < n and code[i+1] == '*':
            i += 2
            while i < n and not (code[i] == '*' and i + 1 < n and code[i+1] == '/'):
                if code[i] == '\n':
                    line += 1
                i += 1
            i += 2 # skip */
            continue

        # Single / Double quote strings
        if ch in ("'", '"'):
            quote = ch
            i += 1
            while i < n:
                if code[i] == '\n':
                    line += 1
                if code[i] == '\\':
                    i += 2
                    continue
                if code[i] == quote:
                    i += 1
                    break
                i += 1
            continue

        # Template literal `
        if ch == '`':
            i += 1
            while i < n:
                if code[i] == '\n':
                    line += 1
                if code[i] == '\\':
                    i += 2
                    continue
                if code[i] == '`':
                    i += 1
                    break
                # Note: template substitution ${...} is inside template string
                if code[i] == '$' and i + 1 < n and code[i+1] == '{':
                    stack.append(('${', line))
                    i += 2
                    break
                i += 1
            continue

        # Regex literal detection heuristic: / after operator or keyword or start of line
        if ch == '/':
            # Check previous non-whitespace token
            j = i - 1
            while j >= 0 and code[j] in ' \t\r\n':
                j -= 1
            prev_char = code[j] if j >= 0 else ''
            
            if prev_char in '(=:[{,;&!|?+*-><~%^/':
                # Likely a regex
                i += 1
                while i < n:
                    if code[i] == '\n':
                        # Unterminated regex on line break
                        break
                    if code[i] == '\\':
                        i += 2
                        continue
                    if code[i] == '[':
                        # Character class inside regex
                        i += 1
                        while i < n and code[i] != ']':
                            if code[i] == '\\':
                                i += 2
                            else:
                                i += 1
                        i += 1
                        continue
                    if code[i] == '/':
                        i += 1
                        # flags (g, i, m, u, s, y)
                        while i < n and code[i].isalpha():
                            i += 1
                        break
                    i += 1
                continue

        # Brackets
        if ch in '({[':
            stack.append((ch, line))
            i += 1
            continue
        
        if ch in ')}]':
            if not stack:
                errors.append(f'Line {line}: Unexpected closing {ch}')
            else:
                top, open_line = stack.pop()
                expected = {'(': ')', '{': '}', '[': ']', '${': '}'}[top]
                if ch != expected:
                    errors.append(f'Line {line}: Mismatched {ch}, expected {expected} (opened "{top}" at line {open_line})')
            i += 1
            continue

        i += 1

    if stack:
        for top, open_line in stack:
            errors.append(f'Unclosed "{top}" opened at line {open_line}')

    print(f'=== {filename} ===')
    if errors:
        for err in errors[:15]:
            print(' ', err)
    else:
        print('  OK - Syntax clean!')

for fn in ['app.js', 'sample_data.js', 'src/controllers/auditorDB.js', 'src/controllers/offlineAuditor.js', 'src/controllers/aiController.js']:
    check_js_file(fn)
