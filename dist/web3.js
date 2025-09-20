"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContractClient = createContractClient;
exports.getContractRead = getContractRead;
exports.getWeb3Diagnostics = getWeb3Diagnostics;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ethers_1 = require("ethers");
function normalizePrivateKey(raw) {
    if (!raw)
        return "";
    let pk = raw.trim().replace(/^['"]|['"]$/g, "");
    if (!pk.startsWith("0x") && pk.length === 64)
        pk = "0x" + pk;
    return pk;
}
function normalizeAddress(raw) {
    if (!raw)
        return undefined;
    const addr = raw.trim().replace(/^['"]|['"]$/g, "");
    return addr;
}
function getRpcUrl() {
    return (process.env.RELTIME_RPC_URL || "https://mainnet.reltime.com").trim();
}
function getChainId() {
    return Number(process.env.RELTIME_CHAIN_ID || 32323);
}
function getPrivateKey() {
    return normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
}
function tryLoadDeployment() {
    const defaultPath = path_1.default.resolve(__dirname, "../../contracts/deployments/reltime.json");
    const envPath = process.env.CONTRACT_DEPLOYMENT_FILE ? path_1.default.resolve(process.env.CONTRACT_DEPLOYMENT_FILE) : defaultPath;
    try {
        const json = JSON.parse(fs_1.default.readFileSync(envPath, "utf-8"));
        const address = json?.MetadataStore?.address;
        if (address && ethers_1.ethers.isAddress(address))
            return address;
    }
    catch { }
    return undefined;
}
// minimal ABI
const ABI = [
    "function storeMetadata(bytes32 id, string data) external",
    "function getMetadata(bytes32 id) external view returns (string data, address submitter)"
];
async function createContractClient() {
    const envAddress = normalizeAddress(process.env.CONTRACT_ADDRESS);
    const address = tryLoadDeployment() || envAddress;
    if (!address || !ethers_1.ethers.isAddress(address))
        return undefined;
    const PRIVATE_KEY = getPrivateKey();
    if (!PRIVATE_KEY)
        return undefined;
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(getRpcUrl(), getChainId());
        const wallet = new ethers_1.ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers_1.ethers.Contract(address, ABI, wallet);
        return { provider, wallet, contract };
    }
    catch (e) {
        return undefined;
    }
}
async function getContractRead() {
    const envAddress = normalizeAddress(process.env.CONTRACT_ADDRESS);
    const address = tryLoadDeployment() || envAddress;
    if (!address || !ethers_1.ethers.isAddress(address))
        return undefined;
    const provider = new ethers_1.ethers.JsonRpcProvider(getRpcUrl(), getChainId());
    const contract = new ethers_1.ethers.Contract(address, ABI, provider);
    return contract;
}
function getWeb3Diagnostics() {
    const envAddress = normalizeAddress(process.env.CONTRACT_ADDRESS);
    const deployment = tryLoadDeployment();
    const resolvedAddress = deployment || envAddress;
    let walletOk = false;
    try {
        const pk = getPrivateKey();
        if (pk) {
            new ethers_1.ethers.Wallet(pk);
            walletOk = true;
        }
    }
    catch { }
    return {
        chainId: getChainId(),
        rpc: getRpcUrl(),
        envContractAddress: envAddress,
        deploymentAddress: deployment,
        resolvedAddress,
        signerConfigured: walletOk,
    };
}
