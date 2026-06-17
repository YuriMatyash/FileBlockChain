import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "printchain-backend", phase: 0 });
});

app.listen(port, () => {
  console.log(`PrintChain backend placeholder listening on port ${port}`);
});
