import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PIN_LENGTH, SESION_JWT_MINUTOS } from "./constants";

const BCRYPT_ROUNDS = 10;

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
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) throw new Error("Missing SESSION_JWT_SECRET env var");

  return jwt.sign({ invitadoId } satisfies SesionPayload, secret, {
    expiresIn: `${SESION_JWT_MINUTOS}m`,
  });
}

export function verificarSesionToken(token: string): SesionPayload | null {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) throw new Error("Missing SESSION_JWT_SECRET env var");

  try {
    return jwt.verify(token, secret) as SesionPayload;
  } catch {
    return null;
  }
}
