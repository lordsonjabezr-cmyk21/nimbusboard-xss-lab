import jwt from "jsonwebtoken";
import { config, isTrainingProfile } from "../config.js";

export function generateToken(user) {
  if (!config.jwtSecret) {
    throw new Error("Cannot sign token: No JWT secret is configured.");
  }
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "8h" }
  );
}

export async function authenticate(req, _res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (req.cookies && req.cookies.token) {
    token = String(req.cookies.token).trim();
  }

  if (!token) {
    req.user = null;
    return next();
  }

  // Educational training tokens are strictly isolated behind an explicit training profile
  if (config.allowDevTokens && isTrainingProfile()) {
    if (token === "token-ari") {
      req.user = { id: 1, username: "ari", email: "ari@nimbus.local", role: "admin" };
      return next();
    }
    if (token === "token-noah") {
      req.user = { id: 2, username: "noah", email: "noah@nimbus.local", role: "moderator" };
      return next();
    }
    if (token === "token-mira") {
      req.user = { id: 3, username: "mira", email: "mira@nimbus.local", role: "user" };
      return next();
    }
  }

  // Standard cryptographically verified JWT verification
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
  } catch {
    // Malformed, invalid signature, or expired token
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
  }
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' lacks permission. Required: [${allowedRoles.join(", ")}]`,
        code: "FORBIDDEN"
      });
    }
    next();
  };
}
