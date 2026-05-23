# AGENTS.md

## Project Overview

Speckle Connectors DUI is a Vue 3 / Nuxt 3 client-only interface embedded in
desktop connectors. It can also run in a browser during development using mocked
connector bindings.

The application has two important operating environments:

- Embedded connector webviews, where JavaScript communicates with host
  applications through bindings and bridges.
- Standalone local development, where `plugins/00.bindings.ts` provides mocks for
  the connector contracts.

Do not assume browser-only behavior is sufficient. Changes to UI flows often also
affect communication with Revit, Rhino, SketchUp, Archicad, or other host
applications.

## Toolchain

- Use Node.js `22.14.x` as specified by `package.json` and CI.
- Use Yarn 4 through Corepack. The repository uses the `node-modules` linker.
- Install with `yarn install --immutable` when validating from a clean install.
- Create local configuration from `env.example` as `.env` when a development
  server requires it.
- Run the local app with `yarn dev`; it serves on `http://localhost:8082` using
  the environment configuration and watches GraphQL documents.

## Repository Map

- `app.vue`: top-level shell, theme handling, telemetry and toast mounting.
- `pages/`: Nuxt entry pages; `index.vue` is the main connector experience and
  `revit-mapper.vue` is the mapping workflow.
- `components/`: feature-oriented Vue components for accounts, send/load flows,
  model cards, issues, mapper UI and common presentation elements.
- `store/`: Pinia setup stores. `hostApp.ts` orchestrates connector events and
  model state; `accounts.ts` owns per-account Apollo clients.
- `plugins/00.bindings.ts`: detects connector runtimes, hoists host bindings and
  supplies development mocks. Treat this as a compatibility-critical entrypoint.
- `lib/bindings/definitions/`: TypeScript contracts and mocked binding
  implementations shared with UI behavior.
- `lib/bridge/`: transport and connector-specific bridge logic, including browser
  based send/load handling.
- `lib/**/graphql/` and `lib/graphql/`: authored GraphQL operations.
- `lib/common/generated/gql/`: generated GraphQL artifacts. Do not manually edit.
- `deployment/`: Docker and Helm packaging.
- `tests/deployment/helm/`: Kind/Tilt deployment harness. There is currently no
  application unit-test suite in this repository.

## Architecture Rules

- The app is configured with `ssr: false`; keep implementations safe for a
  client-only Nuxt application.
- Embedded connectors include older Chromium/CEF hosts. `nuxt.config.ts` targets
  Chrome 65 and loads explicit legacy polyfills. Avoid introducing browser APIs
  or JavaScript assumptions that bypass this compatibility requirement.
- Host application capabilities are optional. Feature UI should continue to
  check the relevant injected binding before exposing or executing an action.
- Preserve the binding boundary: update interfaces and mocks in
  `lib/bindings/definitions/` when adding host-facing methods or events, and
  adjust bridge/runtime registration when the contract requires it.
- State exchanged with connectors belongs in Pinia stores and binding events,
  following the existing `useHostAppStore`, `useAccountStore` and related store
  patterns.
- Accounts have distinct Apollo clients and credentials. GraphQL work that
  depends on an account should continue to execute through that account's
  client, typically using `provideApolloClient`.

## Vue And TypeScript Conventions

- Prefer Vue Composition API with `<script setup lang="ts">`, matching existing
  components.
- Use Nuxt aliases (`~/` or `~~/`) consistently with nearby code.
- Use typed props and emitted events for new component surfaces.
- Use existing Speckle UI components and Tailwind theme classes before adding
  new bespoke styling.
- Keep strict TypeScript intact. Avoid `any` and unsafe assignments; ESLint
  enables strict type-aware rules.
- Format with 2 spaces, single quotes, no semicolons and no trailing commas, as
  defined by `.prettierrc`.
- Preserve Vue block ordering enforced by linting: template before script before
  style.

## GraphQL Workflow

- Author operations using the generated `graphql(...)` helper, following the
  modules in `lib/graphql/`, `lib/ingestion/graphql/`, `lib/issues/graphql/` and
  `lib/workspaces/graphql/`.
- After changing GraphQL documents, run `yarn gqlgen` and include any changed
  generated files under `lib/common/generated/gql/`.
- Do not hand-edit generated GraphQL types or document maps.
- `yarn gqlgen` reads the remote Speckle GraphQL schema, so it requires network
  access.

## Connector And UI Changes

- Test ordinary browser development against mocked bindings, but remember this
  does not fully validate embedded host behavior.
- When modifying send/load, selection, configuration, account or mapper
  behavior, review the corresponding binding definition, mock, store event
  handlers and any connector-specific bridge paths.
- Keep async initialization ordering in mind. The main page explicitly awaits
  account refresh before model-card behavior to avoid startup races.
- Treat error reporting, progress events and `documentChanged` handling as
  user-facing connector contracts; do not silently remove or bypass them.

## Deployment Changes

- Docker production output is generated as a static Nuxt site and served by
  `static-web-server`.
- Helm resources live under `deployment/helm/speckle-dui`; deployment smoke
  configuration and local cluster orchestration live under
  `tests/deployment/helm`.
- Limit deployment edits to deployment work unless application packaging
  genuinely requires coupled changes.

## Validation

Use the smallest relevant validation during iteration, then run the complete
project lint suite before handing off source changes:

```bash
yarn lint:js
yarn lint:tsc
yarn lint:prettier
yarn lint:css
yarn lint
```

For changes affecting Nuxt compilation, packaging or runtime configuration, also
run:

```bash
yarn build
```

For GraphQL document changes, run `yarn gqlgen` before type checking and linting.
For deployment work, use the applicable Docker or Kind/Tilt scripts from
`package.json`; do not claim embedded-connector validation based only on the
mocked browser app.

## Change Discipline

- Keep generated build directories such as `.nuxt/`, `.output/`, `dist/` and
  dependencies out of manual changes.
- Do not commit credentials or developer-specific `.env` values.
- Keep edits scoped to the requested behavior and follow feature boundaries
  already present in `components/`, `lib/` and `store/`.
- Document verification performed and any connector-specific behavior that could
  not be exercised locally.
