"use client";

import { supabase } from "@/lib/supabase";

type TopNavProps = {
  isLoading: boolean;
  isSaving: boolean;
  startNextMonth: () => void;
  title?: string;
};

export function TopNav({
  isLoading: _isLoading,
  isSaving: _isSaving,
  startNextMonth: _startNextMonth,
  title = "Monthly cash flow",
}: TopNavProps) {
  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3 md:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C95730]">Margin</p>
          <h1 className="truncate text-lg font-bold tracking-tight text-[#163B5C] sm:text-xl md:text-2xl">
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={!supabase}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-[#C95730] hover:text-[#C95730] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}