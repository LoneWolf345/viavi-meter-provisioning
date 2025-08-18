# VIAVI Meter Provisioning

## Project Overview
This web application validates sequential MAC addresses and provisions them through a provisioning API. It is built with Vite, React, and TypeScript with a component-driven architecture using shadcn-ui and Tailwind CSS.

### Architecture
- **Vite + React + TypeScript** for the core application stack.
- **React Router** manages routing between pages in `src/pages`.
- **@tanstack/react-query** handles server state and caching.
- **shadcn-ui / Radix UI** and **Tailwind CSS** provide the UI foundation.
- **Supabase** supplies backend services through a generated client and types.

## Getting Started
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```
3. Create a production build:
   ```sh
   npm run build
   ```
4. Run tests:
   ```sh
   npm run test            # Vitest in watch mode
   npm run test -- --run   # Single run for CI
   ```
5. Lint the codebase:
   ```sh
   npm run lint
   ```

## Directory Structure
- `src/components` – Reusable React components and UI primitives.
- `src/pages` – Top-level route components used by React Router.
- `src/services` – API clients such as the provisioning API wrapper.
- `src/hooks` – Custom React hooks.
- `src/integrations` – Third-party integrations like Supabase (`client.ts`, `types.ts`).
- `src/utils` – Shared utility functions.
- `src/e2e` – High-level end-to-end tests executed with Vitest.
- `src/test` – Testing utilities and setup.

## Testing
### Vitest
All unit, integration, and e2e tests run with [Vitest](https://vitest.dev/).
```sh
npm run test            # watch mode
npm run test -- --run   # single run for CI
```

### End-to-End
End-to-end flow tests live in `src/e2e` and run with the same Vitest command—no additional runner is required.

## Supabase Types and Client
Database types and a typed Supabase client are generated with the [Supabase CLI](https://supabase.com/docs/guides/api/generating-types). The project ID is stored in `supabase/config.toml`.
```sh
npm install -g supabase
supabase login
supabase link --project-ref <project_id>

# Generate updated database types and client
supabase gen types typescript --linked > src/integrations/supabase/types.ts
supabase gen typescript --linked --output src/integrations/supabase/client.ts
```

## Environment Variables
- `VITE_API_BASE_URL` – Base URL for the provisioning API. Defaults to `https://ldap-api.apps.prod-ocp4.corp.cableone.net/`.
- `VITE_USE_STUB_API` – When set to `true`, uses a stubbed API for development. Production builds use `.env.production` which sets this to `false`.

Development defaults live in `.env`, while `.env.production` ensures `VITE_USE_STUB_API=false` for production builds.
