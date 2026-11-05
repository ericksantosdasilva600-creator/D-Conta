import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "./_core/cookies";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nyvoReceipts, nyvoUserState } from "../drizzle/schema";
import { getDb } from "./db";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const MAX_STATE_BYTES = 5 * 1024 * 1024;
const MAX_RECEIPT_BYTES = Math.floor(1.5 * 1024 * 1024);
const receiptMime = z.enum(["image/jpeg", "image/png", "image/webp"]);
type AppData = {
  schemaVersion: 3; onboarded: boolean; transactions: unknown[]; customExpenseCategories: string[];
  customIncomeCategories: string[]; habits: unknown[]; completedByDate: Record<string, string[]>;
  notes: unknown[]; tasks: unknown[]; healthLogs: unknown[]; budgets: unknown[];
  remindersEnabled: boolean; dueRemindersEnabled: boolean; taskRemindersEnabled: boolean;
  reduceMotion: boolean; currency: string; tripName: string;
};

function validateAppData(value: unknown): asserts value is AppData {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TRPCError({ code: "BAD_REQUEST", message: "Payload inválido." });
  const d = value as Record<string, unknown>;
  const arrays = ["transactions", "habits", "notes", "tasks", "healthLogs", "budgets", "customExpenseCategories", "customIncomeCategories"];
  if (d.schemaVersion !== 3 || typeof d.onboarded !== "boolean" || typeof d.remindersEnabled !== "boolean" ||
      typeof d.dueRemindersEnabled !== "boolean" || typeof d.taskRemindersEnabled !== "boolean" || typeof d.reduceMotion !== "boolean" ||
      typeof d.currency !== "string" || d.currency.length > 16 || typeof d.tripName !== "string" || d.tripName.length > 200 ||
      arrays.some((k) => !Array.isArray(d[k]) || (d[k] as unknown[]).length > 10000) ||
      !d.completedByDate || typeof d.completedByDate !== "object" || Array.isArray(d.completedByDate)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A estrutura AppData não é válida ou não é suportada." });
  }
  for (const key of ["customExpenseCategories", "customIncomeCategories"]) {
    if ((d[key] as unknown[]).some((x) => typeof x !== "string" || x.length > 120)) throw new TRPCError({ code: "BAD_REQUEST", message: `${key} inválido.` });
  }
  for (const dates of Object.values(d.completedByDate as Record<string, unknown>)) {
    if (!Array.isArray(dates) || dates.length > 10000 || dates.some((x) => typeof x !== "string" || x.length > 200)) throw new TRPCError({ code: "BAD_REQUEST", message: "completedByDate inválido." });
  }
}

function findReceiptIds(value: unknown): string[] {
  const found: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    for (const [key, child] of Object.entries(node)) {
      if (key === "receiptId" && typeof child === "string") found.push(child);
      else visit(child);
    }
  };
  visit(value);
  return [...new Set(found)];
}

