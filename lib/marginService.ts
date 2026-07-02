import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarginBillRow, MarginPaymentRow, MarginProfile } from "@/types/margin";

async function getCurrentUserId(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("No authenticated user found.");
  }

  return data.user.id;
}

export async function loadMarginData(supabase: SupabaseClient) {
  const [profileResponse, paymentsResponse, billsResponse] = await Promise.all([
    supabase
      .from("margin_profiles")
      .select("id, bank_balance, posted_payment_total")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("margin_payments")
      .select("id, name, amount")
      .order("created_at", { ascending: true }),
    supabase
      .from("margin_bills")
      .select("id, name, amount, due_day, due_month, paid")
      .order("due_day", { ascending: true }),
  ]);

  return {
    profileResponse: profileResponse as typeof profileResponse & { data: MarginProfile | null },
    paymentsResponse: paymentsResponse as typeof paymentsResponse & { data: MarginPaymentRow[] | null },
    billsResponse: billsResponse as typeof billsResponse & { data: MarginBillRow[] | null },
  };
}

export async function createMarginProfile(supabase: SupabaseClient) {
  const userId = await getCurrentUserId(supabase);

  return supabase
    .from("margin_profiles")
    .insert({ user_id: userId, bank_balance: 0, posted_payment_total: 0 })
    .select("id, bank_balance, posted_payment_total")
    .single();
}

export async function updateBankBalance(supabase: SupabaseClient, profileId: string, bankBalance: number) {
  return supabase
    .from("margin_profiles")
    .update({ bank_balance: bankBalance })
    .eq("id", profileId);
}

export async function createPayment(supabase: SupabaseClient, name: string, amount: number) {
  const userId = await getCurrentUserId(supabase);

  return supabase
    .from("margin_payments")
    .insert({ user_id: userId, name, amount })
    .select("id, name, amount")
    .single();
}

export async function updateMonthlyBill({
  supabase,
  billId,
  name,
  amount,
  dueDay,
  dueMonth,
}: {
  supabase: SupabaseClient;
  billId: string;
  name: string;
  amount: number;
  dueDay: number;
  dueMonth: string | null;
}) {
  return supabase
    .from("margin_bills")
    .update({ name, amount, due_day: dueDay, due_month: dueMonth })
    .eq("id", billId)
    .select("id, name, amount, due_day, due_month, paid")
    .single();
}

export async function deleteMonthlyBill(supabase: SupabaseClient, billId: string) {
  return supabase.from("margin_bills").delete().eq("id", billId);
}

export async function postPaymentAndUpdateProfile({
  supabase,
  profileId,
  paymentId,
  nextBankBalance,
  nextPostedPaymentTotal,
}: {
  supabase: SupabaseClient;
  profileId: string;
  paymentId: string;
  nextBankBalance: number;
  nextPostedPaymentTotal: number;
}) {
  const [profileResponse, deleteResponse] = await Promise.all([
    supabase
      .from("margin_profiles")
      .update({ bank_balance: nextBankBalance, posted_payment_total: nextPostedPaymentTotal })
      .eq("id", profileId),
    supabase.from("margin_payments").delete().eq("id", paymentId),
  ]);

  return { profileResponse, deleteResponse };
}

export async function startNextMonthData(supabase: SupabaseClient, dueMonth: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      billsResponse: { error: userError ?? new Error("No authenticated user found.") },
      paymentsResponse: { error: null },
      profileResponse: { error: null },
    };
  }

  const recurringBillsResponse = await supabase
    .from("margin_recurring_bills")
    .select("name, amount, due_day")
    .eq("is_active", true)
    .order("due_day", { ascending: true });

  if (recurringBillsResponse.error) {
    return {
      billsResponse: recurringBillsResponse,
      paymentsResponse: { error: null },
      profileResponse: { error: null },
    };
  }

  const billsToInsert = (recurringBillsResponse.data ?? []).map((bill) => ({
    user_id: userData.user.id,
    name: bill.name,
    amount: bill.amount,
    due_day: bill.due_day,
    due_month: dueMonth,
    paid: false,
  }));

  const billsResponse = billsToInsert.length
    ? await supabase.from("margin_bills").insert(billsToInsert)
    : { error: null };

  return {
    billsResponse,
    paymentsResponse: { error: null },
    profileResponse: { error: null },
  };
}