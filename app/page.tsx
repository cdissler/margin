"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BankAccountCard,
  MonthlyBillsSection,
  MonthlySummaryCard,
  PaymentsSection,
} from "@/components/margin/MarginUI";
import { AuthCard } from "@/components/margin/AuthCard";
import { BottomNav } from "@/components/margin/bottomNav";
import { TopNav } from "@/components/margin/topNav";
import {
  createMarginProfile,
  createPayment,
  deleteMonthlyBill,
  loadMarginData as fetchMarginData,
  postPaymentAndUpdateProfile,
  startNextMonthData,
  updateBankBalance,
  updateMonthlyBill,
} from "@/lib/marginService";
import { toMoneyNumber } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type {
  MarginBillRow,
  MarginPaymentRow,
  MarginProfile,
  MonthlyBill,
  Payment,
} from "@/types/margin";

const billMonthSortOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getBillMonthSortValue(month: string | null) {
  if (!month) {
    return 99;
  }

  const monthIndex = billMonthSortOrder.indexOf(month);
  return monthIndex === -1 ? 99 : monthIndex;
}

function sortMonthlyBillsByMonthThenDay(bills: MonthlyBill[]) {
  return [...bills].sort((firstBill, secondBill) => {
    const monthDifference = getBillMonthSortValue(firstBill.dueMonth) - getBillMonthSortValue(secondBill.dueMonth);

    if (monthDifference !== 0) {
      return monthDifference;
    }

    const dayDifference = firstBill.dueDay - secondBill.dueDay;

    if (dayDifference !== 0) {
      return dayDifference;
    }

    return firstBill.name.localeCompare(secondBill.name);
  });
}

