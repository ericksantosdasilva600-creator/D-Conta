/** Identidade do Nyvo: usada na tela Sobre, no suporte e nas diretrizes. */
export const BRAND = {
  name: "Nyvo",
  tagline: "Dinheiro, rotina e estudos num lugar só.",
  mission: "Ajudar pessoas comuns a organizar dinheiro, rotina e estudos num só lugar, de forma simples, gratuita e sem culpa.",
  vision: "Ser o app de organização pessoal preferido de quem trabalha e estuda no Brasil, conhecido por ser fácil, honesto e respeitar a privacidade.",
  values: [
    { title: "Simplicidade", text: "Registrar algo leva segundos. Se precisar de manual, a tela está errada." },
    { title: "Privacidade", text: "Seus dados são seus. Nada de anúncios, rastreamento ou venda de informações." },
    { title: "Sem culpa", text: "Cada um tem seu ritmo. Uma pausa não apaga o progresso." },
    { title: "Clareza", text: "Números e palavras que qualquer pessoa entende, sem juridiquês nem economês." },
    { title: "Acesso para todos", text: "Gratuito, leve e funciona até sem internet." },
    { title: "Ouvir quem usa", text: "As melhorias nascem do feedback de quem usa o Nyvo todo dia." },
  ],
  supportEmail: "ericksantosdasilva600@gmail.com",
  version: "2.1",
};

export const OCCUPATIONS = ["Estudante", "Estagiário(a)", "CLT", "Autônomo(a)", "Empreendedor(a)", "Servidor(a) público(a)", "Freelancer", "Do lar", "Aposentado(a)", "Outro"];
export const INTERESTS = ["Finanças pessoais", "Investimentos", "Sair das dívidas", "Estudos e concursos", "Faculdade", "Academia e saúde", "Leitura", "Produtividade", "Carreira", "Empreender", "Espiritualidade", "Família"];
export const GOALS = ["Controlar gastos", "Juntar dinheiro", "Sair das dívidas", "Criar hábitos", "Organizar estudos", "Ser mais produtivo"];
export const AGE_RANGES = ["Até 17", "18–24", "25–34", "35–44", "45+"];

const TIPS: { match: string[]; text: string }[] = [
  { match: ["Sair das dívidas"], text: "Liste todas as dívidas em Finanças › Dívidas. Ver o total e a data em que você fica livre já tira um peso das costas." },
  { match: ["Juntar dinheiro", "Investimentos", "Finanças pessoais"], text: "Antes de investir, monte a reserva de emergência: de 3 a 6 meses dos seus gastos. Crie a meta em Finanças › Metas." },
  { match: ["Controlar gastos", "Finanças pessoais"], text: "Escreva o gasto assim que pagar: “gastei 23 no lanche”. Leva 3 segundos e o mês fica claro." },
  { match: ["Estudante", "Faculdade", "Organizar estudos", "Estudos e concursos"], text: "Cadastre as datas de provas em Tarefas › Estudos. O Nyvo avisa 3 dias e 1 dia antes." },
  { match: ["Academia e saúde", "Criar hábitos"], text: "Comece com um hábito só e pequeno. Dois minutos por dia vencem uma hora por semana." },
  { match: ["Leitura"], text: "Meta de leitura que funciona: 10 páginas por dia são cerca de 12 livros por ano." },
  { match: ["Produtividade", "Ser mais produtivo", "Carreira"], text: "Use o Pomodoro: 25 minutos de foco, 5 de pausa. Está em Tarefas › Estudos." },
  { match: ["CLT"], text: "Cadastre o salário e as contas fixas no início do mês. O que sobrar, decida para onde vai antes de gastar." },
  { match: ["Autônomo(a)", "Freelancer", "Empreendedor(a)", "Empreender"], text: "Renda variável pede reserva maior: mire em 6 a 12 meses de gastos e separe o dinheiro da empresa do pessoal." },
];

export function tipFor(profile: { occupation: string; interests: string[]; goal: string }, seed = new Date().getDate()) {
  const keys = [profile.occupation, profile.goal, ...profile.interests].filter(Boolean);
  const pool = TIPS.filter((t) => t.match.some((m) => keys.includes(m)));
  const list = pool.length ? pool : TIPS;
  return list[seed % list.length].text;
}
