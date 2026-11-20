@echo off
title AEGIS - Plataforma de Governanca Comportamental em Ciberseguranca
echo ========================================================
echo       INICIANDO ECOSSISTEMA COMPLETO DO AEGIS (MVP)
echo ========================================================
echo.
echo [1/3] Iniciando Backend API (Porta 3001)...
start "AEGIS Backend (Port 3001)" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Iniciando Frontend SOC Dashboard (Porta 5173)...
start "AEGIS Frontend SOC (Port 5173)" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Iniciando Agente Desktop (Porta 5174 / Electron)...
start "AEGIS Desktop Agent (Port 5174)" cmd /k "cd desktop && npm run dev"

echo.
echo ========================================================
echo Todos os servicos foram iniciados com sucesso!
echo.
echo Dashboard SOC:     http://localhost:5173/dashboard
echo Agente Desktop:    http://localhost:5174 (ou janela Electron)
echo API Backend:       http://localhost:3001/api
echo.
echo Credenciais de demonstracao:
echo - Gestor/CISO:     juliana.ciso@aegiscorp.demo / aegis@2024
echo - Colaborador:     carlos.silva@aegiscorp.demo / aegis@colaborador
echo ========================================================
pause

