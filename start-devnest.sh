#!/bin/bash
set -e

NPM=$(which npm)

echo "🔧 Preparing DevNest..."
$NPM -v
node -v

# نصب backend dependencies
cd ~/.devnest/backend
if [ ! -d node_modules ]; then
  echo "📦 Installing backend dependencies..."
  $NPM install
fi

# نصب frontend dependencies
cd ~/.devnest/frontend
if [ ! -d node_modules ]; then
  echo "📦 Installing frontend dependencies..."
  $NPM install
fi

# اجرای DevNest
cd ~/.devnest/backend
echo "🚀 Starting DevNest..."
exec $NPM start
