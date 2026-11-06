// Cálculos das calculadoras do Nyvo. Tudo roda no navegador; nada é enviado.
// Tabelas de 2026: Portaria Interministerial MPS/MF nº 13/2026 (INSS) e Leis 15.191/2025 e 15.270/2025 (IRRF).
(function (root) {
  var INSS = [[1621.00, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
  var IR = [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]];
  var DEPENDENTE = 189.59, SIMPLIFICADO = 607.20;
  function cents(v) { return Math.round(Number((v * 100).toFixed(6))) / 100; }
  function inss(bruto) {
    var total = 0, anterior = 0;
    for (var i = 0; i < INSS.length; i++) {
      var teto = INSS[i][0];
      if (bruto <= anterior) break;
      total += (Math.min(bruto, teto) - anterior) * INSS[i][1];
      anterior = teto;
    }
    return cents(total);
  }
  function tabelaIR(base) {
    if (base <= 0) return 0;
    for (var i = 0; i < IR.length; i++) if (base <= IR[i][0]) return Math.max(0, base * IR[i][1] - IR[i][2]);
    return 0;
  }
  // Redução da Lei 15.270/2025: zera o imposto até R$ 5.000 e cai até sumir em R$ 7.350.
  function comReducao(imposto, rendimento) {
    if (rendimento <= 5000) return 0;
    if (rendimento > 7350) return cents(imposto);
    return cents(Math.max(0, imposto - Math.max(0, 978.62 - 0.133145 * rendimento)));
  }
  function salarioLiquido(bruto, dependentes, outros) {
    var i = inss(bruto), legal = bruto - i - (dependentes || 0) * DEPENDENTE;
    var imposto = Math.min(tabelaIR(legal), tabelaIR(bruto - SIMPLIFICADO));
    var irrf = comReducao(imposto, bruto);
    return { bruto: cents(bruto), inss: i, irrf: irrf, outros: cents(outros || 0), liquido: cents(bruto - i - irrf - (outros || 0)) };
  }
  function decimoTerceiro(salario, meses, media, dependentes) {
    var bruto = cents((salario + (media || 0)) * meses / 12);
    var i = inss(bruto), base = bruto - i - (dependentes || 0) * DEPENDENTE;
    var irrf = comReducao(tabelaIR(base), bruto);
    var primeira = cents(bruto / 2);
    return { bruto: bruto, inss: i, irrf: irrf, primeira: primeira, segunda: cents(bruto - primeira - i - irrf), liquido: cents(bruto - i - irrf) };
  }
  function reserva(gasto, meses, guardado, aporte) {
    var meta = cents(gasto * meses), falta = Math.max(0, cents(meta - (guardado || 0)));
    return { meta: meta, falta: falta, mesesAteMeta: falta === 0 ? 0 : aporte > 0 ? Math.ceil(falta / aporte) : null };
  }
  root.NyvoCalc = { inss: inss, salarioLiquido: salarioLiquido, decimoTerceiro: decimoTerceiro, reserva: reserva };

  if (typeof document === "undefined") return;
  var brl = function (v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  var num = function (id) { var el = document.getElementById(id); return el ? Math.max(0, parseFloat(el.value) || 0) : 0; };
  var linhas = function (itens) {
    return itens.map(function (x) { return '<div class="line' + (x[2] ? " total" : "") + '"><span>' + x[0] + "</span><b>" + brl(x[1]) + "</b></div>"; }).join("");
  };
  var telas = {
    decimo: function () {
      var s = num("salario"), m = Math.min(12, Math.max(1, num("meses") || 12));
      if (!s) return null;
      var r = decimoTerceiro(s, m, num("media"), num("dependentes"));
      return linhas([["1ª parcela, sem descontos", r.primeira], ["2ª parcela, já com os descontos", r.segunda], ["INSS", r.inss], ["Imposto de Renda", r.irrf], ["Total líquido do 13º", r.liquido, 1]]);
    },
    liquido: function () {
      var s = num("salario");
      if (!s) return null;
      var r = salarioLiquido(s, num("dependentes"), num("outros"));
      return linhas([["Salário bruto", r.bruto], ["INSS", r.inss], ["Imposto de Renda", r.irrf], ["Outros descontos", r.outros], ["Salário líquido", r.liquido, 1]]);
    },
    reserva: function () {
      var g = num("gasto");
      if (!g) return null;
      var r = reserva(g, num("mesesReserva") || 6, num("guardado"), num("aporte"));
      var prazo = r.falta === 0 ? "Sua reserva já chegou à meta." : r.mesesAteMeta ? "No ritmo informado, faltam " + r.mesesAteMeta + (r.mesesAteMeta === 1 ? " mês." : " meses.") : "Informe quanto pode guardar por mês para ver o prazo.";
      return linhas([["Meta da reserva", r.meta], ["Quanto falta", r.falta, 1]]) + '<p class="note">' + prazo + "</p>";
    },
  };
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("form[data-calc]");
    if (!form) return;
    var saida = document.getElementById("resultado"), acoes = document.getElementById("depois");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var html = telas[form.dataset.calc]();
      saida.hidden = false;
      saida.innerHTML = html || '<p class="note">Preencha o primeiro campo para calcular.</p>';
      acoes.hidden = !html;
      saida.focus();
    });
  });
})(globalThis);
