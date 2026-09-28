import { getNeonAuth } from "@/lib/auth/server";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

function getAuthHandler() {
  return getNeonAuth().handler();
}

function handleAuthGet(request: Request, context: AuthRouteContext) {
  return getAuthHandler().GET(request, context);
}

function handleAuthPost(request: Request, context: AuthRouteContext) {
  return getAuthHandler().POST(request, context);
}

function handleAuthPut(request: Request, context: AuthRouteContext) {
  return getAuthHandler().PUT(request, context);
}

function handleAuthDelete(request: Request, context: AuthRouteContext) {
  return getAuthHandler().DELETE(request, context);
}

function handleAuthPatch(request: Request, context: AuthRouteContext) {
  return getAuthHandler().PATCH(request, context);
}

export {
  handleAuthDelete as DELETE,
  handleAuthGet as GET,
  handleAuthPatch as PATCH,
  handleAuthPost as POST,
  handleAuthPut as PUT,
};
