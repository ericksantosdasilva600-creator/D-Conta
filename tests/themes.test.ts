import { describe, expect, it } from "vitest";
import glyphs from "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json";
import { ALL_ICONS, iconFor, soundFor, suggestIcons } from "../lib/themes";

describe("ícones e sons por tema", () => {
  it("todos os ícones existem", () => {
    expect(ALL_ICONS.filter((i) => !(i in glyphs))).toEqual([]);
  });
  it("sugere ícones pelo texto, sem depender de acento", () => {
    expect(suggestIcons("Conta de água")[0]).toBe("water-pump");
    expect(suggestIcons("beber agua")[0]).toBe("cup-water");
    expect(suggestIcons("Mercado do mês")[0]).toBe("cart-outline");
    expect(suggestIcons("xyz")).toEqual([]);
  });
  it("não confunde pedaços de palavras", () => {
    expect(suggestIcons("celular")[0]).toBe("cellphone");
    expect(soundFor("", "gasto extra")).toBe("moedas");
    expect(suggestIcons("gasolina")[0]).toBe("gas-station-outline");
  });
  it("escolhe o som pelo tema ou respeita a escolha", () => {
    expect(soundFor("", "Beber água")).toBe("agua");
    expect(soundFor(undefined, "Ler um livro")).toBe("livro");
    expect(soundFor("sino", "Beber água")).toBe("sino");
    expect(soundFor("", "Ligar para a tia")).toBe("padrao");
  });
  it("respeita o ícone escolhido e usa reserva", () => {
    expect(iconFor("broom", "Beber água", "bell")).toBe("broom");
    expect(iconFor("", "qualquer", "bell")).toBe("bell");
  });
});
