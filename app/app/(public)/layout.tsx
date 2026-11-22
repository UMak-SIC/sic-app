import { connection } from "next/server";

import { PublicFrame } from "@/components/public/public-frame";

// Every public page renders per request, so content saved in the dashboard shows
// without a redeploy (PS-03.8, PS-11.6, PS-15.4) and nothing is read from the
// database at build time.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <PublicFrame>{children}</PublicFrame>;
}
