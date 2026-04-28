@echo off
chcp 65001 >nul
title WiFi Print Server — PHẦN MỀM TÍNH TIỀN

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   WiFi Print Server — PHẦN MỀM TÍNH TIỀN  ║
echo  ╚══════════════════════════════════════════════╝
echo.

set /p PRINTER_HOST="Dia chi IP may in (Enter = 192.168.1.100): "
if "%PRINTER_HOST%"=="" set PRINTER_HOST=192.168.1.100

set /p WS_PORT="Cong WebSocket (Enter = 9101): "
if "%WS_PORT%"=="" set WS_PORT=9101

echo.
echo Khoi tao may in: %PRINTER_HOST%:9100
echo Cong WebSocket:   ws://0.0.0.0:%WS_PORT%
echo.
echo De in, trong Cai dat app, them may in WiFi voi dia chi:
echo   ws://DIA-CHI-IP-MAY-TINH:%WS_PORT%
echo.
echo Dang khoi dong...
echo.

set PRINTER_HOST=%PRINTER_HOST%
set WS_PORT=%WS_PORT%

node wifi-print-server.js
