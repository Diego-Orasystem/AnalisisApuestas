@echo off
echo 🏀 H2H GG League Basketball - Servidor Local
echo.
echo 🔄 Iniciando servidor HTTP...
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python no está instalado o no está en el PATH
    echo 💡 Instala Python desde https://python.org
    echo.
    pause
    exit /b 1
)

REM Iniciar el servidor
echo ✅ Python encontrado, iniciando servidor...
echo.
python server.py

REM Si llegamos aquí, el servidor se cerró
echo.
echo 🛑 Servidor cerrado
pause 