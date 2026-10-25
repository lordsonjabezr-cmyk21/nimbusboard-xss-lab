import express from "express";
import { config, hintsEnabled, isVulnerable } from "../config.js";
import { dbQuery } from "../db/pool.js";
import { resetDatabase } from "../db/init.js";

const router = express.Router();

const HINTS = {
  reflected: [
    "Identify where the query parameter appears in the HTTP response.",
    "Notice if it appears directly in the HTML body or inside an HTML attribute.",
    "In attribute context, test how quotes and angle brackets are processed."
  ],
  stored: [
    "Examine where the post or profile field is stored and retrieved.",
    "Notice how the content is rendered in different user views (team feed, profile cards).",
    "In fixed mode, observe how HTML characters are converted to entity equivalents."
  ],
  dom: [
    "Trace the data flow directly in client-side JavaScript from location.hash to innerHTML.",
    "Check window.addEventListener('message') handlers for missing event.origin validation.",
    "Notice that the payload never touches the server in fragment-based DOM XSS."
  ],
  mutation: [
    "Observe how the browser HTML parser switches namespaces when encountering MathML or SVG tags.",
    "Notice how custom regex string replacement before DOM insertion can be subverted by browser normalization."
  ],
  blind: [
    "Submit a payload into the support feedback queue and inspect the admin/moderator queue.",
    "The local OOB listener records a fixed callback event without exfiltrating secrets or tokens."
  ],
  self: [
    "Review how social engineering attacks trick users into opening developer tools.",
    "Inspect the console warning implemented to deter Self-XSS copy-paste attacks."
  ],
  csp: [
    "Read the Content-Security-Policy header in the HTTP response.",
    "Compare 'unsafe-inline' with strict policies; observe how nonces are validated."
  ],
  framework: [
    "Look for framework escape hatches like React's dangerouslySetInnerHTML.",
    "Inspect dynamic href attributes where javascript: URI schemes might not be filtered."
  ],
  markdown: [
    "Check whether the markdown renderer permits raw HTML passthrough.",
    "Test markdown link schemes like [click](javascript:...) to see if URL protocols are validated."
  ],
  encoding: [
    "Analyze whether the server decodes input multiple times before rendering.",
    "Notice how non-recursive keyword stripping (<script>) can be defeated by nested tags."
  ]
};

// GET /lab/hints/:id
router.get("/hints/:id", (req, res) => {
  if (!hintsEnabled()) {
    return res.status(404).json({ error: "Hints are disabled (LAB_HINTS=off)" });
  }
  const id = req.params.id?.toLowerCase();
  const hints = HINTS[id] || ["Analyze source, transformation, and browser sink."];
  res.json({ id, hints });
});

// GET /lab/scoreboard
router.get("/scoreboard", async (_req, res) => {
  const flagsRes = await dbQuery("SELECT * FROM flags ORDER BY category ASC");
  const categories = [
    "reflected", "stored", "dom", "mutation", "blind",
    "self", "csp", "framework", "markdown", "encoding"
  ];

  const scoreboard = categories.map(cat => {
    const f = flagsRes.rows.find(row => row.category === cat);
    return {
      category: cat,
      exercise_id: f ? f.exercise_id : `XSS-${cat.toUpperCase().slice(0, 4)}-01`,
      points: f ? f.points : 100,
      solved: false // Session/client tracked
    };
  });

  res.json({
    mode: config.mode,
    hintsEnabled: hintsEnabled(),
    totalPoints: 1000,
    categories: scoreboard
  });
});

// POST /lab/flags/submit
router.post("/flags/submit", async (req, res) => {
  const { category, flag } = req.body || {};
  if (!category || !flag) {
    return res.status(400).json({ accepted: false, error: "Category and flag are required" });
  }

  const result = await dbQuery("SELECT * FROM flags WHERE LOWER(category) = LOWER($1)", [category]);
  const expected = result.rows[0];

  if (expected && expected.flag_code === flag.trim()) {
    return res.json({
      accepted: true,
      category,
      points: expected.points,
      message: `Correct! Flag for ${category} accepted.`
    });
  }

  res.status(400).json({
    accepted: false,
    category,
    error: "Invalid flag code submitted for this category"
  });
});

// POST /lab/reset
router.post("/reset", async (req, res) => {
  // Guard reset endpoint from casual exposure beyond intended local lab
  const rawIp = req.ip || req.socket?.remoteAddress || "";
  const clientIp = rawIp.replace(/^::ffff:/, "");
  const isLoopback = clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "localhost";
  const isPrivateDockerNet = clientIp.startsWith("172.") || clientIp.startsWith("10.") || clientIp.startsWith("192.168.");
  const isAdmin = req.user && req.user.role === "admin";

  // Allow reset from local/docker network in training profile, or require admin auth
  const isAuthorized = (config.profile === "training" && (isLoopback || isPrivateDockerNet)) || isAdmin;

  if (!isAuthorized) {
    return res.status(403).json({
      error: "Forbidden: Lab reset is restricted to local training environments or authenticated administrators",
      code: "FORBIDDEN"
    });
  }

  const result = await resetDatabase();
  res.json({ ok: true, message: "Database reset to initial seed state", ...result });
});

// GET /lab/status
router.get("/status", async (_req, res) => {
  res.json({
    ok: true,
    mode: config.mode,
    hints: hintsEnabled(),
    isVulnerable: isVulnerable()
  });
});

export default router;
