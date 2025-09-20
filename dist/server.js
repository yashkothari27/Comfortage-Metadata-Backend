"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const web3_1 = require("./web3");
const storage_1 = require("./storage");
const ethers_1 = require("ethers");
// Load root .env first, then override with backend/.env if present
const rootEnv = dotenv_1.default.config({ path: "../.env" });
const localEnv = dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "2mb" }));
const PORT = Number(process.env.PORT || 4000);
const RELTIME_RPC_URL = process.env.RELTIME_RPC_URL || "https://mainnet.reltime.com";
const RELTIME_CHAIN_ID = Number(process.env.RELTIME_CHAIN_ID || 32323);
(0, storage_1.ensureDataDir)();
const MetadataPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    // either raw data string or structured fields
    data: zod_1.z.any().optional(),
    name: zod_1.z.string().optional(),
    // allow either a valid URL or an empty string
    image: zod_1.z.string().url().or(zod_1.z.literal("")).optional(),
    attributes: zod_1.z.any().optional(),
    storeOnChain: zod_1.z.boolean().optional()
});
function normalizeToJsonString(body) {
    if (typeof body === "string")
        return body;
    return JSON.stringify(body);
}
function toBytes32Id(idOrDataString) {
    if (idOrDataString.startsWith("0x") && idOrDataString.length === 66)
        return idOrDataString;
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(idOrDataString));
}
app.get("/health", (_req, res) => {
    res.json({ ok: true, chainId: RELTIME_CHAIN_ID, rpc: RELTIME_RPC_URL });
});
app.get("/config", (_req, res) => {
    const diag = (0, web3_1.getWeb3Diagnostics)();
    const pk = process.env.DEPLOYER_PRIVATE_KEY || "";
    res.json({
        ok: true,
        ...diag,
        diagnostics: {
            privateKeyLength: pk.trim().length,
            privateKeyStartsWith0x: pk.trim().startsWith("0x"),
            rootEnvLoaded: !!rootEnv.parsed,
            backendEnvLoaded: !!localEnv.parsed,
        }
    });
});
app.get("/", (_req, res) => {
    res.type("html").send(`
    <style>
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;line-height:1.6;color:#0f172a}
      code{background:#0f172a;color:#e2e8f0;padding:8px 10px;border-radius:8px;display:inline-block}
      a{color:#2563eb;text-decoration:none}
      .box{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:12px}
    </style>
    <h2>Metadata API</h2>
    <div class="box">
      <div>Chain: <b>${RELTIME_CHAIN_ID}</b> • RPC: <code>${RELTIME_RPC_URL}</code></div>
    </div>
    <div class="box">
      <div>Health: <a href="/health">GET /health</a></div>
      <div>Store: <code>POST /metadata</code></div>
      <div>Get: <code>GET /metadata/:id</code></div>
    </div>
  `);
});
app.post("/metadata", async (req, res) => {
    try {
        const parsed = MetadataPayload.parse(req.body);
        const structured = parsed.data ?? { name: parsed.name, image: parsed.image, attributes: parsed.attributes };
        const jsonString = normalizeToJsonString(structured);
        const id = parsed.id ? toBytes32Id(parsed.id) : toBytes32Id(jsonString);
        let onChainTxHash;
        const shouldStoreOnChain = !!parsed.storeOnChain;
        if (shouldStoreOnChain) {
            const client = await (0, web3_1.createContractClient)();
            if (!client) {
                return res.status(400).json({ error: "On-chain storage requested but contract signer not configured" });
            }
            const tx = await client.contract.storeMetadata(id, jsonString);
            const receipt = await tx.wait();
            onChainTxHash = receipt?.hash;
        }
        (0, storage_1.persistLocal)(id, jsonString);
        res.json({ id, data: JSON.parse(jsonString), onChainTxHash });
    }
    catch (err) {
        res.status(400).json({ error: err?.message || "Invalid payload" });
    }
});
app.get("/metadata/:id", async (req, res) => {
    try {
        const idParam = req.params.id;
        const id = toBytes32Id(idParam);
        // Try on-chain read first if configured
        const reader = await (0, web3_1.getContractRead)();
        if (reader) {
            try {
                const result = await reader.getMetadata(id);
                const dataStr = result[0];
                const submitter = result[1];
                if (dataStr && dataStr.length > 0) {
                    return res.json({ id, data: JSON.parse(dataStr), submitter, source: "onchain" });
                }
            }
            catch { }
        }
        const local = (0, storage_1.readLocal)(id);
        if (!local)
            return res.status(404).json({ error: "Not found" });
        res.json({ id, data: JSON.parse(local), source: "local" });
    }
    catch (err) {
        res.status(400).json({ error: err?.message || "Invalid id" });
    }
});
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
