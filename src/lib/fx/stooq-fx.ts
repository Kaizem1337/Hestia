import { fetchText } from "@/lib/http";
import type { FxPair, FxProvider, FxQuote } from "./types";

/**
 * Stooq FX fallback. Stooq quotes currency pairs as lowercase concatenations,
 * e.g. "eurusd", "krwgbp": https://stooq.com/q/l/?s=eurusd&f=sd2t2ohlcv&h&e=csv
 */
export class StooqFxProvider implements FxProvider {
  readonly name = "stooq-fx";

  async getRates(pairs: FxPair[]): Promise<FxQuote[]> {
    const out: FxQuote[] = [];
    const needed: FxPair[] = [];
    for (const p of pairs) {
      if (p.from === p.to) out.push({ from: p.from, to: p.to, rate: 1 });
      else needed.push(p);
    }
    if (needed.length === 0) return out;

    // key (lowercase pair) -> FxPair
    const byKey = new Map<string, FxPair>();
    for (const p of needed) {
      byKey.set(`${p.from}${p.to}`.toLowerCase(), p);
    }

    const keys = Array.from(byKey.keys());
    const chunkSize = 20;
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      try {
        const url = `https://stooq.com/q/l/?s=${chunk.join(
          ","
        )}&f=sd2t2ohlcv&h&e=csv`;
        const csv = await fetchText(url, { accept: "text/csv" });
        const lines = csv.trim().split(/\r?\n/);
        const header = lines.shift()?.toLowerCase() ?? "";
        const cols = header.split(",");
        const symIdx = cols.indexOf("symbol");
        const closeIdx = cols.indexOf("close");
        if (symIdx === -1 || closeIdx === -1) continue;
        for (const line of lines) {
          const parts = line.split(",");
          const key = parts[symIdx]?.toLowerCase();
          const rate = Number(parts[closeIdx]);
          if (!key || !Number.isFinite(rate) || rate <= 0) continue;
          const pair = byKey.get(key);
          if (pair) out.push({ from: pair.from, to: pair.to, rate });
        }
      } catch {
        // skip chunk
      }
    }
    return out;
  }
}
