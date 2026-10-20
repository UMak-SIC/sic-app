export async function readExportIds(request: Request): Promise<string[] | null> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("ids" in body) || !Array.isArray(body.ids)) return null;
  if (!body.ids.length || !body.ids.every((id: unknown) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return null;
  return [...new Set<string>(body.ids)];
}
