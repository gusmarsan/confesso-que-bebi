from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

old = '''      <button id="createUserButton" class="forgot-password-link" type="button" style="display:block;margin:12px auto 0;padding:4px 8px;border:0;background:none;color:var(--muted);font-size:.66rem;font-weight:750;text-decoration:underline;text-underline-offset:3px;box-shadow:none">
        <span class="button-label">Esqueci minha senha</span>
      </button>'''

new = '''      <a id="createUserButton" class="forgot-password-link" href="./reset.html" onclick="event.stopImmediatePropagation()" style="display:block;margin:12px auto 0;padding:4px 8px;border:0;background:none;color:var(--muted);font-size:.66rem;font-weight:750;text-align:center;text-decoration:underline;text-underline-offset:3px;box-shadow:none">
        <span class="button-label">Esqueci minha senha</span>
      </a>'''

if old not in text:
    if 'href="./reset.html"' in text:
        raise SystemExit(0)
    raise SystemExit("Current reset control not found")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
