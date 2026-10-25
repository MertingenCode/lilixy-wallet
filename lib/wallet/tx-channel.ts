export const TX_SENT_EVENT = "lilixy:tx-sent";

export interface TxSentDetail {
  hash: string;
  chainId: number;
  from: string;
  to?: string;
  value?: string;
  data?: string;
  nonce?: number;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  timestamp: number;
}

export function emitTransactionSent(detail: TxSentDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TxSentDetail>(TX_SENT_EVENT, { detail }),
  );
}

export function subscribeToTransactions(
  listener: (detail: TxSentDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const custom = event as CustomEvent<TxSentDetail>;
    if (custom.detail) listener(custom.detail);
  };
  window.addEventListener(TX_SENT_EVENT, handler);
  return () => window.removeEventListener(TX_SENT_EVENT, handler);
}
