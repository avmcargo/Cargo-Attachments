# AVM CARGO

Платформа отслеживания посылок для карго-компании AVM CARGO. Клиенты отслеживают грузы от регистрации до получения. Администраторы управляют статусами, импортируют/экспортируют Excel, сканируют QR-коды.

## Run & Operate

- `pnpm --filter @workspace/avm-cargo run dev` — фронтенд (порт 20375)
- `pnpm --filter @workspace/api-server run dev` — API сервер (порт 8080)
- `pnpm run typecheck` — полная проверка типов
- `pnpm run build` — сборка
- `pnpm --filter @workspace/api-spec run codegen` — регенерация хуков из OpenAPI
- `pnpm --filter @workspace/db run push` — применить схему БД

## Test Accounts

- **Администратор**: телефон `+77001111111`, пароль `admin123`
- **Клиент 1**: телефон `+77771234567`, пароль `client123`
- **Клиент 2**: телефон `+77007654321`, пароль `client123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + shadcn/ui + framer-motion
- Routing: wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: express-session + bcryptjs + connect-pg-simple
- Validation: Zod v3, drizzle-zod, Orval codegen
- Excel: xlsx (клиентский экспорт + серверный импорт)

## Where things live

- `artifacts/avm-cargo/` — React+Vite фронтенд
  - `src/pages/` — страницы (landing, login, register, dashboard, package detail, admin)
  - `src/components/` — переиспользуемые компоненты
  - `src/index.css` — темa (чёрный/белый/красный)
- `artifacts/api-server/src/routes/` — API маршруты
  - `auth.ts` — регистрация/вход/выход/me
  - `packages.ts` — CRUD посылок + статусы + импорт/экспорт
  - `notifications.ts` — уведомления
- `lib/db/src/schema/` — Drizzle схема (users, packages, package_history, notifications)
- `lib/api-spec/openapi.yaml` — OpenAPI контракт

## Architecture decisions

- **Сессии на стороне сервера** (express-session + PostgreSQL) вместо JWT для простоты и безопасности
- **Role-based access**: role='admin' в таблице users; middleware requireAuth / requireAdmin
- **Статус 'delivered' → автоархивация**: при установке статуса delivered пакет помечается archived=true
- **OpenAPI-first**: все хуки React Query генерируются из openapi.yaml через Orval
- **type: number вместо integer** в OpenAPI spec (совместимость Orval 8.x + Zod v3)

## User preferences

_Заполнять по мере разработки._

## Gotchas

- После изменений в `lib/api-spec/openapi.yaml` обязательно запустить `pnpm --filter @workspace/api-spec run codegen`
- После изменений в `lib/db/src/schema/` запустить `pnpm run typecheck:libs` перед проверкой артефактов
- Не использовать `type: integer` в OpenAPI spec — Orval 8.x генерирует `zod.int()` который не существует в Zod v3; использовать `type: number`
- `pnpm --filter @workspace/db run push-force` если push падает с конфликтом колонок
