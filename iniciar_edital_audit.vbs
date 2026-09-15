Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

batPath = scriptDir & "\iniciar_portal.bat"
WshShell.Run "cmd.exe /c """ & batPath & """", 1, False
