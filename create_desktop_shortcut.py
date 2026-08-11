import os
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ICON_PATH = os.path.join(SCRIPT_DIR, "app_icon.ico")
VBS_PATH = os.path.join(SCRIPT_DIR, "iniciar_edital_audit.vbs")
BAT_PATH = os.path.join(SCRIPT_DIR, "iniciar_edital_audit.bat")

# Possible Desktop directories
user_profile = os.environ.get("USERPROFILE", r"C:\Users\victo")
desktop_dirs = [
    os.path.join(user_profile, "OneDrive", "Desktop"),
    os.path.join(user_profile, "Desktop"),
]

ps_script_template = """
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = "{lnk_path}"
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"{vbs_path}`""
$shortcut.WorkingDirectory = "{work_dir}"
$shortcut.IconLocation = "{icon_path},0"
$shortcut.Description = "EditalAudit AI - High-Tech Enterprise (Avaliador Mestre de Editais)"
$shortcut.WindowStyle = 1
$shortcut.Save()
Write-Host "[+] Atalho criado/atualizado com sucesso em: $shortcutPath"
"""

for d in desktop_dirs:
    if os.path.exists(d):
        lnk_path = os.path.join(d, "Edital Audit AI.lnk")
        ps_code = ps_script_template.format(
            lnk_path=lnk_path.replace("\\", "\\\\"),
            vbs_path=VBS_PATH.replace("\\", "\\\\"),
            work_dir=SCRIPT_DIR.replace("\\", "\\\\"),
            icon_path=ICON_PATH.replace("\\", "\\\\")
        )
        
        ps_file = os.path.join(SCRIPT_DIR, "temp_create_lnk.ps1")
        with open(ps_file, "w", encoding="utf-8") as f:
            f.write(ps_code)
            
        res = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps_file], capture_output=True, text=True)
        print(res.stdout)
        if res.stderr:
            print("[ERR]", res.stderr)
        
        if os.path.exists(ps_file):
            os.remove(ps_file)

if os.path.exists(os.path.join(SCRIPT_DIR, "temp_inspect.ps1")):
    os.remove(os.path.join(SCRIPT_DIR, "temp_inspect.ps1"))
if os.path.exists(os.path.join(SCRIPT_DIR, "inspect_shortcut.py")):
    os.remove(os.path.join(SCRIPT_DIR, "inspect_shortcut.py"))
