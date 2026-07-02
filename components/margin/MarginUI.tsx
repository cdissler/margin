import { formatMoney } from "@/lib/money";
import type { MonthlyBill, Payment } from "@/types/margin";

type LedgerTotalProps = {
  label: string;
  value: number;
  muted?: boolean;
};

export function LedgerTotal({ label, value, muted = false }: LedgerTotalProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className={`text-lg font-bold ${muted ? "text-slate-500" : "text-[#163B5C]"}`}>
        {formatMoney(value)}
      </p>
    </div>
  );
}

type MiniTotalProps = {
  label: string;
  value: number;
};

export function MiniTotal({ label, value }: MiniTotalProps) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#163B5C]">{formatMoney(value)}</p>
    </div>
  );
}

type ListRowProps = {
  checked: boolean;
  title: string;
  amount: number;
  onClick: () => void;
};

export function ListRow({ checked, title, amount, onClick }: ListRowProps) {
  return (
    <div className="pointer-events-none grid w-full grid-cols-[minmax(0,1fr)_112px_38px] items-center gap-4 px-4 py-3.5 text-left sm:grid-cols-[minmax(0,1fr)_132px_42px] sm:px-5 sm:py-4">
      <span className={`block truncate text-base font-bold leading-6 sm:text-lg ${checked ? "text-slate-400 line-through" : "text-slate-800"}`}>
        {title}
      </span>
      <span className={`text-right text-base font-bold leading-6 tabular-nums sm:text-lg ${checked ? "text-slate-400" : "text-[#163B5C]"}`}>
        {formatMoney(amount)}
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`pointer-events-auto flex h-9 w-9 items-center justify-center justify-self-end rounded-lg border text-base font-bold transition sm:h-10 sm:w-10 ${
          checked
            ? "border-[#163B5C] bg-[#163B5C] text-white"
            : "border-slate-300 bg-white text-slate-300 hover:border-[#C95730] hover:text-[#C95730]"
        }`}
        aria-label={`Post ${title}`}
      >
        ✓
      </button>
    </div>
  );
}

type EmptyStateProps = {
  text: string;
};

export function EmptyState({ text }: EmptyStateProps) {
  return <p className="px-4 py-5 text-sm text-slate-500 sm:px-5 sm:py-7">{text}</p>;
}

type BankAccountCardProps = {
  bankBalance: number;
  saveBankBalance: (value: number) => void;
};

export function BankAccountCard({ bankBalance, saveBankBalance }: BankAccountCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="p-4 sm:p-5">
        <label className="block text-sm font-semibold text-slate-600" htmlFor="bankBalance">
          Current balance
        </label>
        <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-[#163B5C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#163B5C]/10 sm:px-4 sm:py-3">
          <span className="mr-2 text-slate-500">$</span>
          <input
            id="bankBalance"
            type="number"
            min="0"
            step="0.01"
            value={bankBalance || ""}
            onChange={(event) => saveBankBalance(Number(event.target.value))}
            className="w-full bg-transparent text-xl font-bold text-[#163B5C] outline-none sm:text-2xl"
            placeholder="0.00"
          />
        </div>
      </div>
    </section>
  );
}

type MonthlySummaryCardProps = {
  bankBalance: number;
  pendingPaymentTotal: number;
  unpaidBillTotal: number;
  projectedBalance: number;
};

export function MonthlySummaryCard({
  bankBalance,
  pendingPaymentTotal,
  unpaidBillTotal,
  projectedBalance,
}: MonthlySummaryCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="bg-[#163B5C] px-4 py-3.5 text-white sm:px-5 sm:py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">This month</p>
        <p className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">{formatMoney(projectedBalance)}</p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-200">
        <div className="px-2 py-2.5 text-center sm:px-3 sm:py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px]">Bank</p>
          <p className="mt-0.5 truncate text-base font-bold text-[#163B5C] sm:mt-1 sm:text-xl">{formatMoney(bankBalance)}</p>
        </div>
        <div className="px-2 py-2.5 text-center sm:px-3 sm:py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px]">Payments</p>
          <p className="mt-0.5 truncate text-base font-bold text-slate-600 sm:mt-1 sm:text-xl">-{formatMoney(pendingPaymentTotal)}</p>
        </div>
        <div className="px-2 py-2.5 text-center sm:px-3 sm:py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px]">Bills</p>
          <p className="mt-0.5 truncate text-base font-bold text-slate-600 sm:mt-1 sm:text-xl">-{formatMoney(unpaidBillTotal)}</p>
        </div>
      </div>
    </section>
  );
}

