import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ?? "https://settlrapi.theswissknife.com";
  const useEmbeddedUpdate = apiUrl.includes("10.0.2.2");
  // Android release builds reject HTTP by default. Allow it only for the
  // emulator's local host bridge; staging and production stay HTTPS-only.

  // Expo's runtime config still supports the legacy root `splash` field, while
  // the SDK 57 TypeScript declaration no longer includes it.
  return {
    ...config,
    name: "Settlr",
    slug: "settlr",
    version: "0.1.0",
    // One artwork across the web favicon, mobile web tab icon, and native
    // launcher icon. The PNG is rendered from assets/icon.svg, which mirrors
    // settlr-web/app/icon.svg exactly.
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#fffefa",
    },
    scheme: "settlr",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.settlr.app",
      associatedDomains: ["applinks:settlr.theswissknife.com"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.settlr.app",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#1b5e55",
      },
      // Keep focused inputs and form actions above the Android IME. This is a
      // native setting, so release builds must be rebuilt after changing it.
      softwareKeyboardLayoutMode: "resize",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "settlr.theswissknife.com",
              pathPrefix: "/verify-email",
            },
            {
              scheme: "https",
              host: "settlr.theswissknife.com",
              pathPrefix: "/reset-password",
            },
            {
              scheme: "https",
              host: "settlr.theswissknife.com",
              pathPrefix: "/invite",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
      "./plugins/with-local-cleartext",
    ],
    extra: {
      router: {},
      eas: {
        projectId: "82005120-b73d-4445-9572-d0f1db6c309f",
      },
      // Exposed to app via Constants.expoConfig.extra.apiUrl
      apiUrl,
    },
    owner: "hogwarts-wizard",
    runtimeVersion: {
      policy: "appVersion",
    },
    // Native Maestro tests must exercise the JS bundled with the APK. Without
    // this, Expo may silently download a prior OTA update and test old UI.
    updates: useEmbeddedUpdate
      ? { enabled: false }
      : { url: "https://u.expo.dev/82005120-b73d-4445-9572-d0f1db6c309f" },
  } as ExpoConfig;
};
