/** Pure FX conversion helper (no DB/provider dependencies). */
export function convert(amount: number, rate: number): number {
  return amount * rate;
}
