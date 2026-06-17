import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import Web3 from "web3";
import "./styles.css";

const EXPECTED_CHAIN_ID = 31337;
const EMPTY_FORM = {
  title: "",
  description: "",
  fileType: "STL",
  category: "3D Printing",
  fileCid: "",
  metadataCid: "",
  preview: "",
  initialPriceEth: "0.1"
};

function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function ipfsUrl(value) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const cid = value.replace("ipfs://", "");
  return `https://ipfs.io/ipfs/${cid}`;
}

function formatTimestamp(value) {
  const seconds = Number(value || 0);
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleString();
}

const PHASE_5_METADATA_NOTE = "Not stored as a dedicated on-chain field yet. Add it to the metadata JSON/IPFS record in the next phase.";

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState("");
  const [contracts, setContracts] = useState({});
  const [status, setStatus] = useState("Ready. Connect MetaMask and deploy local contracts to begin.");
  const [listings, setListings] = useState([]);
  const [myLicenses, setMyLicenses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [mintForm, setMintForm] = useState(EMPTY_FORM);
  const [listPrices, setListPrices] = useState({});

  const wrongNetwork = chainId && Number(chainId) !== EXPECTED_CHAIN_ID;

  useEffect(() => {
    fetch("/src/config/contracts.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("contracts.json was not found");
        return response.json();
      })
      .then(setConfig)
      .catch(() => {
        setConfigError("Missing frontend/src/config/contracts.json. Start a local Hardhat node, then run npm run deploy:local.");
      });
  }, []);

  useEffect(() => {
    if (!config || !web3) return;
    const next = {};
    for (const [name, data] of Object.entries(config.contracts || {})) {
      next[name] = new web3.eth.Contract(data.abi, data.address);
    }
    setContracts(next);
  }, [config, web3]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus("MetaMask was not detected. Install MetaMask to use the DApp.");
      return;
    }
    const instance = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const networkId = await instance.eth.getChainId();
    setWeb3(instance);
    setAccount(accounts[0] || "");
    setChainId(networkId.toString());
    setStatus("Wallet connected. Marketplace purchases use ETH; PRINT is shown as a reward token.");
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts) => setAccount(accounts[0] || "");
    const onChain = (id) => setChainId(Web3.utils.hexToNumber(id).toString());
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  const loadLicense = useCallback(async (tokenId, listing = null) => {
    const nft = contracts.PrintLicenseNFT;
    if (!nft || !web3) return null;
    const [info, owner, tokenUri, history] = await Promise.all([
      nft.methods.getLicenseInfo(tokenId).call(),
      nft.methods.ownerOf(tokenId).call(),
      nft.methods.tokenURI(tokenId).call().catch(() => ""),
      nft.methods.getOwnershipHistory(tokenId).call().catch(() => [])
    ]);
    const metadataText = info.metadataCid || tokenUri;
    return {
      tokenId: info.tokenId?.toString?.() || tokenId.toString(),
      title: info.title || `Manufacturing/use license #${tokenId}`,
      description: info.description || "No summary entered yet.",
      fileCid: info.fileCid,
      metadataCid: metadataText,
      tokenUri,
      creator: info.creator,
      owner,
      createdAt: info.createdAt?.toString?.() || info.createdAt,
      initialPrice: info.initialPrice?.toString?.() || info.initialPrice,
      listing,
      history: history.map((item) => ({
        previousOwner: item.previousOwner,
        newOwner: item.newOwner,
        price: item.price?.toString?.() || item.price,
        timestamp: item.timestamp?.toString?.() || item.timestamp,
        actionType: item.actionType
      })),
      fileType: "",
      category: "",
      preview: ""
    };
  }, [contracts.PrintLicenseNFT, web3]);

  const refreshData = useCallback(async () => {
    if (!web3 || !contracts.PrintMarketplace || !contracts.PrintLicenseNFT) return;
    setStatus("Loading marketplace and license data...");
    const active = await contracts.PrintMarketplace.methods.getActiveListings().call();
    const readableListings = await Promise.all(active.filter((l) => l.active).map(async (listing) => {
      const license = await loadLicense(listing.tokenId, listing);
      return { ...license, listing };
    }));
    setListings(readableListings);

    if (account) {
      const events = await contracts.PrintLicenseNFT.getPastEvents("LicenseMinted", { fromBlock: 0, toBlock: "latest" }).catch(() => []);
      const tokenIds = [...new Set(events.map((event) => event.returnValues.tokenId?.toString()))].filter(Boolean);
      const owned = [];
      for (const tokenId of tokenIds) {
        try {
          const owner = await contracts.PrintLicenseNFT.methods.ownerOf(tokenId).call();
          if (owner.toLowerCase() === account.toLowerCase()) owned.push(await loadLicense(tokenId));
        } catch (error) {
          // Ignore burned or unavailable demo tokens.
        }
      }
      setMyLicenses(owned.filter(Boolean));
    }

    if (contracts.PrintToken && account) {
      const [name, symbol, balance] = await Promise.all([
        contracts.PrintToken.methods.name().call(),
        contracts.PrintToken.methods.symbol().call(),
        contracts.PrintToken.methods.balanceOf(account).call()
      ]);
      setTokenInfo({ name, symbol, balance: web3.utils.fromWei(balance, "ether") });
    }
    setStatus("Data loaded.");
  }, [account, contracts, loadLicense, web3]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const mintLicense = async (event) => {
    event.preventDefault();
    if (!contracts.PrintLicenseNFT || !account || wrongNetwork) return;
    setStatus("Submitting mint transaction...");
    const metadataUri = mintForm.metadataCid.startsWith("ipfs://") ? mintForm.metadataCid : `ipfs://${mintForm.metadataCid}`;
    const initialPrice = web3.utils.toWei(mintForm.initialPriceEth || "0", "ether");
    await contracts.PrintLicenseNFT.methods
      .mintLicense(mintForm.title, mintForm.description, mintForm.fileCid, mintForm.metadataCid, metadataUri, initialPrice)
      .send({ from: account });
    setMintForm(EMPTY_FORM);
    setStatus("License NFT minted. Reminder: CIDs were entered manually; real IPFS upload and richer metadata fields are later phases.");
    await refreshData();
  };

  const listLicense = async (tokenId) => {
    const priceEth = listPrices[tokenId] || "0.1";
    setStatus(`Listing license #${tokenId} for ${priceEth} ETH...`);
    await contracts.PrintMarketplace.methods.listLicense(tokenId, web3.utils.toWei(priceEth, "ether")).send({ from: account });
    setStatus("License listed for ETH.");
    await refreshData();
  };

  const cancelListing = async (tokenId) => {
    setStatus(`Canceling listing for license #${tokenId}...`);
    await contracts.PrintMarketplace.methods.cancelListing(tokenId).send({ from: account });
    setStatus("Listing canceled.");
    await refreshData();
  };

  const buyLicense = async (license) => {
    setStatus(`Buying license #${license.tokenId} with ETH...`);
    await contracts.PrintMarketplace.methods.buyLicense(license.tokenId).send({ from: account, value: license.listing.price });
    setStatus("Purchase complete. Marketplace enforced the creator royalty and transferred the license NFT.");
    await refreshData();
  };

  const addresses = useMemo(() => Object.entries(config?.contracts || {}), [config]);

  return (
    <main className="app-shell">
      <section className="hero panel">
        <p className="eyebrow">PrintChain Phase 5</p>
        <h1>Manufacturing/use license NFT marketplace</h1>
        <p>Each NFT represents a license to use, print, or manufacture the digital model/file. Purchases use ETH through PrintMarketplace; PRINT is a reward token.</p>
        <button onClick={connectWallet}>{account ? "Wallet connected" : "Connect MetaMask"}</button>
        <p className="status">{status}</p>
        {configError && <p className="error">{configError}</p>}
        {wrongNetwork && <p className="error">Wrong network: connected to chain {chainId}. Switch MetaMask to local Hardhat chain ID {EXPECTED_CHAIN_ID}.</p>}
      </section>

      <section className="grid two">
        <article><h2>Wallet status</h2><p><strong>Account:</strong> {account || "Not connected"}</p><p><strong>Chain ID:</strong> {chainId || "—"}</p><p><strong>Expected:</strong> {EXPECTED_CHAIN_ID}</p></article>
        <article><h2>Contract debug info</h2>{addresses.length ? addresses.map(([name, data]) => <p key={name}><strong>{name}:</strong> <code>{data.address}</code></p>) : <p>No contract config loaded.</p>}</article>
      </section>

      <section className="panel"><h2>Marketplace listings</h2><div className="card-grid">{listings.length ? listings.map((license) => <LicenseCard key={license.tokenId} license={license} web3={web3} account={account} onSelect={setSelected} onBuy={buyLicense} onCancel={cancelListing} />) : <p>No active license listings found.</p>}</div></section>

      <section className="grid two">
        <MintForm form={mintForm} setForm={setMintForm} onSubmit={mintLicense} disabled={!account || wrongNetwork || !contracts.PrintLicenseNFT} />
        <article><h2>PRINT reward/token info</h2>{tokenInfo ? <><p><strong>Name:</strong> {tokenInfo.name}</p><p><strong>Symbol:</strong> {tokenInfo.symbol}</p><p><strong>Your balance:</strong> {tokenInfo.balance} {tokenInfo.symbol}</p></> : <p>Connect wallet to load PRINT reward token data.</p>}<p className="note">PRINT is displayed as a reward/loyalty token. Marketplace purchases in this phase use ETH.</p></article>
      </section>

      <section className="panel"><h2>My licenses and listing controls</h2><div className="card-grid">{myLicenses.length ? myLicenses.map((license) => <article key={license.tokenId}><h3>{license.title}</h3><p>Token #{license.tokenId}</p><p>{license.description}</p><input placeholder="List price in ETH" value={listPrices[license.tokenId] || ""} onChange={(e) => setListPrices({ ...listPrices, [license.tokenId]: e.target.value })} /><button onClick={() => listLicense(license.tokenId)}>List for sale</button><button className="secondary" onClick={() => setSelected(license)}>View details/history</button></article>) : <p>No licenses owned by connected wallet were found from mint events.</p>}</div></section>

      <section className="panel"><h2>License details/history</h2>{selected ? <LicenseDetails license={selected} web3={web3} /> : <p>Select a marketplace card or owned license to view details.</p>}</section>
    </main>
  );
}

function LicenseCard({ license, web3, account, onSelect, onBuy, onCancel }) {
  const seller = license.listing?.seller;
  const isSeller = account && seller?.toLowerCase() === account.toLowerCase();
  return <article className="listing-card"><div className="preview">{license.preview ? <img src={ipfsUrl(license.preview)} alt="License preview" /> : <span>No preview image yet</span>}</div><h3>{license.title}</h3><p>{license.description}</p><p><strong>File type:</strong> {license.fileType || PHASE_5_METADATA_NOTE}</p><p><strong>Category:</strong> {license.category || PHASE_5_METADATA_NOTE}</p><p><strong>Creator:</strong> {shortAddress(license.creator)}</p><p><strong>Seller:</strong> {shortAddress(seller)}</p><p><strong>Token ID:</strong> {license.tokenId}</p><p><strong>Price:</strong> {web3 ? web3.utils.fromWei(license.listing.price, "ether") : "—"} ETH</p><button onClick={() => onSelect(license)}>Details</button>{isSeller ? <button className="secondary" onClick={() => onCancel(license.tokenId)}>Cancel listing</button> : <button disabled={!account} onClick={() => onBuy(license)}>Buy license</button>}</article>;
}

function MintForm({ form, setForm, onSubmit, disabled }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  return <article><h2>Mint license NFT</h2><p className="note">Phase 5 uses manually entered demo CIDs/token URIs. Real IPFS upload is not implemented yet. File type, category, and preview are shown here as metadata planning fields; the current Solidity contract stores title, description, file CID, metadata CID/tokenURI, creator, timestamp, owner history, and prices.</p><form onSubmit={onSubmit} className="form"><input required placeholder="Title" value={form.title} onChange={(e) => update("title", e.target.value)} /><textarea required placeholder="Description / documentation text" value={form.description} onChange={(e) => update("description", e.target.value)} /><input required placeholder="File type for metadata, e.g. STL" value={form.fileType} onChange={(e) => update("fileType", e.target.value)} /><input required placeholder="Category for metadata, e.g. CNC" value={form.category} onChange={(e) => update("category", e.target.value)} /><input required placeholder="File CID" value={form.fileCid} onChange={(e) => update("fileCid", e.target.value)} /><input required placeholder="Metadata CID or tokenURI" value={form.metadataCid} onChange={(e) => update("metadataCid", e.target.value)} /><input placeholder="Optional preview image CID or URL for metadata" value={form.preview} onChange={(e) => update("preview", e.target.value)} /><input required placeholder="Suggested initial price in ETH" value={form.initialPriceEth} onChange={(e) => update("initialPriceEth", e.target.value)} /><button disabled={disabled} type="submit">Mint manufacturing/use license</button></form></article>;
}

function LicenseDetails({ license, web3 }) {
  return <div className="details"><h3>{license.title}</h3><p>{license.description}</p><p><strong>Token ID:</strong> {license.tokenId}</p><p><strong>Creator/designer:</strong> <code>{license.creator}</code></p><p><strong>Current owner:</strong> <code>{license.owner}</code></p><p><strong>Seller if listed:</strong> <code>{license.listing?.seller || "Not currently listed"}</code></p><p><strong>File CID:</strong> <code>{license.fileCid}</code></p><p><strong>Metadata CID / tokenURI:</strong> <code>{license.metadataCid || license.tokenUri}</code></p><p><strong>Created:</strong> {formatTimestamp(license.createdAt)}</p><p><strong>Suggested initial price:</strong> {web3 ? web3.utils.fromWei(license.initialPrice || "0", "ether") : "—"} ETH</p><h4>Ownership/license history</h4>{license.history?.length ? <ul>{license.history.map((item, index) => <li key={index}>{item.actionType}: {shortAddress(item.previousOwner)} → {shortAddress(item.newOwner)} for {web3 ? web3.utils.fromWei(item.price || "0", "ether") : "—"} ETH at {formatTimestamp(item.timestamp)}</li>)}</ul> : <p>No history available.</p>}</div>;
}

createRoot(document.getElementById("root")).render(<App />);
