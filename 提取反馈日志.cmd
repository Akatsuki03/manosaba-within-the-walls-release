@echo off
setlocal
chcp 65001 >nul
where node.exe >nul 2>&1
if errorlevel 1 goto no_node
node.exe "%~dp0scripts\export-feedback.mjs" --interactive
set "EXPORT_EXIT=%ERRORLEVEL%"
pause
exit /b %EXPORT_EXIT%
:no_node
echo Node.js is required. Install the same Node.js version used by the game.
pause
exit /b 1
