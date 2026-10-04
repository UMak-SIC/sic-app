"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

export default function EventCheckinRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  React.useEffect(() => {
    router.replace(`/events/${id}`);
  }, [id, router]);

  return null;
}
