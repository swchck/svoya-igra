@echo off
REM Windows: двойной клик из Проводника. Запускает Своя Игра локально.
setlocal enableextensions
cd /d "%~dp0"

REM Делегируем PowerShell (там логика установки и запуска).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo Скрипт завершился с ошибкой ^(код %RC%^).
  pause
)
exit /b %RC%
