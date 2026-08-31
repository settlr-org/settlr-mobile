import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ?? "https://settlrapi.theswissknife.com";
  // Android release builds reject HTTP by default. Allow it only for the
  // emulator's local host bridge; staging and production stay HTTPS-only.

  return {
    ...config,
    name: "Settlr",
    slug: "settlr",
    version: "0.1.0",
    scheme: "settlr",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.settlr.app",
    },
    android: {
      package: "com.settlr.app",
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
    updates: {
      url: "https://u.expo.dev/82005120-b73d-4445-9572-d0f1db6c309f",
    },
  };
};
