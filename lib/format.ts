export function toMoneyNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}