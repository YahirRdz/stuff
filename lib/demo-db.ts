import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { DEMO_USER } from "./demo";

/**
 * In-memory stand-in for Supabase, used only when DEMO_MODE is on. It implements the small
 * subset of the supabase-js query builder that the rest of the app actually calls
 * (.from().select/insert/update/delete().eq/ilike/order().single/maybeSingle()), backed by
 * plain arrays instead of Postgres. Data lives in `globalThis` so it survives Next.js dev
 * hot-reloads, and resets whenever the server process restarts.
 */

type Row = Record<string, unknown>;

interface DemoStore {
  bodas: Row[];
  invitados: Row[];
  confirmaciones: Row[];
  invitados_historial: Row[];
}

const globalForDemo = globalThis as unknown as { __demoStore?: DemoStore };

const DEMO_PIN = "1234";

function defaultsFor(table: string): Row {
  const now = new Date().toISOString();

  switch (table) {
    case "bodas":
      return { id: randomUUID(), creado_at: now };
    case "invitados":
      return {
        id: randomUUID(),
        magic_token: randomUUID(),
        token_expira_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        pin_intentos: 0,
        pin_bloqueado_hasta: null,
        max_acompanantes: 1,
        estado: "pending",
        confirmado_at: null,
        restricciones_dieteticas: null,
        num_acompanantes: 0,
        comentarios: null,
        mesa_asignada: null,
        asiento_asignado: null,
        creado_at: now,
        actualizado_at: now,
      };
    case "confirmaciones":
      return { id: randomUUID(), confirmado_at: now };
    case "invitados_historial":
      return { id: randomUUID(), creado_at: now, cambios: null, ip_address: null, user_agent: null };
    default:
      return { id: randomUUID() };
  }
}

function seed(): DemoStore {
  const store: DemoStore = { bodas: [], invitados: [], confirmaciones: [], invitados_historial: [] };
  const pinHash = bcrypt.hashSync(DEMO_PIN, 10);

  const boda: Row = {
    ...defaultsFor("bodas"),
    nombre: "Boda de Ana & Luis",
    fecha: "2026-11-14",
    creado_por: DEMO_USER.id,
  };
  store.bodas.push(boda);

  const invitadosSeed: Array<{
    nombre: string;
    email: string;
    telefono: string;
    max_acompanantes: number;
    estado: "pending" | "confirmed" | "declined";
    num_acompanantes?: number;
    restricciones_dieteticas?: string;
    comentarios?: string;
  }> = [
    { nombre: "María López", email: "maria.lopez@example.com", telefono: "+52 55 1234 0001", max_acompanantes: 2, estado: "confirmed", num_acompanantes: 1, restricciones_dieteticas: "Vegetariana" },
    { nombre: "Carlos Fernández", email: "carlos.fernandez@example.com", telefono: "+52 55 1234 0002", max_acompanantes: 1, estado: "pending" },
    { nombre: "Sofía Ramírez", email: "sofia.ramirez@example.com", telefono: "+52 55 1234 0003", max_acompanantes: 2, estado: "declined", comentarios: "Estaremos de viaje esas fechas, ¡los queremos mucho!" },
    { nombre: "Jorge Martínez", email: "jorge.martinez@example.com", telefono: "+52 55 1234 0004", max_acompanantes: 3, estado: "confirmed", num_acompanantes: 3 },
    { nombre: "Lucía Torres", email: "lucia.torres@example.com", telefono: "+52 55 1234 0005", max_acompanantes: 0, estado: "pending" },
    { nombre: "Andrés Gómez", email: "andres.gomez@example.com", telefono: "+52 55 1234 0006", max_acompanantes: 1, estado: "confirmed", num_acompanantes: 0, restricciones_dieteticas: "Sin gluten" },
    { nombre: "Valentina Cruz", email: "valentina.cruz@example.com", telefono: "+52 55 1234 0007", max_acompanantes: 2, estado: "pending" },
    { nombre: "Diego Herrera", email: "diego.herrera@example.com", telefono: "+52 55 1234 0008", max_acompanantes: 1, estado: "declined", comentarios: "No podremos asistir, felicidades a ambos" },
  ];

  for (const g of invitadosSeed) {
    const creadoAt = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const invitado: Row = {
      ...defaultsFor("invitados"),
      boda_id: boda.id,
      nombre: g.nombre,
      email: g.email,
      telefono: g.telefono,
      pin_hash: pinHash,
      max_acompanantes: g.max_acompanantes,
      estado: g.estado,
      confirmado_at: g.estado === "pending" ? null : new Date(Date.now() - 2 * 86_400_000).toISOString(),
      num_acompanantes: g.num_acompanantes ?? 0,
      restricciones_dieteticas: g.restricciones_dieteticas ?? null,
      comentarios: g.comentarios ?? null,
      creado_por: DEMO_USER.id,
      creado_at: creadoAt,
      actualizado_at: creadoAt,
    };
    store.invitados.push(invitado);

    store.invitados_historial.push({
      ...defaultsFor("invitados_historial"),
      invitado_id: invitado.id,
      evento: "created",
      cambios: { nombre: g.nombre, email: g.email, max_acompanantes: g.max_acompanantes },
      creado_at: creadoAt,
    });

    if (g.estado !== "pending") {
      const respuesta = g.estado === "confirmed" ? "confirmed" : "declined";
      store.confirmaciones.push({
        ...defaultsFor("confirmaciones"),
        invitado_id: invitado.id,
        respuesta,
        restricciones_dieteticas: g.restricciones_dieteticas ?? null,
        num_acompanantes: g.num_acompanantes ?? 0,
        comentarios: g.comentarios ?? null,
        ip_address: "203.0.113.42",
        user_agent: "Mozilla/5.0 (demo)",
        confirmado_at: invitado.confirmado_at,
      });
      store.invitados_historial.push({
        ...defaultsFor("invitados_historial"),
        invitado_id: invitado.id,
        evento: respuesta,
        cambios: { respuesta, num_acompanantes: g.num_acompanantes ?? 0 },
        ip_address: "203.0.113.42",
        user_agent: "Mozilla/5.0 (demo)",
        creado_at: invitado.confirmado_at,
      });
    }
  }

  return store;
}

