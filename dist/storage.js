"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDataDir = ensureDataDir;
exports.persistLocal = persistLocal;
exports.readLocal = readLocal;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dataDir = path_1.default.resolve(__dirname, "../.data");
const dataFile = path_1.default.join(dataDir, "metadata.json");
function ensureDataDir() {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
    if (!fs_1.default.existsSync(dataFile))
        fs_1.default.writeFileSync(dataFile, JSON.stringify({}, null, 2));
}
function persistLocal(id, jsonString) {
    const current = JSON.parse(fs_1.default.readFileSync(dataFile, "utf-8"));
    current[id] = jsonString;
    fs_1.default.writeFileSync(dataFile, JSON.stringify(current, null, 2));
}
function readLocal(id) {
    if (!fs_1.default.existsSync(dataFile))
        return undefined;
    const current = JSON.parse(fs_1.default.readFileSync(dataFile, "utf-8"));
    return current[id];
}
