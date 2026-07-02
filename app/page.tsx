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
  loadMarginData as fetchMarginData,
  postPaymentAndUpdateProfile,
  startNextMonthData,
  updateBankBalance,
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

export default function Home() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [bankBalance, setBankBalance] = useState(0);
  const [postedPaymentTotal, setPostedPaymentTotal] = useState(0);

  const [paymentName, setPaymentName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);

  const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);

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


  const projectedBalance = bankBalance - pendingPaymentTotal - unpaidBillTotal;

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
      ((billsResponse.data ?? []) as MarginBillRow[]).map((bill) => ({
        id: bill.id,
        name: bill.name,
        amount: toMoneyNumber(bill.amount),
        dueDay: bill.due_day,
        paid: bill.paid,
      }))
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
  async function startNextMonth() {
    if (!supabase || !profileId) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const { billsResponse, paymentsResponse, profileResponse } = await startNextMonthData(supabase);

    if (billsResponse.error || paymentsResponse.error || profileResponse.error) {
      setErrorMessage("Could not reset monthly bills.");
      setIsSaving(false);
      return;
    }

    await loadMarginData();
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {session ? (
        <TopNav
          isLoading={isLoading}
          isSaving={isSaving}
          startNextMonth={startNextMonth}
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
                  isSaving={isSaving}
                  moveBillToPayments={moveBillToPayments}
                />
              </section>
            </section>

            <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:mt-4 sm:p-4 lg:mt-6">
              <button
                onClick={startNextMonth}
                disabled={isLoading || isSaving}
                className="h-12 w-full rounded-xl bg-[#163B5C] px-4 text-sm font-bold text-white transition hover:bg-[#102c45] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset bills
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                Reloads your monthly bills from the recurring bills list.
              </p>
            </section>
          </>
        )}
      </div>

      {session ? <BottomNav /> : null}
    </main>
  );
}