type ClearedTotalsCardProps = {
  postedPaymentTotal: number;
  pendingPaymentTotal: number;
  paidBillTotal: number;
};

export function ClearedTotalsCard({ postedPaymentTotal, pendingPaymentTotal, paidBillTotal }: ClearedTotalsCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        <div className="px-2 py-3 text-center sm:px-3">
          <MiniTotal label="Posted" value={postedPaymentTotal} />
        </div>
        <div className="px-2 py-3 text-center sm:px-3">
          <MiniTotal label="Waiting" value={Number.isFinite(pendingPaymentTotal) ? pendingPaymentTotal : 0} />
        </div>
        <div className="px-2 py-3 text-center sm:px-3">
          <MiniTotal label="Bills" value={paidBillTotal} />
        </div>
      </div>
    </section>
  );
}

type PaymentsSectionProps = {
  paymentName: string;
  paymentAmount: string;
  payments: Payment[];
  isSaving: boolean;
  setPaymentName: (value: string) => void;
  setPaymentAmount: (value: string) => void;
  addPayment: () => void;
  postPayment: (id: string) => void;
};

export function PaymentsSection({
  paymentName,
  paymentAmount,
  payments,
  isSaving,
  setPaymentName,
  setPaymentAmount,
  addPayment,
  postPayment,
}: PaymentsSectionProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        <div className="grid grid-cols-[112px_1fr_58px] gap-2 sm:grid-cols-[150px_1fr_64px] sm:gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#163B5C] focus:ring-2 focus:ring-[#163B5C]/10 sm:h-11"
            placeholder="Amount"
          />
          <input
            type="text"
            value={paymentName}
            onChange={(event) => setPaymentName(event.target.value)}
            className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#163B5C] focus:ring-2 focus:ring-[#163B5C]/10 sm:h-11"
            placeholder="Payment name"
          />
          <button
            onClick={addPayment}
            disabled={isSaving}
            className="h-10 rounded-xl bg-[#C95730] px-3 text-sm font-bold text-white transition hover:bg-[#ad4527] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:px-4"
          >
            Add
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#C95730]/20">
        <div className="border-b border-[#C95730]/10 bg-[#C95730]/[0.04] px-4 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#C95730] sm:text-lg">Payments waiting to post</h2>
            <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2.5 text-xs font-bold text-[#C95730] shadow-sm ring-1 ring-[#C95730]/15">
              {payments.length}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 bg-white">
          {payments.length === 0 ? (
            <EmptyState text="Nothing waiting to post." />
          ) : (
            payments.map((payment) => (
              <ListRow
                key={payment.id}
                checked={false}
                title={payment.name}
                amount={payment.amount}
                onClick={() => postPayment(payment.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

type MonthlyBillsSectionProps = {
  monthlyBills: MonthlyBill[];
  unpaidBillTotal: number;
  isSaving: boolean;
  moveBillToPayments: (id: string) => void;
};

export function MonthlyBillsSection({
  monthlyBills,
  unpaidBillTotal,
  isSaving,
  moveBillToPayments,
}: MonthlyBillsSectionProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:mb-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-slate-800 sm:text-base">Monthly bills</h2>
        <p className="shrink-0 text-right text-sm font-bold tabular-nums text-[#163B5C]">
          {formatMoney(unpaidBillTotal)}
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {monthlyBills.length === 0 ? (
          <EmptyState text="No monthly bills added yet." />
        ) : (
          monthlyBills.map((bill) => (
            <div
              key={bill.id}
              className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_58px_100px_68px] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_72px_116px_76px] sm:gap-4 sm:px-5 sm:py-3.5"
            >
              <p className="min-w-0 truncate text-base font-bold text-slate-800 sm:text-lg">{bill.name}</p>
              <p className="text-right text-sm font-bold tabular-nums text-slate-400 sm:text-base">Due {bill.dueDay}</p>
              <p className="text-right text-base font-bold tabular-nums text-[#163B5C] sm:text-lg">{formatMoney(bill.amount)}</p>
              <button
                type="button"
                onClick={() => moveBillToPayments(bill.id)}
                disabled={isSaving}
                className="h-10 rounded-lg bg-[#C95730] px-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#ad4527] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-base"
                aria-label={`Move ${bill.name} to payments`}
              >
                Paid
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}