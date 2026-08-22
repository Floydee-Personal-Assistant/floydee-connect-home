# Floydee Connect home prototype

An interactive, static prototype for **Floydee Connect**, a Commitment-to-Capacity Intelligence system. It uses synthetic, in-browser data only and does not connect to accounts, calendars, email, contacts, or any backend service.

## Development

```sh
npm ci
npm run dev
```

## Verification

```sh
npm run check:runtime
npm run build
npm run test:runtime
```

## Deployment

The `main` branch deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`. Configure the repository's Pages source as **GitHub Actions**. The published site is expected at:

<https://floydee-personal-assistant.github.io/floydee-connect-home/>

This repository is deliberately separate from Floydee Connect's internal product records and contains no personal data, credentials, or production integrations.
