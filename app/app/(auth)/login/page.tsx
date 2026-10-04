"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient, isAuthApiError } from "@neondatabase/auth/next";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Takes no arguments by design: the client is bound to this origin and talks to
// the /api/auth catch-all. Passing options is explicitly not supported while
// Auth is managed by Neon.
const authClient = createAuthClient();

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The form used to call preventDefault and nothing else, so signing in was
  // impossible even though the route behind it works.
  //
  // This goes through the SDK's browser client, which is the documented path:
  // it takes no arguments and talks to the same-origin catch-all, and while Auth
  // is managed by Neon the client is not interchangeable with a hand-rolled
  // fetch. An earlier version of this comment claimed a raw fetch is rejected
  // with INVALID_ORIGIN. That was never established. The 403 seen at the time
  // came from serving on 127.0.0.1, which is not on the trusted-origins
  // allowlist, not from using fetch. Localhost is pre-approved and a plain fetch
  // to the same endpoint succeeds from it. The client is used because it is
  // documented, not because the alternative is proven broken.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setErrorMessage(null);

    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (error) {
        // One message covers a wrong password and an unknown address alike.
        // The API distinguishes them, and saying which would tell an attacker
        // which addresses are registered. The charter also bans surfacing raw
        // API error strings.
        setErrorMessage(
          isAuthApiError(error)
            ? "That email and password combination did not work. Check them and try again."
            : "We could not sign you in just now. Try again in a moment.",
        );
        setIsSubmitting(false);
        return;
      }

      // A session that is not on the administrators list is refused by the
      // layout guard and lands on the access-denied page, so this is the right
      // destination either way. refresh() is what makes the new session visible
      // to the server components behind it.
      router.replace("/overview");
      router.refresh();
    } catch {
      setErrorMessage(
        "We could not reach the sign-in service. Check your connection and try again.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white text-ink flex items-center justify-center p-3 sm:p-5 lg:p-8 font-sans">
      <main className="w-full max-w-[1320px] min-h-auto lg:h-[min(88dvh,860px)] lg:min-h-[640px] bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_20px_40px_-15px_rgba(18,51,58,0.08)] grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] p-4 sm:p-6 lg:p-7 gap-6 lg:gap-8 overflow-hidden">
        {/* Left Column: Form */}
        <section className="flex flex-col justify-center items-center py-4 px-3 sm:px-8 md:px-12 w-full h-full overflow-y-auto">
          <div className="w-full max-w-[380px] flex flex-col items-center my-auto py-2">
            {/* UMak SIC Emblem */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-5 sm:mb-6">
              <Image
                src="/assets/sic_logo_nobg.png"
                alt="UMak SIC Emblem"
                fill
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink tracking-tight font-sans text-center mb-1.5">
              Welcome back!
            </h1>
            <p className="text-base sm:text-base text-muted font-display font-normal text-center mb-6 sm:mb-8">
              Enter your details below
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 sm:gap-5">
              {/* Email Field */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="email" className="text-ink">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  aria-invalid={errorMessage ? true : undefined}
                  aria-describedby={errorMessage ? "sign-in-error" : undefined}
                  className="bg-white text-ink border-line placeholder:text-muted-light focus-visible:border-green focus-visible:ring-green/10"
                />
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="password" className="text-ink">
                  Password
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="pr-12 bg-white text-ink border-line placeholder:text-muted-light focus-visible:border-green focus-visible:ring-green/10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 h-9 w-9 text-muted hover:text-ink hover:bg-transparent"
                  >
                    {showPassword ? (
                      <Eye size={20} weight="regular" />
                    ) : (
                      <EyeSlash size={20} weight="regular" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <Link
                href="#forgot"
                className="text-xs font-semibold text-ink self-end -mt-1 hover:text-green transition hover:underline"
              >
                Forgot Password?
              </Link>

              {/* Sign-in error. Plain language only, per the charter's ban on
                  surfacing API error strings. */}
              {errorMessage ? (
                <p
                  id="sign-in-error"
                  role="alert"
                  className="text-sm font-sans text-red leading-relaxed"
                >
                  {errorMessage}
                </p>
              ) : null}

              {/* Primary Login Button */}
              <Button
                type="submit"
                variant="pill"
                size="xl"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="w-full bg-green hover:bg-green-hover text-white active:scale-[0.99] mt-1 shadow-sm font-bold"
              >
                {isSubmitting ? "Signing in" : "Login"}
              </Button>

            </form>

            <p className="mt-6 sm:mt-8 text-xs text-muted text-center">
              Not a member?{" "}
              <Link
                href="/register"
                className="font-bold text-green hover:underline ml-1"
              >
                Register now
              </Link>
            </p>
          </div>
        </section>

        {/* Right Column: Zen Administrative Showcase */}
        <section className="hidden lg:flex flex-col items-center justify-center gap-5 sm:gap-4 bg-gradient-to-b from-zen-from via-zen-via to-zen-to rounded-[24px] sm:rounded-[28px] p-6 lg:p-8 xl:p-10 relative overflow-hidden h-full">
          {/* Main Visual Artwork */}
          <div className="relative w-full max-w-[450px] flex items-center justify-center">
            <div className="relative w-full h-[300px] xl:h-[370px] flex items-center justify-center">
              <Image
                src="/assets/signin/sign-in-cartoon.svg"
                alt="Zen administrative coordinator in focus meditation"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Thesis Footer Headline */}
          <p className="text-xl sm:text-2xl xl:text-[25px] leading-snug text-ink text-center max-w-[430px] font-sans font-normal tracking-tight mt-3 sm:mt-5">
            Manage <strong className="font-bold text-ink">events</strong>,{" "}
            <strong className="font-bold text-ink">attendance</strong>, and{" "}
            <span className="block sm:inline font-bold text-ink">event communication.</span>
          </p>
        </section>
      </main>
    </div>
  );
}
