from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

old = '''      <button id="createUserButton" class="google-button" type="button" style="margin-top:10px">
        <span class="google-icon">✉</span>
        <span class="button-label">Definir ou redefinir senha</span>
      </button>'''

new = '''      <button id="createUserButton" class="forgot-password-link" type="button" style="display:block;margin:12px auto 0;padding:4px 8px;border:0;background:none;color:var(--muted);font-size:.66rem;font-weight:750;text-decoration:underline;text-underline-offset:3px;box-shadow:none">
        <span class="button-label">Esqueci minha senha</span>
      </button>'''

if old not in text:
    raise SystemExit("Password reset button block not found")

text = text.replace(old, new, 1)
text = text.replace('./app-enhancements.js?v=0.5.3"', './app-enhancements.js?v=0.5.3.2"')
path.write_text(text, encoding="utf-8")
