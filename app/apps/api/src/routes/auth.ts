import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { requireAuth, signToken } from "../auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Registers auth routes: register, login, me. */
export function registerAuthRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const token = signToken({ userId: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }
    const token = signToken({ userId: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: { id: true, email: true, createdAt: true },
    });
    return { user };
  });
}
