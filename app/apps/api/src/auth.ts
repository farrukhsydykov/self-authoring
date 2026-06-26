import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export interface JwtPayload {
  userId: string;
  email: string;
}

/** Signs a JWT for the authenticated user. */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

/** Verifies a JWT and returns the payload. */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/** Fastify preHandler that requires a valid Bearer JWT. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  try {
    const payload = verifyToken(header.slice(7));
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}
