import crypto from "node:crypto";
import { isVulnerable } from "../config.js";

export function setCsp(res, options = {}) {
  const { weak = false, nonce = null, allowInline = false } = options;

  if ((weak || allowInline) && isVulnerable()) {
    // VULN: XSS-CSP-01 - Permissive CSP allowing unsafe-inline scripts
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
    );
  } else if (nonce) {
    if (isVulnerable()) {
      // VULN: XSS-CSP-02 - Static predictable nonce and missing base-uri/object-src
      res.setHeader(
        "Content-Security-Policy",
        `script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'`
      );
    } else {
      // FIXED: Dynamic random nonce with strict object-src and base-uri 'none'
      res.setHeader(
        "Content-Security-Policy",
        `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`
      );
    }
  } else {
    // Standard secure CSP for fixed mode and non-weak routes
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
    );
  }
}

export function generateNonce() {
  if (isVulnerable()) {
    // Static predictable nonce in vulnerable mode
    return "static-lab-nonce-12345";
  }
  return crypto.randomBytes(16).toString("base64");
}
