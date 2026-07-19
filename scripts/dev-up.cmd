@echo off
REM Eventing — master local dev
REM Always use pure CMD + npm.cmd (never npm.ps1 / PowerShell ExecutionPolicy).
setlocal
cd /d "%~dp0.."

call "%~dp0dev-up-pure.cmd" %*
set ERR=%ERRORLEVEL%
endlocal & exit /b %ERR%
