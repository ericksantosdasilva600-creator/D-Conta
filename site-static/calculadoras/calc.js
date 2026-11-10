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
    // Como no salário e nas férias, vale o menor imposto entre as deduções legais e o desconto simplificado.
    var irrf = comReducao(Math.min(tabelaIR(base), tabelaIR(bruto - SIMPLIFICADO)), bruto);
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
  // Avos do 13º. Com `saida` (aviso indenizado que atravessa o fim do ano), soma os avos do ano da saída
  // até dezembro e os do ano seguinte até a data projetada (Lei 4.090/1962; CLT, art. 487, §1º).
  function avosDecimo(adm, fim, saida) {
    var anoIni = new Date(saida == null ? fim : saida).getUTCFullYear(), anoFim = new Date(fim).getUTCFullYear(), avos = 0;
    for (var ano = anoIni; ano <= anoFim; ano++) {
      for (var m = 0; m < 12; m++) {
        var ini = Math.max(Date.UTC(ano, m, 1), adm), fimMes = Math.min(Date.UTC(ano, m + 1, 0), fim);
        if (fimMes >= ini && (fimMes - ini) / DIA + 1 >= 15) avos++;
      }
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
    var avos13 = justa ? 0 : avosDecimo(adm, projetado, saida), avosF = justa ? 0 : avosFerias(adm, projetado);
    // Se o aviso projetado completa um novo período aquisitivo, ele entra como férias indenizadas inteiras.
    var periodosExtra = justa ? 0 : anosCompletos(adm, projetado) - anos;
    var decimo = sal * avos13 / 12, vencidas = sal * (p.vencidas || 0) * 4 / 3, proporcionais = sal * (avosF / 12 + periodosExtra) * 4 / 3;
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
  // Melhor dia para comprar no cartão: a compra entra na fatura do primeiro fechamento na mesma data ou depois dela
  // (conta o dia do fechamento na fatura atual, o caso mais cauteloso). O melhor dia é o seguinte ao fechamento.
  // Dias que não existem no mês (31 em abril, por exemplo) viram o último dia do mês. Datas em UTC, formato AAAA-MM-DD.
  function diaDoMes(y, m, d) { var ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return Date.UTC(y, m, Math.min(d, ultimo)); }
  function proximoDia(t, dia, depois) {
    var x = new Date(t), y = x.getUTCFullYear(), m = x.getUTCMonth();
    for (var k = 0; k < 3; k++) { var c = diaDoMes(y, m + k, dia); if (depois ? c > t : c >= t) return c; }
    return diaDoMes(y, m + 3, dia);
  }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function faturaDa(t, fech, venc) {
    var c = proximoDia(t, fech, false), v = proximoDia(c, venc, true);
    return { compra: iso(t), fechamento: iso(c), vencimento: iso(v), dias: Math.round((v - t) / DIA) };
  }
  function melhorDiaCartao(o) {
    var fech = Math.min(31, Math.max(1, Math.round(o.fechamento || 1))), venc = Math.min(31, Math.max(1, Math.round(o.vencimento || 1)));
    var hoje = dataUTC(o.hoje), compra = (o.compra && dataUTC(o.compra)) || hoje;
    var ultimoFech = proximoDia(hoje - DIA, fech, false), melhor = ultimoFech + DIA;
    var pior = faturaDa(ultimoFech, fech, venc);
    return { compra: faturaDa(compra, fech, venc), melhor: faturaDa(melhor, fech, venc), pior: pior,
      melhorDia: new Date(melhor).getUTCDate(), menorPrazo: pior.dias };
  }
  // Dividir a conta: a taxa de serviço vale para tudo; os itens extras (bebidas, por exemplo) só para quem consumiu.
  // A conta é feita em centavos e a soma fecha exata: ninguém paga mais de 1 centavo acima da sua parte.
  function dividirConta(o) {
    var pessoas = Math.min(1000, Math.max(1, Math.floor(o.pessoas || 1))), taxa = Math.max(0, o.taxa || 0) / 100;
    var total = Math.max(0, o.total || 0), extra = Math.min(total, Math.max(0, o.extra || 0));
    var quem = extra > 0 ? Math.min(pessoas, Math.max(1, Math.floor(o.quemExtra || pessoas))) : 0;
    var totalCent = Math.round(total * (1 + taxa) * 100), extraCent = Math.round(extra * (1 + taxa) * 100);
    // Parte ideal de cada um em centavos; arredonda para baixo e dá os centavos que faltam a quem ficou mais perto de subir.
    var ideal = [], pagos = [], falta = totalCent;
    for (var i = 0; i < pessoas; i++) { ideal.push((totalCent - extraCent) / pessoas + (i < quem ? extraCent / quem : 0)); pagos.push(Math.floor(ideal[i] + 1e-9)); falta -= pagos[i]; }
    var ordem = ideal.map(function (v, k) { return k; }).sort(function (x, y) { return (ideal[y] - pagos[y]) - (ideal[x] - pagos[x]) || x - y; });
    for (var k = 0; k < falta; k++) pagos[ordem[k % pessoas]]++;
    var grupos = [], soma = 0;
    for (var j = 0; j < pessoas; j++) {
      var consumiu = j < quem, c = pagos[j], g = null;
      soma += c;
      for (var q = 0; q < grupos.length; q++) if (grupos[q].extra === consumiu && grupos[q].valor === c / 100) g = grupos[q];
      if (g) g.qtd++; else grupos.push({ extra: consumiu, valor: c / 100, qtd: 1 });
    }
    return { conta: total, taxa: cents((totalCent - Math.round(total * 100)) / 100), total: totalCent / 100, pessoas: pessoas, quemExtra: quem,
      media: cents(totalCent / pessoas / 100), grupos: grupos, soma: soma / 100 };
  }
  // Custo por km do carro: combustível pelo consumo, mais os gastos fixos do ano e do mês divididos pelos km rodados.
  // A desvalorização só entra se a pessoa informar o valor do carro e a porcentagem.
  function custoKm(o) {
    var km = Math.max(0, o.km || 0), consumo = Math.max(0, o.consumo || 0), preco = Math.max(0, o.preco || 0);
    if (!km || !consumo) return null;
    var litros = km / consumo, combustivel = litros * preco;
    var depAno = Math.max(0, o.valorCarro || 0) * Math.min(100, Math.max(0, o.desvalorizacao || 0)) / 100;
    var anuais = Math.max(0, o.anuais || 0), manutencao = Math.max(0, o.manutencao || 0), mensais = Math.max(0, o.mensais || 0);
    var fixos = anuais / 12 + manutencao / 12 + depAno / 12 + mensais;
    var mes = combustivel + fixos;
    return { litros: Math.round(litros * 10) / 10, combustivelMes: cents(combustivel), documentosMes: cents(anuais / 12), manutencaoMes: cents(manutencao / 12),
      desvalorizacaoMes: cents(depAno / 12), outrosMes: cents(mensais), totalMes: cents(mes), totalAno: cents(mes * 12),
      combustivelKm: Math.round(preco / consumo * 1000) / 1000, porKm: Math.round(mes / km * 1000) / 1000, cemKm: cents(mes / km * 100) };
  }
  // Álcool ou gasolina: o etanol compensa quando o preço dele dividido pelo da gasolina fica abaixo do rendimento relativo.
  // Sem o consumo do carro, usa a regra prática de 70% (o etanol rende cerca de 70% da gasolina).
  function alcoolGasolina(o) {
    var etanol = Math.max(0, o.etanol || 0), gasolina = Math.max(0, o.gasolina || 0);
    if (!etanol || !gasolina) return null;
    var cg = Math.max(0, o.consGasolina || 0), ce = Math.max(0, o.consEtanol || 0), doCarro = !!(cg && ce);
    if (cg && !ce) ce = cg * 0.7;
    var rend = doCarro ? ce / cg : 0.7, razao = etanol / gasolina;
    var r4 = function (v) { return Math.round(v * 10000) / 10000; };
    var melhor = r4(razao) < r4(rend) ? "etanol" : r4(razao) > r4(rend) ? "gasolina" : "empate";
    var r = { razao: r4(razao), rendimento: r4(rend), doCarro: doCarro, limiteEtanol: cents(gasolina * rend), melhor: melhor };
    if (cg) {
      r.kmEtanol = Math.round(etanol / ce * 1000) / 1000; r.kmGasolina = Math.round(gasolina / cg * 1000) / 1000;
      var km = Math.max(0, o.km || 0);
      if (km) { r.mesEtanol = cents(km / ce * etanol); r.mesGasolina = cents(km / cg * gasolina); r.economiaMes = cents(Math.abs(r.mesEtanol - r.mesGasolina)); r.economiaAno = cents(r.economiaMes * 12); }
    }
    return r;
  }
  // Alugar ou financiar: compara o patrimônio no fim do prazo do financiamento.
  // Quem paga menos por mês investe a diferença, para os dois lados gastarem o mesmo. Quem aluga investe a entrada e os custos da compra.
  // Taxas anuais viram mensais por juros compostos. O aluguel é reajustado a cada 12 meses. Não inclui seguros nem taxas do banco.
  function alugarFinanciar(o) {
    var valor = Math.max(0, o.valor || 0), entrada = Math.max(0, o.entrada || 0), aluguel = Math.max(0, o.aluguel || 0);
    var n = Math.round(Math.max(0, o.anos || 0) * 12);
    if (!valor || !aluguel || !n || entrada >= valor) return null;
    var mensal = function (a) { return Math.pow(1 + Math.max(-0.99, a || 0) / 100, 1 / 12) - 1; };
    var i = mensal(o.jurosAno), r = mensal(o.rendAno), reaj = Math.max(-99, o.reajAno || 0) / 100, custos = Math.max(0, o.custos || 0);
    var financiado = valor - entrada, price = o.sistema === "price";
    var pmt = i > 0 ? financiado * i / (1 - Math.pow(1 + i, -n)) : financiado / n, amort = financiado / n;
    var saldo = financiado, invCompra = 0, invAluga = entrada + custos, totalParcelas = 0, totalAluguel = 0, primeira = 0, ultima = 0, aluguelFinal = 0;
    for (var k = 1; k <= n; k++) {
      var juros = saldo * i, parcela = price ? pmt : amort + juros;
      saldo = Math.max(0, saldo - (parcela - juros));
      var alug = aluguel * Math.pow(1 + reaj, Math.floor((k - 1) / 12));
      invCompra *= 1 + r; invAluga *= 1 + r;
      if (parcela > alug) invAluga += parcela - alug; else invCompra += alug - parcela;
      totalParcelas += parcela; totalAluguel += alug;
      if (k === 1) primeira = parcela;
      ultima = parcela; aluguelFinal = alug;
    }
    var imovelFinal = valor * Math.pow(1 + Math.max(-99, o.valAno || 0) / 100, n / 12);
    var patCompra = cents(imovelFinal + invCompra), patAluga = cents(invAluga);
    return {
      meses: n, financiado: cents(financiado), primeiraParcela: cents(primeira), ultimaParcela: cents(ultima),
      totalParcelas: cents(totalParcelas), totalJuros: cents(totalParcelas - financiado), totalAluguel: cents(totalAluguel), aluguelFinal: cents(aluguelFinal),
      imovelFinal: cents(imovelFinal), investidoCompra: cents(invCompra), patrimonioFinanciar: patCompra, patrimonioAlugar: patAluga,
      diferenca: cents(Math.abs(patCompra - patAluga)), melhor: patCompra > patAluga ? "financiar" : patCompra < patAluga ? "alugar" : "empate",
      aluguelAno: Math.round(aluguel * 12 / valor * 10000) / 100
    };
  }
  // Quanto cobrar por hora como autônomo: o que a pessoa quer ganhar no ano mais os custos, dividido pelas horas que dá para cobrar.
  // 13º e férias opcionais: soma 1 mês (13º) e 1/3 de mês (adicional de férias); as semanas de folga já cobrem o mês de descanso.
  // Imposto informado pela pessoa, como % do que ela recebe. Margem extra opcional sobre o valor final.
  function valorHora(o) {
    var ganho = Math.max(0, o.ganho || 0);
    if (!ganho) return null;
    var custos = Math.max(0, o.custos || 0);
    var horasDia = Math.min(24, Math.max(0, o.horasDia || 0)), dias = Math.min(7, Math.max(0, o.diasSemana || 0));
    var folga = Math.min(51, Math.max(0, o.semanasFolga || 0)), parado = Math.min(90, Math.max(0, o.naoCobrado || 0)) / 100;
    var imposto = Math.min(90, Math.max(0, o.imposto || 0)) / 100, margem = Math.min(500, Math.max(0, o.margem || 0)) / 100;
    var horasAno = horasDia * dias * (52 - folga) * (1 - parado);
    if (!(horasAno > 0)) return null;
    var extras = o.extras ? ganho * (1 + 1 / 3) : 0;
    var paraVoce = ganho * 12 + extras, custosAno = custos * 12;
    var semImposto = (paraVoce + custosAno) * (1 + margem);
    var bruto = semImposto / (1 - imposto);
    var hora = bruto / horasAno;
    return {
      hora: cents(hora), dia: cents(hora * horasDia), faturarMes: cents(bruto / 12), faturarAno: cents(bruto),
      horasMes: Math.round(horasAno / 12 * 10) / 10, horasAno: Math.round(horasAno),
      horaVoce: cents(paraVoce / horasAno), horaCustos: cents(custosAno / horasAno), horaMargem: cents((semImposto - paraVoce - custosAno) / horasAno), horaImposto: cents((bruto - semImposto) / horasAno)
    };
  }
  // MEI 2026: DAS = 5% do salário mínimo (R$ 1.621, Decreto 12.797/2025) de INSS + R$ 1 de ICMS (comércio/indústria) e/ou R$ 5 de ISS (serviços).
  // Limite: R$ 81.000 no ano; no ano de abertura, R$ 6.750 por mês desde o mês de abertura (fração conta como mês inteiro).
  // Passou até 20%: deixa de ser MEI em 1º de janeiro do ano seguinte e paga imposto sobre o excesso. Mais de 20%: perde o MEI desde o início do ano (ou da abertura).
  // Fontes: Receita Federal, notícia de 02/01/2026 sobre o DAS-MEI e Manual do Desenquadramento do Simei (abr/2025). Revisar todo ano, em janeiro.
  var MEI = { inss: 81.05, icms: 1, iss: 5, limiteAno: 81000, limiteMes: 6750 };
  function mei(o) {
    var at = o.atividade === "servicos" || o.atividade === "ambos" ? o.atividade : "comercio";
    var das = MEI.inss + (at !== "servicos" ? MEI.icms : 0) + (at !== "comercio" ? MEI.iss : 0);
    var inicio = Math.min(12, Math.max(1, Math.floor(o.inicio || 1)));
    var ate = Math.min(12, Math.max(inicio, Math.floor(o.ate || inicio)));
    var mesesAtivos = 13 - inicio, mesesPassados = ate - inicio + 1, mesesRestantes = 12 - ate;
    var limite = inicio > 1 ? MEI.limiteMes * mesesAtivos : MEI.limiteAno;
    var faturado = Math.min(1e12, Math.max(0, o.faturado || 0));
    var media = faturado / mesesPassados;
    var previsto = typeof o.previsto === "number" && isFinite(o.previsto) && o.previsto >= 0 ? Math.min(1e12, o.previsto) : media;
    var projecao = faturado + previsto * mesesRestantes;
    var situacao = function (v) { return v <= limite ? "dentro" : v <= limite * 1.2 ? "ate20" : "acima20"; };
    var resta = Math.max(0, limite - faturado);
    return {
      das: cents(das), dasAno: cents(das * mesesAtivos), mesesAtivos: mesesAtivos, limite: limite, limite20: cents(limite * 1.2),
      faturado: cents(faturado), usado: Math.round(faturado / limite * 1000) / 10,
      resta: cents(resta), porMes: mesesRestantes ? cents(resta / mesesRestantes) : 0, mesesRestantes: mesesRestantes,
      media: cents(media), previsto: cents(previsto), projecao: cents(projecao), excesso: cents(Math.max(0, projecao - limite)),
      agora: situacao(faturado), situacao: situacao(projecao)
    };
  }
  // Média de notas da faculdade: média ponderada das notas já tiradas e a nota que falta tirar nas avaliações seguintes.
  // Avaliação sem nota (só com peso) conta como ainda por fazer. Peso em branco vale 1.
  // Exame final opcional: média final = média × (100 − peso do exame)% + exame × peso do exame%. Cada faculdade tem a sua regra.
  function mediaNotas(o) {
    var maxima = o.maxima > 0 ? Math.min(1000, o.maxima) : 10;
    var aprovacao = Math.min(maxima, Math.max(0, typeof o.aprovacao === "number" && isFinite(o.aprovacao) ? o.aprovacao : 7));
    var itens = (o.notas || []).filter(function (x) { return x && (typeof x.nota === "number" || typeof x.peso === "number"); }).map(function (x) {
      var peso = typeof x.peso === "number" && isFinite(x.peso) ? Math.min(1000, Math.max(0, x.peso)) : 1;
      var nota = typeof x.nota === "number" && isFinite(x.nota) ? Math.min(maxima, Math.max(0, x.nota)) : null;
      return { nota: nota, peso: peso };
    }).filter(function (x) { return x.peso > 0; });
    if (!itens.length) return null;
    var soma = 0, pesoFeito = 0, pesoFalta = 0, feitas = 0;
    itens.forEach(function (x) { if (x.nota === null) pesoFalta += x.peso; else { soma += x.nota * x.peso; pesoFeito += x.peso; feitas++; } });
    var pesoTotal = pesoFeito + pesoFalta, r = { maxima: maxima, aprovacao: aprovacao, feitas: feitas, faltam: itens.length - feitas, media: pesoFeito ? cents(soma / pesoFeito) : null };
    if (pesoFalta > 0) {
      var precisa = (aprovacao * pesoTotal - soma) / pesoFalta;
      r.precisa = cents(Math.max(0, precisa));
      r.melhorPossivel = cents((soma + maxima * pesoFalta) / pesoTotal);
      r.situacao = precisa <= 1e-9 ? "garantido" : precisa > maxima + 1e-9 ? "impossivel" : "falta";
      return r;
    }
    r.situacao = soma / pesoTotal >= aprovacao - 1e-9 ? "aprovado" : "abaixo";
    if (r.situacao === "abaixo" && typeof o.exameMinima === "number" && o.exameMinima > 0) {
      var pe = Math.min(100, Math.max(1, typeof o.pesoExame === "number" && o.pesoExame > 0 ? o.pesoExame : 50)) / 100;
      var exameMinima = Math.min(maxima, o.exameMinima);
      var exame = (exameMinima - (soma / pesoTotal) * (1 - pe)) / pe;
      r.exameMinima = exameMinima; r.pesoExame = Math.round(pe * 100);
      r.exame = cents(Math.max(0, exame));
      r.exameSituacao = exame > maxima + 1e-9 ? "impossivel" : "possivel";
    }
    return r;
  }
  function desafio52(inicial) {
    var semanas = [];
    for (var s = 1; s <= 52; s++) semanas.push(cents(inicial * s));
    return { semanas: semanas, total: cents(inicial * 1378) };
  }
  root.DaContaCalc = { inss: inss, salarioLiquido: salarioLiquido, decimoTerceiro: decimoTerceiro, diasFerias: diasFerias, ferias: ferias, rescisao: rescisao, avosDecimo: avosDecimo, avosFerias: avosFerias, reserva: reserva, horasExtras: horasExtras, orcamento: orcamento, parcelamento: parcelamento, jurosCompostos: jurosCompostos, aliquotaIR: aliquotaIR, quantoRende: quantoRende, quitarDividas: quitarDividas, rotativo: rotativo, melhorDiaCartao: melhorDiaCartao, dividirConta: dividirConta, custoKm: custoKm, alcoolGasolina: alcoolGasolina, alugarFinanciar: alugarFinanciar, valorHora: valorHora, mei: mei, mediaNotas: mediaNotas, desafio52: desafio52 };

  if (typeof document === "undefined") return;
  var brl = function (v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  var num = function (id) { var el = document.getElementById(id); var v = el ? parseFloat(el.value) : 0; return isFinite(v) ? Math.min(1e12, Math.max(0, v)) : 0; };
  var linhas = function (itens) {
    return itens.map(function (x) { return '<div class="line' + (x[2] ? " total" : "") + '"><span>' + x[0] + "</span><b>" + brl(x[1]) + "</b></div>"; }).join("");
  };
  var telas = {
    decimo: function () {
      var s = num("salario"), m = Math.min(12, Math.max(1, Math.floor(num("meses") || 12)));
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
  telas.conta = function () {
    var total = num("total"), pessoas = Math.floor(num("pessoas"));
    if (!total || !pessoas) return null;
    var campoTaxa = document.getElementById("taxa"), taxa = campoTaxa && campoTaxa.value !== "" ? num("taxa") : 10;
    if (num("extra") > total) return '<p class="note">Os itens à parte não podem passar do valor da conta. O valor da conta é a soma de tudo, incluindo esses itens.</p>';
    var r = dividirConta({ total: total, taxa: taxa, pessoas: pessoas, extra: num("extra"), quemExtra: num("quemExtra") });
    var pct = function (v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }); };
    var partes = r.grupos.map(function (g) {
      var um = g.qtd === 1, quem = r.quemExtra ? (g.extra ? "" : " não") + (um ? " consumiu" : " consumiram") + " os itens à parte" : "";
      var rot = g.qtd + (um ? " pessoa" : " pessoas") + (quem ? " que" + quem : "") + (um ? " paga" : " pagam");
      return '<div class="line total"><span>' + rot + "</span><b>" + brl(g.valor) + "</b></div>";
    }).join("");
    var tipos = r.grupos.reduce(function (a, g) { a[g.extra] = 1; return a; }, {});
    var centavos = r.grupos.length > Object.keys(tipos).length ? '<p class="note">A diferença de 1 centavo entre algumas pessoas é para a soma fechar exatamente o valor da conta.</p>' : "";
    return linhas([["Valor da conta", r.conta], ["Taxa de serviço (" + pct(taxa) + "%)", r.taxa], ["Total a pagar", r.total, 1]]) +
      "<h3>Quanto cada um paga</h3>" + partes + centavos +
      '<p class="note">A taxa de serviço foi dividida na mesma proporção do que cada um consumiu. Confira o total com o valor impresso na conta antes de pagar.</p>';
  };
  telas.km = function () {
    var km = num("km"), consumo = num("consumo"), preco = num("preco");
    if (!km || !consumo || !preco) return null;
    var r = custoKm({ km: km, consumo: consumo, preco: preco, anuais: num("anuais"), manutencao: num("manutencao"), mensais: num("mensais"), valorCarro: num("valorCarro"), desvalorizacao: num("desvalorizacao") });
    var real = function (v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 3 }); };
    var itens = [["Combustível (" + r.litros.toLocaleString("pt-BR") + " litros)", r.combustivelMes]];
    if (r.documentosMes) itens.push(["IPVA, seguro e licenciamento", r.documentosMes]);
    if (r.manutencaoMes) itens.push(["Manutenção", r.manutencaoMes]);
    if (r.desvalorizacaoMes) itens.push(["Desvalorização do carro", r.desvalorizacaoMes]);
    if (r.outrosMes) itens.push(["Estacionamento, pedágio e outros", r.outrosMes]);
    itens.push(["Custo total por mês", r.totalMes, 1]);
    return '<div class="line total"><span>Custo por km</span><b>' + real(r.porKm) + "</b></div>" +
      '<div class="line"><span>Só o combustível, por km</span><b>' + real(r.combustivelKm) + "</b></div>" +
      '<div class="line"><span>Cada 100 km rodados</span><b>' + brl(r.cemKm) + "</b></div>" +
      "<h3>Quanto o carro custa por mês</h3>" + linhas(itens) +
      '<div class="line"><span>Custo por ano</span><b>' + brl(r.totalAno) + "</b></div>" +
      '<p class="note">É uma estimativa com os valores que você informou. O consumo real muda com o trânsito, a estrada e o jeito de dirigir.</p>';
  };
  telas.hora = function () {
    var opt = function (id, d) { var el = document.getElementById(id); var v = el && el.value !== "" ? parseFloat(el.value) : NaN; return isFinite(v) ? Math.max(0, v) : d; };
    var ex = document.getElementById("extras");
    var r = valorHora({ ganho: num("ganho"), custos: num("custos"), horasDia: opt("horasDia", 8), diasSemana: opt("diasSemana", 5), semanasFolga: opt("folga", 4),
      naoCobrado: opt("naoCobrado", 25), imposto: num("imposto"), margem: num("margem"), extras: ex ? ex.checked : true });
    if (!r) return null;
    var h = function (v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }); };
    var partes = [["Para você", r.horaVoce], ["Custos do trabalho", r.horaCustos]];
    if (r.horaMargem) partes.push(["Margem de segurança", r.horaMargem]);
    if (r.horaImposto) partes.push(["Impostos", r.horaImposto]);
    return '<div class="line total"><span>Cobre no mínimo por hora</span><b>' + brl(r.hora) + "</b></div>" +
      linhas([["Valor de um dia de trabalho", r.dia], ["Quanto faturar por mês", r.faturarMes], ["Quanto faturar por ano", r.faturarAno]]) +
      '<p class="note">Isso considera cerca de ' + h(r.horasMes) + " horas cobradas por mês (" + h(r.horasAno) + " no ano). O resto do tempo vai para folgas e tarefas que ninguém paga.</p>" +
      "<h3>Para onde vai cada hora cobrada</h3>" + linhas(partes) +
      '<p class="note">É uma estimativa com os números que você informou. Ela mostra o mínimo para fechar a sua conta, não o preço do mercado: pesquise quanto outros profissionais da sua área cobram. O imposto muda conforme o regime (MEI, Simples, autônomo): confirme com um contador.</p>';
  };
  telas.notas = function () {
    var raw = function (id) { var el = document.getElementById(id); if (!el || el.value.trim() === "") return undefined; var v = parseFloat(el.value.replace(",", ".")); return isFinite(v) ? v : undefined; };
    var notas = [];
    for (var i = 1; i <= 8; i++) notas.push({ nota: raw("nota" + i), peso: raw("peso" + i) });
    var r = mediaNotas({ notas: notas, aprovacao: raw("aprovacao"), maxima: raw("maxima"), exameMinima: raw("exameMinima"), pesoExame: raw("pesoExame") });
    if (!r) return null;
    var n = function (v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }); };
    var linha = function (rot, val, total) { return '<div class="line' + (total ? " total" : "") + '"><span>' + rot + "</span><b>" + val + "</b></div>"; };
    var aval = function (k) { return k === 1 ? "1 avaliação" : k + " avaliações"; };
    var html = r.media !== null ? linha(r.faltam ? "Sua média até agora" : "Sua média", n(r.media), r.faltam === 0) : "";
    if (r.faltam) {
      html += linha(r.faltam === 1 ? "Nota que você precisa na avaliação que falta" : "Média que você precisa nas " + aval(r.faltam) + " que faltam", r.situacao === "impossivel" ? "acima de " + n(r.maxima) : n(r.precisa), 1);
      html += '<p class="note">' + (r.situacao === "garantido" ? "Boa notícia: mesmo tirando zero no que falta, você já chega à média " + n(r.aprovacao) + ". Continue estudando para garantir uma nota melhor." :
        r.situacao === "impossivel" ? "Mesmo tirando " + n(r.maxima) + " em tudo, a média chega a " + n(r.melhorPossivel) + ", abaixo de " + n(r.aprovacao) + ". Veja se a sua faculdade tem exame final, recuperação ou trabalho extra e converse com o professor." :
        "Para fechar com média " + n(r.aprovacao) + ", tire pelo menos " + n(r.precisa) + (r.faltam === 1 ? " na avaliação que falta." : " de média, levando em conta o peso de cada uma.")) + "</p>";
    } else if (r.situacao === "aprovado") {
      html += '<p class="note">Você passou da média ' + n(r.aprovacao) + ". Parabéns! Confira também as faltas: em muitas faculdades elas reprovam mesmo com nota boa.</p>";
    } else {
      html += '<p class="note">A média ficou abaixo de ' + n(r.aprovacao) + ".</p>";
      if (r.exame !== undefined) html += linha("Nota que você precisa no exame final", r.exameSituacao === "impossivel" ? "acima de " + n(r.maxima) : n(r.exame), 1) +
        '<p class="note">Pela regra que você informou: o exame vale ' + r.pesoExame + "% e a média final precisa chegar a " + n(r.exameMinima) + "." + (r.exameSituacao === "impossivel" ? " Mesmo com nota máxima no exame não dá; converse com a coordenação sobre as opções." : "") + "</p>";
      else html += '<p class="note">Se a sua faculdade tem exame final, abra "Minha faculdade tem exame final" e calcule de novo para ver a nota que você precisa.</p>';
    }
    return html + '<p class="note">É uma estimativa. Arredondamento, provas substitutivas e a regra do exame mudam de faculdade para faculdade: confira no regimento ou no plano de ensino.</p>';
  };
  telas.mei = function () {
    var val = function (id, d) { var el = document.getElementById(id); return el ? el.value : d; };
    var prev = document.getElementById("previsto");
    var previsto = prev && prev.value !== "" && isFinite(parseFloat(prev.value)) ? Math.max(0, parseFloat(prev.value)) : null;
    var r = mei({ atividade: val("atividade", "comercio"), inicio: parseInt(val("inicio", "1"), 10), ate: parseInt(val("ateMes", "1"), 10), faturado: num("faturado"), previsto: previsto });
    var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    var inicio = parseInt(val("inicio", "1"), 10) || 1;
    var pct = function (v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; };
    var html = '<div class="line total"><span>DAS por mês em 2026</span><b>' + brl(r.das) + "</b></div>" +
      linhas([["DAS no ano (" + r.mesesAtivos + (r.mesesAtivos === 1 ? " mês)" : " meses)"), r.dasAno], ["Seu limite de faturamento em 2026", r.limite], ["Você já faturou", r.faturado]]) +
      '<div class="line"><span>Parte do limite já usada</span><b>' + pct(r.usado) + "</b></div>" +
      linhas([["Ainda pode faturar no ano", r.resta]]);
    if (r.mesesRestantes && r.resta) html += linhas([["Média por mês até dezembro, sem passar do limite", r.porMes]]);
    if (inicio > 1) html += '<p class="note">Como o MEI foi aberto em ' + MESES[inicio - 1] + ", o limite é proporcional: R$ 6.750 por mês, de " + MESES[inicio - 1] + " a dezembro.</p>";
    if (r.mesesRestantes) {
      html += "<h3>Se continuar assim até dezembro</h3>" +
        linhas([["Faturamento por mês daqui para frente", r.previsto], ["Faturamento previsto no ano", r.projecao, true]]);
    }
    var ja = r.agora === r.situacao;
    if (r.situacao === "dentro") {
      html += '<p class="note"><b>Dentro do limite.</b> ' + (r.mesesRestantes ? "Nesse ritmo, o ano fecha abaixo de " + brl(r.limite) + "." : "O ano fechou abaixo de " + brl(r.limite) + ".") + "</p>";
    } else if (r.situacao === "ate20") {
      html += '<p class="note"><b>' + (ja ? "Você já passou do limite" : "Atenção: nesse ritmo, você passa do limite") + " em até 20%</b> (" + brl(r.excesso) + " a mais). Você deixa de ser MEI em 1º de janeiro de 2027 e paga imposto sobre o valor que passou, junto com o DAS de janeiro. Avise a Receita até o último dia útil do mês seguinte ao que passou do limite.</p>";
    } else {
      html += '<p class="note"><b>' + (ja ? "Você já passou do limite" : "Cuidado: nesse ritmo, você passa do limite") + " em mais de 20%</b> (acima de " + brl(r.limite20) + "). Nesse caso a empresa deixa de ser MEI desde " + (inicio > 1 ? "a abertura" : "1º de janeiro de 2026") + " e paga os impostos de microempresa desse período. Fale com um contador o quanto antes.</p>";
    }
    return html + '<p class="note">É uma estimativa com as regras de 2026 e os números que você informou. O DAS vence todo dia 20. Confira sua situação no Portal do Empreendedor e, na dúvida, fale com um contador.</p>';
  };
  telas.imovel = function () {
    var opt = function (id, d) { var el = document.getElementById(id); var v = el && el.value !== "" ? parseFloat(el.value) : NaN; return isFinite(v) ? Math.min(1000, Math.max(0, v)) : d; };
    var sistema = document.getElementById("sistema");
    var r = alugarFinanciar({ valor: num("valor"), entrada: num("entrada"), aluguel: num("aluguel"), jurosAno: Math.min(1000, num("juros")), anos: Math.min(50, num("anos")),
      sistema: sistema ? sistema.value : "sac", custos: num("custos"), rendAno: opt("rendimento", 7), valAno: opt("valorizacao", 4), reajAno: opt("reajuste", 4) });
    if (!r) return null;
    var titulo = r.melhor === "financiar" ? "Financiar deixa você com mais patrimônio" : r.melhor === "alugar" ? "Alugar e investir deixa você com mais patrimônio" : "Empate: os dois caminhos dão no mesmo";
    var anos = (r.meses / 12).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return '<div class="line total"><span>' + titulo + "</span><b>" + brl(r.diferenca) + "</b></div>" +
      '<p class="note">Diferença de patrimônio depois de ' + anos + " anos, se quem paga menos por mês investir a diferença.</p>" +
      "<h3>Financiando</h3>" + linhas([["Valor financiado", r.financiado], ["Primeira parcela", r.primeiraParcela], ["Última parcela", r.ultimaParcela], ["Total pago em parcelas", r.totalParcelas], ["Só de juros", r.totalJuros], ["Imóvel valorizado no fim", r.imovelFinal], ["Dinheiro investido no fim", r.investidoCompra], ["Patrimônio no fim", r.patrimonioFinanciar, 1]]) +
      "<h3>Alugando e investindo</h3>" + linhas([["Total pago de aluguel", r.totalAluguel], ["Aluguel no último ano", r.aluguelFinal], ["Patrimônio no fim", r.patrimonioAlugar, 1]]) +
      '<p class="note">O aluguel equivale a ' + r.aluguelAno.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "% do valor do imóvel por ano. É uma estimativa: não inclui seguros obrigatórios do financiamento, taxas do banco, condomínio, IPTU nem manutenção. Valorização, rendimento e reajuste mudam com o tempo. Antes de assinar, peça a simulação oficial ao banco com o CET.</p>";
  };
  telas.combustivel = function () {
    var etanol = num("etanol"), gasolina = num("gasolina");
    if (!etanol || !gasolina) return null;
    var r = alcoolGasolina({ etanol: etanol, gasolina: gasolina, consEtanol: num("consEtanol"), consGasolina: num("consGasolina"), km: num("kmMes") });
    var pct = function (v) { return (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; };
    var real = function (v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 3 }); };
    var titulo = r.melhor === "etanol" ? "Abasteça com etanol" : r.melhor === "gasolina" ? "Abasteça com gasolina" : "Tanto faz: os dois custam o mesmo por km";
    var html = '<div class="line total"><span>' + titulo + "</span><b>" + pct(r.razao) + "</b></div>" +
      '<p class="note">O etanol custa ' + pct(r.razao) + " do preço da gasolina. " + (r.doCarro ? "No seu carro, ele rende " + pct(r.rendimento) + " da gasolina." : "Pela regra dos 70%, ele compensa abaixo de 70%.") + "</p>" +
      '<div class="line"><span>Preço máximo do etanol para compensar</span><b>' + brl(r.limiteEtanol) + "</b></div>";
    if (r.kmEtanol) {
      html += "<h3>Quanto custa cada km</h3>" +
        '<div class="line"><span>Com etanol' + (r.doCarro ? "" : " (estimado)") + "</span><b>" + real(r.kmEtanol) + "</b></div>" +
        '<div class="line"><span>Com gasolina</span><b>' + real(r.kmGasolina) + "</b></div>";
      if (r.mesEtanol) {
        html += "<h3>No mês</h3>" + linhas([["Gastando com etanol", r.mesEtanol], ["Gastando com gasolina", r.mesGasolina]]) +
          (r.economiaMes ? linhas([["Economia escolhendo " + (r.melhor === "etanol" ? "o etanol" : "a gasolina") + ", por mês", r.economiaMes, 1], ["Em um ano", r.economiaAno]]) : "");
      }
    }
    return html + '<p class="note">É uma estimativa. O rendimento real muda com o carro, o trânsito e o jeito de dirigir. Só use etanol se o carro for flex.</p>';
  };
  telas.cartao = function () {
    var fech = num("fechamento"), venc = num("vencimento");
    if (!fech || !venc) return null;
    var hoje = new Date(), hojeIso = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");
    var campo = document.getElementById("compra"), compra = campo && /^\d{4}-\d{2}-\d{2}$/.test(campo.value) ? campo.value : hojeIso;
    var r = melhorDiaCartao({ fechamento: fech, vencimento: venc, hoje: hojeIso, compra: compra });
    var data = function (t) { return new Date(t + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }); };
    var dias = function (n) { return n === 1 ? "1 dia" : n + " dias"; };
    var linha = function (rot, val, total) { return '<div class="line' + (total ? " total" : "") + '"><span>' + rot + "</span><b>" + val + "</b></div>"; };
    var quando = compra === hojeIso ? "Se comprar hoje" : "Se comprar em " + data(r.compra.compra);
    return linha("Melhor dia de compra", "dia " + r.melhorDia, 1) +
      '<p class="note">A próxima vez é ' + data(r.melhor.compra) + ": a compra só vence em " + data(r.melhor.vencimento) + ", " + dias(r.melhor.dias) + " depois. Evite o dia do fechamento e os dias logo antes dele: aí o prazo cai para cerca de " + dias(r.menorPrazo) + ".</p>" +
      "<h3>" + quando + "</h3>" +
      linha("Entra na fatura que fecha em", data(r.compra.fechamento)) + linha("Você paga em", data(r.compra.vencimento)) + linha("Prazo até pagar", dias(r.compra.dias), 1) +
      '<p class="note">É uma estimativa. Cada banco tem sua regra para compras feitas no próprio dia do fechamento, e o vencimento muda quando cai em fim de semana ou feriado. Confira o "melhor dia de compra" no app do seu cartão.</p>';
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
    var mesAtual = document.getElementById("ateMes");
    if (mesAtual && !mesAtual.dataset.fixo) mesAtual.value = String(new Date().getMonth() + 1);
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