export default function Home() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [bankBalance, setBankBalance] = useState(0);
  const [postedPaymentTotal, setPostedPaymentTotal] = useState(0);

  const [paymentName, setPaymentName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);

  const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_month, index) => {
        const date = new Date(new Date().getFullYear(), index, 1);

        return {
          value: index,
          label: date.toLocaleString("en-US", { month: "long" }),
          shortLabel: date.toLocaleString("en-US", { month: "short" }),
        };
      }),
    []
  );
  const currentMonthIndex = new Date().getMonth();
  const [selectedBillMonth, setSelectedBillMonth] = useState(currentMonthIndex);
  const [isBillMonthPickerOpen, setIsBillMonthPickerOpen] = useState(false);
  const [selectedMonthlyBill, setSelectedMonthlyBill] = useState<MonthlyBill | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueMonth, setEditBillDueMonth] = useState("");
  const [editBillDueDay, setEditBillDueDay] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Supabase is not configured. Check your .env.local file.");
      setIsAuthLoading(false);
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);

      if (data.session) {
        loadMarginData();
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      setErrorMessage("Could not check sign-in status.");
      setIsAuthLoading(false);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession) {
        loadMarginData();
      } else {
        setProfileId(null);
        setBankBalance(0);
        setPostedPaymentTotal(0);
        setPayments([]);
        setMonthlyBills([]);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const pendingPaymentTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  const unpaidBillTotal = useMemo(
    () => monthlyBills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0),
    [monthlyBills]
  );
  const selectedBillMonthLabel = monthOptions.find((month) => month.value === selectedBillMonth)?.shortLabel ?? "";


  const projectedBalance = bankBalance - pendingPaymentTotal;

  async function loadMarginData() {
    if (!supabase) {
      setErrorMessage("Supabase is not configured. Check your .env.local file.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    let marginData;

    try {
      marginData = await fetchMarginData(supabase);
    } catch {
      setErrorMessage("Could not load Margin data from Supabase.");
      setIsLoading(false);
      return;
    }

    const { profileResponse, paymentsResponse, billsResponse } = marginData;

    if (profileResponse.error || paymentsResponse.error || billsResponse.error) {
      setErrorMessage("Could not load Margin data from Supabase.");
      setIsLoading(false);
      return;
    }

    let profile = profileResponse.data as MarginProfile | null;

    if (!profile) {
      const createProfileResponse = await createMarginProfile(supabase);
      if (createProfileResponse.error) {
        setErrorMessage("Could not create your Margin profile.");
        setIsLoading(false);
        return;
      }
      profile = createProfileResponse.data as MarginProfile;
    }

    setProfileId(profile.id);
    setBankBalance(toMoneyNumber(profile.bank_balance));
    setPostedPaymentTotal(toMoneyNumber(profile.posted_payment_total));
    setPayments(
      ((paymentsResponse.data ?? []) as MarginPaymentRow[]).map((payment) => ({
        id: payment.id,
        name: payment.name,
        amount: toMoneyNumber(payment.amount),
      }))
    );
    setMonthlyBills(
      sortMonthlyBillsByMonthThenDay(
        ((billsResponse.data ?? []) as MarginBillRow[]).map((bill) => ({
          id: bill.id,
          name: bill.name,
          amount: toMoneyNumber(bill.amount),
          dueDay: bill.due_day,
          dueMonth: bill.due_month,
          paid: bill.paid,
        }))
      )
    );

    setIsLoading(false);
  }

  async function saveBankBalance(value: number) {
    setBankBalance(value);
    setErrorMessage("");

    if (!supabase || !profileId) {
      return;
    }

    const response = await updateBankBalance(supabase, profileId, value);

    if (response.error) {
      setErrorMessage("Could not save bank balance.");
    }
  }

  async function addPayment() {
    if (!supabase) {
      return;
    }

    setErrorMessage("");

    const amount = Number(paymentAmount);

    if (!paymentName.trim() || !amount || amount <= 0) {
      return;
    }

    setIsSaving(true);

    const response = await createPayment(supabase, paymentName.trim(), amount);

    if (response.error) {
      setErrorMessage("Could not add payment.");
      setIsSaving(false);
      return;
    }

    const newPayment = response.data as MarginPaymentRow;

    setPayments((currentPayments) => [
      ...currentPayments,
      {
        id: newPayment.id,
        name: newPayment.name,
        amount: toMoneyNumber(newPayment.amount),
      },
    ]);

    setPaymentName("");
    setPaymentAmount("");
    setIsSaving(false);
  }

  async function postPayment(id: string) {
    if (!supabase || !profileId) {
      return;
    }

    setErrorMessage("");

    const paymentToPost = payments.find((payment) => payment.id === id);

    if (!paymentToPost) {
      return;
    }

    const nextBankBalance = bankBalance - paymentToPost.amount;
    const nextPostedPaymentTotal = postedPaymentTotal + paymentToPost.amount;

    setIsSaving(true);

    const { profileResponse, deleteResponse } = await postPaymentAndUpdateProfile({
      supabase,
      profileId,
      paymentId: id,
      nextBankBalance,
      nextPostedPaymentTotal,
    });

    if (profileResponse.error || deleteResponse.error) {
      setErrorMessage("Could not post payment.");
      setIsSaving(false);
      return;
    }

    setBankBalance(nextBankBalance);
    setPostedPaymentTotal(nextPostedPaymentTotal);
    setPayments((currentPayments) => currentPayments.filter((payment) => payment.id !== id));
    setIsSaving(false);
  }
  async function moveBillToPayments(id: string) {
    if (!supabase) {
      return;
    }

    setErrorMessage("");

    const billToMove = monthlyBills.find((bill) => bill.id === id);

    if (!billToMove) {
      return;
    }

    setIsSaving(true);

    const paymentResponse = await createPayment(supabase, billToMove.name, billToMove.amount);

    if (paymentResponse.error) {
      setErrorMessage("Could not add bill to payments.");
      setIsSaving(false);
      return;
    }

    const deleteResponse = await supabase.from("margin_bills").delete().eq("id", id);

    if (deleteResponse.error) {
      setErrorMessage("Payment was added, but the bill could not be removed.");
      setIsSaving(false);
      return;
    }

    const newPayment = paymentResponse.data as MarginPaymentRow;

    setPayments((currentPayments) => [
      ...currentPayments,
      {
        id: newPayment.id,
        name: newPayment.name,
        amount: toMoneyNumber(newPayment.amount),
      },
    ]);
    setMonthlyBills((currentBills) => currentBills.filter((bill) => bill.id !== id));
    setIsSaving(false);
  }

  function openBillEditor(bill: MonthlyBill) {
    setSelectedMonthlyBill(bill);
    setEditBillName(bill.name);
    setEditBillAmount(String(bill.amount));
    setEditBillDueMonth(bill.dueMonth ?? selectedBillMonthLabel);
    setEditBillDueDay(String(bill.dueDay));
  }

  async function saveMonthlyBill() {
    if (!supabase || !selectedMonthlyBill) {
      return;
    }

    const amount = Number(editBillAmount);
    const dueDay = Number(editBillDueDay);

    if (!editBillName.trim() || !amount || amount <= 0 || !editBillDueMonth || !dueDay || dueDay < 1 || dueDay > 31) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const response = await updateMonthlyBill({
      supabase,
      billId: selectedMonthlyBill.id,
      name: editBillName.trim(),
      amount,
      dueDay,
      dueMonth: editBillDueMonth,
    });

    if (response.error) {
      setErrorMessage("Could not update monthly bill.");
      setIsSaving(false);
      return;
    }

    const updatedBill = response.data as MarginBillRow;

    setMonthlyBills((currentBills) =>
      sortMonthlyBillsByMonthThenDay(
        currentBills.map((bill) =>
          bill.id === selectedMonthlyBill.id
            ? {
                id: updatedBill.id,
                name: updatedBill.name,
                amount: toMoneyNumber(updatedBill.amount),
                dueDay: updatedBill.due_day,
                dueMonth: updatedBill.due_month,
                paid: updatedBill.paid,
              }
            : bill
        )
      )
    );
    setSelectedMonthlyBill(null);
    setIsSaving(false);
  }

  async function removeMonthlyBill() {
    if (!supabase || !selectedMonthlyBill) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const response = await deleteMonthlyBill(supabase, selectedMonthlyBill.id);

    if (response.error) {
      setErrorMessage("Could not delete monthly bill.");
      setIsSaving(false);
      return;
    }

    setMonthlyBills((currentBills) => currentBills.filter((bill) => bill.id !== selectedMonthlyBill.id));
    setSelectedMonthlyBill(null);
    setIsSaving(false);
  }
  async function startNextMonth() {
    if (!supabase || !profileId) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const { billsResponse, paymentsResponse, profileResponse } = await startNextMonthData(supabase, selectedBillMonthLabel);

    if (billsResponse.error || paymentsResponse.error || profileResponse.error) {
      setErrorMessage("Could not add monthly bills.");
      setIsSaving(false);
      return;
    }

    await loadMarginData();
    setIsBillMonthPickerOpen(false);
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {session ? (
        <TopNav
          isLoading={isLoading}
          isSaving={isSaving}
          startNextMonth={() => setIsBillMonthPickerOpen(true)}
        />
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-3 sm:px-5 sm:py-5 md:px-8 md:py-6">
        {errorMessage ? (
          <div className="mb-3 rounded-2xl border border-[#C95730]/30 bg-white px-4 py-3 text-sm font-semibold text-[#C95730] shadow-sm sm:mb-5 sm:px-5 sm:py-4">
            {errorMessage}
          </div>
        ) : null}

        {isAuthLoading || isLoading ? (
          <div className="rounded-2xl bg-white px-4 py-6 text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 sm:px-5 sm:py-8">
            Loading Margin data...
          </div>
        ) : !session ? (
          <AuthCard onAuthSuccess={() => undefined} />
        ) : (
          <>
            <section className="grid gap-3 sm:gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-6">
              <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-6 lg:space-y-5">
                <MonthlySummaryCard
                  bankBalance={bankBalance}
                  pendingPaymentTotal={pendingPaymentTotal}
                  unpaidBillTotal={unpaidBillTotal}
                  projectedBalance={projectedBalance}
                />

                <BankAccountCard bankBalance={bankBalance} saveBankBalance={saveBankBalance} />

              </aside>

              <section className="space-y-3 sm:space-y-4 lg:space-y-6">
                <PaymentsSection
                  paymentName={paymentName}
                  paymentAmount={paymentAmount}
                  payments={payments}
                  isSaving={isSaving}
                  setPaymentName={setPaymentName}
                  setPaymentAmount={setPaymentAmount}
                  addPayment={addPayment}
                  postPayment={postPayment}
                />

                <MonthlyBillsSection
                  monthlyBills={monthlyBills}
                  unpaidBillTotal={unpaidBillTotal}
                  billMonthLabel={selectedBillMonthLabel}
                  isSaving={isSaving}
                  moveBillToPayments={moveBillToPayments}
                  openBillEditor={openBillEditor}
                />
              </section>
            </section>

            <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:mt-4 sm:p-4 lg:mt-6">
              <button
                type="button"
                onClick={() => setIsBillMonthPickerOpen(true)}
                disabled={isLoading || isSaving}
                className="h-12 w-full rounded-xl bg-[#163B5C] px-4 text-sm font-bold text-white transition hover:bg-[#102c45] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add monthly bills
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                Adds bills from your recurring list without clearing anything.
              </p>
            </section>
          </>
        )}
      </div>

      {selectedMonthlyBill ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-4 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-5">
          <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={removeMonthlyBill}
                disabled={isSaving}
                className="shrink-0 rounded-full border border-[#C95730]/25 bg-white px-3 py-1.5 text-xs font-bold text-[#C95730] transition hover:border-[#C95730]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C95730]">Edit monthly bill</p>
                <h2 className="mt-1 truncate text-xl font-bold text-[#163B5C]">{selectedMonthlyBill.name}</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Name</span>
                <input
                  type="text"
                  value={editBillName}
                  onChange={(event) => setEditBillName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                  placeholder="Bill name"
                />
              </label>

              <div className="grid grid-cols-[minmax(0,1fr)_96px_72px] gap-2">
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Amount</span>
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
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Month</span>
                  <select
                    value={editBillDueMonth}
                    onChange={(event) => setEditBillDueMonth(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.shortLabel}>
                        {month.shortLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Due</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editBillDueDay}
                    onChange={(event) => setEditBillDueDay(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#163B5C] focus:bg-white focus:ring-2 focus:ring-[#163B5C]/10"
                    placeholder="Day"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMonthlyBill(null)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMonthlyBill}
                disabled={isSaving}
                className="h-11 rounded-xl bg-[#C95730] px-4 text-sm font-bold text-white transition hover:bg-[#ad4527] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isBillMonthPickerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-4 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C95730]">Add monthly bills</p>
              <h2 className="mt-1 text-xl font-bold text-[#163B5C]">Choose month</h2>
              <p className="mt-1 text-sm text-slate-500">Bills will be added from your recurring list.</p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {monthOptions.map((month) => (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => setSelectedBillMonth(month.value)}
                  className={`h-11 rounded-xl border px-3 text-sm font-bold transition ${
                    selectedBillMonth === month.value
                      ? "border-[#163B5C] bg-[#163B5C] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#163B5C]/40"
                  }`}
                >
                  {month.shortLabel}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsBillMonthPickerOpen(false)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startNextMonth}
                disabled={isSaving}
                className="h-11 rounded-xl bg-[#C95730] px-4 text-sm font-bold text-white transition hover:bg-[#ad4527] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add bills
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {session ? <BottomNav /> : null}
    </main>
  );
}
