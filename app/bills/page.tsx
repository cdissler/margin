

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthCard } from "@/components/margin/AuthCard";
import { BottomNav } from "@/components/margin/bottomNav";
import { TopNav } from "@/components/margin/topNav";
import { formatMoney } from "@/lib/money";
import { supabase } from "@/lib/supabase";


type RecurringBill = {
  id: string;
  name: string;
  amount: number | string;
  due_day: number;
  is_active: boolean;
};

function formatDueDay(day: number) {
  const suffixRules = new Intl.PluralRules("en-US", { type: "ordinal" });
  const suffixes: Record<Intl.LDMLPluralRule, string> = {
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
    zero: "th",
    many: "th",
  };

  return `${day}${suffixes[suffixRules.select(day)]}`;
}

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
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueDay, setEditBillDueDay] = useState("");

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

  function openBillActions(bill: RecurringBill) {
    setSelectedBill(bill);
    setEditBillName(bill.name);
    setEditBillAmount(String(bill.amount));
    setEditBillDueDay(String(bill.due_day));
  }

  async function updateRecurringBill() {
    if (!supabase || !selectedBill) {
      return;
    }

    const amount = Number(editBillAmount);
    const dueDay = Number(editBillDueDay);

    if (!editBillName.trim() || !amount || amount <= 0 || !dueDay || dueDay < 1 || dueDay > 31) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const response = await supabase
      .from("margin_recurring_bills")
      .update({
        name: editBillName.trim(),
        amount,
        due_day: dueDay,
      })
      .eq("id", selectedBill.id)
      .select("id, name, amount, due_day, is_active")
      .single();

    if (response.error) {
      setErrorMessage("Could not update recurring bill.");
      setIsSaving(false);
      return;
    }

    setRecurringBills((currentBills) =>
      currentBills
        .map((bill) => (bill.id === selectedBill.id ? (response.data as RecurringBill) : bill))
        .sort((firstBill, secondBill) => firstBill.due_day - secondBill.due_day)
    );
    setSelectedBill(null);
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
    setSelectedBill(null);
    setIsSaving(false);
  }


  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <TopNav
        isLoading={isLoading}
        isSaving={isSaving}
        startNextMonth={() => {}}
        title="Monthly bills"
      />

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-3 sm:px-5 sm:pt-5 md:px-8 md:pt-6">
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
          <section className="grid min-w-0 gap-3 pb-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-start md:gap-5">
            <aside className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 md:sticky md:top-20">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C95730]">Recurring list</p>
                <p className="shrink-0 text-right text-2xl font-bold tabular-nums text-[#163B5C]">{formatMoney(activeBillTotal)}</p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_86px_66px] gap-2">
                  <input
                    type="text"
                    value={billName}
                    onChange={(event) => setBillName(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="Name"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billAmount}
                    onChange={(event) => setBillAmount(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="$"
                  />
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billDueDay}
                    onChange={(event) => setBillDueDay(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="📅"
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

            <section className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                <h2 className="text-lg font-bold text-[#163B5C]">Bills you pay every month</h2>
                <p className="text-xs text-slate-500 sm:text-sm">This list will become the source for each new month.</p>
              </div>

              <div className="w-full">
                {recurringBills.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-slate-500 sm:px-5 sm:py-7">No recurring bills yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_12px_104px_12px_76px] items-center gap-2 border-b border-slate-100 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:gap-3 sm:px-5">
                      <span>Name</span>
                      <span className="text-center">|</span>
                      <span className="text-right">$</span>
                      <span className="text-center">|</span>
                      <span className="text-right">📅</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {recurringBills.map((bill) => (
                        <button
                          key={bill.id}
                          type="button"
                          onClick={() => openBillActions(bill)}
                          className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_12px_92px_12px_64px] items-center gap-2 px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 sm:gap-3 sm:px-5"
                        >
                          <span className="min-w-0 truncate text-sm font-bold text-slate-800">{bill.name}</span>
                          <span className="text-center text-sm font-bold text-slate-300">|</span>
                          <span className="text-right text-sm font-bold tabular-nums text-[#163B5C]">{formatMoney(Number(bill.amount))}</span>
                          <span className="text-center text-sm font-bold text-slate-300">|</span>
                          <span className="text-right text-sm font-semibold tabular-nums text-slate-500">{formatDueDay(bill.due_day)}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </section>
        )}
      </div>

      {selectedBill ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-3 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-5 sm:px-5">
          <div className="max-h-[calc(100vh-8rem)] w-full overflow-y-auto rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:max-w-md sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C95730]">Edit recurring bill</p>
                <h2 className="mt-1 truncate text-xl font-bold text-[#163B5C]">{selectedBill.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatMoney(Number(selectedBill.amount))} due on the {formatDueDay(selectedBill.due_day)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeRecurringBill(selectedBill.id)}
                disabled={isSaving}
                className="shrink-0 rounded-full border border-[#C95730]/25 bg-white px-3 py-1.5 text-xs font-bold text-[#C95730] transition hover:border-[#C95730]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-[minmax(0,1fr)_92px_70px] gap-2">
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Name</span>
                  <input
                    type="text"
                    value={editBillName}
                    onChange={(event) => setEditBillName(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="Name"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editBillAmount}
                    onChange={(event) => setEditBillAmount(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="$"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">📅</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editBillDueDay}
                    onChange={(event) => setEditBillDueDay(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="📅"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedBill(null)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={updateRecurringBill}
                disabled={isSaving}
                className="h-11 rounded-xl bg-[#C95730] px-4 text-sm font-bold text-white transition hover:bg-[#ad4527] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {session ? <BottomNav /> : null}
    </main>
  );
}