import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { TreeDocument } from "./types";

export type CloudTreeRow = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  personCount: number;
};

type TreeRow = {
  id: string;
  name: string;
  description: string;
  data: TreeDocument | string;
  updated_at: string;
};

function asDoc(data: TreeDocument | string): TreeDocument {
  if (typeof data === "string") return JSON.parse(data) as TreeDocument;
  return data;
}

export const listCloudTrees = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<TreeRow>`
      select id, name, description, data, updated_at
      from trees
      where user_id = ${context.userId}
      order by updated_at desc
    `;
    return rows.map((r) => {
      const doc = asDoc(r.data);
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        updatedAt: r.updated_at,
        personCount: Array.isArray(doc.people) ? doc.people.length : 0,
      } satisfies CloudTreeRow;
    });
  });

export const getCloudTree = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<TreeRow>`
      select id, name, description, data, updated_at
      from trees
      where id = ${id} and user_id = ${context.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    const doc = asDoc(row.data);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      origin: "cloud" as const,
      updatedAt: row.updated_at,
      personCount: doc.people.length,
      doc,
    };
  });

export const upsertCloudTree = createServerFn({ method: "POST" })
  .validator((input: { id: string; doc: TreeDocument }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const payload = JSON.stringify(data.doc);
    const name = data.doc.name.trim() || "Pohon tanpa nama";
    const description = data.doc.description ?? "";
    await sql.query(
      `insert into trees (id, user_id, name, description, data, updated_at)
       values ($1, $2, $3, $4, $5::jsonb, now())
       on conflict (user_id, id) do update
         set name = excluded.name,
             description = excluded.description,
             data = excluded.data,
             updated_at = now()`,
      [data.id, context.userId, name, description, payload],
    );
    return { ok: true as const, id: data.id };
  });

export const deleteCloudTree = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from trees where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
