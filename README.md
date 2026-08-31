# Settlr mobile plan

This repository contains the implementation-ready Expo mobile plan for iOS and Android. It shares the API contract and semantic design tokens with the web product while retaining native navigation and controls.

## Delivery

Pull requests run Prettier, TypeScript, unit tests, and an Expo web export. A push to `main` publishes an EAS Update to the protected `production` environment.

Configure the `EXPO_TOKEN` repository secret and, when needed, the `EXPO_PUBLIC_API_URL` repository variable. Native store binaries remain an explicit EAS Build/review operation.
