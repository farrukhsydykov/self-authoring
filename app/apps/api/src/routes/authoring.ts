import type { FastifyInstance } from "fastify";
import { AuthoringModule, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../auth.js";

const moduleSchema = z.enum(["past", "future", "faults", "virtues"]);

/** Registers authoring document CRUD routes. */
export function registerAuthoringRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/authoring", { preHandler: requireAuth }, async (request) => {
    const docs = await prisma.authoringDocument.findMany({
      where: { userId: request.user!.userId },
      select: { module: true, data: true, updatedAt: true },
    });
    return { documents: docs };
  });

  app.get("/authoring/:module", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = moduleSchema.safeParse((request.params as { module: string }).module);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid module" });
    }
    const doc = await prisma.authoringDocument.findUnique({
      where: {
        userId_module: {
          userId: request.user!.userId,
          module: parsed.data as AuthoringModule,
        },
      },
    });
    return { document: doc };
  });

  app.put("/authoring/:module", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = moduleSchema.safeParse((request.params as { module: string }).module);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid module" });
    }
    const body = request.body;
    if (!body || typeof body !== "object") {
      return reply.status(400).send({ error: "Invalid data" });
    }
    const doc = await prisma.authoringDocument.upsert({
      where: {
        userId_module: {
          userId: request.user!.userId,
          module: parsed.data as AuthoringModule,
        },
      },
      create: {
        userId: request.user!.userId,
        module: parsed.data as AuthoringModule,
        data: body as object,
      },
      update: { data: body as object },
    });
    return { document: doc };
  });
}
