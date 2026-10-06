@echo off
title Shop AI - running (close this window to stop)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
set RC=%ERRORLEVEL%
if not "%RC%"=="0" echo.
if not "%RC%"=="0" echo This step stopped with an error. Send a screenshot of this window to your team.
if not "%RC%"=="0" pause
exit /b %RC%
