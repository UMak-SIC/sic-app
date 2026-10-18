"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Sign-out has to happen in the browser. better-auth's endpoint is a POST that
// clears the session by returning Set-Cookie, so a server action that fetched
// it server-side would clear the cookie in the fetch response and leave the
// browser still holding a live session. A client POST keeps the Set-Cookie
// applying to the browser, which is the whole point of the action.
//
// The endpoint answers {"success":true} rather than redirecting, so the
// navigation is done here to avoid dropping the operator on a JSON body.
export function useSignOut() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      // Leaving the control re-enabled lets the operator try again rather than
      // stranding them.
      setIsSigningOut(false);
    }
  };

  return { signOut, isSigningOut };
}
