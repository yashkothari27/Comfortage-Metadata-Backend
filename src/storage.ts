import fs from "fs";
import path from "path";

const dataDir = path.resolve(__dirname, "../.data");
const dataFile = path.join(dataDir, "metadata.json");

export function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}, null, 2));
}

export function persistLocal(id: string, jsonString: string) {
  const current = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  current[id] = jsonString;
  fs.writeFileSync(dataFile, JSON.stringify(current, null, 2));
}

export function readLocal(id: string): string | undefined {
  if (!fs.existsSync(dataFile)) return undefined;
  const current = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  return current[id];
}


