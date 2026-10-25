import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { validateConfig, KNOWN_INSECURE_SECRETS } from "../src/config.js";
import { authenticate, requireAuth, requireRole, generateToken } from "../src/middleware/auth.js";

// Helper to simulate Express middleware execution
async function runMiddleware(middleware, req, res = {}) {
  let calledNext = false;
  let returnedRes = res;
  if (!returnedRes.status) {
    returnedRes.status = function(code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!returnedRes.json) {
    returnedRes.json = function(payload) {
      this.body = payload;
      return this;
    };
  }

  await new Promise((resolve) => {
    middleware(req, returnedRes, () => {
      calledNext = true;
      resolve();
    });
    // If res.json or res.status was called without next
    if (returnedRes.statusCode) {
      resolve();
    }
  });

  return { req, res: returnedRes, calledNext };
}

test("1. Missing JWT secret rejection in production profile", () => {
  const prodConfigWithoutSecret = {
    profile: "production",
    jwtSecret: "",
    allowDevTokens: false
  };

  assert.throws(
    () => validateConfig(prodConfigWithoutSecret),
    /Missing JWT secret/i,
    "Should reject missing JWT secret in production profile"
  );
});

test("2. Known/default JWT secret rejection", () => {
  // Test in production profile
  for (const secret of KNOWN_INSECURE_SECRETS) {
    const configWithDefaultSecret = {
      profile: "production",
      jwtSecret: secret,
      allowDevTokens: false
    };

    assert.throws(
      () => validateConfig(configWithDefaultSecret),
      /Insecure JWT secret/i,
      `Should reject known default secret '${secret}' in production profile`
    );
  }

  // Also verify that known secrets are rejected if explicitly set in training profile
  const trainingWithKnownSecret = {
    profile: "training",
    jwtSecret: "nimbusboard-lab-jwt-secret-not-for-prod",
    allowDevTokens: true
  };
  // Simulate setting process.env.JWT_SECRET to known secret
  const oldSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = "nimbusboard-lab-jwt-secret-not-for-prod";
    assert.throws(
      () => validateConfig(trainingWithKnownSecret),
      /Insecure JWT secret/i,
      "Should reject known default secret even in training profile when explicitly set"
    );
  } finally {
    process.env.JWT_SECRET = oldSecret;
  }
});

test("3. Valid training-mode authentication", async () => {
  const reqAri = { headers: { authorization: "Bearer token-ari" } };
  const { req: resAri, calledNext: nextAri } = await runMiddleware(authenticate, reqAri);
  assert.equal(nextAri, true);
  assert.ok(resAri.user);
  assert.equal(resAri.user.username, "ari");
  assert.equal(resAri.user.role, "admin");

  const reqNoah = { headers: { authorization: "Bearer token-noah" } };
  const { req: resNoah, calledNext: nextNoah } = await runMiddleware(authenticate, reqNoah);
  assert.equal(nextNoah, true);
  assert.ok(resNoah.user);
  assert.equal(resNoah.user.username, "noah");
  assert.equal(resNoah.user.role, "moderator");

  const reqMira = { headers: { authorization: "Bearer token-mira" } };
  const { req: resMira, calledNext: nextMira } = await runMiddleware(authenticate, reqMira);
  assert.equal(nextMira, true);
  assert.ok(resMira.user);
  assert.equal(resMira.user.username, "mira");
  assert.equal(resMira.user.role, "user");
});

test("4. Invalid token rejection", async () => {
  // Malformed garbage token
  const req = { headers: { authorization: "Bearer not-a-valid-jwt-token" } };
  const { req: checkedReq } = await runMiddleware(authenticate, req);
  assert.equal(checkedReq.user, null);

  // Protected route rejects unauthenticated request
  const authRes = {};
  await runMiddleware(requireAuth, checkedReq, authRes);
  assert.equal(authRes.statusCode, 401);
  assert.equal(authRes.body.code, "UNAUTHORIZED");
});

test("5. Invalid signature rejection", async () => {
  // Token signed with an untrusted external secret
  const forgedToken = jwt.sign(
    { id: 1, username: "ari", role: "admin" },
    "attacker-arbitrary-untrusted-secret-key-123",
    { expiresIn: "1h" }
  );

  const req = { headers: { authorization: `Bearer ${forgedToken}` } };
  const { req: checkedReq } = await runMiddleware(authenticate, req);
  assert.equal(checkedReq.user, null, "Forged token signature must be rejected");

  const authRes = {};
  await runMiddleware(requireAuth, checkedReq, authRes);
  assert.equal(authRes.statusCode, 401);
});

test("6. Expired token rejection", async () => {
  // Create an expired token using current active secret
  const validUser = { id: 3, username: "mira", email: "mira@nimbus.local", role: "user" };
  const expiredToken = jwt.sign(
    validUser,
    (await import("../src/config.js")).config.jwtSecret,
    { expiresIn: "-5s" }
  );

  const req = { headers: { authorization: `Bearer ${expiredToken}` } };
  const { req: checkedReq } = await runMiddleware(authenticate, req);
  assert.equal(checkedReq.user, null, "Expired token must be rejected");

  const authRes = {};
  await runMiddleware(requireAuth, checkedReq, authRes);
  assert.equal(authRes.statusCode, 401);
});

test("7. Unauthorized role access enforcement (RBAC)", async () => {
  // User with 'user' role attempting to access admin-only route
  const regularUserReq = {
    user: { id: 3, username: "mira", role: "user" }
  };
  const adminMiddleware = requireRole("admin");
  const res = {};

  await runMiddleware(adminMiddleware, regularUserReq, res);
  assert.equal(res.statusCode, 403, "Regular user must receive 403 Forbidden on admin route");
  assert.equal(res.body.code, "FORBIDDEN");

  // User with 'moderator' role attempting to access admin-only route
  const modUserReq = {
    user: { id: 2, username: "noah", role: "moderator" }
  };
  const modRes = {};
  await runMiddleware(adminMiddleware, modUserReq, modRes);
  assert.equal(modRes.statusCode, 403);
  assert.equal(modRes.body.code, "FORBIDDEN");

  // User with 'admin' role allowed
  const adminReq = {
    user: { id: 1, username: "ari", role: "admin" }
  };
  const adminAllowedRes = {};
  const { calledNext } = await runMiddleware(adminMiddleware, adminReq, adminAllowedRes);
  assert.equal(calledNext, true);
  assert.equal(adminAllowedRes.statusCode, undefined);
});
