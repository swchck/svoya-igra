#!/usr/bin/env bash
# Linux/Unix: запуск из терминала или двойным кликом (если включено в файловом менеджере).
cd "$(dirname "$0")"
exec /usr/bin/env bash "scripts/launch-common.sh"
