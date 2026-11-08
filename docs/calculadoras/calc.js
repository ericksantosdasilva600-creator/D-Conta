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
  // Rescisão (CLT, arts. 146, 477, 484-A e 487; Lei 4.090/1962; Lei 12.506/2011; Súmulas 171 e 261 do TST).
  // Datas em "AAAA-MM-DD". Aviso indenizado, férias indenizadas com o terço e multa do FGTS não têm INSS nem IR
  // (Nota PGFN 485/2016; Receita Federal). O 13º paga INSS e IR em separado; o saldo de salário, como um salário.
  var DIA = 86400000;
  function dataUTC(s) { var p = String(s || "").split("-"); var t = Date.UTC(+p[0], +p[1] - 1, +p[2]); return isNaN(t) ? null : t; }
  function maisMeses(t, n) {
    var d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth() + n, dia = d.getUTCDate();
    var ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Date.UTC(y, m, Math.min(dia, ultimo));
  }
  function anosCompletos(adm, fim) { var k = 0; while (maisMeses(adm, 12 * (k + 1)) <= fim + DIA) k++; return k; }
  function avosDecimo(adm, fim) {
    var ano = new Date(fim).getUTCFullYear(), avos = 0;
    for (var m = 0; m < 12; m++) {
      var ini = Math.max(Date.UTC(ano, m, 1), adm), fimMes = Math.min(Date.UTC(ano, m + 1, 0), fim);
      if (fimMes >= ini && (fimMes - ini) / DIA + 1 >= 15) avos++;
    }
    return avos;
  }
  function avosFerias(adm, fim) {
    var ini = maisMeses(adm, 12 * anosCompletos(adm, fim)), m = 0;
    while (maisMeses(ini, m + 1) <= fim + DIA) m++;
    if ((fim + DIA - maisMeses(ini, m)) / DIA > 14) m++;
    return Math.min(12, m);
  }
  function rescisao(p) {
    var adm = dataUTC(p.admissao), saida = dataUTC(p.saida), sal = p.salario || 0, tipo = p.tipo || "sem";
    if (adm === null || saida === null || saida < adm) return null;
    var dia = sal / 30, d = new Date(saida);
    var ultimoDoMes = d.getUTCDate() === new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    var inicioMes = Math.max(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1), adm);
    var diasSaldo = ultimoDoMes && inicioMes === Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) ? 30 : Math.min(30, (saida - inicioMes) / DIA + 1);
    var anos = anosCompletos(adm, saida), diasAviso = 0, aviso = 0, projetado = saida;
    if ((tipo === "sem" || tipo === "acordo") && p.avisoIndenizado) {
      // No acordo, o aviso indenizado sai pela metade; aqui o tempo projetado também é a metade.
      var cheio = 30 + 3 * Math.min(20, anos), metade = tipo === "acordo";
      diasAviso = metade ? Math.floor(cheio / 2) : cheio;
      aviso = dia * (metade ? cheio / 2 : cheio);
      projetado = saida + diasAviso * DIA;
    }
    var justa = tipo === "justa";
    var avos13 = justa ? 0 : avosDecimo(adm, projetado), avosF = justa ? 0 : avosFerias(adm, projetado);
    var decimo = sal * avos13 / 12, vencidas = sal * (p.vencidas || 0) * 4 / 3, proporcionais = sal * avosF / 12 * 4 / 3;
    var saldo = dia * diasSaldo;
    var mult = tipo === "sem" ? 0.4 : tipo === "acordo" ? 0.2 : 0;
    var multa = mult && p.fgts > 0 ? (p.fgts + 0.08 * (saldo + aviso + decimo)) * mult : 0;
    var liq = salarioLiquido(cents(saldo), p.dependentes);
    var d13 = decimoTerceiro(sal, avos13, 0, p.dependentes);
    var adiantamento = Math.min(cents(p.adiantamento || 0), d13.bruto);
    var bruto = cents(saldo + aviso + decimo + vencidas + proporcionais + multa);
    var inssT = cents(liq.inss + d13.inss), irT = cents(liq.irrf + d13.irrf);
    return {
      anos: anos, diasSaldo: diasSaldo, saldo: cents(saldo), diasAviso: diasAviso, aviso: cents(aviso), avos13: avos13, decimo: cents(decimo),
      vencidas: cents(vencidas), avosFerias: avosF, proporcionais: cents(proporcionais), multa: cents(multa), percMulta: mult * 100,
      bruto: bruto, inss: inssT, irrf: irT, adiantamento: adiantamento, liquido: cents(bruto - inssT - irT - adiantamento)
    };
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
  // Juros compostos com aporte no fim de cada mês: M = C(1 + i)^n + A[(1 + i)^n − 1] / i.
  // Taxa anual vira mensal equivalente: (1 + a)^(1/12) − 1. Não considera Imposto de Renda nem taxas.
  function jurosCompostos(inicial, aporte, taxa, anual, meses) {
    var c = inicial || 0, a = aporte || 0, n = Math.max(0, Math.round(meses || 0));
    var i = anual ? Math.pow(1 + (taxa || 0) / 100, 1 / 12) - 1 : (taxa || 0) / 100;
    var anos = [], saldo = c;
    for (var m = 1; m <= n; m++) {
      saldo = saldo * (1 + i) + a;
      if (m % 12 === 0 || m === n) anos.push({ mes: m, investido: cents(c + a * m), total: cents(saldo) });
    }
    var final = n === 0 ? c : i === 0 ? c + a * n : c * Math.pow(1 + i, n) + a * (Math.pow(1 + i, n) - 1) / i;
    var investido = cents(c + a * n), total = cents(final);
    return { taxaMensal: Math.round(i * 1e6) / 1e4, investido: investido, juros: cents(total - investido), total: total, anos: anos };
  }
  // Quanto rende: poupança, CDB e LCI/LCA no mesmo prazo, com aporte no fim de cada mês.
  // Poupança (Lei 8.177, art. 12, com a Lei 12.703): 0,5% ao mês + TR se a meta Selic passar de 8,5% ao ano;
  // senão, 70% da Selic ao ano em base mensal + TR. Poupança e LCI/LCA são isentas de IR para pessoa física.
  // CDB: IR regressivo da Receita (até 180 dias 22,5%; até 360, 20%; até 720, 17,5%; acima, 15%), cobrado só sobre o
  // rendimento de cada depósito pelo tempo que ele ficou aplicado. CDI estimado como Selic − 0,10 ponto. Sem IOF (prazo ≥ 1 mês).
  function aliquotaIR(dias) { return dias <= 180 ? 0.225 : dias <= 360 ? 0.2 : dias <= 720 ? 0.175 : 0.15; }
  function quantoRende(o) {
    var c = o.inicial || 0, a = o.aporte || 0, n = Math.max(1, Math.round(o.meses || 0));
    var selic = (o.selic || 0) / 100, tr = (o.tr || 0) / 100, cdi = Math.max(0, selic - 0.001);
    var mensal = function (anual) { return Math.pow(1 + anual, 1 / 12) - 1; };
    var juroPoup = selic > 0.085 ? 0.005 : mensal(0.7 * selic);
    var taxas = { poupanca: (1 + juroPoup) * (1 + tr) - 1, cdb: mensal(cdi * (o.pctCdb === undefined ? 100 : o.pctCdb) / 100), lci: mensal(cdi * (o.pctLci === undefined ? 90 : o.pctLci) / 100) };
    var investido = cents(c + a * n), saida = {};
    Object.keys(taxas).forEach(function (k) {
      var i = taxas[k], bruto = 0, ir = 0;
      // depósito inicial no mês 0 e um aporte no fim de cada mês 1..n
      for (var m = 0; m <= n; m++) {
        var v = m === 0 ? c : a;
        if (!v) continue;
        var meses = n - m, final = v * Math.pow(1 + i, meses);
        bruto += final;
        if (k === "cdb") ir += (final - v) * aliquotaIR(Math.round(meses * 365 / 12));
      }
      bruto = cents(bruto); ir = cents(ir);
      saida[k] = { taxaMensal: Math.round(i * 1e6) / 1e4, bruto: bruto, ir: ir, liquido: cents(bruto - ir), ganho: cents(bruto - ir - investido) };
    });
    saida.investido = investido; saida.cdi = Math.round(cdi * 1e4) / 100; saida.aliquotaInicial = aliquotaIR(Math.round(n * 365 / 12)) * 100;
    return saida;
  }
  // Plano para quitar dívidas: compara avalanche (maiores juros primeiro) e bola de neve (menor saldo primeiro).
  // Todo mês: juros entram no saldo, cada dívida recebe o mínimo e o que sobra do orçamento (soma dos mínimos + extra)
  // vai para a dívida da vez. Quando uma dívida acaba, o mínimo dela passa a ajudar as outras. Matemática pura, sem regra legal.
  function quitarDividas(o) {
    var lista = (o.dividas || []).filter(function (d) { return d && d.saldo > 0; }).map(function (d, i) {
      return { nome: d.nome || "Dívida " + (i + 1), saldo: d.saldo, inicial: d.saldo, taxa: (d.juros || 0) / 100, minimo: Math.max(0, d.minimo || 0), fim: 0 };
    });
    if (!lista.length) return null;
    var ordem = lista.slice().sort(o.metodo === "bola" ?
      function (a, b) { return a.inicial - b.inicial || b.taxa - a.taxa; } :
      function (a, b) { return b.taxa - a.taxa || a.inicial - b.inicial; });
    var orcamento = lista.reduce(function (s, d) { return s + d.minimo; }, 0) + Math.max(0, o.extra || 0);
    var juros = 0, pago = 0, mes = 0, LIMITE = 600;
    while (lista.some(function (d) { return d.saldo > 0.005; })) {
      if (++mes > LIMITE) return { impossivel: true, orcamento: cents(orcamento) };
      var antes = juros;
      lista.forEach(function (d) { if (d.saldo > 0.005) { var j = d.saldo * d.taxa; juros += j; d.saldo += j; } });
      var resta = orcamento;
      lista.forEach(function (d) { if (d.saldo > 0.005) { var p = Math.min(d.minimo, d.saldo, resta); d.saldo -= p; resta -= p; } });
      for (var k = 0; k < ordem.length && resta > 0.005; k++) {
        var d = ordem[k];
        if (d.saldo <= 0.005) continue;
        var p = Math.min(d.saldo, resta); d.saldo -= p; resta -= p;
      }
      pago += orcamento - resta;
      lista.forEach(function (d) { if (!d.fim && d.saldo <= 0.005) { d.saldo = 0; d.fim = mes; } });
      // se a dívida total não cai no primeiro mês, o orçamento não cobre nem os juros
      if (mes === 1 && orcamento <= juros - antes + 0.005) return { impossivel: true, orcamento: cents(orcamento) };
    }
    return { impossivel: false, meses: mes, juros: cents(juros), pago: cents(pago), orcamento: cents(orcamento),
      ordem: ordem.map(function (d) { return { nome: d.nome, mes: d.fim }; }) };
  }
  // Rotativo do cartão (Res. CMN 4.549/2017, com a Res. CMN 5.112/2023, e Lei 14.690/2023, art. 28): o saldo não pago
  // fica no rotativo só até a fatura seguinte; depois pode virar parcelamento. Juros e encargos somados não podem
  // passar do valor original da dívida. Parcelas pela Tabela Price. Não considera IOF, multa nem novas compras.
  function rotativo(o) {
    var saldo = cents(Math.max(0, (o.fatura || 0) - (o.pago || 0)));
    var tr = Math.max(0, o.taxaRotativo || 0) / 100, tp = Math.max(0, o.taxaParcelado || 0) / 100;
    var n = Math.max(1, Math.round(o.parcelas || 1));
    var jurosRot = cents(Math.min(saldo * tr, saldo));
    var proxima = cents(saldo + jurosRot);
    var semTeto = tp > 0 ? proxima * tp / (1 - Math.pow(1 + tp, -n)) : proxima / n;
    var jurosParc = cents(semTeto * n - proxima), teto = false;
    if (jurosRot + jurosParc > saldo + 0.005) { teto = true; jurosParc = cents(saldo - jurosRot); }
    var parcela = cents((proxima + jurosParc) / n);
    return { saldo: saldo, jurosRotativo: jurosRot, proximaFatura: proxima, parcela: parcela, parcelas: n,
      jurosParcelado: jurosParc, jurosTotal: cents(jurosRot + jurosParc), totalPago: cents(saldo + jurosRot + jurosParc),
      teto: teto, limiteJuros: saldo, taxaAnual: Math.round((Math.pow(1 + tr, 12) - 1) * 10000) / 100 };
  }
  function desafio52(inicial) {
    var semanas = [];
    for (var s = 1; s <= 52; s++) semanas.push(cents(inicial * s));
    return { semanas: semanas, total: cents(inicial * 1378) };
  }
  root.DaContaCalc = { inss: inss, salarioLiquido: salarioLiquido, decimoTerceiro: decimoTerceiro, diasFerias: diasFerias, ferias: ferias, rescisao: rescisao, avosDecimo: avosDecimo, avosFerias: avosFerias, reserva: reserva, horasExtras: horasExtras, orcamento: orcamento, parcelamento: parcelamento, jurosCompostos: jurosCompostos, aliquotaIR: aliquotaIR, quantoRende: quantoRende, quitarDividas: quitarDividas, rotativo: rotativo, desafio52: desafio52 };

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
  telas.rescisao = function () {
    var s = num("salario"), tipo = document.getElementById("tipo").value;
    if (!s) return null;
    var r = rescisao({ salario: s, admissao: document.getElementById("admissao").value, saida: document.getElementById("saida").value, tipo: tipo,
      avisoIndenizado: document.getElementById("aviso").value === "1", vencidas: Math.floor(num("vencidas")), fgts: num("fgts"), adiantamento: num("adiantamento"), dependentes: num("dependentes") });
    if (!r) return '<p class="note">Confira as datas: a saída precisa ser depois da admissão.</p>';
    var itens = [["Saldo de salário (" + r.diasSaldo + (r.diasSaldo === 1 ? " dia)" : " dias)"), r.saldo]];
    if (r.aviso) itens.push(["Aviso prévio indenizado (" + (tipo === "acordo" ? "metade de " + (30 + 3 * Math.min(20, r.anos)) : r.diasAviso) + " dias)", r.aviso]);
    if (r.avos13) itens.push(["13º proporcional (" + r.avos13 + "/12)", r.decimo]);
    if (r.vencidas) itens.push(["Férias vencidas com o terço", r.vencidas]);
    if (r.avosFerias) itens.push(["Férias proporcionais (" + r.avosFerias + "/12) com o terço", r.proporcionais]);
    if (r.multa) itens.push(["Multa de " + r.percMulta + "% do FGTS", r.multa]);
    itens.push(["INSS", r.inss], ["Imposto de Renda", r.irrf]);
    if (r.adiantamento) itens.push(["Adiantamento do 13º já recebido", r.adiantamento]);
    itens.push(["Total líquido estimado", r.liquido, 1]);
    var notas = { sem: "Você também pode sacar todo o FGTS e pedir o seguro-desemprego, se cumprir os requisitos.", acordo: "No acordo você saca até 80% do FGTS e não tem seguro-desemprego.", pedido: "Quem pede demissão não saca o FGTS nem recebe seguro-desemprego. Se não cumprir o aviso, a empresa pode descontar até um salário.", justa: "Na justa causa a lei não paga 13º nem férias proporcionais. Há decisões do TST que garantem as férias proporcionais; vale consultar o sindicato." };
    var fgts = (tipo === "sem" || tipo === "acordo") && !num("fgts") ? " Informe o saldo do FGTS para estimar a multa." : "";
    return linhas(itens) + '<p class="note">' + notas[tipo] + fgts + "</p>";
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
  telas.juros = function () {
    var c = num("inicial"), a = num("aporte"), t = num("taxa"), p = num("prazo");
    if (!(c || a) || !p) return null;
    var emAnos = document.getElementById("unidadePrazo").value === "anos";
    var meses = Math.min(1200, Math.round(emAnos ? p * 12 : p));
    var r = jurosCompostos(c, a, t, document.getElementById("unidadeTaxa").value === "ano", meses);
    var pct = function (v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 4 }); };
    var tabela = r.anos.length > 1 ? '<table><thead><tr><th>Período</th><th>Investido</th><th>Total</th></tr></thead><tbody>' + r.anos.map(function (x) {
      var rot = x.mes % 12 === 0 ? (x.mes / 12) + (x.mes === 12 ? " ano" : " anos") : x.mes + (x.mes === 1 ? " mês" : " meses");
      return "<tr><td>" + rot + "</td><td>" + brl(x.investido) + "</td><td>" + brl(x.total) + "</td></tr>";
    }).join("") + "</tbody></table>" : "";
    return linhas([["Total investido", r.investido], ["Juros ganhos", r.juros], ["Valor final estimado", r.total, 1]]) +
      '<p class="note">Taxa usada: ' + pct(r.taxaMensal) + "% ao mês, em " + meses + (meses === 1 ? " mês" : " meses") + ". É uma estimativa sem Imposto de Renda e taxas.</p>" + tabela;
  };
  telas.rende = function () {
    var c = num("inicial"), a = num("aporte"), meses = Math.min(600, Math.round(num("meses")));
    if (!(c || a) || !meses) return null;
    var pCdb = num("pctCdb") || 100, pLci = num("pctLci") || 90;
    var r = quantoRende({ inicial: c, aporte: a, meses: meses, selic: num("selic") || 13.75, tr: num("tr"), pctCdb: pCdb, pctLci: pLci });
    var nomes = { poupanca: "Poupança", cdb: "CDB (" + pCdb.toLocaleString("pt-BR") + "% do CDI)", lci: "LCI ou LCA (" + pLci.toLocaleString("pt-BR") + "% do CDI)" };
    var ordem = ["poupanca", "cdb", "lci"].sort(function (x, y) { return r[y].liquido - r[x].liquido; });
    var pct = function (v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }); };
    var tabela = '<table><thead><tr><th>Opção</th><th>Imposto</th><th>Você recebe</th></tr></thead><tbody>' + ordem.map(function (k, j) {
      return "<tr><td>" + (j === 0 ? "<b>" + nomes[k] + "</b>" : nomes[k]) + "</td><td>" + brl(r[k].ir) + "</td><td>" + (j === 0 ? "<b>" + brl(r[k].liquido) + "</b>" : brl(r[k].liquido)) + "</td></tr>";
    }).join("") + "</tbody></table>";
    var melhor = r[ordem[0]];
    return linhas([["Total que você vai guardar", r.investido], ["Ganho líquido na melhor opção", melhor.ganho], ["Melhor opção: " + nomes[ordem[0]], melhor.liquido, 1]]) + tabela +
      '<p class="note">Em ' + meses + (meses === 1 ? " mês" : " meses") + ", com CDI estimado em " + pct(r.cdi) + "% ao ano. Poupança rendendo " + pct(r.poupanca.taxaMensal) + "% ao mês. No CDB, o Imposto de Renda do valor inicial fica em " + pct(r.aliquotaInicial) + "%; cada depósito mensal paga conforme o tempo que ficou aplicado. É uma estimativa: taxas mudam e não há garantia de rendimento.</p>";
  };
  telas.dividas = function () {
    var dividas = [];
    for (var i = 1; i <= 6; i++) {
      var el = document.getElementById("saldo" + i);
      if (!el || !num("saldo" + i)) continue;
      dividas.push({ nome: document.getElementById("nome" + i).value.trim().slice(0, 40), saldo: num("saldo" + i), juros: num("juros" + i), minimo: num("minimo" + i) });
    }
    if (!dividas.length) return null;
    var extra = num("extra"), av = quitarDividas({ dividas: dividas, extra: extra, metodo: "avalanche" }), bo = quitarDividas({ dividas: dividas, extra: extra, metodo: "bola" });
    if (av.impossivel) return '<p class="note">Com ' + brl(av.orcamento) + " por mês, as dívidas não acabam em 50 anos: o pagamento não cobre os juros. Aumente o valor extra, confira os pagamentos mínimos ou procure renegociar os juros com o credor.</p>";
    var esc = function (t) { return t.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var tempo = function (m) { var a = Math.floor(m / 12), r = m % 12; return (a ? a + (a === 1 ? " ano" : " anos") : "") + (a && r ? " e " : "") + (r ? r + (r === 1 ? " mês" : " meses") : ""); };
    var melhor = bo.juros < av.juros - 0.005 ? bo : av, nomeMelhor = melhor === av ? "Avalanche" : "Bola de neve";
    var tabela = '<table><thead><tr><th>Método</th><th>Prazo</th><th>Juros pagos</th></tr></thead><tbody>' +
      "<tr><td>Avalanche: maiores juros primeiro</td><td>" + tempo(av.meses) + "</td><td>" + brl(av.juros) + "</td></tr>" +
      "<tr><td>Bola de neve: menor dívida primeiro</td><td>" + tempo(bo.meses) + "</td><td>" + brl(bo.juros) + "</td></tr></tbody></table>";
    var ordem = '<p class="note"><b>Ordem no método ' + nomeMelhor.toLowerCase() + ":</b></p><ol>" + melhor.ordem.map(function (d) { return "<li>" + esc(d.nome) + ": quitada no mês " + d.mes + "</li>"; }).join("") + "</ol>";
    var dif = cents(Math.abs(av.juros - bo.juros));
    var txt = dif < 0.01 ? "Aqui os dois métodos dão o mesmo resultado." : melhor === av ? "A avalanche economiza " + brl(dif) + " em juros. A bola de neve quita a primeira dívida mais cedo, o que ajuda a manter o ânimo." : "Aqui a bola de neve sai " + brl(dif) + " mais barata em juros e ainda quita a primeira dívida mais cedo.";
    return linhas([["Você vai pagar por mês", melhor.orcamento], ["Juros até quitar tudo", melhor.juros]]) +
      '<div class="line total"><span>Livre das dívidas em</span><b>' + tempo(melhor.meses) + "</b></div>" +
      tabela + ordem + '<p class="note">' + txt + " É uma estimativa: considera juros fixos e pagamentos em dia, sem multas, tarifas, IOF ou renegociação.</p>";
  };
  telas.rotativo = function () {
    var f = num("fatura");
    if (!f) return null;
    var r = rotativo({ fatura: f, pago: num("pago"), taxaRotativo: num("taxaRot"), taxaParcelado: num("taxaParc"), parcelas: Math.min(24, Math.floor(num("parcelas")) || 12) });
    if (!r.saldo) return '<p class="note">Você vai pagar a fatura inteira, então não entra nada no rotativo e não há juros. Continue assim!</p>';
    var pct = function (v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }); };
    var teto = r.teto ? '<p class="note"><b>Aqui entra o teto:</b> pelas parcelas e taxas informadas, os juros passariam de ' + brl(r.limiteJuros) + ". Pela lei, juros e encargos somados não podem passar do valor original da dívida, então a calculadora limitou a conta a esse valor. Se o banco cobrar mais, reclame no SAC, na ouvidoria e no Procon.</p>" : "";
    return linhas([["Vai para o rotativo", r.saldo], ["Juros de 1 mês no rotativo", r.jurosRotativo], ["Fica para a próxima fatura", r.proximaFatura, 1]]) +
      '<p class="note">Uma taxa de ' + pct(num("taxaRot")) + "% ao mês equivale a cerca de " + pct(r.taxaAnual) + "% ao ano. O rotativo só pode durar até a fatura seguinte: se não der para pagar tudo nela, o banco pode oferecer um parcelamento.</p>" +
      "<h3>Se parcelar na fatura seguinte</h3>" +
      linhas([[r.parcelas + "x de", r.parcela], ["Juros do rotativo e do parcelamento", r.jurosTotal], ["Total pago pela dívida", r.totalPago, 1]]) + teto +
      '<p class="note">É uma estimativa com juros fixos e pagamentos em dia. Não inclui IOF, multa, juros de atraso nem compras novas. Confira as taxas e o Custo Efetivo Total (CET) na sua fatura.</p>';
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
