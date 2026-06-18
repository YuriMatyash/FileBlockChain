const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/";
const UPLOAD_ENDPOINT = import.meta.env.VITE_IPFS_UPLOAD_ENDPOINT || "";

function normalizeCid(value = "") {
  return value.replace(/^ipfs:\/\//, "").trim();
}

async function sha256CidLike(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(await input.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `mock-${hex.slice(0, 46)}`;
}

export function toIpfsUri(cidOrUri) {
  if (!cidOrUri) return "";
  if (cidOrUri.startsWith("ipfs://") || cidOrUri.startsWith("http://") || cidOrUri.startsWith("https://")) return cidOrUri;
  return `ipfs://${cidOrUri}`;
}

export function toGatewayUrl(cidOrUri) {
  if (!cidOrUri) return "";
  if (cidOrUri.startsWith("http://") || cidOrUri.startsWith("https://")) return cidOrUri;
  return `${IPFS_GATEWAY.replace(/\/$/, "")}/${normalizeCid(cidOrUri)}`;
}

async function uploadToBackend(payload, kind) {
  if (!UPLOAD_ENDPOINT) return null;
  const body = new FormData();
  body.append("kind", kind);
  if (payload instanceof File) {
    body.append("file", payload);
  } else {
    body.append("metadata", JSON.stringify(payload));
  }
  const response = await fetch(UPLOAD_ENDPOINT, { method: "POST", body });
  if (!response.ok) throw new Error(`Upload endpoint failed with HTTP ${response.status}`);
  return response.json();
}

export async function uploadFile(file, kind = "file") {
  const realUpload = await uploadToBackend(file, kind);
  if (realUpload?.cid) return { cid: normalizeCid(realUpload.cid), uri: toIpfsUri(realUpload.cid), mode: realUpload.mode || "real" };

  const cid = await sha256CidLike(file);
  return { cid, uri: toIpfsUri(cid), mode: "mock", note: "Demo CID generated locally; no real IPFS upload happened." };
}

export async function uploadMetadata(metadata) {
  const realUpload = await uploadToBackend(metadata, "metadata");
  if (realUpload?.cid) return { cid: normalizeCid(realUpload.cid), uri: toIpfsUri(realUpload.cid), mode: realUpload.mode || "real", metadata };

  const cid = await sha256CidLike(JSON.stringify(metadata));
  return { cid, uri: toIpfsUri(cid), mode: "mock", metadata, note: "Demo metadata CID generated locally; no real IPFS upload happened." };
}

export async function fetchMetadata(cidOrUri) {
  if (!cidOrUri) return null;
  if (normalizeCid(cidOrUri).startsWith("mock-")) {
    const stored = sessionStorage.getItem(`printchain:metadata:${normalizeCid(cidOrUri)}`);
    return stored ? JSON.parse(stored) : null;
  }
  const response = await fetch(toGatewayUrl(cidOrUri));
  if (!response.ok) throw new Error(`Metadata fetch failed with HTTP ${response.status}`);
  return response.json();
}

export function rememberMockMetadata(cidOrUri, metadata) {
  const cid = normalizeCid(cidOrUri);
  if (cid.startsWith("mock-")) sessionStorage.setItem(`printchain:metadata:${cid}`, JSON.stringify(metadata));
}
