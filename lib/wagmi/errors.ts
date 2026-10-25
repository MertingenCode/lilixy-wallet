export class ProviderRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "ProviderRpcError";
    this.code = code;
    this.data = data;
  }
}

export const RPC_ERRORS = {
  userRejected: 4001,
  unauthorized: 4100,
  unsupportedMethod: 4200,
  disconnected: 4900,
  chainDisconnected: 4901,
  unrecognizedChain: 4902,
  invalidParams: -32602,
  internal: -32603,
} as const;

export function mapProviderError(error: unknown): ProviderRpcError {
  if (error instanceof ProviderRpcError) return error;
  const message =
    error instanceof Error ? error.message : "Internal provider error";
  if (/user rejected|denied|rejected the request/iu.test(message)) {
    return new ProviderRpcError(RPC_ERRORS.userRejected, "User rejected request");
  }
  if (/chain.*not.*(added|configured)|unrecognized chain/iu.test(message)) {
    return new ProviderRpcError(
      RPC_ERRORS.unrecognizedChain,
      "Unrecognized chain ID",
    );
  }
  return new ProviderRpcError(RPC_ERRORS.internal, message);
}
