const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Enables Android cleartext only for the local emulator bridge. It is evaluated
 * during the native build, so staging and production HTTPS builds never carry
 * this exception.
 */
module.exports = function withLocalCleartext(config) {
  if (!process.env.EXPO_PUBLIC_API_URL?.startsWith("http://10.0.2.2:")) {
    return config;
  }

  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error("Android manifest does not contain an application node.");
    }
    application.$["android:usesCleartextTraffic"] = "true";
    return mod;
  });
};
