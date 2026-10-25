import {
  encodeFunctionData,
  erc20Abi,
  type Address,
  type Chain,
  type PublicClient,
} from "viem";
import { estimateL1Fee } from "viem/op-stack";

import type { Asset } from "@/lib/wallet/assets";

const OP_STACK_CHAINS = new Set([10, 8453, 11155420, 84532]);
const ARBITRUM_CHAINS = new Set([42161, 421614]);

export interface TransferFeeEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  l1FeeWei: bigint;
  feeWei: bigint;
  includesL1Fee: boolean;
  isL2: boolean;
}

interface EstimateTransferFeeInput {
  client: PublicClient;
  chain: Chain;
  account: Address;
  asset: Pick<Asset, "kind" | "address" | "decimals" | "balance">;
  recipient: Address | undefined;
  amount: bigint | null;
}

function isL2Chain(chainId: number): boolean {
  return OP_STACK_CHAINS.has(chainId) || ARBITRUM_CHAINS.has(chainId);
}

/**
 * Estimate the full native cost of a transfer:
 * - gas limit with a safety buffer
 * - EIP-1559 max fee, falling back to legacy gas price
 * - OP Stack L1 data fee when available
 * - a larger gas buffer on Arbitrum because viem has no L1-fee helper there
 */
export async function estimateTransferFee({
  client,
  chain,
  account,
  asset,
  recipient,
  amount,
}: EstimateTransferFeeInput): Promise<TransferFeeEstimate> {
  const target = recipient ?? account;
  const native = asset.kind === "native";
  const probeAmount = (() => {
    if (!native) {
      if (amount === null || amount <= 0n) return 1n;
      return amount > asset.balance ? asset.balance : amount;
    }
    if (amount === null || amount <= 0n) return 0n;
    return amount > asset.balance ? asset.balance : amount;
  })();
  const data =
    !native && asset.address
      ? encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [target, probeAmount],
        })
      : undefined;

  let gasEstimate: bigint;
  try {
    gasEstimate = await client.estimateGas({
      account,
      to: native ? target : (asset.address as Address),
      value: native ? probeAmount : 0n,
      data,
    });
  } catch {
    // A failed simulation should not make the form unusable. These are
    // conservative fallbacks; the transaction itself is still simulated by the
    // signing path before broadcast.
    gasEstimate = native ? 21_000n : 65_000n;
  }

  // Arbitrum's L1 calldata cost is not exposed by viem, so reserve more gas.
  const bufferBps = ARBITRUM_CHAINS.has(chain.id) ? 15_000n : 12_000n;
  const gasLimit = (gasEstimate * bufferBps) / 10_000n;

  const fees = await client.estimateFeesPerGas().catch(() => null);
  const gasPrice =
    fees?.maxFeePerGas ??
    fees?.gasPrice ??
    (await client.getGasPrice());

  let l1FeeWei = 0n;
  let includesL1Fee = false;
  if (OP_STACK_CHAINS.has(chain.id)) {
    try {
      l1FeeWei = await estimateL1Fee(client, {
        account,
        chain,
        to: native ? target : (asset.address as Address),
        value: native ? probeAmount : 0n,
        data,
      });
      includesL1Fee = l1FeeWei > 0n;
    } catch {
      // If the GasPriceOracle is unavailable, leave a conservative reserve
      // instead of silently under-reporting the total fee.
      l1FeeWei = 0n;
    }
  }

  const l2FeeWei = gasLimit * gasPrice;
  const fallbackL1Reserve =
    OP_STACK_CHAINS.has(chain.id) && l1FeeWei === 0n
      ? (l2FeeWei * 20n) / 100n
      : 0n;

  return {
    gasLimit,
    gasPrice,
    l1FeeWei,
    feeWei: l2FeeWei + l1FeeWei + fallbackL1Reserve,
    includesL1Fee,
    isL2: isL2Chain(chain.id),
  };
}

export function isOpStackChain(chainId: number): boolean {
  return OP_STACK_CHAINS.has(chainId);
}

export function isArbitrumChain(chainId: number): boolean {
  return ARBITRUM_CHAINS.has(chainId);
}
