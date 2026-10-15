"use client";

import { SignOut } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { useSignOut } from "@/lib/auth/use-sign-out";

export function SignOutButton() {
  const { signOut, isSigningOut } = useSignOut();

  return (
    <Button
      type="button"
      variant="pill"
      size="xl"
      onClick={signOut}
      disabled={isSigningOut}
      aria-busy={isSigningOut}
      className="w-full sm:w-auto"
    >
      <SignOut size={18} weight="regular" />
      {isSigningOut ? "Signing out" : "Sign out"}
    </Button>
  );
}
