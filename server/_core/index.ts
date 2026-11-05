import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createCorsMiddleware } from "./cors";
import { clearLegacySessionCookie } from "./cookies";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(createCorsMiddleware());
  app.use(clearLegacySessionCookie());
  app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });

  app.use(express.json({ limit: "6mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const webRoot = path.resolve(process.cwd(), "dist-web");
  const webIndex = path.join(webRoot, "index.html");
  if (process.env.NODE_ENV === "production" && fs.existsSync(webIndex)) {
    app.use(express.static(webRoot, {
      index: "index.html",
      maxAge: 0,
      setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=0, must-revalidate"),
    }));
    app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
      if ((req.method !== "GET" && req.method !== "HEAD") || path.extname(req.path)) return next();
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.sendFile(webIndex, (error) => { if (error) next(error); });
    });
  }

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log("[api] server listening");
  });
}

startServer().catch(() => {
  console.error("[api] server failed to start");
});
