"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDashboardPath, cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { Bike, ChefHat, ShoppingBag, Shield, ArrowLeft } from "lucide-react";

const ROLES: {
  id: UserRole;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    id: "customer",
    label: "Customer",
    description: "Order food for delivery or pickup",
    icon: ShoppingBag,
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Manage your menu and orders",
    icon: ChefHat,
  },
  {
    id: "driver",
    label: "Driver",
    description: "Deliver orders and earn",
    icon: Bike,
  },
  {
    id: "admin",
    label: "Super Admin",
    description: "Oversee the entire platform",
    icon: Shield,
  },
];

export default function AuthPage() {
  const [mode, setMode] = useState<"select" | "login" | "signup">("select");
  const [role, setRole] = useState<UserRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const supabase = createClient();

  const selectRole = (r: UserRole, m: "login" | "signup") => {
    setRole(r);
    setMode(m);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone, role },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Signup failed");
        router.push(next || getDashboardPath(role));
        router.refresh();
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile && profile.role !== role) {
          await supabase.auth.signOut();
          throw new Error(
            `This account is registered as ${profile.role}. Please use the ${profile.role} sign-in.`
          );
        }

        router.push(next || getDashboardPath(profile?.role || role));
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-brand-light via-canvas to-canvas">
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="font-display text-4xl font-bold tracking-tight">
              Magda<span className="text-brand">Ya</span>
            </h1>
            <p className="text-muted mt-2">Food delivery & pickup, simplified.</p>
          </div>

          <div className="space-y-3 animate-slide-up">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.id}
                  className="bg-surface rounded-3xl border border-border p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-11 rounded-2xl bg-brand-light text-brand flex items-center justify-center shrink-0">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold">{r.label}</h2>
                      <p className="text-sm text-muted">{r.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => selectRole(r.id, "login")}
                    >
                      Log in
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => selectRole(r.id, "signup")}
                    >
                      Sign up
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted mt-8">
            <Link
              href="/"
              className="hover:text-ink underline-offset-2 hover:underline"
            >
              Continue browsing
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const roleMeta = ROLES.find((r) => r.id === role)!;
  const Icon = roleMeta.icon;

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="max-w-md mx-auto px-4 py-8">
        <button
          onClick={() => setMode("select")}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-6"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-12 rounded-2xl bg-brand-light text-brand flex items-center justify-center">
              <Icon className="size-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-sm text-muted">{roleMeta.label}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <Input
                  id="fullName"
                  label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
                <Input
                  id="phone"
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </>
            )}
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />

            {error && (
              <div className="rounded-2xl bg-red-50 text-danger text-sm p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  className={cn("text-brand font-semibold")}
                  onClick={() => setMode("signup")}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="text-brand font-semibold"
                  onClick={() => setMode("login")}
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
