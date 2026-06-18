export const MOCK_X402_HEADER = "x-printchain-demo-payment";
export const MOCK_X402_QUERY = "demoPaid";
export const MOCK_X402_VALUE = "paid";

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
