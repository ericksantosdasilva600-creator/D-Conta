// Anúncios do Dá Conta, só nas páginas públicas (nunca dentro do app).
// Desligado enquanto ADSENSE_CLIENT estiver vazio: nenhum script externo é carregado.
// Antes de preencher: domínio próprio, conta AdSense aprovada, política de privacidade
// e textos "sem anúncios" atualizados, e aviso de cookies.
(function () {
  var ADSENSE_CLIENT = ""; // ex.: "ca-pub-0000000000000000"
  var AD_SLOT = "";        // bloco criado no painel do AdSense
  if (!ADSENSE_CLIENT || !AD_SLOT) return;
  var boxes = document.querySelectorAll(".ad-slot");
  if (!boxes.length) return;
  var s = document.createElement("script");
  s.async = true; s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT);
  document.head.appendChild(s);
  boxes.forEach(function (box) {
    var ins = document.createElement("ins");
    ins.className = "adsbygoogle"; ins.style.display = "block";
    ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
    ins.setAttribute("data-ad-slot", AD_SLOT);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    box.appendChild(ins); box.hidden = false;
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
})();
