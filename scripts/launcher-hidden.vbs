Option Explicit

Dim shell, fileSystem, root, launcher, command
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

root = fileSystem.GetParentFolderName(fileSystem.GetParentFolderName(WScript.ScriptFullName))
launcher = fileSystem.BuildPath(root, "scripts\launcher-gui.ps1")
command = "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Quote(launcher)

' Run through wscript rather than start/cmd so no transient console window is created.
shell.Run command, 0, False

Function Quote(value)
    Quote = Chr(34) & value & Chr(34)
End Function
