const { API_HOST } = require("./src/config/api");
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...(config.ios || {}),
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      NSFaceIDUsageDescription:
        "FinConnect usa Face ID para iniciar sesión sin escribir la contraseña.",
    },
  },
  extra: {
    ...(config.extra || {}),
    apiHost: API_HOST,
    useMock: process.env.EXPO_PUBLIC_USE_MOCK === "1",
  },
});
