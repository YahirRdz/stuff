import { z } from "zod";

export const crearInvitadoSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  telefono: z.string().trim().max(30).optional().nullable(),
  max_acompanantes: z.number().int().min(1).max(20).default(1),
});

export const crearInvitadosBatchSchema = z.array(crearInvitadoSchema).min(1).max(500);

export const validarTokenSchema = z.object({
  token: z.string().uuid(),
});

export const verificarPinSchema = z.object({
  token: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/),
});

export const confirmarSchema = z.object({
  respuesta: z.enum(["confirmed", "declined"]),
  restricciones_dieteticas: z.string().trim().max(500).optional().nullable(),
  num_acompanantes: z.number().int().min(0).max(20).default(0),
  comentarios: z.string().trim().max(1000).optional().nullable(),
});
