import type { Metadata } from "next";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";

import { PeopleGrid } from "@/components/public/content-parts";
import { EmptyState } from "@/components/public/page-parts";
import { listOfficers } from "@/lib/public-site/content";

export const metadata: Metadata = { title: "Executive Committee" };

// Each officer's name and position, with an optional photo (PS-03.5).
export default async function ExecutiveCommitteePage() {
  const officers = await listOfficers();
  return officers.length > 0 ? (
    <PeopleGrid people={officers} />
  ) : (
    <EmptyState icon={UsersThree} message="This year's Executive Committee will be announced soon." />
  );
}
