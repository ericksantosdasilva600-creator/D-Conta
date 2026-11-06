import { Platform } from "react-native";
import { SITE_ROOT } from "@/lib/site";
import type { SoundId } from "@/lib/themes";

const NATIVE: Record<Exclude<SoundId, "padrao">, number> = {
  agua: require("../assets/sounds/daconta_agua.wav"),
  livro: require("../assets/sounds/daconta_livro.wav"),
  sino: require("../assets/sounds/daconta_sino.wav"),
  moedas: require("../assets/sounds/daconta_moedas.wav"),
  treino: require("../assets/sounds/daconta_treino.wav"),
  remedio: require("../assets/sounds/daconta_remedio.wav"),
};

/** Toca o som dentro do site ou do app. Se o aparelho ou o navegador bloquear, segue sem som. */
export async function playSound(id: SoundId) {
  if (id === "padrao") return;
  try {
    if (Platform.OS === "web") {
      await new Audio(`${SITE_ROOT}/sons/daconta_${id}.wav`).play();
      return;
    }
    const { createAudioPlayer } = await import("expo-audio");
    createAudioPlayer(NATIVE[id]).play();
  } catch {
    // Som é um extra: o aviso continua aparecendo.
  }
}
