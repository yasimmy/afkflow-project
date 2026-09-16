@echo off
cd /d "c:\Users\Den\Desktop\AFKFLOW\launcher"
node node_modules\typescript\lib\tsc.js --noEmit > tsc-out.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> tsc-out.txt
