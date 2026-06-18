const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY_URL || "https://ipfs.io/ipfs/";
const UPLOAD_ENDPOINT = import.meta.env.VITE_IPFS_UPLOAD_ENDPOINT || "";
const MAX_PERSISTED_METADATA_BYTES = 120_000;
const MAX_OBJECT_URL_PREVIEW_BYTES = 8 * 1024 * 1024;
const mockPreviewUrls = new Map();

function normalizeCid(value = "") {
  return value.replace(/^ipfs:\/\//, "").trim();
}

async function sha256CidLike(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(await input.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `mock-${hex.slice(0, 46)}`;
}

function byteLength(value) {
  return new Blob([value]).size;
}

export function isMockCid(cidOrUri = "") {
  return normalizeCid(cidOrUri).startsWith("mock-");
}

export function toIpfsUri(cidOrUri) {
  if (!cidOrUri) return "";
  if (cidOrUri.startsWith("ipfs://") || cidOrUri.startsWith("http://") || cidOrUri.startsWith("https://") || cidOrUri.startsWith("data:") || cidOrUri.startsWith("blob:")) return cidOrUri;
  return `ipfs://${cidOrUri}`;
}

export function toGatewayUrl(cidOrUri) {
  if (!cidOrUri) return "";
  if (cidOrUri.startsWith("http://") || cidOrUri.startsWith("https://") || cidOrUri.startsWith("data:") || cidOrUri.startsWith("blob:")) return cidOrUri;
  const cid = normalizeCid(cidOrUri);
  const objectUrl = mockPreviewUrls.get(cid);
  if (objectUrl) return objectUrl;
  if (cid.startsWith("mock-")) return "";
  return `${IPFS_GATEWAY.replace(/\/$/, "")}/${cid}`;
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

export function rememberMockPreview(cidOrUri, file) {
  const cid = normalizeCid(cidOrUri);
  if (!cid.startsWith("mock-") || !(file instanceof File)) return { uri: toIpfsUri(cid), displayUri: "", warning: "" };
  const previous = mockPreviewUrls.get(cid);
  if (previous) URL.revokeObjectURL(previous);

  if (file.size > MAX_OBJECT_URL_PREVIEW_BYTES) {
    return {
      uri: toIpfsUri(cid),
      displayUri: "",
      warning: `Preview file "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB, so mock/demo mode did not keep it in browser memory. A placeholder is shown instead.`
    };
  }

  const objectUrl = URL.createObjectURL(file);
  mockPreviewUrls.set(cid, objectUrl);
  return {
    uri: toIpfsUri(cid),
    displayUri: objectUrl,
    warning: "Mock/demo preview uses a temporary in-memory object URL and may not survive a full browser restart."
  };
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
  if (isMockCid(cidOrUri)) {
    const stored = sessionStorage.getItem(`printchain:metadata:${normalizeCid(cidOrUri)}`);
    return stored ? JSON.parse(stored) : null;
  }
  const response = await fetch(toGatewayUrl(cidOrUri));
  if (!response.ok) throw new Error(`Metadata fetch failed with HTTP ${response.status}`);
  return response.json();
}

export function rememberMockMetadata(cidOrUri, metadata) {
  const cid = normalizeCid(cidOrUri);
  if (!cid.startsWith("mock-")) return { stored: false, reason: "not-mock" };

  const lightweightMetadata = {
    ...metadata,
    image: metadata.image?.startsWith("data:") || metadata.image?.startsWith("blob:") ? "" : metadata.image,
    previewDisplayUri: "",
    previewStorageNote: metadata.previewStorageNote || "Mock/demo mode stores only lightweight local metadata. Large files/previews are not permanently stored in the browser."
  };
  const serialized = JSON.stringify(lightweightMetadata);
  if (byteLength(serialized) > MAX_PERSISTED_METADATA_BYTES) {
    return { stored: false, reason: "metadata-too-large" };
  }

  try {
    sessionStorage.setItem(`printchain:metadata:${cid}`, serialized);
    return { stored: true };
  } catch (error) {
    console.warn("Mock metadata was not persisted because browser storage quota was unavailable.", error);
    return { stored: false, reason: "quota" };
  }
}