function badRequest(message: string): never { throw new TRPCError({ code: "BAD_REQUEST", message }); }
function privateNotFound(): never { throw new TRPCError({ code: "NOT_FOUND", message: "Recibo não encontrado." }); }

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), {
        ...cookieOptions,
        maxAge: -1,
      });
      return {
        success: true,
      } as const;
    }),
  }),

  sync: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
      const [row] = await db.select().from(nyvoUserState).where(eq(nyvoUserState.userId, ctx.user.id)).limit(1);
      return { revision: row?.revision ?? 0, data: (row?.payload as AppData | undefined) ?? null, updatedAt: row?.updatedAt.toISOString() ?? null };
    }),
    push: protectedProcedure.input(z.object({ expectedRevision: z.number().int().min(0).max(2_147_483_646), data: z.unknown() })).mutation(async ({ ctx, input }) => {
      validateAppData(input.data);
      const payload = input.data as AppData;
      if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_STATE_BYTES) badRequest("O payload excede 5 MiB.");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
      try {
        return await db.transaction(async (tx) => {
          const [current] = await tx.select().from(nyvoUserState).where(eq(nyvoUserState.userId, ctx.user.id)).for("update").limit(1);
          const revision = current?.revision ?? 0;
          if (revision !== input.expectedRevision) throw new TRPCError({ code: "CONFLICT", message: "A revisão do estado mudou; sincroniza novamente." });
          const ids = findReceiptIds(payload);
          if (ids.length) {
            const ownedRows = await tx.select({ id: nyvoReceipts.id }).from(nyvoReceipts)
              .where(and(eq(nyvoReceipts.userId, ctx.user.id), inArray(nyvoReceipts.id, ids)));
            const ownIds = new Set(ownedRows.map((r) => r.id));
            if (ids.some((id) => !ownIds.has(id))) throw new TRPCError({ code: "BAD_REQUEST", message: "O snapshot referencia recibos inválidos." });
          }
          const nextRevision = revision + 1;
          if (!current) {
            if (input.expectedRevision !== 0) throw new TRPCError({ code: "CONFLICT", message: "Estado inexistente; sincroniza novamente." });
            await tx.insert(nyvoUserState).values({ userId: ctx.user.id, schemaVersion: payload.schemaVersion, revision: nextRevision, payload });
          } else {
            await tx.update(nyvoUserState).set({ schemaVersion: payload.schemaVersion, revision: nextRevision, payload })
              .where(and(eq(nyvoUserState.userId, ctx.user.id), eq(nyvoUserState.revision, input.expectedRevision)));
          }
          const [saved] = await tx.select({ updatedAt: nyvoUserState.updatedAt }).from(nyvoUserState).where(eq(nyvoUserState.userId, ctx.user.id)).limit(1);
          const oldIds = current?.payload ? findReceiptIds(current.payload) : [];
          const newIds = new Set(ids);
          const removedIds = oldIds.filter((id) => !newIds.has(id));
          if (removedIds.length) await tx.delete(nyvoReceipts).where(and(eq(nyvoReceipts.userId, ctx.user.id), inArray(nyvoReceipts.id, removedIds)));
          return { revision: nextRevision, updatedAt: saved.updatedAt.toISOString() };
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (input.expectedRevision === 0 && typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "O estado foi criado em simultâneo; sincroniza novamente." });
        throw error;
      }
    }),
    uploadReceipt: protectedProcedure.input(z.object({ mimeType: receiptMime, base64: z.string().min(1).max(2_200_000) })).mutation(async ({ ctx, input }) => {
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) badRequest("Base64 inválido.");
      const bytes = Buffer.from(input.base64, "base64");
      if (!bytes.length || bytes.length > MAX_RECEIPT_BYTES || bytes.toString("base64") !== input.base64) badRequest("Tamanho ou codificação de recibo inválidos.");
      const matches = input.mimeType === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : input.mimeType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
      if (!matches) badRequest("O conteúdo da imagem não corresponde ao MIME declarado.");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
      const id = randomUUID();
      await db.insert(nyvoReceipts).values({ id, userId: ctx.user.id, mimeType: input.mimeType, sizeBytes: bytes.length, bytes });
      return { id, mimeType: input.mimeType, sizeBytes: bytes.length };
    }),
    getReceipt: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
      const [row] = await db.select().from(nyvoReceipts).where(and(eq(nyvoReceipts.id, input.id), eq(nyvoReceipts.userId, ctx.user.id))).limit(1);
      if (!row) privateNotFound();
      return { id: row.id, mimeType: row.mimeType as z.infer<typeof receiptMime>, base64: row.bytes.toString("base64") };
    }),
    deleteReceipt: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
      return db.transaction(async (tx) => {
        const [snapshot] = await tx.select({ payload: nyvoUserState.payload }).from(nyvoUserState)
          .where(eq(nyvoUserState.userId, ctx.user.id)).for("update").limit(1);
        if (snapshot?.payload && findReceiptIds(snapshot.payload).includes(input.id)) badRequest("Remove primeiro o recibo do movimento e sincroniza as alterações.");
        const deleted = await tx.delete(nyvoReceipts).where(and(eq(nyvoReceipts.id, input.id), eq(nyvoReceipts.userId, ctx.user.id)));
        if (Number((deleted as unknown as { affectedRows?: number }).affectedRows ?? 0) !== 1) privateNotFound();
        return { success: true as const };
      });
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
