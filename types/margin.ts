export type Payment = {
  id: string;
  name: string;
  amount: number;
};

export type MonthlyBill = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  dueMonth: string | null;
  paid: boolean;
};

export type MarginProfile = {
  id: string;
  bank_balance: number | string;
  posted_payment_total: number | string;
};

export type MarginPaymentRow = {
  id: string;
  name: string;
  amount: number | string;
};

export type MarginBillRow = {
  id: string;
  name: string;
  amount: number | string;
  due_day: number;
  due_month: string | null;
  paid: boolean;
};