// Contagem anônima de visitas: sem cookies, sem nome, e-mail ou dados do app.
// Guarda só a página, o site de origem e o fuso horário. O código da aba some ao fechá-la.
(function () {
  var URL = "https://bxwcqljlbrwpasfkmdhc.supabase.co/rest/v1/nyvo_visits";
  var KEY = "sb_publishable_PNm5tQk2MxZ41kqnucHhjQ_mN-yjQGn";
  try {
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    var host = location.hostname;
    if (host !== "ericksantosdasilva600-creator.github.io") return;
    var sid = sessionStorage.getItem("nyvo.aba");
    if (!sid) { sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); sessionStorage.setItem("nyvo.aba", sid); }
    var path = location.pathname.replace(/^\/nyvo/, "") || "/";
    if (path.indexOf("/app") === 0) path = "/app";
    var ref = "";
    try { if (document.referrer) { var r = new window.URL(document.referrer).hostname; if (r !== host) ref = r; } } catch (e) {}
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    var send = function (kind) {
      fetch(URL, { method: "POST", keepalive: true, headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ session_id: sid, kind: kind, path: path.slice(0, 120), referrer: ref.slice(0, 120) || null, tz: tz.slice(0, 64) || null }) }).catch(function () {});
    };
    send("view");
    setInterval(function () { if (document.visibilityState === "visible") send("ping"); }, 120000);
  } catch (e) {}
})();
