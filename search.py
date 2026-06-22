import urllib.request, urllib.parse, re, html, sys

queries = [
    'Supabase RLS best practices admin policies',
    'Supabase offline first Dexie IndexedDB sync best practices',
    'React offline first IndexedDB sync architecture best practices',
    'Supabase SECURITY DEFINER RPC best practices',
    'Supabase row level security update policy with check best practices'
]
headers = {'User-Agent': 'Mozilla/5.0'}

def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    return html.unescape(s).strip()

def fetch(q):
    url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote(q)
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode('utf-8', errors='ignore')

def parse(text):
    results = []
    for m in re.finditer(r'<a class="result__a" href="([^"]+)">(.*?)</a>', text, re.S):
        title = clean(m.group(2))
        href = html.unescape(m.group(1))
        snippet = ''
        tail = text[m.end():m.end()+1200]
        snip_match = re.search(r'<a class="result__snippet"[^>]*>(.*?)</a>|<div class="result__snippet">(.*?)</div>', tail, re.S)
        if snip_match:
            snippet = clean(snip_match.group(1) or snip_match.group(2))
        results.append((title, href, snippet))
    return results

for q in queries:
    print('='*80)
    print('QUERY:', q)
    try:
        text = fetch(q)
        results = parse(text)[:5]
        for i, (title, href, snippet) in enumerate(results, 1):
            print(f'{i}. {title}')
            print(f'   {href}')
            if snippet:
                print(f'   {snippet[:220]}')
            print()
    except Exception as e:
        print('ERROR:', e)