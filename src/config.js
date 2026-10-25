// Centralized application configuration
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const KNOWN_INSECURE_SECRETS = [
  "nimbusboard-lab-jwt-secret-not-for-prod",
  "secret",
  "jwtsecret",
  "password",
  "changeme",
  "123456",
  "admin",
  "supersecret",
  "defaultsecret",
  "replace_with_a_secure_random_at_least_32_char_secret_key!"
];

const rawProfile = (process.env.LAB_PROFILE || (process.env.NODE_ENV === "production" ? "production" : "training")).toLowerCase();
const profile = rawProfile === "production" ? "production" : "training";

// Determine JWT secret safely
let resolvedJwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : "";
let ephemeralSecretGenerated = false;

if (!resolvedJwtSecret) {
  if (profile === "training") {
    // Generate an ephemeral random secret unique to this process run
    resolvedJwtSecret = crypto.randomBytes(32).toString("hex");
    ephemeralSecretGenerated = true;
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "127.0.0.1",
  profile,
  mode: process.env.LAB_MODE === "fixed" ? "fixed" : "vulnerable",
  hints: process.env.LAB_HINTS !== "off",
  allowDevTokens: profile === "training" && process.env.ALLOW_DEV_TOKENS !== "false",
  databaseUrl: process.env.DATABASE_URL || "",
  oobUrl: process.env.OOB_URL || "http://127.0.0.1:5000/callback",
  jwtSecret: resolvedJwtSecret,
  ephemeralSecretGenerated,
  frontendUrl: process.env.FRONTEND_URL || "http://127.0.0.1:3000",
  uploadDir: path.resolve(__dirname, "../uploads"),
  maxUploadBytes: 2 * 1024 * 1024 // 2MB limit
};

export function validateConfig(cfg = config) {
  if (cfg.profile === "production") {
    if (!cfg.jwtSecret) {
      throw new Error("Missing JWT secret: JWT_SECRET environment variable is required in production profile.");
    }
    if (KNOWN_INSECURE_SECRETS.includes(cfg.jwtSecret.toLowerCase()) || cfg.jwtSecret.length < 32) {
      throw new Error("Insecure JWT secret: Known default or weak JWT_SECRET is not permitted in production (minimum 32 characters required).");
    }
    if (cfg.allowDevTokens) {
      throw new Error("Insecure configuration: Training authentication shortcuts (ALLOW_DEV_TOKENS) cannot be enabled in production profile.");
    }
  } else {
    // In training profile
    if (process.env.JWT_SECRET && KNOWN_INSECURE_SECRETS.includes(process.env.JWT_SECRET.toLowerCase())) {
      throw new Error("Insecure JWT secret: Known default or insecure JWT_SECRET is prohibited even in training mode. Provide a strong secret or leave unset to use ephemeral generation.");
    }
  }
}

export function isAllowedOobUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname === "oob-listener" ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export const isVulnerable = () => config.mode === "vulnerable";
export const isFixed = () => config.mode === "fixed";
export const hintsEnabled = () => config.hints;
export const isProductionProfile = () => config.profile === "production";
export const isTrainingProfile = () => config.profile === "training";
