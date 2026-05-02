#!/usr/bin/env bash
# macOS: двойной клик в Finder. Запускает Своя Игра локально.
cd "$(dirname "$0")"
exec /usr/bin/env bash "scripts/launch-common.sh"
