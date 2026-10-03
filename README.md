# Своя Игра

Конструктор и проигрыватель «Своей игры» для macOS, Windows и Linux. В редакторе вы
собираете раунды, темы и вопросы с картинками, звуком, видео и роликами с YouTube.
Во время игры табло идёт на большой экран, а ведущий управляет партией из второго
окна, где видны правильные ответы. Интернет нужен только для YouTube и медиа по ссылкам.

Сайт: https://swchck.github.io/svoya-igra/ · онлайн-версия без установки: https://swchck.github.io/svoya-igra/app/

## Скачать

| Система | Файл |
| --- | --- |
| macOS (Apple Silicon) | [Svoya-Igra_macOS-arm64.dmg](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_macOS-arm64.dmg) |
| macOS (Intel) | [Svoya-Igra_macOS-x64.dmg](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_macOS-x64.dmg) |
| Windows | [Svoya-Igra_Windows-x64-setup.exe](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Windows-x64-setup.exe) |
| Linux (AppImage) | [Svoya-Igra_Linux-x64.AppImage](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Linux-x64.AppImage) |
| Linux (deb / rpm) | [.deb](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Linux-x64.deb) · [.rpm](https://github.com/swchck/svoya-igra/releases/latest/download/Svoya-Igra_Linux-x64.rpm) |

Все версии лежат на странице [релизов](https://github.com/swchck/svoya-igra/releases).
Когда выходит новая версия, установленное приложение предлагает обновиться.

### Первый запуск

У приложения нет подписи Apple и Microsoft, поэтому при первом запуске система
спросит, доверяете ли вы ему.

- macOS сообщит, что не может проверить разработчика. Откройте «Системные настройки»,
  раздел «Конфиденциальность и безопасность», и нажмите «Всё равно открыть». Если macOS
  называет приложение повреждённым, выполните в Терминале
  `xattr -dr com.apple.quarantine "/Applications/Своя Игра.app"`.
- Windows покажет окно SmartScreen. Нажмите «Подробнее», затем «Выполнить в любом случае».
- На Linux AppImage достаточно сделать исполняемым:
  `chmod +x Svoya-Igra_Linux-x64.AppImage`.

## Как играть

1. На главном экране нажмите «Новая игра». Чтобы сначала посмотреть готовую игру,
   нажмите «Открыть пример».
2. В редакторе добавьте раунды, в раунды темы, в темы вопросы. У вопроса есть
   стоимость, тип (обычный, аукцион или кот в мешке), текст, ответ и медиа к вопросу
   и к ответу. У звука и видео можно задать отрезок, например с 0:30 по 1:15. В конце
   можно добавить финал со ставками.
3. Нажмите «Играть», чтобы открыть сцену для зрителей. Кнопка «Окно ведущего» открывает
   пульт: там видны ответы, кнопки звука и видео, счёт и все решения по ходу игры. Пока
   пульт открыт, на сцене остаётся только игра. Сцену удобно вывести на проектор,
   а пульт держать на ноутбуке.
4. Счёт сохраняется по ходу игры. Если закрыть окно, в следующий раз партию можно
   продолжить.

На сцене работают клавиши: пробел или Enter листают заставки и открывают ответ,
Esc закрывает вопрос без начисления очков.

Звук и видео с диска запускаются сами. Ролик с YouTube внутри приложения стартует
только после клика по плееру на сцене; пульт подскажет, если это нужно.

## Формат .gamezip

Игру можно перенести на другой компьютер в файле `.gamezip`. Это обычный ZIP-архив:

```
game.json     описание игры (типы в src/types.ts); вложения записаны как media://<файл>
media/        картинки, звук, видео
meta.json     { app, format, version, exportedAt }
icon.svg      иконка формата
```

Ссылки на YouTube и другие сайты хранятся как ссылки. Двойной клик по `.gamezip`
открывает игру в приложении. Экспорт в JSON тоже содержит всю игру: вложения встроены
в файл как data URL.

## Разработка

Понадобятся Node.js 22+ и Rust (stable).

```bash
npm ci
npm run app:dev    # приложение с горячей перезагрузкой
npm run dev        # только интерфейс в браузере, http://localhost:5173
npm run check      # typecheck, lint и тесты
npm run app:build  # установщики для текущей ОС в src-tauri/target/release/bundle
npm run site:dev   # промо-сайт, http://localhost:5174
```

Где что лежит:

- `src/game`: модель игры, обход медиа, разбор ссылок YouTube, чтение старых форматов;
- `src/io`: импорт и экспорт `.gamezip` и JSON;
- `src/media`: вложения, которые хранятся как Blob в IndexedDB;
- `src/composables/usePlaySession.ts`: правила партии; `src/play`: сохранение партии
  и связь сцены с окном ведущего;
- `src/components/ui`: компоненты shadcn-vue, остальные компоненты в `src/components`;
- `site`: промо-сайт для GitHub Pages с общей темой и компонентами, веб-версия приложения
  собирается рядом с ним в `app/`; кнопки скачивания
  ведут на последний релиз, публикует сайт workflow `Site`;
- `src-tauri`: оболочка приложения, открытие файлов из ОС и локальный мост для YouTube
  (зачем он нужен, объяснено в начале `youtube_bridge.rs`).

## Выпуск версии

```bash
git tag v0.3.0
git push origin v0.3.0
```

Workflow `Release` соберёт установщики для всех платформ и опубликует релиз. Номер
версии он берёт из тега. Теги с дефисом, например `v1.0.0-rc1`, публикуются как
pre-release, и автообновление их не предлагает.

Автообновление работает только с подписанными сборками. Публичный ключ записан
в `src-tauri/tauri.conf.json`, приватный хранится в секрете репозитория
`TAURI_SIGNING_PRIVATE_KEY`. В форке секрет нужно добавить самому:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/svoya-igra.key
```

Без секрета релиз всё равно соберётся, но без файлов обновления.
