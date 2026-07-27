@echo off
echo Starting ComfyUI with --listen flag...
echo This allows the Shotgun Seat Squad app to reach ComfyUI over LAN.

:: Kill any existing ComfyUI processes
taskkill /f /im "Comfy Desktop.exe" >nul 2>&1
timeout /t 2 >nul

set PARENT_DIR=%~dp0..\ComfyUI-Installs\ComfyUI
set PYTHON=%PARENT_DIR%\ComfyUI\.venv\Scripts\python.exe
set MODEL_PATHS=%APPDATA%\Comfy Desktop\shared_model_paths.yaml
set INPUT_DIR=%LOCALAPPDATA%\Comfy-Desktop\ComfyUI-Shared\input
set OUTPUT_DIR=%LOCALAPPDATA%\Comfy-Desktop\ComfyUI-Shared\output

cd /d "%PARENT_DIR%"
"%PYTHON%" -s ComfyUI\main.py --listen --port 8188 --enable-manager --extra-model-paths-config "%MODEL_PATHS%" --input-directory "%INPUT_DIR%" --output-directory "%OUTPUT_DIR%"

pause
