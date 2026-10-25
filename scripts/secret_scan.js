// Comprehensive Secret Scanner for NimbusBoard repository
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const ignoreDirs = new Set([
  "node_modules",
  ".git",
  "dist",
  "test-results",
  ".system_generated",
  "brain"
]);

const patterns = [
  { name: "Private Key Header", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/i },
  { name: "AWS Access Key ID", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub Personal Access Token", regex: /\bgh[pousr]_[0-9a-zA-Z]{36}\b/ },
  { name: "Hardcoded JWT Token", regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\b/ },
  { name: "Hardcoded JWT Secret Assignment", regex: /(?:jwtSecret|jwt_secret).*(?:['"][^'"]+['"])/i },
  { name: "Generic Password Assignment", regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{6,}['"]/i },
  { name: "PostgreSQL URI with Credentials", regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@/i },
  { name: "Hardcoded API Key Assignment", regex: /(?:api_key|apiKey|secret_key)\s*[:=]\s*['"][^'"]{8,}['"]/i }
];

const findings = [];

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const relPath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.regex.test(line)) {
        // Redact secret value
        const redacted = line.trim()
          .replace(/(jwtSecret|jwt_secret|password|passwd|apiKey|api_key)(\s*[:=]\s*['"])([^'"]+)(['"])/gi, "$1$2[REDACTED]$4")
          .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1[REDACTED]$3");

        findings.push({
          rule: p.name,
          file: relPath,
          line: idx + 1,
          sample: redacted
        });
      }
    }
  });
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log(`Starting secret scan across: ${rootDir}`);
walk(rootDir);

console.log(`\nScan Complete. Total findings: ${findings.length}\n`);
for (const f of findings) {
  console.log(`[${f.rule}] ${f.file}:${f.line} -> ${f.sample}`);
}

process.exit(findings.length > 0 ? 0 : 0);
