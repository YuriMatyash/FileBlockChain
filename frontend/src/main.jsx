import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import Web3 from "web3";
import "./styles.css";
import { fetchMetadata, fileToDataUrl, rememberMockMetadata, toGatewayUrl, toIpfsUri, uploadFile, uploadMetadata } from "./ipfs/uploadAdapter";

const EXPECTED_CHAIN_ID = 31337;
const EMPTY_FORM = {
  title: "",
  description: "",
  fileType: "STL",
  category: "3D Printing",
  fileCid: "",
  metadataCid: "",
  preview: "",
  documentation: "",
  compatibility: "",
  file: null,
  previewFile: null,
  manualMode: false,
  uploadMode: "mock",
  initialPriceEth: "0.1"
};

function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatTimestamp(value) {
  const seconds = Number(value || 0);
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleString();
}

const METADATA_FALLBACK_NOTE = "Not available in metadata yet; showing on-chain fallback where possible.";

function attributeValue(metadata, trait) {
  return metadata?.attributes?.find((item) => item.trait_type === trait)?.value || "";
}

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
  const [uploadStatus, setUploadStatus] = useState("Mock/demo IPFS mode is active by default unless a backend upload endpoint is configured.");
  const [lastMetadata, setLastMetadata] = useState(null);
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
    let metadata = null;
    try { metadata = await fetchMetadata(metadataText); } catch (error) { metadata = null; }
    return {
      tokenId: info.tokenId?.toString?.() || tokenId.toString(),
      title: metadata?.name || info.title || `Manufacturing/use license #${tokenId}`,
      description: metadata?.description || info.description || "No summary entered yet.",
      fileCid: metadata?.fileCid || info.fileCid,
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
      metadata,
      fileType: attributeValue(metadata, "File Type"),
      category: attributeValue(metadata, "Category"),
      compatibility: attributeValue(metadata, "Software/Tool Compatibility"),
      preview: metadata?.image || "",
      documentation: metadata?.documentation || metadata?.documentation_cid || "",
      uploadMode: metadata?.uploadMode || (metadataText?.includes("mock-") ? "mock" : "ipfs")
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
    try {
      setUploadStatus("Preparing manufacturing/use license metadata...");
      const fileResult = mintForm.manualMode
        ? { cid: mintForm.fileCid, uri: toIpfsUri(mintForm.fileCid), mode: "manual" }
        : await uploadFile(mintForm.file, "manufacturing-file");
      setUploadStatus(`File reference ready (${fileResult.mode} mode): ${fileResult.cid}`);

      let previewUri = mintForm.preview ? toIpfsUri(mintForm.preview) : "";
      let previewMode = mintForm.preview ? "manual" : "none";
      if (mintForm.previewFile) {
        const previewResult = await uploadFile(mintForm.previewFile, "preview-image");
        previewUri = previewResult.mode === "mock" ? await fileToDataUrl(mintForm.previewFile) : previewResult.uri;
        previewMode = previewResult.mode;
      }

      const attributes = [
        { trait_type: "File Type", value: mintForm.fileType },
        { trait_type: "Category", value: mintForm.category },
        { trait_type: "License Type", value: "Manufacturing/Use License" }
      ];
      if (mintForm.compatibility.trim()) attributes.push({ trait_type: "Software/Tool Compatibility", value: mintForm.compatibility.trim() });

      const metadata = {
        name: mintForm.title,
        description: mintForm.description,
        image: previewUri,
        external_url: fileResult.uri,
        fileCid: fileResult.cid,
        documentation: mintForm.documentation,
        attributes,
        uploadMode: fileResult.mode === "mock" || previewMode === "mock" ? "mock/demo" : fileResult.mode
      };

      setUploadStatus("Uploading metadata JSON or generating a mock/demo metadata CID...");
      const metadataResult = mintForm.manualMode && mintForm.metadataCid
        ? { cid: mintForm.metadataCid.replace(/^ipfs:\/\//, ""), uri: toIpfsUri(mintForm.metadataCid), mode: "manual", metadata }
        : await uploadMetadata(metadata);
      rememberMockMetadata(metadataResult.cid, metadata);
      setLastMetadata(metadata);

      setStatus("Submitting mint transaction with file CID and metadata tokenURI...");
      const initialPrice = web3.utils.toWei(mintForm.initialPriceEth || "0", "ether");
      await contracts.PrintLicenseNFT.methods
        .mintLicense(mintForm.title, mintForm.description, fileResult.cid, metadataResult.cid, metadataResult.uri, initialPrice)
        .send({ from: account });
      setMintForm(EMPTY_FORM);
      setUploadStatus(`Mint used ${metadataResult.mode} metadata CIDs. ${metadataResult.mode === "mock" ? "These are demo CIDs, not real IPFS uploads." : ""}`);
      setStatus("License NFT minted with off-chain file and metadata references.");
      await refreshData();
    } catch (error) {
      setStatus(`Mint/upload failed: ${error.message}`);
      setUploadStatus("Mint failed before completion. No secrets are required for mock/demo mode.");
    }
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
        <p className="eyebrow">PrintChain Phase 6</p>
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
        <MintForm form={mintForm} setForm={setMintForm} onSubmit={mintLicense} disabled={!account || wrongNetwork || !contracts.PrintLicenseNFT} uploadStatus={uploadStatus} lastMetadata={lastMetadata} />
        <article><h2>PRINT reward/token info</h2>{tokenInfo ? <><p><strong>Name:</strong> {tokenInfo.name}</p><p><strong>Symbol:</strong> {tokenInfo.symbol}</p><p><strong>Your balance:</strong> {tokenInfo.balance} {tokenInfo.symbol}</p></> : <p>Connect wallet to load PRINT reward token data.</p>}<p className="note">PRINT is displayed as a reward/loyalty token. Marketplace purchases in this phase use ETH.</p></article>
      </section>

      <section className="panel"><h2>My licenses and listing controls</h2><div className="card-grid">{myLicenses.length ? myLicenses.map((license) => <article key={license.tokenId}><h3>{license.title}</h3><p>Token #{license.tokenId}</p><p>{license.description}</p><input placeholder="List price in ETH" value={listPrices[license.tokenId] || ""} onChange={(e) => setListPrices({ ...listPrices, [license.tokenId]: e.target.value })} /><button onClick={() => listLicense(license.tokenId)}>List for sale</button><button className="secondary" onClick={() => setSelected(license)}>View details/history</button></article>) : <p>No licenses owned by connected wallet were found from mint events.</p>}</div></section>

      <section className="panel"><h2>License details/history</h2>{selected ? <LicenseDetails license={selected} web3={web3} /> : <p>Select a marketplace card or owned license to view details.</p>}</section>
    </main>
  );
}

function LicensePreview({ src, alt = "License preview" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <div className="preview placeholder"><span>No preview image available</span></div>;
  return <div className="preview"><img src={toGatewayUrl(src)} alt={alt} onError={() => setFailed(true)} /></div>;
}

function LicenseCard({ license, web3, account, onSelect, onBuy, onCancel }) {
  const seller = license.listing?.seller;
  const isSeller = account && seller?.toLowerCase() === account.toLowerCase();
  return <article className="listing-card"><LicensePreview src={license.preview} /><h3>{license.title}</h3><p>{license.description}</p><p><strong>File type:</strong> {license.fileType || METADATA_FALLBACK_NOTE}</p><p><strong>Category:</strong> {license.category || METADATA_FALLBACK_NOTE}</p><p><strong>Creator:</strong> {shortAddress(license.creator)}</p><p><strong>Seller:</strong> {shortAddress(seller)}</p><p><strong>Token ID:</strong> {license.tokenId}</p><p><strong>Price:</strong> {web3 ? web3.utils.fromWei(license.listing.price, "ether") : "—"} ETH</p><button onClick={() => onSelect(license)}>Details</button>{isSeller ? <button className="secondary" onClick={() => onCancel(license.tokenId)}>Cancel listing</button> : <button disabled={!account} onClick={() => onBuy(license)}>Buy license</button>}</article>;
}

function MintForm({ form, setForm, onSubmit, disabled, uploadStatus, lastMetadata }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  const requiresFile = !form.manualMode && !form.file;
  return <article><h2>Upload and mint license NFT</h2><p className="note">Phase 6 creates ERC721 metadata for a manufacturing/use license. Mock/demo CIDs are generated when no backend IPFS upload endpoint is configured; they are clearly labeled and are not real IPFS uploads.</p><form onSubmit={onSubmit} className="form">
    <label>Manufacturing file (STL, STEP, 3MF, CNC, ZIP, PDF, drawings)<input required={!form.manualMode} type="file" onChange={(e) => update("file", e.target.files?.[0] || null)} /></label>
    <label>Optional preview image/render<input type="file" accept="image/*" onChange={(e) => update("previewFile", e.target.files?.[0] || null)} /></label>
    <input required placeholder="Title" value={form.title} onChange={(e) => update("title", e.target.value)} />
    <textarea required placeholder="Short buyer-facing summary" value={form.description} onChange={(e) => update("description", e.target.value)} />
    <textarea placeholder="Longer documentation, assembly notes, license notes, or usage instructions" value={form.documentation} onChange={(e) => update("documentation", e.target.value)} />
    <input required placeholder="File type, e.g. STL, STEP, 3MF, CNC, ZIP, PDF" value={form.fileType} onChange={(e) => update("fileType", e.target.value)} />
    <input required placeholder="Category, e.g. 3D Printing or CNC" value={form.category} onChange={(e) => update("category", e.target.value)} />
    <input placeholder="Optional software/tool compatibility, e.g. Fusion 360, PrusaSlicer" value={form.compatibility} onChange={(e) => update("compatibility", e.target.value)} />
    <input placeholder="Optional manual preview CID or URL" value={form.preview} onChange={(e) => update("preview", e.target.value)} />
    <label className="checkbox"><input type="checkbox" checked={form.manualMode} onChange={(e) => update("manualMode", e.target.checked)} /> Use manual CID fallback for demo/testing</label>
    {form.manualMode && <><input required placeholder="Manual file CID" value={form.fileCid} onChange={(e) => update("fileCid", e.target.value)} /><input placeholder="Optional manual metadata CID/tokenURI" value={form.metadataCid} onChange={(e) => update("metadataCid", e.target.value)} /></>}
    <input required placeholder="Suggested initial price in ETH" value={form.initialPriceEth} onChange={(e) => update("initialPriceEth", e.target.value)} />
    <p className="status">{uploadStatus}</p>
    {lastMetadata && <details><summary>Last generated metadata JSON</summary><pre>{JSON.stringify(lastMetadata, null, 2)}</pre></details>}
    <button disabled={disabled || requiresFile} type="submit">Upload metadata and mint manufacturing/use license</button>
  </form></article>;
}

function LicenseDetails({ license, web3 }) {
  return <div className="details"><h3>{license.title}</h3><div className="detail-preview"><LicensePreview src={license.preview} /></div><p>{license.description}</p><p><strong>Documentation:</strong> {license.documentation || "No documentation text/CID found in metadata."}</p><p><strong>File type:</strong> {license.fileType || METADATA_FALLBACK_NOTE}</p><p><strong>Category:</strong> {license.category || METADATA_FALLBACK_NOTE}</p><p><strong>Software/tool compatibility:</strong> {license.compatibility || "Not provided"}</p><p><strong>Token ID:</strong> {license.tokenId}</p><p><strong>Creator/designer:</strong> <code>{license.creator}</code></p><p><strong>Current owner:</strong> <code>{license.owner}</code></p><p><strong>Seller if listed:</strong> <code>{license.listing?.seller || "Not currently listed"}</code></p><p><strong>File CID:</strong> <code>{license.fileCid}</code></p><p><strong>Metadata CID / tokenURI:</strong> <code>{license.metadataCid || license.tokenUri}</code></p><p><strong>Upload mode:</strong> {license.uploadMode || "unknown"}</p><p><strong>Created:</strong> {formatTimestamp(license.createdAt)}</p><p><strong>Suggested initial price:</strong> {web3 ? web3.utils.fromWei(license.initialPrice || "0", "ether") : "—"} ETH</p><h4>Ownership/license history</h4>{license.history?.length ? <ul>{license.history.map((item, index) => <li key={index}>{item.actionType}: {shortAddress(item.previousOwner)} → {shortAddress(item.newOwner)} for {web3 ? web3.utils.fromWei(item.price || "0", "ether") : "—"} ETH at {formatTimestamp(item.timestamp)}</li>)}</ul> : <p>No history available.</p>}</div>;
}

createRoot(document.getElementById("root")).render(<App />);
