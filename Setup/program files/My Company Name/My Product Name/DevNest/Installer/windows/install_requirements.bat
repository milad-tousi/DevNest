@echo off
echo ✅ Starting automatic installation of DevNest dependencies...

REM Check if winget exists
where winget >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo ❌ winget is not available. Please update your Windows or install App Installer from Microsoft Store.
  pause
  exit /b 1
)

REM Install Vagrant
echo 🔧 Installing Vagrant...
winget install --id=Hashicorp.Vagrant -e --silent

REM Install VirtualBox
echo 🖥️ Installing VirtualBox...
winget install --id=Oracle.VirtualBox -e --silent

REM ✅ Add VBoxManage and Vagrant to PATH permanently
echo 🛠️ Updating PATH...

set "VBOX_PATH=C:\Program Files\Oracle\VirtualBox"
set "VAGRANT_PATH=C:\Program Files\Vagrant\bin"

REM Use reg add to update system-wide environment variables (needs Admin rights)
REM First check if current path already has the entries
setx PATH "%PATH%;%VBOX_PATH%;%VAGRANT_PATH%" >nul

echo ✅ Installation complete!
pause
