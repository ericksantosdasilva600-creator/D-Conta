/** Temas que ligam o texto digitado a ícones e sons. Funções puras, usadas no site e no app. */
export const SOUNDS = [
  { id: "padrao", label: "Padrão" },
  { id: "agua", label: "Água" },
  { id: "livro", label: "Livro" },
  { id: "sino", label: "Sino" },
  { id: "moedas", label: "Moedas" },
  { id: "treino", label: "Treino" },
  { id: "remedio", label: "Remédio" },
] as const;
export type SoundId = (typeof SOUNDS)[number]["id"];

type Theme = { words: string[]; icons: string[]; sound?: SoundId };

// A ordem importa: o tema mais específico vem antes ("conta de água" antes de "água").
export const THEMES: Theme[] = [
  { words: ["conta de agua", "conta da agua", "agua e esgoto", "saneamento"], icons: ["water-pump", "faucet", "water"], sound: "moedas" },
  { words: ["conta de luz", "conta da luz", "energia", "luz", "eletric*"], icons: ["lightbulb-on-outline", "flash-outline", "transmission-tower"], sound: "moedas" },
  { words: ["internet", "wifi", "wi fi", "fibra"], icons: ["wifi", "router-wireless", "web"], sound: "moedas" },
  { words: ["celular", "telefone", "recarga", "plano de dados"], icons: ["cellphone", "phone-outline", "sim-outline"], sound: "moedas" },
  { words: ["gas", "botijao"], icons: ["gas-cylinder", "fire", "stove"], sound: "moedas" },
  { words: ["aluguel", "condominio", "moradia", "casa", "apartamento", "iptu"], icons: ["home-outline", "home-city-outline", "key-outline"], sound: "moedas" },
  { words: ["netflix", "spotify", "streaming", "disney", "prime video", "assinatura", "youtube"], icons: ["television-play", "play-circle-outline", "music-circle-outline"], sound: "moedas" },
  { words: ["fatura", "cartao", "nubank"], icons: ["credit-card-outline", "credit-card-check-outline", "wallet-outline"], sound: "moedas" },
  { words: ["divida", "emprestimo", "boleto", "parcela", "pagar", "pagamento", "conta"], icons: ["cash-clock", "file-document-outline", "bank-outline"], sound: "moedas" },
  { words: ["guardar dinheiro", "reserva", "poupar", "poupanca", "investir", "investimento", "dinheiro", "salario", "gasto"], icons: ["piggy-bank-outline", "cash-multiple", "chart-line"], sound: "moedas" },
  { words: ["beber agua", "tomar agua", "agua", "hidrat*", "copo"], icons: ["cup-water", "water-outline", "bottle-soda-outline"], sound: "agua" },
  { words: ["remedio", "medicamento", "vitamina", "comprimido", "antibiotico"], icons: ["pill", "medical-bag", "clock-alert-outline"], sound: "remedio" },
  { words: ["medico", "dentista", "consulta", "exame de sangue", "hospital", "saude", "plano de saude", "farmacia", "terapia"], icons: ["stethoscope", "hospital-box-outline", "heart-pulse"], sound: "sino" },
  { words: ["ler", "leitura", "livro", "paginas", "biblia"], icons: ["book-open-page-variant-outline", "bookshelf", "book-outline"], sound: "livro" },
  { words: ["estudar", "estudo", "prova", "faculdade", "escola", "curso", "trabalho da", "tcc", "aula", "idioma", "ingles", "duolingo"], icons: ["school-outline", "notebook-outline", "pencil-outline"], sound: "livro" },
  { words: ["academia", "treino", "treinar", "musculacao", "exercicio", "alongar", "alongamento"], icons: ["dumbbell", "arm-flex-outline", "weight-lifter"], sound: "treino" },
  { words: ["corrida", "correr", "caminhada", "caminhar", "bicicleta", "pedalar", "futebol"], icons: ["run-fast", "walk", "bike"], sound: "treino" },
  { words: ["mercado", "supermercado", "feira", "compras"], icons: ["cart-outline", "basket-outline", "shopping-outline"] },
  { words: ["delivery", "ifood", "restaurante", "almoco", "jantar", "lanche", "pizza", "comida", "alimentacao"], icons: ["silverware-fork-knife", "food-outline", "pizza"] },
  { words: ["cafe", "padaria"], icons: ["coffee-outline", "bread-slice-outline", "cupcake"] },
  { words: ["uber", "onibus", "transporte", "metro", "passagem"], icons: ["bus", "taxi", "train"] },
  { words: ["combustivel", "gasolina", "alcool", "etanol", "carro", "ipva", "oficina", "moto"], icons: ["gas-station-outline", "car-outline", "motorbike"] },
  { words: ["viagem", "viajar", "ferias", "hotel", "voo"], icons: ["airplane", "bag-suitcase-outline", "palm-tree"] },
  { words: ["cinema", "lazer", "show", "jogo", "games"], icons: ["movie-open-outline", "ticket-outline", "gamepad-variant-outline"] },
  { words: ["musica", "violao", "guitarra", "piano", "cantar"], icons: ["music-note", "guitar-acoustic", "piano"] },
  { words: ["cachorro", "gato", "pet", "racao", "veterinario"], icons: ["paw-outline", "dog", "cat"] },
  { words: ["roupa", "sapato", "tenis", "shopping"], icons: ["tshirt-crew-outline", "shoe-sneaker", "hanger"] },
  { words: ["presente", "aniversario", "natal"], icons: ["gift-outline", "cake-variant-outline", "party-popper"], sound: "sino" },
  { words: ["dormir", "sono", "acordar", "descanso", "pausa"], icons: ["sleep", "bed-outline", "alarm"], sound: "sino" },
  { words: ["meditar", "meditacao", "respirar", "oracao", "orar", "igreja"], icons: ["meditation", "flower-outline", "hands-pray"], sound: "sino" },
  { words: ["limpar", "limpeza", "faxina", "lavar", "louca"], icons: ["broom", "spray-bottle", "washing-machine"] },
  { words: ["filho", "bebe", "crianca", "escolinha"], icons: ["baby-carriage", "human-male-child", "teddy-bear"] },
  { words: ["reuniao", "trabalho", "projeto", "email", "cliente"], icons: ["briefcase-outline", "laptop", "email-outline"] },
];

