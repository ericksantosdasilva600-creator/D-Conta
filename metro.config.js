const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// reacut/ é o editor de vídeo ReaCut, um app separado (Electron): fica fora do bundle do Dá Conta.
config.resolver.blockList = [/[\\/]reacut[\\/].*/];

module.exports = withNativeWind(config, {
  input: "./global.css",
});
