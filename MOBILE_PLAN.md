# Settlr mobile plan

## App foundation

Use the current stable Expo SDK with Expo Router, strict TypeScript, React Native, `@settlr-org/settlr-native-ui`, TanStack Query, React Hook Form, Zod, Expo SecureStore, Expo SQLite with SQLCipher, Expo ImagePicker/Camera, and Expo Notifications. Expo Router supplies typed file-based routes and deep links across Android, iOS, and web ([documentation](https://docs.expo.dev/router/introduction/)); SecureStore is for small secrets, not ledgers ([documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)).

Reserve application identifier `com.settlr.app`, URL scheme `settlr`, and universal/app links under `https://settlr.theswissknife.com`. Use the API bearer-token endpoints; native fetch has no browser CORS requirement. Store refresh tokens in SecureStore and keep access tokens memory-only.

## Navigation and screens

Use Home, Groups, Add, Activity, and Account tabs. Deep-linkable stacks cover group detail, expense detail/edit, settlement, friend/direct ledger, personal expense, budget, recurring expense, notifications, profile, payment QR, sessions, and preferences. The Add flow supports equal/exact/percentage/shares splits, receipt capture, category, date, currency, exchange-rate disclosure, notes, and member selection. Settlement displays “who pays whom”, payment handle/QR, note, confirmation, and undo-friendly feedback.

## Connectivity and privacy

Use online-first data: persist recent read queries and drafts in SQLCipher SQLite, keep the database key in SecureStore, expire cached financial data, and never queue a ledger mutation offline. Retry only idempotent reads or mutations carrying an idempotency key. Show stale/offline status and preserve unfinished forms. Redact account, token, receipt, and amount data from logs and automated screenshots.

Register Expo push tokens through the API and support transactional invite, friend-request, expense, comment, and settlement notifications with user preference controls. Use platform permission rationale, deep-link notification taps to the relevant screen, and revoke device tokens on logout.

## Release and verification

Configure EAS preview and production channels, TestFlight, and Google Play internal testing. Test component states with React Native Testing Library, route and auth flows on Android/iOS, push/deep links, SecureStore failure, encrypted-cache migration, attachment permissions, rotation, reduced motion, large text, screen readers, and offline drafts. Store API base URLs and non-secret feature flags in Expo public configuration only; secrets remain in EAS/server environments.
