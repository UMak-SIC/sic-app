import { resolveShortUrl } from "@/lib/services/short-url-service";

export const dynamic = "force-dynamic";

const CODE_PATTERN = /^[A-Za-z]{7}$/;

async function resolve({ params }: RouteContext<"/url/[code]">): Promise<Response> {
  const { code } = await params;
  if (!CODE_PATTERN.test(code)) {
    return Response.json({ error: "Link not found." }, { status: 404 });
  }

  const destination = await resolveShortUrl(code);
  if (!destination) {
    return Response.json({ error: "Link not found." }, { status: 404 });
  }

  return Response.redirect(destination, 302);
}

export async function GET(_: Request, context: RouteContext<"/url/[code]">) {
  return resolve(context);
}

export async function HEAD(_: Request, context: RouteContext<"/url/[code]">) {
  return resolve(context);
}
