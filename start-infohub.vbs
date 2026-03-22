' InfoHub - Background Launcher for Windows
' Double-click this file to start InfoHub silently in the background.
' To stop: open Task Manager > find "node.exe" > End Task

Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Check if already running on port 3000
Set objExec = WshShell.Exec("cmd /c netstat -ano | findstr :3000 | findstr LISTENING")
strOutput = ""
Do While Not objExec.StdOut.AtEndOfStream
    strOutput = strOutput & objExec.StdOut.ReadLine()
Loop

If Len(strOutput) > 0 Then
    MsgBox "InfoHub is already running!" & vbCrLf & vbCrLf & "Open: http://localhost:3000", vbInformation, "InfoHub"
    WScript.Quit
End If

' Start InfoHub in background (hidden window)
WshShell.CurrentDirectory = strPath
WshShell.Run "cmd /c cd /d """ & strPath & """ && npx next dev > """ & strPath & "\infohub.log"" 2>&1", 0, False

' Wait a moment then open browser
WScript.Sleep 4000
WshShell.Run "http://localhost:3000", 1, False

MsgBox "InfoHub started in background!" & vbCrLf & vbCrLf & _
       "Open: http://localhost:3000" & vbCrLf & _
       "Log:  infohub.log" & vbCrLf & vbCrLf & _
       "To stop: run stop-infohub.bat", vbInformation, "InfoHub"
