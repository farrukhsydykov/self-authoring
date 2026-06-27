import type { FastifyInstance } from "fastify";
import type { PresentAuthoringData } from "@self-authoring/shared";
import {
  isPresentProgrammeComplete,
  normalizePresentData,
} from "@self-authoring/shared";
import type { Prisma } from "@prisma/client";
import { AuthoringModule, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { generatePresentOverview } from "../ai/present-overview.js";
import { requireAuth } from "../auth.js";
import { oceanItems } from "../scoring.js";

const moduleSchema = z.enum(["past", "future", "present", "faults", "virtues"]);

const faultIds = oceanItems.filter((i) => i.pole === "fault").map((i) => i.id);
const virtueIds = oceanItems.filter((i) => i.pole === "virtue").map((i) => i.id);

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

  app.post("/authoring/present/overview", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.user!.userId;
    const doc = await prisma.authoringDocument.findUnique({
      where: { userId_module: { userId, module: "present" } },
    });

    if (!doc?.data) {
      return reply.status(400).send({ error: "Present Authoring programme not found." });
    }

    const data = normalizePresentData(doc.data as Partial<PresentAuthoringData>);
    if (!isPresentProgrammeComplete(data, faultIds, virtueIds)) {
      return reply.status(403).send({
        error: "Complete both Faults and Virtues before generating the overview.",
      });
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (profile?.presentOverview) {
      return { overview: profile.presentOverview };
    }

    try {
      const overview = await generatePresentOverview(data);
      if (profile) {
        await prisma.userProfile.update({
          where: { userId },
          data: { presentOverview: overview as unknown as Prisma.InputJsonValue },
        });
      }

      const updatedDoc = await prisma.authoringDocument.update({
        where: { userId_module: { userId, module: "present" } },
        data: { data: { ...data, overview } as object },
      });

      return { overview, document: updatedDoc };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Overview generation failed";
      return reply.status(500).send({ error: message });
    }
  });
}
