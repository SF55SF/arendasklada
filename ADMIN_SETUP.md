# Кабинет управления ArendaSklada.uz

Админка Decap CMS доступна по адресу:

```text
/admin/
```

## Что сохранено

- коллекция объектов осталась в `src/content/warehouses/`;
- страницы объектов создаются автоматически по `pageSlug`;
- карточки, фильтры и Яндекс-карта берут данные из markdown-файлов;
- GitHub Actions собирает Astro в `dist`;
- конфигурация админки лежит в `public/admin/config.yml`.

## Важно перед запуском админки

В `public/admin/config.yml` замените маячки:

```yaml
repo: ARENDASKLADA_GITHUB_REPO_REPLACE_ME
base_url: https://ARENDASKLADA_DECAP_AUTH_WORKER_REPLACE_ME.workers.dev
```

`repo` — ваш GitHub репозиторий, например `owner/arendasklada.uz`.
`base_url` — адрес Cloudflare Worker/Pages Function, который будет выполнять OAuth для Decap CMS.

## Как добавлять склад

Создайте запись в коллекции «Склады». Главное поле — `pageSlug`.

Пример:

```text
warehouse-2500m2-tashkent-sergeli
```

Страница будет доступна как:

```text
https://arendasklada.uz/warehouse-2500m2-tashkent-sergeli/
```

## Карта

На главном экране подключена Яндекс-карта в сером стиле. Для каждого объекта задаются точные координаты:

```yaml
latitude: 41.311081
longitude: 69.240562
```

Поля `mapX` и `mapY` сохранены для резервной CSS-карты, которая показывается, если внешний скрипт карты не загрузился. При необходимости укажите ключ в переменной окружения `PUBLIC_YANDEX_MAPS_API_KEY`.

## Форма заявок

Форма отправляет данные на `/api/leads`. Для продакшена подключите Cloudflare Worker, Pages Function, Formspree, CRM webhook или другой endpoint по маячку:

```text
ARENDASKLADA_MARKER_FORM_ENDPOINT
```

## Локальный запуск

```bash
npm ci
npm run dev
```

Для локального режима Decap CMS можно отдельно запустить:

```bash
npx decap-server
```
