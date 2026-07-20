export const MOCK_X402_HEADER = "x-printchain-demo-payment";
export const MOCK_X402_QUERY = "demoPaid";
export const MOCK_X402_VALUE = "paid";
export const MARKETPLACE_ACCESS_PRICE_WEI = 10n ** 18n;
export const DEFAULT_LOCAL_ACCESS_RECEIVER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export function hasMockPaymentProof(req) {
  const headerProof = req.get(MOCK_X402_HEADER);
  const queryProof = req.query[MOCK_X402_QUERY];
  return headerProof === MOCK_X402_VALUE || queryProof === "true" || queryProof === MOCK_X402_VALUE;
}

export function paymentRequiredResponse(tokenId) {
  return {
    error: "payment_required",
    status: 402,
    message: "HTTP 402 Payment Required: provide mock x402 demo payment proof to access this protected manufacturing/use license preview.",
    tokenId,
    mockDemo: true,
    acceptedProofs: [
      `Header ${MOCK_X402_HEADER}: ${MOCK_X402_VALUE}`,
      `Query ?${MOCK_X402_QUERY}=true`
    ],
    note: "This is a local x402-style demo only. No real payment settlement, payment credentials, or blockchain purchase occurs in this backend route. Marketplace NFT purchases still use ETH through PrintMarketplace."
  };
}

export function protectedPreviewResponse(tokenId) {
  return {
    status: "ok",
    tokenId,
    mockDemo: true,
    licenseType: "Manufacturing/Use License",
    message: "Mock x402-style payment proof accepted. Protected preview data is available for this license NFT.",
    protectedResource: {
      title: `Protected preview for PrintChain license #${tokenId}`,
      previewCid: `mock-paid-preview-cid-${tokenId}`,
      previewUrl: `ipfs://mock-paid-preview-cid-${tokenId}`,
      downloadHint: "In a production system this response could reveal a gated preview, file pointer, or short-lived download URL after real x402 settlement.",
      allowedFileExamples: ["STL", "STEP", "3MF", "G-code", "CNC", "ZIP", "PDF", "technical drawing"]
    },
    note: "Mocked for local educational demo; do not treat this as real payment verification."
  };
}

export function marketplaceAccessRequiredResponse(walletAddress, accessReceiver) {
  return {
    error: "payment_required",
    status: 402,
    message: "Marketplace access requires a 1 ETH local Hardhat demo payment.",
    walletAddress,
    requiredAmount: "1 ETH",
    requiredAmountWei: MARKETPLACE_ACCESS_PRICE_WEI.toString(),
    accessReceiver,
    mockDemo: true,
    instructions: "Send exactly 1 ETH (or more) from this wallet to the access receiver on local Hardhat, then submit the transaction hash to POST /api/marketplace-access/verify.",
    note: "This is an in-memory local x402-style access gate. It resets when the backend restarts and gates only this frontend/API experience; public blockchain data remains public. It is separate from ETH NFT purchases through PrintMarketplace."
  };
}

async function jsonRpc(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!response.ok) throw new Error(`Local RPC returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "Local RPC request failed.");
  return payload.result;
}

/** Verifies a mined local-Hardhat ETH transfer; no private key or provider credential is used. */
export async function verifyMarketplaceAccessTransaction({ walletAddress, txHash, accessReceiver, rpcUrl }) {
  if (!walletAddress || !txHash) return { valid: false, status: 400, error: "walletAddress and txHash are required." };
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return { valid: false, status: 400, error: "walletAddress must be a valid address." };
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) return { valid: false, status: 400, error: "txHash must be a transaction hash." };

  try {
    const [transaction, receipt] = await Promise.all([
      jsonRpc(rpcUrl, "eth_getTransactionByHash", [txHash]),
      jsonRpc(rpcUrl, "eth_getTransactionReceipt", [txHash])
    ]);
    if (!transaction) return { valid: false, status: 400, error: "Transaction was not found on the configured local Hardhat RPC." };
    if (!receipt || receipt.status !== "0x1") return { valid: false, status: 400, error: "Transaction has not succeeded on the local Hardhat network yet." };
    if (transaction.from?.toLowerCase() !== walletAddress.toLowerCase()) return { valid: false, status: 400, error: "Transaction sender does not match walletAddress." };
    if (transaction.to?.toLowerCase() !== accessReceiver.toLowerCase()) return { valid: false, status: 400, error: "Transaction recipient does not match the configured access receiver." };
    if (BigInt(transaction.value || "0x0") < MARKETPLACE_ACCESS_PRICE_WEI) {
      return { valid: false, status: 402, error: "Marketplace access requires at least 1 ETH on the local Hardhat network." };
    }
    return { valid: true, transaction };
  } catch (error) {
    return { valid: false, status: 400, error: `Could not verify transaction: ${error.message}` };
  }
}
