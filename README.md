# ArendaSklada.uz

Готовая Astro-версия сайта каталога складских и индустриальных объектов для домена `arendasklada.uz`.

## Что внутри

- русскоязычная главная страница;
- структура каталога: фильтры, карточки объектов, CTA-кнопки;
- отдельные страницы объектов по `slug`;
- серая Яндекс-карта Ташкента с маркерами объектов из списка;
- Decap CMS админка по `/admin/`;
- GitHub Actions workflow для сборки Astro и публикации `dist`;
- понятные маячки `ARENDASKLADA_MARKER_*` для замены домена, Worker, формы, контактов и карты.

## Быстрый запуск

```bash
npm ci
npm run dev
```

Сборка:

```bash
npm run build
```

## Где менять объекты

Объекты находятся в:

```text
src/content/warehouses/
```

Название коллекции `warehouses` оставлено специально, чтобы сохранить текущую структуру Astro/Decap. На сайте эти записи отображаются как склады.

## Маячки для поиска

В редакторе выполните поиск по `ARENDASKLADA_MARKER_`:

- `ARENDASKLADA_MARKER_GITHUB_REPO` — репозиторий для Decap CMS;
- `ARENDASKLADA_MARKER_CLOUDFLARE_WORKER_AUTH` — OAuth Worker/Pages Function для админки;
- `ARENDASKLADA_MARKER_FORM_ENDPOINT` — endpoint формы заявок;
- `ARENDASKLADA_MARKER_CONTACT_PHONE` и `ARENDASKLADA_MARKER_CONTACT_EMAIL` — контакты;
- `PUBLIC_YANDEX_MAPS_API_KEY` — ключ Яндекс.Карт при необходимости;
- `ARENDASKLADA_MARKER_DEPLOY_TARGET` — настройки деплоя.

## Cloudflare Pages

Для Cloudflare Pages используйте:

```text
Build command: npm run build
Build output directory: dist
```

Админку Decap CMS можно подключить через отдельный Cloudflare Worker или Pages Function и указать адрес в `public/admin/config.yml`.
