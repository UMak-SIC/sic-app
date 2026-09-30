"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
      setLastUpdated(new Date());
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [router]);

  return <p className="font-mono text-xs text-slate-500" role="status">Refreshing every 10 seconds. Updated {lastUpdated.toLocaleTimeString()}.</p>;
}
