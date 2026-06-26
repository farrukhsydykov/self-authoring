import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerOceanRoutes } from "./routes/ocean.js";
import { registerAuthoringRoutes } from "./routes/authoring.js";
import { registerProfileRoutes } from "./routes/profile.js";

const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 3001);

/** Starts the Fastify API server. */
async function main() {
  const app = Fastify({ logger: true });
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      if (!body) {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
  await app.register(cors, { origin: true });

  registerAuthRoutes(app, prisma);
  registerOceanRoutes(app, prisma);
  registerAuthoringRoutes(app, prisma);
  registerProfileRoutes(app, prisma);

  app.get("/health", async () => ({ ok: true }));

  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