function getStore(): DemoStore {
  if (!globalForDemo.__demoStore) {
    globalForDemo.__demoStore = seed();
  }
  return globalForDemo.__demoStore;
}

function getTable(name: string): Row[] {
  const store = getStore() as unknown as Record<string, Row[]>;
  if (!store[name]) store[name] = [];
  return store[name];
}

type Filter = { col: string; op: "eq" | "ilike"; val: unknown };
type SingleMode = "array" | "single" | "maybeSingle";
type Result = { data: unknown; error: { message: string } | null };

class DemoQuery implements PromiseLike<Result> {
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private insertRows: Row[] = [];
  private updatePatch: Row = {};
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private singleMode: SingleMode = "array";

  constructor(private tableName: string) {}

  // Columns are ignored: the in-memory store always returns full rows.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  select(_cols?: string) {
    return this;
  }

  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch: Row) {
    this.mode = "update";
    this.updatePatch = patch;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ col, op: "ilike", val: pattern });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => {
      const value = row[f.col];
      if (f.op === "eq") return value === f.val;
      const pattern = String(f.val).replace(/%/g, "").toLowerCase();
      return String(value ?? "").toLowerCase().includes(pattern);
    });
  }

  private shape(rows: Row[]): Result {
    if (this.singleMode === "single") {
      return rows[0]
        ? { data: rows[0], error: null }
        : { data: null, error: { message: "No se encontró el registro" } };
    }
    if (this.singleMode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  private execute(): Result {
    const table = getTable(this.tableName);

    if (this.mode === "select") {
      let rows = table.filter((r) => this.matches(r));
      if (this.orderCol) {
        const col = this.orderCol;
        rows = [...rows].sort((a, b) => {
          const av = String(a[col] ?? "");
          const bv = String(b[col] ?? "");
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return this.orderAsc ? cmp : -cmp;
        });
      }
      return this.shape(rows);
    }

    if (this.mode === "insert") {
      const inserted = this.insertRows.map((row) => {
        const full = { ...defaultsFor(this.tableName), ...row };
        table.push(full);

        if (this.tableName === "invitados") {
          getTable("invitados_historial").push({
            ...defaultsFor("invitados_historial"),
            invitado_id: full.id,
            evento: "created",
            cambios: { nombre: full.nombre, email: full.email, max_acompanantes: full.max_acompanantes },
          });
        }

        return full;
      });
      return this.shape(inserted);
    }

    if (this.mode === "update") {
      const matched = table.filter((r) => this.matches(r));
      matched.forEach((row) => {
        Object.assign(row, this.updatePatch);
        if ("actualizado_at" in row) row.actualizado_at = new Date().toISOString();
      });
      return this.shape(matched);
    }

    // delete
    const matched = table.filter((r) => this.matches(r));
    const remaining = table.filter((r) => !this.matches(r));
    table.length = 0;
    table.push(...remaining);

    if (this.tableName === "invitados") {
      const removedIds = new Set(matched.map((r) => r.id));
      for (const child of ["confirmaciones", "invitados_historial"]) {
        const childTable = getTable(child);
        const keep = childTable.filter((r) => !removedIds.has(r.invitado_id));
        childTable.length = 0;
        childTable.push(...keep);
      }
    }

    return this.shape(matched);
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createDemoSupabaseClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: DEMO_USER }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
    from(table: string) {
      return new DemoQuery(table);
    },
  };
}
