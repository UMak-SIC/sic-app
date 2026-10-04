import "server-only";

import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let neonAuth: NeonAuth | undefined;

function requiredAuthEnvironment(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to initialize Neon Auth.`);
  }

  return value;
}

export function getNeonAuth(): NeonAuth {
  neonAuth ??= createNeonAuth({
    baseUrl: requiredAuthEnvironment("NEON_AUTH_BASE_URL"),
    cookies: { secret: requiredAuthEnvironment("NEON_AUTH_COOKIE_SECRET") },
  });

  return neonAuth;
}
