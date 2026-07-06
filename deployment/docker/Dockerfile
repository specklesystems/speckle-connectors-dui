FROM node:22-bookworm@sha256:7e791fc54bd02fc89fd4fb39eb37e5bea753c75679c8022478d81679367d995a AS build-stage
WORKDIR /app
RUN corepack enable
COPY package.json .
COPY yarn.lock .
COPY .yarnrc.yml .
RUN yarn install --immutable || (cat /tmp/xfs-*/build.log && exit 1)
COPY . .
# NODE_ENV must be set after the dependencies are installed because @nuxt/kit is a devDependency and is required to build the application
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV NUXT_PUBLIC_POSTHOG_API_KEY=acd87c5a50b56df91a795e999812a3a4
ENV NUXT_PUBLIC_POSTHOG_API_HOST="eu.i.posthog.com"
# Browser OpenTelemetry (HyperDX RUM). Static SPA → config is baked at build time;
# override per-deployment with --build-arg. service.name is fixed to "speckle-dui".
ARG NUXT_PUBLIC_HYPERDX_ENABLED=false
ARG NUXT_PUBLIC_HYPERDX_COLLECTOR_URL=
ARG NUXT_PUBLIC_HYPERDX_INGESTION_KEY=
ARG NUXT_PUBLIC_HYPERDX_OTEL_RESOURCE_ATTRIBUTES=service.name=speckle-dui
ENV NUXT_PUBLIC_HYPERDX_ENABLED=${NUXT_PUBLIC_HYPERDX_ENABLED}
ENV NUXT_PUBLIC_HYPERDX_COLLECTOR_URL=${NUXT_PUBLIC_HYPERDX_COLLECTOR_URL}
ENV NUXT_PUBLIC_HYPERDX_INGESTION_KEY=${NUXT_PUBLIC_HYPERDX_INGESTION_KEY}
ENV NUXT_PUBLIC_HYPERDX_OTEL_RESOURCE_ATTRIBUTES=${NUXT_PUBLIC_HYPERDX_OTEL_RESOURCE_ATTRIBUTES}
RUN yarn generate

FROM joseluisq/static-web-server:2.40@sha256:63528bfba5d86b00572e23b4e44ed0f7a791f931df650125156d0c24f7a8f877 AS production-stage
WORKDIR /app
COPY --from=build-stage /app/dist /app/dist
CMD ["--config-file", "/app/configuration.toml"]
