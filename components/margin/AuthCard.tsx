

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthCardProps = {
  onAuthSuccess: () => void;
};

export function AuthCard({ onAuthSuccess }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function signIn() {
    if (!supabase) {
      setErrorMessage("Supabase is not configured. Check your .env.local file.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (response.error) {
      setErrorMessage(response.error.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onAuthSuccess();
  }

  async function signUp() {
    if (!supabase) {
      setErrorMessage("Supabase is not configured. Check your .env.local file.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (response.error) {
      setErrorMessage(response.error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Account created. Check your email if confirmation is required, then sign in.");
    setIsLoading(false);
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C95730]">Margin</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#163B5C]">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use your account to keep your cash-flow data private and synced.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-slate-600" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
            placeholder="••••••••"
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p>
      ) : null}

      {successMessage ? (
        <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{successMessage}</p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={signIn}
          disabled={isLoading || !email.trim() || !password}
          className="h-11 rounded-xl bg-[#163B5C] px-4 text-sm font-bold text-white transition hover:bg-[#102c45] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign in
        </button>
        <button
          onClick={signUp}
          disabled={isLoading || !email.trim() || !password}
          className="h-11 rounded-xl bg-[#C95730] px-4 text-sm font-bold text-white transition hover:bg-[#ad4527] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign up
        </button>
      </div>
    </section>
  );
}