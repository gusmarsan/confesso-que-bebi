from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

# 1) A literal </script> inside the report template prematurely closes the main
# module script in the HTML parser. Remove the report-only enhancement tag.
report_enhancement = '  <script type="module" src="./app-enhancements.js?v=0.5.3.2"></script>\n'
if report_enhancement not in text:
    raise SystemExit('Nested report script tag not found')
text = text.replace(report_enhancement, '', 1)

# 2) Password reset now lives in reset.html, so keep index auth focused on login.
text = text.replace(
    '      signInWithEmailAndPassword,sendPasswordResetEmail,signOut',
    '      signInWithEmailAndPassword,signOut',
    1,
)

text = text.replace(
    '      [el.createUserButton,el.emailLoginButton].forEach(button=>button.disabled=busy);',
    '      el.emailLoginButton.disabled=busy;',
    1,
)

reset_start = text.find('    el.createUserButton.addEventListener("click",async()=>{')
logout_start = text.find('    el.logoutButton.addEventListener', reset_start)
if reset_start == -1 or logout_start == -1:
    raise SystemExit('Obsolete inline reset handler not found')
text = text[:reset_start] + text[logout_start:]

# Cache-bust the external enhancements file after the hotfix.
text = text.replace(
    './app-enhancements.js?v=0.5.3.2',
    './app-enhancements.js?v=0.5.3.4',
)

path.write_text(text, encoding='utf-8')
