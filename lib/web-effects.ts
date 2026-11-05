import { useEffect } from "react";
import { Platform } from "react-native";
import type { AppData } from "@/lib/app-data";
import { billStatus } from "@/lib/finance-extra";
import { daysUntil, localDateKey } from "@/lib/format";

/** Modo escuro no site: inverte as cores da interface preservando o verde/azul da marca. */
export function useWebDarkMode(enabled: boolean) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "nyvo-dark-style";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = "html.nyvo-dark{background:#151917!important}html.nyvo-dark body{filter:invert(0.9) hue-rotate(180deg);background:#F7F5EF!important;min-height:100%}";
      document.head.appendChild(style);
    }
    document.documentElement.classList.toggle("nyvo-dark", enabled);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", enabled ? "#121614" : "#187A61");
  }, [enabled]);
}

/** Avisos do navegador: uma vez por dia, ao abrir o Nyvo, lembra contas e tarefas que vencem hoje ou estão atrasadas. */
export function useBrowserReminders(data: AppData) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !data.browserNotifications) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const today = localDateKey();
    const key = "nyvo.last-browser-reminder";
    try { if (localStorage.getItem(key) === today) return; } catch { return; }
    const lines: string[] = [];
    data.recurringBills.filter((b) => b.active).forEach((b) => { const s = billStatus(b); if (!s.paid && s.days <= 1) lines.push(`${b.name} ${s.days < 0 ? "atrasada" : s.days === 0 ? "vence hoje" : "vence amanhã"}`); });
    data.transactions.filter((t) => t.kind === "expense" && !t.paid && t.dueDate).forEach((t) => { const d = daysUntil(t.dueDate); if (d !== null && d <= 1) lines.push(`${t.merchant} ${d < 0 ? "atrasada" : d === 0 ? "vence hoje" : "vence amanhã"}`); });
    data.tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate <= today).forEach((t) => lines.push(`Tarefa: ${t.title}`));
    data.studyItems.filter((s) => !s.done && s.dueDate && (daysUntil(s.dueDate) ?? 9) <= 1).forEach((s) => lines.push(`Estudo: ${s.title}`));
    if (!lines.length) return;
    try { localStorage.setItem(key, today); } catch { /* sem armazenamento, apenas não repete nesta sessão */ }
    const body = lines.slice(0, 4).join("\n") + (lines.length > 4 ? `\n+${lines.length - 4} itens` : "");
    const show = async () => {
      try {
        const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
        if (reg) await reg.showNotification("Nyvo · para hoje", { body, icon: "icon-192.png", tag: "nyvo-today" });
        else new Notification("Nyvo · para hoje", { body, tag: "nyvo-today" });
      } catch { /* o navegador pode bloquear; os itens continuam visíveis na tela Hoje */ }
    };
    void show();
  }, [data.browserNotifications, data.recurringBills, data.transactions, data.tasks, data.studyItems]);
}
