import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
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
  plugins: ["expo-router", "expo-secure-store", "expo-font"],
  extra: {
    router: {},
    eas: {
      projectId: "82005120-b73d-4445-9572-d0f1db6c309f",
    },
    // Exposed to app via Constants.expoConfig.extra.apiUrl
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL ?? "https://settlrapi.theswissknife.com",
  },
  owner: "hogwarts-wizard",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/82005120-b73d-4445-9572-d0f1db6c309f",
  },
});
