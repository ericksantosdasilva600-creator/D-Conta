// Cálculos das calculadoras do Dá Conta. Tudo roda no navegador; nada é enviado.
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
  // CLT, arts. 130, 142 e 143. Férias e terço pagam INSS e IR (em separado do salário do mês); o abono é isento,
  // mas o terço sobre ele entra no IR (Solução de Consulta Cosit nº 209/2021).
  function diasFerias(faltas) {
    var f = faltas || 0;
    return f <= 5 ? 30 : f <= 14 ? 24 : f <= 23 ? 18 : f <= 32 ? 12 : 0;
  }
  function ferias(salario, media, faltas, vender, dependentes) {
    var direito = diasFerias(faltas), vendidos = vender ? Math.floor(direito / 3) : 0, gozo = direito - vendidos;
    var dia = (salario + (media || 0)) / 30;
    var valor = dia * gozo, terco = valor / 3, abono = dia * vendidos, tercoAbono = abono / 3;
    var i = inss(cents(valor + terco)), tributavel = valor + terco + tercoAbono;
    var legal = tributavel - i - (dependentes || 0) * DEPENDENTE;
    var irrf = comReducao(Math.min(tabelaIR(legal), tabelaIR(tributavel - SIMPLIFICADO)), tributavel);
    var bruto = cents(valor + terco + abono + tercoAbono);
    return { direito: direito, gozo: gozo, vendidos: vendidos, ferias: cents(valor), terco: cents(terco), abono: cents(abono + tercoAbono), bruto: bruto, inss: i, irrf: irrf, liquido: cents(bruto - i - irrf) };
  }
  function reserva(gasto, meses, guardado, aporte) {
    var meta = cents(gasto * meses), falta = Math.max(0, cents(meta - (guardado || 0)));
    return { meta: meta, falta: falta, mesesAteMeta: falta === 0 ? 0 : aporte > 0 ? Math.ceil(falta / aporte) : null };
  }
  function horasExtras(salario, jornada, horas, adicional) {
    var hora = salario / (jornada || 220), extra = hora * (1 + (adicional === undefined ? 50 : adicional) / 100);
    return { hora: cents(hora), extra: cents(extra), total: cents(extra * horas) };
  }
  function orcamento(renda) {
    return { essenciais: cents(renda * 0.5), desejos: cents(renda * 0.3), futuro: cents(renda * 0.2) };
  }
  // Taxa mensal embutida na compra: resolve à vista = parcela × (1 − (1 + i)^−n) / i.
  function parcelamento(vista, parcela, n) {
    var total = cents(parcela * n), juros = cents(total - vista);
    if (total <= vista) return { total: total, juros: juros, taxa: 0 };
    var baixo = 0, alto = 10;
    for (var k = 0; k < 200; k++) {
      var i = (baixo + alto) / 2, presente = parcela * (1 - Math.pow(1 + i, -n)) / i;
      if (presente > vista) baixo = i; else alto = i;
    }
    return { total: total, juros: juros, taxa: Math.round(((baixo + alto) / 2) * 10000) / 100 };
  }
  function desafio52(inicial) {
    var semanas = [];
    for (var s = 1; s <= 52; s++) semanas.push(cents(inicial * s));
    return { semanas: semanas, total: cents(inicial * 1378) };
  }
  root.DaContaCalc = { inss: inss, salarioLiquido: salarioLiquido, decimoTerceiro: decimoTerceiro, diasFerias: diasFerias, ferias: ferias, reserva: reserva, horasExtras: horasExtras, orcamento: orcamento, parcelamento: parcelamento, desafio52: desafio52 };

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
  telas.ferias = function () {
    var s = num("salario");
    if (!s) return null;
    var r = ferias(s, num("media"), Math.floor(num("faltas")), document.getElementById("vender").value === "1", num("dependentes"));
    if (!r.direito) return '<p class="note">Com mais de 32 faltas sem justificativa, a CLT não prevê férias nesse período.</p>';
    var itens = [["Férias de " + r.gozo + " dias", r.ferias], ["Um terço das férias", r.terco]];
    if (r.vendidos) itens.push(["Venda de " + r.vendidos + " dias, com o terço", r.abono]);
    return linhas(itens.concat([["INSS", r.inss], ["Imposto de Renda", r.irrf], ["Total líquido das férias", r.liquido, 1]]));
  };
  telas.horas = function () {
    var s = num("salario");
    if (!s) return null;
    var r = horasExtras(s, num("jornada") || 220, num("horas"), parseFloat(document.getElementById("adicional").value));
    return linhas([["Sua hora normal", r.hora], ["Sua hora extra", r.extra], ["Total das horas extras", r.total, 1]]);
  };
  telas.orcamento = function () {
    var v = num("renda");
    if (!v) return null;
    var r = orcamento(v);
    return linhas([["50% para o essencial", r.essenciais], ["30% para o que você quer", r.desejos], ["20% para o futuro", r.futuro]]);
  };
  telas.parcelar = function () {
    var v = num("vista"), p = num("parcela"), n = Math.floor(num("vezes"));
    if (!v || !p || !n) return null;
    var r = parcelamento(v, p, n);
    var taxa = r.taxa.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    var txt = r.juros > 0 ? "Esse parcelamento embute cerca de " + taxa + "% de juros ao mês. Compare com o que o seu dinheiro renderia guardado." : "Não há juros: o total parcelado não passa do preço à vista.";
    return linhas([["Total parcelado", r.total], [r.juros > 0 ? "Juros pagos" : "Economia ou diferença", Math.abs(r.juros), 1]]) + '<p class="note">' + txt + "</p>";
  };
  var CHAVE = "nyvo.desafio52";
  var lerMarcas = function () { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } };
  var gravar = function (d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} };
  function resumoDesafio() {
    var boxes = document.querySelectorAll("#semanas input"), soma = 0, feitas = 0;
    boxes.forEach(function (b) { if (b.checked) { soma += parseFloat(b.value); feitas++; } });
    var el = document.getElementById("guardado52");
    if (el) el.textContent = feitas + " de 52 semanas · " + brl(soma) + " guardados";
  }
  telas.desafio = function () {
    var v = num("inicial");
    if (!v) return null;
    var r = desafio52(v), d = lerMarcas(), marcadas = d.inicial === v ? d.marcadas || [] : [];
    var grade = r.semanas.map(function (x, i) {
      return '<label><input type="checkbox" value="' + x + '" data-s="' + (i + 1) + '"' + (marcadas.indexOf(i + 1) >= 0 ? " checked" : "") + "><span>Sem. " + (i + 1) + "</span><b>" + brl(x) + "</b></label>";
    }).join("");
    setTimeout(resumoDesafio, 0);
    return linhas([["Total em 52 semanas", r.total, 1]]) + '<p class="note" id="guardado52"></p><div id="semanas" class="weeks" data-inicial="' + v + '">' + grade + "</div>";
  };
  document.addEventListener("change", function (e) {
    var g = document.getElementById("semanas");
    if (!g || !g.contains(e.target)) return;
    var marcadas = [];
    g.querySelectorAll("input:checked").forEach(function (b) { marcadas.push(Number(b.dataset.s)); });
    gravar({ inicial: Number(g.dataset.inicial), marcadas: marcadas });
    resumoDesafio();
  });
  function pomodoro(box) {
    var tempos = { foco: 25, pausa: 5 }, modo = "foco", resta = tempos.foco * 60, fim = 0, rel = null, ciclos = 0;
    var tela = box.querySelector("#tempo"), iniciar = box.querySelector("#iniciar"), info = box.querySelector("#ciclos"), titulo = document.title;
    function bip() { try { var a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(); o.connect(a.destination); o.start(); o.stop(a.currentTime + 0.4); } catch (e) {} }
    function mostra() {
      var m = String(Math.floor(resta / 60)).padStart(2, "0"), s = String(resta % 60).padStart(2, "0");
      tela.textContent = m + ":" + s;
      document.title = rel ? m + ":" + s + " · " + (modo === "foco" ? "Foco" : "Pausa") : titulo;
      info.textContent = ciclos === 1 ? "1 ciclo concluído" : ciclos + " ciclos concluídos";
    }
    function para() { clearInterval(rel); rel = null; iniciar.textContent = "Iniciar"; }
    function troca(novo) {
      para(); modo = novo; resta = tempos[novo] * 60;
      box.querySelectorAll("[data-modo]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.modo === novo)); });
      mostra();
    }
    iniciar.addEventListener("click", function () {
      if (rel) { para(); mostra(); return; }
      fim = Date.now() + resta * 1000; iniciar.textContent = "Pausar";
      rel = setInterval(function () {
        resta = Math.max(0, Math.round((fim - Date.now()) / 1000));
        if (resta === 0) { bip(); if (modo === "foco") ciclos++; troca(modo === "foco" ? "pausa" : "foco"); return; }
        mostra();
      }, 250);
      mostra();
    });
    box.querySelector("#zerar").addEventListener("click", function () { troca(modo); });
    box.querySelectorAll("[data-modo]").forEach(function (b) { b.addEventListener("click", function () { troca(b.dataset.modo); }); });
    mostra();
  }
  document.addEventListener("DOMContentLoaded", function () {
    var pomo = document.getElementById("pomodoro");
    if (pomo) pomodoro(pomo);
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
