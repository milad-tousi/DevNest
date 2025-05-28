Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.Run "cmd.exe /c cd /d """ & baseDir & "\frontend"" && npm install && npm run dev", 0, False

WshShell.Run "cmd.exe /c cd /d """ & baseDir & "\backend"" && npm install && node index.js", 0, False
WshShell.Run "http://localhost:5000", 0, False

Set fso = Nothing
Set WshShell = Nothing
