const proxyChainIds = new Set<number>([1, 56, 137, 42161, 10, 8453, 43114, 146, 324, 4663]);

export function markProxyChain(chainId: number): void {
  proxyChainIds.add(chainId);
}

export function isProxyChain(chainId: number): boolean {
  return proxyChainIds.has(chainId);
}
