@echo off
rem RYSS COMPANY - roda a loja no seu PC (Windows). De dois cliques neste arquivo.
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nao encontrado.
  echo Instale a versao LTS em https://nodejs.org e depois rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) < 20 ? 1 : 0)"
if errorlevel 1 (
  echo.
  echo Sua versao do Node.js e antiga. Instale a versao LTS em https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist .env.local (
  echo DEMO_PRODUCTS=true> .env.local
  echo Criado .env.local com produtos de EXEMPLO.
  echo Para usar o Supabase, preencha .env.local seguindo o .env.example.
)

if not exist node_modules (
  echo Instalando dependencias, aguarde alguns minutos na primeira vez...
  call npm install
  if errorlevel 1 (
    echo.
    echo Falha ao instalar dependencias. Copie a mensagem acima e envie para o suporte.
    pause
    exit /b 1
  )
)

echo.
echo Abrindo http://localhost:3000 no navegador. Para parar, feche esta janela.
echo.
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
pause
