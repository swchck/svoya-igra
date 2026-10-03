# Своя Игра

Конструктор и проигрыватель «Своей игры» для macOS, Windows и Linux. Соберите раунды,
темы и вопросы с картинками, звуком, видео и YouTube, выведите игру на большой экран
и ведите её со второго окна, где видны ответы. Работает без интернета (кроме YouTube).

## Скачать

| Система | Файл |
| --- | --- |
| macOS (Apple Silicon) | [Svoya-Igra_macOS-arm64.dmg](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_macOS-arm64.dmg) |
| macOS (Intel) | [Svoya-Igra_macOS-x64.dmg](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_macOS-x64.dmg) |
| Windows | [Svoya-Igra_Windows-x64-setup.exe](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Windows-x64-setup.exe) |
| Linux (AppImage) | [Svoya-Igra_Linux-x64.AppImage](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Linux-x64.AppImage) |
| Linux (deb / rpm) | [.deb](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Linux-x64.deb) · [.rpm](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Linux-x64.rpm) |

Все версии — на странице [релизов](https://github.com/swchck/svoya-igra/releases).
Установленное приложение само предлагает обновиться, когда выходит новая версия.

### Первый запуск

Приложение не подписано сертификатами Apple и Microsoft, поэтому система один раз
переспросит:

- **macOS** — «не удалось проверить разработчика». Откройте «Системные настройки →
  Конфиденциальность и безопасность» и нажмите «Всё равно открыть». Если macOS пишет,
  что приложение повреждено, выполните в терминале
  `xattr -dr com.apple.quarantine "/Applications/Своя Игра.app"`.
- **Windows** — SmartScreen: «Подробнее» → «Выполнить в любом случае».
- **Linux** — AppImage: `chmod +x Svoya-Igra_Linux-x64.AppImage` и запуск.

## Как играть

1. На главной — «Новая игра» или «Пример (1996)», чтобы посмотреть готовую.
2. В редакторе: раунды → темы → вопросы. У вопроса есть стоимость, тип (обычный,
   аукцион, кот в мешке), текст, ответ и медиа к обоим.
3. «Играть» открывает сцену для зрителей. «Окно ведущего» — пульт с ответами и
   управлением, его удобно держать на ноутбуке, а сцену вывести на проектор.
4. Партия сохраняется по ходу игры: если закрыть окно, при следующем запуске её
   можно продолжить.

Пробел или Enter листают заставки и открывают ответ, Esc возвращает к табло.

## Формат `.gamezip`

Игры переносятся между компьютерами файлами `.gamezip` — это ZIP-архив:

```
game.json     описание игры (типы в src/types.ts); вложения — ссылки media://<файл>
media/        картинки, звук, видео
meta.json     { app, format, version, exportedAt }
icon.svg      иконка формата
```

Ссылки на YouTube и другие сайты остаются ссылками. Двойной клик по `.gamezip`
открывает игру в приложении. JSON-экспорт тоже самодостаточен: вложения встроены
в него как data URL.

## Разработка

Нужны Node.js 22+ и Rust (stable).

```bash
npm ci
npm run app:dev    # приложение с горячей перезагрузкой
npm run dev        # только интерфейс в браузере, http://localhost:5173
npm run check      # typecheck + lint + тесты
npm run app:build  # установщики для текущей ОС в src-tauri/target/release/bundle
```

Устройство:

- `src/game` — модель игры: фабрики, обход медиа, разбор YouTube-ссылок, приведение
  старых форматов;
- `src/io` — `.gamezip` и JSON;
- `src/media` — вложения как Blob в IndexedDB;
- `src/composables/usePlaySession.ts` — правила партии; `src/play` — сохранение партии
  и связь сцены с окном ведущего;
- `src/components/ui` — компоненты shadcn-vue, остальное в `src/components`;
- `src-tauri` — оболочка: открытие файлов из ОС, локальный мост для YouTube
  (`youtube_bridge.rs` — почему он нужен, написано в начале файла).

## Выпуск версии

```bash
git tag v0.2.0
git push origin v0.2.0
```

Workflow `Release` соберёт установщики на всех платформах и опубликует релиз.
Номер версии берётся из тега.

Чтобы работало автообновление, сборки должны быть подписаны. Один раз добавьте
в секреты репозитория приватный ключ (публичный уже лежит в `src-tauri/tauri.conf.json`):

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/svoya-igra.key
```

Без секрета релиз всё равно соберётся, но без файлов обновления.
