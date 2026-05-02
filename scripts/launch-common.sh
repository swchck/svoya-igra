#!/usr/bin/env bash
# Общий слой логики для macOS/Linux. Подключается из start.command и start.sh.
# Делает: проверяет node/npm, при необходимости предлагает установить, ставит зависимости,
# собирает приложение и запускает локальный preview-сервер с открытием браузера.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

say() { printf '\033[1;33m%s\033[0m\n' "$*"; }
err() { printf '\033[1;31m%s\033[0m\n' "$*" >&2; }
ok()  { printf '\033[1;32m%s\033[0m\n' "$*"; }

# === 0. Найти Node.js ===
detect_node() {
  for c in node nodejs; do
    if command -v "$c" >/dev/null 2>&1; then
      NODE_BIN="$c"
      return 0
    fi
  done
  for p in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if [ -x "$p" ]; then
      NODE_BIN="$p"
      return 0
    fi
  done
  return 1
}

ask_yn() {
  # $1 = вопрос; $2 = по умолчанию (Y|N)
  local prompt="$1" default="${2:-Y}" reply
  if [ "$default" = "Y" ]; then prompt="$prompt [Y/n] "; else prompt="$prompt [y/N] "; fi
  printf '%s' "$prompt"
  read -r reply || true
  reply="${reply:-$default}"
  case "$reply" in y|Y|yes|YES|да|Да|ДА) return 0 ;; *) return 1 ;; esac
}

install_node() {
  local kernel; kernel="$(uname -s)"
  case "$kernel" in
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        say "Устанавливаю Node.js через Homebrew…"
        brew install node
        return $?
      fi
      err "Homebrew не найден. Установите brew (https://brew.sh) или Node.js (https://nodejs.org) и повторите запуск."
      return 1
      ;;
    Linux)
      if command -v apt-get >/dev/null 2>&1; then
        say "Устанавливаю Node.js через apt (потребуется sudo)…"
        sudo apt-get update && sudo apt-get install -y nodejs npm
        return $?
      elif command -v dnf >/dev/null 2>&1; then
        say "Устанавливаю Node.js через dnf…"
        sudo dnf install -y nodejs npm
        return $?
      elif command -v pacman >/dev/null 2>&1; then
        say "Устанавливаю Node.js через pacman…"
        sudo pacman -Sy --noconfirm nodejs npm
        return $?
      elif command -v zypper >/dev/null 2>&1; then
        say "Устанавливаю Node.js через zypper…"
        sudo zypper install -y nodejs npm
        return $?
      fi
      err "Не удалось определить пакетный менеджер. Установите Node.js (https://nodejs.org) и повторите запуск."
      return 1
      ;;
    *)
      err "Неизвестная ОС ($kernel). Установите Node.js вручную: https://nodejs.org"
      return 1
      ;;
  esac
}

if ! detect_node; then
  err "Node.js не найден."
  if ask_yn "Попробовать установить Node.js автоматически?" "Y"; then
    if ! install_node; then
      err "Установка не удалась. Скачайте Node.js: https://nodejs.org"
      exit 1
    fi
    detect_node || { err "Node.js всё ещё не доступен — закройте и откройте терминал и повторите."; exit 1; }
  else
    err "Установите Node.js (https://nodejs.org) и запустите скрипт снова."
    exit 1
  fi
fi

NPM_BIN="$(dirname "$NODE_BIN")/npm"
[ -x "$NPM_BIN" ] || NPM_BIN="$(command -v npm || true)"
if [ -z "$NPM_BIN" ]; then
  err "npm не найден рядом с node ($NODE_BIN). Переустановите Node.js."
  exit 1
fi

ok "Node.js: $($NODE_BIN --version) ($NODE_BIN)"
ok "npm:     $($NPM_BIN --version) ($NPM_BIN)"

# === 1. Зависимости ===
if [ ! -d node_modules ] || [ package.json -nt node_modules/.installed ]; then
  say "Устанавливаю зависимости…"
  "$NPM_BIN" install --no-audit --no-fund
  : > node_modules/.installed
else
  ok "Зависимости актуальны."
fi

# === 2. Сборка (опционально, если уже собрано — пропускаем) ===
if [ ! -d dist ] || [ src -nt dist ] || [ package.json -nt dist ]; then
  say "Собираю приложение…"
  "$NPM_BIN" run build
fi

# === 3. Старт локального сервера ===
PORT="${PORT:-5173}"
say "Запускаю Своя Игра на http://localhost:${PORT}"

# Открыть браузер через 1.5 сек после старта
( sleep 1.5
  case "$(uname -s)" in
    Darwin) open "http://localhost:${PORT}" ;;
    Linux)  xdg-open "http://localhost:${PORT}" >/dev/null 2>&1 || true ;;
  esac ) &

exec "$NPM_BIN" run preview -- --host --port "$PORT"
