import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { AppData } from "@/lib/app-data";
import { eventsBetween } from "@/lib/reminders";

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

export function notificationsSupported() {
  return Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window;
}

export async function showSystemNotification(title: string, body: string, tag?: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, { body, icon: "icon-192.png", badge: "icon-192.png", tag });
    else new Notification(title, { body, tag });
    return true;
  } catch { return false; }
}

const LAST_KEY = "nyvo.reminders.last-check";
const FIRED_KEY = "nyvo.reminders.fired";

/**
 * Relógio dos lembretes no site: a cada 15 s verifica o que deveria ter tocado.
 * Avisos perdidos enquanto o Nyvo estava fechado (até 6 h) aparecem ao abrir.
 */
export function useReminderScheduler(data: AppData, onFire: (title: string, body: string) => void) {
  const dataRef = useRef(data);
  const fireRef = useRef(onFire);
  useEffect(() => { dataRef.current = data; fireRef.current = onFire; });
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
    const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
    const tick = () => {
      const now = new Date();
      const saved = Number(read(LAST_KEY));
      const from = new Date(Math.max(saved || now.getTime() - 20000, now.getTime() - 6 * 3600000));
      write(LAST_KEY, String(now.getTime()));
      if (from >= now) return;
      let fired: string[] = [];
      try { fired = JSON.parse(read(FIRED_KEY) || "[]"); } catch { fired = []; }
      const events = eventsBetween(dataRef.current, from, now, 50).filter((e) => !fired.includes(e.key));
      if (!events.length) return;
      write(FIRED_KEY, JSON.stringify([...fired, ...events.map((e) => e.key)].slice(-400)));
      const system = dataRef.current.browserNotifications;
      if (events.length > 3) {
        const body = events.slice(-4).map((e) => `${e.title}: ${e.body}`).join("\n");
        if (system) void showSystemNotification(`Nyvo · ${events.length} lembretes`, body, "nyvo-batch");
        fireRef.current(`${events.length} lembretes`, events.slice(-2).map((e) => e.title).join(", "));
        return;
      }
      for (const e of events) {
        if (system) void showSystemNotification(e.title, e.body, e.key);
        fireRef.current(e.title, e.body);
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
}
