#!/usr/bin/env bash
# RYSS COMPANY - roda a loja no seu computador (Mac ou Linux).
# No terminal, dentro desta pasta:  ./rodar-no-pc.sh
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão LTS em https://nodejs.org e rode de novo."
  exit 1
fi

if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "Sua versão do Node.js é antiga. Instale a versão LTS em https://nodejs.org"
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "DEMO_PRODUCTS=true" > .env.local
  echo "Criado .env.local com produtos de EXEMPLO."
  echo "Para usar o Supabase, preencha .env.local seguindo o .env.example."
fi

if [ ! -d node_modules ]; then
  echo "Instalando dependências, aguarde alguns minutos na primeira vez..."
  npm install
fi

echo
echo "Abra http://localhost:3000 no navegador. Para parar, pressione Ctrl+C."
echo
( sleep 8 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || true) ) &
npm run dev