export const GENERIC_ICONS = ["star-outline", "heart-outline", "flag-outline", "bell-outline", "check-circle-outline", "calendar-outline", "target", "lightning-bolt-outline"];
export const ALL_ICONS = [...new Set([...THEMES.flatMap((t) => t.icons), ...GENERIC_ICONS])];

const clean = (text: string) => `${text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim()}`;
// Palavra inteira, com plural opcional; "*" no fim aceita qualquer terminação.
const hits = (text: string, word: string) => word.endsWith("*") ? text.includes(` ${word.slice(0, -1)}`) : ` ${text} `.includes(` ${word} `) || ` ${text} `.includes(` ${word}s `);
export const themeOf = (text: string) => { const t = clean(text); return THEMES.find((theme) => theme.words.some((w) => hits(t, w))) ?? null; };

/** Ícones sugeridos para o texto, do mais provável ao menos provável. */
export const suggestIcons = (text: string) => themeOf(text)?.icons ?? [];
/** O ícone escolhido, ou o sugerido pelo texto, ou o de reserva. */
export const iconFor = (chosen: string | undefined, text: string, fallback: string) => chosen && ALL_ICONS.includes(chosen) ? chosen : suggestIcons(text)[0] ?? fallback;
export const isSound = (v: unknown): v is SoundId => SOUNDS.some((s) => s.id === v);
/** O som escolhido ou, em "automático", o sugerido pelo texto. */
export const soundFor = (chosen: string | undefined, text: string): SoundId => isSound(chosen) ? chosen : themeOf(text)?.sound ?? "padrao";
