import React from "react";
import { createRoot } from "react-dom/client";
import Web3 from "web3";
import "./styles.css";

function App() {
  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);
  const web3Version = Web3.version;

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">PrintChain Phase 0</p>
        <h1>Manufacturing license NFT marketplace foundation</h1>
        <p>
          Each future NFT will represent a license to use, print, or manufacture a digital model/file.
        </p>
      </section>

      <section className="card-grid" aria-label="Project setup status">
        <article>
          <h2>Wallet</h2>
          <p>{hasMetaMask ? "MetaMask provider detected." : "Install MetaMask to connect in later phases."}</p>
        </article>
        <article>
          <h2>Blockchain library</h2>
          <p>Frontend is configured to use web3.js {web3Version}.</p>
        </article>
        <article>
          <h2>Next phase</h2>
          <p>Phase 1 will add the PRINT ERC20 reward token.</p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
