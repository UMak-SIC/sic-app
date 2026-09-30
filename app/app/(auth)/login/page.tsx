"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
              {/* Email / Username Field */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="username" className="text-ink">
                  Email
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
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

              {/* Primary Login Button */}
              <Button
                type="submit"
                variant="pill"
                size="xl"
                className="w-full bg-green hover:bg-green-hover text-white active:scale-[0.99] mt-1 shadow-sm font-bold"
              >
                Login
              </Button>

              {/* Google SSO Button */}
              <Button
                type="button"
                variant="pillOutline"
                size="xl"
                className="w-full bg-surface-subtle hover:bg-surface-subtle-hover text-ink gap-3 font-bold border-0"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Login with Google
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
