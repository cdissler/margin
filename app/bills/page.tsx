

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthCard } from "@/components/margin/AuthCard";
import { BottomNav } from "@/components/margin/bottomNav";
import { formatMoney } from "@/lib/money";
import { supabase } from "@/lib/supabase";

type RecurringBill = {
  id: string;
  name: string;
  amount: number | string;
  due_day: number;
  is_active: boolean;
};

export default function BillsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDay, setBillDueDay] = useState("");
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Supabase is not configured. Check your .env.local file.");
      setIsAuthLoading(false);
      setIsLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setIsAuthLoading(false);

        if (data.session) {
          loadRecurringBills();
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        setErrorMessage("Could not check sign-in status.");
        setIsAuthLoading(false);
        setIsLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession) {
        loadRecurringBills();
      } else {
        setRecurringBills([]);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const activeBillTotal = useMemo(
    () => recurringBills.filter((bill) => bill.is_active).reduce((sum, bill) => sum + Number(bill.amount), 0),
    [recurringBills]
  );

  async function loadRecurringBills() {
    if (!supabase) {
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    const response = await supabase
      .from("margin_recurring_bills")
      .select("id, name, amount, due_day, is_active")
      .order("due_day", { ascending: true });

    if (response.error) {
      setErrorMessage("Could not load recurring bills.");
      setIsLoading(false);
      return;
    }

    setRecurringBills((response.data ?? []) as RecurringBill[]);
    setIsLoading(false);
  }

  async function addRecurringBill() {
    if (!supabase) {
      return;
    }

    const amount = Number(billAmount);
    const dueDay = Number(billDueDay);

    if (!billName.trim() || !amount || amount <= 0 || !dueDay || dueDay < 1 || dueDay > 31) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setErrorMessage("You need to sign in before adding bills.");
      setIsSaving(false);
      return;
    }

    const response = await supabase
      .from("margin_recurring_bills")
      .insert({
        user_id: userData.user.id,
        name: billName.trim(),
        amount,
        due_day: dueDay,
        is_active: true,
      })
      .select("id, name, amount, due_day, is_active")
      .single();

    if (response.error) {
      setErrorMessage("Could not add recurring bill.");
      setIsSaving(false);
      return;
    }

    setRecurringBills((currentBills) =>
      [...currentBills, response.data as RecurringBill].sort((firstBill, secondBill) => firstBill.due_day - secondBill.due_day)
    );
    setBillName("");
    setBillAmount("");
    setBillDueDay("");
    setIsSaving(false);
  }

  async function removeRecurringBill(id: string) {
    if (!supabase) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const response = await supabase.from("margin_recurring_bills").delete().eq("id", id);

    if (response.error) {
      setErrorMessage("Could not remove recurring bill.");
      setIsSaving(false);
      return;
    }

    setRecurringBills((currentBills) => currentBills.filter((bill) => bill.id !== id));
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-5 md:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C95730]">Margin</p>
            <h1 className="truncate text-lg font-bold tracking-tight text-[#163B5C] sm:text-xl md:text-2xl">
              Monthly bills
            </h1>
          </div>
          <a
            href="/"
            className="shrink-0 rounded-full bg-[#163B5C] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#102c45]"
          >
            Back
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col px-3 py-3 sm:px-5 sm:py-5 md:px-8 md:py-6">
        {errorMessage ? (
          <div className="mb-3 rounded-2xl border border-[#C95730]/30 bg-white px-4 py-3 text-sm font-semibold text-[#C95730] shadow-sm">
            {errorMessage}
          </div>
        ) : null}

        {isAuthLoading || isLoading ? (
          <div className="rounded-2xl bg-white px-4 py-6 text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
            Loading recurring bills...
          </div>
        ) : !session ? (
          <AuthCard onAuthSuccess={loadRecurringBills} />
        ) : (
          <section className="grid gap-3 md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-5">
            <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 md:sticky md:top-20">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C95730]">Recurring list</p>
              <p className="mt-2 text-3xl font-bold text-[#163B5C]">{formatMoney(activeBillTotal)}</p>
              <p className="mt-1 text-sm text-slate-500">Active bills that can repopulate each month.</p>

              <div className="mt-5 space-y-3">
                <input
                  type="text"
                  value={billName}
                  onChange={(event) => setBillName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                  placeholder="Bill name"
                />
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billAmount}
                    onChange={(event) => setBillAmount(event.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="Amount"
                  />
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billDueDay}
                    onChange={(event) => setBillDueDay(event.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="Due"
                  />
                </div>
                <button
                  onClick={addRecurringBill}
                  disabled={isSaving}
                  className="h-11 w-full rounded-xl bg-[#C95730] px-4 text-sm font-bold text-white transition hover:bg-[#ad4527] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add bill
                </button>
              </div>
            </aside>

            <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                <h2 className="text-lg font-bold text-[#163B5C]">Bills you pay every month</h2>
                <p className="text-xs text-slate-500 sm:text-sm">This list will become the source for each new month.</p>
              </div>

              <div className="divide-y divide-slate-100">
                {recurringBills.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-slate-500 sm:px-5 sm:py-7">No recurring bills yet.</p>
                ) : (
                  recurringBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {bill.name} <span className="font-semibold text-slate-400">· Due {bill.due_day}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{bill.is_active ? "Active" : "Inactive"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-sm font-bold text-[#163B5C]">{formatMoney(Number(bill.amount))}</p>
                        <button
                          onClick={() => removeRecurringBill(bill.id)}
                          disabled={isSaving}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-[#C95730] hover:text-[#C95730] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        )}
      </div>

      {session ? <BottomNav /> : null}
    </main>
  );
}