# Speckle Connectors DUI

DUI v3 is a Speckle interface embedded inside the desktop connectors that allows users to interact with them - sync streams, manage servers etc. It's built in Vue 3 with Nuxt 3 and only supports client side rendering.

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn install
```

And create an `.env` file from `.env.example`.

## Development

Start the development server on `http://localhost:8082`

```bash
yarn dev
```

Once you've got it running locally, you can run connectors with `SPECKLE_DUI_URL` env var set to `http://127.0.0.1:8082` (either system level, via CLI, or via launch/IDE configuration)
see [connector-configuration](https://docs.speckle.systems/connectors/connector-configuration#self-hosting-desktop-ui) docs.

## Production

Build the application for production:

```bash
yarn build
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information...
