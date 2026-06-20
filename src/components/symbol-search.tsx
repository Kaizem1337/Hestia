"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";
import type { SearchResult } from "@/lib/view-types";
import { cn } from "@/lib/utils";

export function SymbolSearch({
  onSelect,
  placeholder = "Search ticker or company (e.g. AAPL, 000660, Dongyue)",
  autoFocus,
}: {
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<{ results: SearchResult[] }>(
          `/api/search?q=${encodeURIComponent(q)}`
        );
        setResults(data.results);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // debounce
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(r: SearchResult) {
    onSelect(r);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Symbol search"
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {results.length === 0 && !loading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches. Try a different ticker or name.
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.symbol}-${i}`}
              onClick={() => choose(r)}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left",
                i === activeIndex ? "bg-muted" : "hover:bg-muted"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.symbol}</span>
                  {r.type && (
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {r.type}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {r.name || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <div>{r.exchange || r.region || ""}</div>
                <div className="font-medium">{r.currency || ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
