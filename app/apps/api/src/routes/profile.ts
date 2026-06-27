import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../auth.js";

/** Registers user profile routes. */
export function registerProfileRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/profile", { preHandler: requireAuth }, async (request, reply) => {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: request.user!.userId },
    });
    if (!profile) {
      return reply.status(404).send({ error: "No profile found" });
    }
    return {
      presentOverview: profile.presentOverview ?? null,
      updatedAt: profile.updatedAt,
    };
  });
}
