import express from "express";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));

const events = [];
const MAX_EVENTS = 100;
const ALLOWED_EVENTS = new Set([
  "feedback-submitted",
  "blind-probe",
  "ticket-created",
  "ping",
  "test-callback"
]);

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

app.get("/", (_req, res) => {
  const jsonContent = esc(JSON.stringify(events, null, 2));
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Local OOB Listener · NimbusBoard</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 16px; color: #172033; background: #f8fafc; }
    pre { background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    button { background: #dc2626; color: white; border: 0; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
    .badge { display: inline-block; padding: 4px 8px; background: #e2e8f0; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
  </style>
</head>
<body>
  <h1>☁️ Local OOB Callback Listener</h1>
  <p>Educational listener for Blind XSS simulation (Category 5). Records event metadata within the isolated lab environment.</p>
  <p><span class="badge">Events Recorded: ${events.length}</span></p>
  <pre>${jsonContent}</pre>
  <form method="post" action="/reset">
    <button type="submit">Clear Event Log</button>
  </form>
</body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "NimbusBoard Local OOB Listener", count: events.length });
});

app.post("/callback", (req, res) => {
  const rawEvent = String(req.body?.event || "").trim().toLowerCase();
  const event = ALLOWED_EVENTS.has(rawEvent) ? rawEvent : "unknown";
  const id = Number.isInteger(Number(req.body?.id)) && Number(req.body?.id) >= 0 ? Number(req.body?.id) : 0;

  events.unshift({
    at: new Date().toISOString(),
    event,
    id
  });

  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  res.status(204).end();
});

// Constrained reset mechanism
app.post("/reset", (req, res) => {
  events.length = 0;
  if (req.accepts("html")) {
    res.redirect("/");
  } else {
    res.json({ ok: true, message: "OOB listener events cleared" });
  }
});

const PORT = 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Local OOB listener running on http://${HOST}:${PORT}`);
});
