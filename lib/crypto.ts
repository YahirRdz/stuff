import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PIN_LENGTH, SESION_JWT_MINUTOS } from "./constants";
import { isDemoMode } from "./demo";

const BCRYPT_ROUNDS = 10;
const DEMO_JWT_SECRET = "demo-mode-secret-not-for-production-use";

function getSessionSecret(): string {
  const secret = process.env.SESSION_JWT_SECRET;
  if (secret) return secret;
  if (isDemoMode()) return DEMO_JWT_SECRET;
  throw new Error("Missing SESSION_JWT_SECRET env var");
}

export function generarPin(): string {
  const min = 10 ** (PIN_LENGTH - 1);
  const max = 10 ** PIN_LENGTH - 1;
  return String(randomInt(min, max + 1));
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verificarPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

interface SesionPayload {
  invitadoId: string;
}

export function crearSesionToken(invitadoId: string): string {
  return jwt.sign({ invitadoId } satisfies SesionPayload, getSessionSecret(), {
    expiresIn: `${SESION_JWT_MINUTOS}m`,
  });
}

export function verificarSesionToken(token: string): SesionPayload | null {
  try {
    return jwt.verify(token, getSessionSecret()) as SesionPayload;
  } catch {
    return null;
  }
}
