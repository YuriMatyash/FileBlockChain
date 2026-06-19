import "dotenv/config";
import express from "express";
import cors from "cors";
import { hasMockPaymentProof, paymentRequiredResponse, protectedPreviewResponse } from "./x402.js";

const app = express();
const port = process.env.PORT || 4000;

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

app.listen(port, () => {
  console.log(`PrintChain backend with mock x402 demo listening on port ${port}`);
});
