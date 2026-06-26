import type { FastifyInstance } from "fastify";
import type { LikertAnswer, OceanScores, PersonalityPortrait } from "@self-authoring/shared";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { generatePersonalityPortrait } from "../ai/assessment.js";
import { computeOceanScores, oceanItems } from "../scoring.js";

const submitSchema = z.object({
  answers: z.record(z.string(), z.coerce.number().int().min(1).max(5)),
});

/** Registers OCEAN assessment routes. */
export function registerOceanRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/ocean/items", { preHandler: requireAuth }, async () => {
    return { items: oceanItems };
  });

  app.post("/ocean", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid answers. Each item must be rated 1–5." });
    }
    const answers = parsed.data.answers as Record<string, LikertAnswer>;
    const scores = computeOceanScores(answers);
    const result = await prisma.oceanResult.create({
      data: {
        userId: request.user!.userId,
        answers: answers as Prisma.InputJsonValue,
        scores: scores as unknown as Prisma.InputJsonValue,
      },
    });
    return result;
  });

  app.get("/ocean", { preHandler: requireAuth }, async (request) => {
    const results = await prisma.oceanResult.findMany({
      where: { userId: request.user!.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, scores: true, createdAt: true },
    });
    return { results };
  });

  app.get("/ocean/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.oceanResult.findFirst({
      where: { id, userId: request.user!.userId },
    });
    if (!result) {
      return reply.status(404).send({ error: "Not found" });
    }
    return result;
  });

  app.post("/ocean/:id/assess", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const result = await prisma.oceanResult.findFirst({
      where: { id, userId },
    });
    if (!result) {
      return reply.status(404).send({ error: "Not found" });
    }

    const existing = await prisma.userProfile.findUnique({ where: { userId } });
    if (existing) {
      return {
        assessment: existing.assessment as unknown as PersonalityPortrait,
        oceanResultId: existing.oceanResultId,
        updatedAt: existing.updatedAt,
      };
    }

    try {
      const answers = result.answers as Record<string, LikertAnswer>;
      const scores = result.scores as unknown as OceanScores;
      const assessment = await generatePersonalityPortrait(scores, answers);

      const profile = await prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          oceanResultId: id,
          assessment: assessment as unknown as Prisma.InputJsonValue,
        },
        update: {
          oceanResultId: id,
          assessment: assessment as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        assessment,
        oceanResultId: profile.oceanResultId,
        updatedAt: profile.updatedAt,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assessment generation failed";
      return reply.status(500).send({ error: message });
    }
  });
}
