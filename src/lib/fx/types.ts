export interface FxPair {
  from: string;
  to: string;
}

export interface FxQuote {
  from: string;
  to: string;
  rate: number;
}

/**
 * FX provider adapter contract. Implement to swap the FX data source without
 * touching conversion logic elsewhere.
 */
export interface FxProvider {
  readonly name: string;
  getRates(pairs: FxPair[]): Promise<FxQuote[]>;
}
