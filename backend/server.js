import "dotenv/config";
import express from "express";
import cors from "cors";
import { DEFAULT_LOCAL_ACCESS_RECEIVER, hasMockPaymentProof, marketplaceAccessRequiredResponse, paymentRequiredResponse, protectedPreviewResponse, verifyMarketplaceAccessTransaction } from "./x402.js";

const app = express();
const port = process.env.PORT || 4000;
const accessReceiver = process.env.MARKETPLACE_ACCESS_RECEIVER || DEFAULT_LOCAL_ACCESS_RECEIVER;
const hardhatRpcUrl = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";
// Deliberately in memory for the local educational demo. Restarting the backend resets access.
const unlockedWallets = new Set();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "printchain-backend", phase: 9, x402Demo: "mock" });
});

app.get("/api/paid-preview/:tokenId", (req, res) => {
  const { tokenId } = req.params;

  // Mock x402-style verification for local educational demos only.
  // This does not settle a real payment and does not replace PrintMarketplace ETH purchases.
  if (!hasMockPaymentProof(req)) {
    return res.status(402).json(paymentRequiredResponse(tokenId));
  }

  return res.json(protectedPreviewResponse(tokenId));
});

app.get("/api/marketplace-access/:walletAddress", (req, res) => {
  const walletAddress = req.params.walletAddress.toLowerCase();
  if (unlockedWallets.has(walletAddress)) {
    return res.json({ status: "ok", accessGranted: true, walletAddress, requiredAmount: "1 ETH", accessReceiver, mockDemo: true, note: "Access is stored only in backend memory and resets on restart." });
  }
  return res.status(402).json(marketplaceAccessRequiredResponse(req.params.walletAddress, accessReceiver));
});

app.post("/api/marketplace-access/verify", async (req, res) => {
  const { walletAddress, txHash } = req.body || {};
  const result = await verifyMarketplaceAccessTransaction({ walletAddress, txHash, accessReceiver, rpcUrl: hardhatRpcUrl });
  if (!result.valid) return res.status(result.status).json({ error: "marketplace_access_verification_failed", status: result.status, message: result.error });
  unlockedWallets.add(walletAddress.toLowerCase());
  return res.json({ status: "ok", accessGranted: true, walletAddress, txHash, requiredAmount: "1 ETH", accessReceiver, mockDemo: true, note: "Verified against local Hardhat RPC. Access is in memory and resets when the backend restarts." });
});

app.listen(port, () => {
  console.log(`PrintChain backend with local x402 demos listening on port ${port}`);
  console.log(`Marketplace access receiver: ${accessReceiver}; local RPC: ${hardhatRpcUrl}`);
});
