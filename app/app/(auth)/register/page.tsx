"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white text-ink flex items-center justify-center p-3 sm:p-5 lg:p-8 font-sans">
      <main className="w-full max-w-[1320px] min-h-auto lg:h-[min(88dvh,860px)] lg:min-h-[640px] bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_20px_40px_-15px_rgba(18,51,58,0.08)] grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] p-4 sm:p-6 lg:p-7 gap-6 lg:gap-8 overflow-hidden">
        {/* Left Column: Zen Administrative Showcase */}
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

        {/* Right Column: Registration Form */}
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
              Create an account
            </h1>
            <p className="text-base sm:text-base text-muted font-display font-normal text-center mb-6 sm:mb-8">
              Set up your profile now
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 sm:gap-5">
              {/* Email / Username Field */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="email" className="text-ink">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

              {/* Repeat Password Field */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="repeatPassword" className="text-ink">
                  Repeat Password
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="repeatPassword"
                    type={showRepeatPassword ? "text" : "password"}
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="pr-12 bg-white text-ink border-line placeholder:text-muted-light focus-visible:border-green focus-visible:ring-green/10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                    aria-label={showRepeatPassword ? "Hide repeat password" : "Show repeat password"}
                    className="absolute right-2 h-9 w-9 text-muted hover:text-ink hover:bg-transparent"
                  >
                    {showRepeatPassword ? (
                      <Eye size={20} weight="regular" />
                    ) : (
                      <EyeSlash size={20} weight="regular" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Primary Register Button */}
              <Button
                type="submit"
                variant="pill"
                size="xl"
                className="w-full bg-green hover:bg-green-hover text-white active:scale-[0.99] mt-2 shadow-sm font-bold"
              >
                Create account
              </Button>
            </form>

            <p className="mt-6 sm:mt-8 text-xs text-muted text-center">
              Already have an account.{" "}
              <Link
                href="/login"
                className="font-bold text-green hover:underline ml-1"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
