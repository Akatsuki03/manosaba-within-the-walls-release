@echo off
setlocal
chcp 65001 >nul
set "MANOSABA_EDITION=llm"
set "MANOSABA_DATA_DIR=%USERPROFILE%\.manosaba\llm-test-v1"
set "PORT=3211"
if "%~1"=="" (
  wscript.exe "%~dp0scripts\launcher-hidden.vbs"
  exit /b 0
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-game.ps1" %*
if errorlevel 1 (
  echo.
  echo 游戏未能启动，请查看上方提示。
  pause
)
endlocal
