from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

css_marker = "    .auth-screen.hidden{display:none}\n"
css_patch = "    .auth-screen.hidden{display:none}\n    body.auth-pending .auth-screen,\n    body.auth-pending .app,\n    body.auth-pending .bottom-nav{visibility:hidden!important}\n"
if "body.auth-pending .auth-screen" not in text:
    if css_marker not in text:
        raise SystemExit("auth-screen CSS marker not found")
    text = text.replace(css_marker, css_patch, 1)

if '<body class="auth-pending">' not in text:
    if "<body>" not in text:
        raise SystemExit("body marker not found")
    text = text.replace("<body>", '<body class="auth-pending">\n  <script>setTimeout(()=>document.body.classList.remove("auth-pending"),4000)</script>', 1)

old = '''    onAuthStateChanged(auth,user=>{\n      if(user)startUserSession(user);\n      else endUserSession();\n    });'''
new = '''    onAuthStateChanged(auth,user=>{\n      if(user)startUserSession(user);\n      else endUserSession();\n      requestAnimationFrame(()=>document.body.classList.remove("auth-pending"));\n    });'''
if new not in text:
    if old not in text:
        raise SystemExit("onAuthStateChanged block not found")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
