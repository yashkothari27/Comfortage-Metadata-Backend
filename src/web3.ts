import fs from "fs";
import path from "path";
import { ethers } from "ethers";

function normalizePrivateKey(raw: string | undefined): string {
  if (!raw) return "";
  let pk = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!pk.startsWith("0x") && pk.length === 64) pk = "0x" + pk;
  return pk;
}

function normalizeAddress(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const addr = raw.trim().replace(/^['"]|['"]$/g, "");
  return addr;
}

function getRpcUrl(): string {
  return (process.env.RELTIME_RPC_URL || "https://mainnet.reltime.com").trim();
}

function getChainId(): number {
  return Number(process.env.RELTIME_CHAIN_ID || 32323);
}

function getPrivateKey(): string {
  return normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
}

function tryLoadDeployment() {
  const defaultPath = path.resolve(__dirname, "../../contracts/deployments/reltime.json");
  const envPath = process.env.CONTRACT_DEPLOYMENT_FILE ? path.resolve(process.env.CONTRACT_DEPLOYMENT_FILE) : defaultPath;
  try {
    const json = JSON.parse(fs.readFileSync(envPath, "utf-8"));
    const address = json?.MetadataStore?.address as string | undefined;
    if (address && ethers.isAddress(address)) return address;
  } catch {}
  return undefined;
}

// minimal ABI
const ABI = [
  "function storeMetadata(bytes32 id, string data) external",
  "function getMetadata(bytes32 id) external view returns (string data, address submitter)"
];

export async function createContractClient() {
  const envAddress = normalizeAddress(process.env.CONTRACT_ADDRESS);
  const address = tryLoadDeployment() || envAddress;
  if (!address || !ethers.isAddress(address)) return undefined;
  const PRIVATE_KEY = getPrivateKey();
  if (!PRIVATE_KEY) return undefined;
  try {
    const provider = new ethers.JsonRpcProvider(getRpcUrl(), getChainId());
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(address, ABI, wallet);
    return { provider, wallet, contract };
  } catch (e) {
    return undefined;
  }
}

export async function getContractRead() {
  const envAddress = normalizeAddress(process.env.CONTRACT_ADDRESS);
  const address = tryLoadDeployment() || envAddress;
  if (!address || !ethers.isAddress(address)) return undefined;
  const provider = new ethers.JsonRpcProvider(getRpcUrl(), getChainId());
  const contract = new ethers.Contract(address, ABI, provider);
  return contract as unknown as { getMetadata: (id: `0x${string}`) => Promise<[string, string]> };
}

export function getWeb3Diagnostics() {
  const envAddress = normalizeAddress(process.env.CONTRACT_ADDRESS);
  const deployment = tryLoadDeployment();
  const resolvedAddress = deployment || envAddress;
  let walletOk = false;
  try {
    const pk = getPrivateKey();
    if (pk) {
      new ethers.Wallet(pk);
      walletOk = true;
    }
  } catch {}
  return {
    chainId: getChainId(),
    rpc: getRpcUrl(),
    envContractAddress: envAddress,
    deploymentAddress: deployment,
    resolvedAddress,
    signerConfigured: walletOk,
  };
}


