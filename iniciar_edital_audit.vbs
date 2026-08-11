Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

batPath = scriptDir & "\iniciar_edital_audit.bat"
WshShell.Run "cmd.exe /c """ & batPath & """", 0, False
