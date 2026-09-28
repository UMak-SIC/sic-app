import { getNeonAuth } from "@/lib/auth/server";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

function handler() {
  return getNeonAuth().handler();
}

export function GET(request: Request, context: AuthRouteContext) {
  return handler().GET(request, context);
}

export function POST(request: Request, context: AuthRouteContext) {
  return handler().POST(request, context);
}

export function PUT(request: Request, context: AuthRouteContext) {
  return handler().PUT(request, context);
}

export function DELETE(request: Request, context: AuthRouteContext) {
  return handler().DELETE(request, context);
}

export function PATCH(request: Request, context: AuthRouteContext) {
  return handler().PATCH(request, context);
}
