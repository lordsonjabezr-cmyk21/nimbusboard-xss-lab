import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { dbQuery, memoryStore } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SEED_DATA = {
  users: [
    {
      id: 1,
      username: "ari",
      email: "ari@nimbus.local",
      password_hash: "$2b$10$/ja2zhcScD2.Oj8ef9I7COIAHgrSmR9/Pf2gzw9YRlgvZgFnuTGui",
      role: "admin",
      bio: "Lead Security Architect & Administrator for NimbusBoard. Overseeing compliance and audit logs.",
      avatar_url: "/avatars/default-admin.svg"
    },
    {
      id: 2,
      username: "noah",
      email: "noah@nimbus.local",
      password_hash: "$2b$10$qq39KDLIyDNuitrRx0UZzOp7m7CwPkPt/PkkBV3oJkPcn8/AgDiQm",
      role: "moderator",
      bio: "Community moderator and support queue reviewer. Keeping discussions productive.",
      avatar_url: "/avatars/default-mod.svg"
    },
    {
      id: 3,
      username: "mira",
      email: "mira@nimbus.local",
      password_hash: "$2b$10$Ni9WI28DQvXpCERT6iqJW.Q3/88xQjqLR7ljJdaftYEnyvzJbNKOK",
      role: "user",
      bio: "Product designer & frontend enthusiast. Exploring team collaboration features.",
      avatar_url: "/avatars/default-user.svg"
    }
  ],
  posts: [
    {
      id: 1,
      user_id: 1,
      author_name: "Ari",
      title: "Welcome to NimbusBoard Security Lab",
      body: "Welcome to the NimbusBoard collaboration application. Use this training workspace to learn about XSS defense in depth, contextual encoding, and secure architectures.",
      tags: "welcome,security,getting-started",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 3,
      author_name: "Mira",
      title: "Kanban Board v2 Release Notes",
      body: "We just updated the sprint board layout! Feel free to leave comments, propose cards, and review upcoming tasks.",
      tags: "design,sprint,announcement",
      created_at: new Date().toISOString()
    }
  ],
  comments: [
    {
      id: 1,
      post_id: 1,
      user_id: 2,
      author_name: "Noah",
      body: "Great to have the security training modules online. Looking forward to reviewing feedback submissions.",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      post_id: 2,
      user_id: 1,
      author_name: "Ari",
      body: "The new layout looks clean and responsive.",
      created_at: new Date().toISOString()
    }
  ],
  tasks: [
    {
      id: 1,
      title: "Implement Contextual Encoding",
      description: "Ensure all user input reflected in HTML or attributes is contextually encoded.",
      status: "todo",
      priority: "high",
      assignee_name: "Mira",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "Review CSP Directive Configuration",
      description: "Audit script-src and object-src in route response headers.",
      status: "in_progress",
      priority: "high",
      assignee_name: "Ari",
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      title: "Audit Rich-Text Markdown Renderer",
      description: "Verify link scheme allowlists and HTML passthrough sanitization.",
      status: "review",
      priority: "medium",
      assignee_name: "Noah",
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      title: "Deploy Local OOB Callback Listener",
      description: "Verify callback event collection for simulated blind XSS workflows.",
      status: "done",
      priority: "low",
      assignee_name: "Ari",
      created_at: new Date().toISOString()
    }
  ],
  feedback: [
    {
      id: 1,
      name: "External Contributor",
      email: "contributor@example.com",
      message: "Feature request: Add syntax highlighting to the markdown preview widget.",
      category: "feature",
      status: "pending",
      created_at: new Date().toISOString()
    }
  ],
  emails: [
    {
      id: 1,
      recipient_email: "noah@nimbus.local",
      subject: "Daily Moderation Digest",
      body_html: "<p>Hello Noah,</p><p>You have 1 pending support ticket to review in the moderation queue.</p><p>Best regards,<br>NimbusBoard Automation</p>",
      status: "sent",
      created_at: new Date().toISOString()
    }
  ],
  flags: [
    { category: "reflected", exercise_id: "XSS-REFL-01", flag_code: "FLAG{xss_reflected_context_bypass}", description: "Reflected input in search query body and attribute context", points: 100 },
    { category: "stored", exercise_id: "XSS-STOR-01", flag_code: "FLAG{xss_stored_rendering_danger}", description: "Stored content in posts, comments, and profile biography", points: 100 },
    { category: "dom", exercise_id: "XSS-DOM-01", flag_code: "FLAG{xss_dom_sink_flow}", description: "DOM sinks in live preview and URL fragment processing", points: 100 },
    { category: "mutation", exercise_id: "XSS-MUT-01", flag_code: "FLAG{xss_mutation_parser_mismatch}", description: "Mutation XSS discrepancy between parser and sanitizer", points: 100 },
    { category: "blind", exercise_id: "XSS-BLIND-01", flag_code: "FLAG{xss_blind_callback_verified}", description: "Blind XSS via support feedback queue with local OOB listener", points: 100 },
    { category: "self", exercise_id: "XSS-SELF-01", flag_code: "FLAG{xss_self_console_awareness}", description: "Self-XSS social engineering and developer console protection", points: 100 },
    { category: "csp", exercise_id: "XSS-CSP-01", flag_code: "FLAG{xss_csp_weakness_analyzed}", description: "Content Security Policy analysis: unsafe-inline and nonce reuse", points: 100 },
    { category: "framework", exercise_id: "XSS-FW-01", flag_code: "FLAG{xss_framework_escape_react}", description: "Modern framework escape hatch dangerouslySetInnerHTML and javascript: hrefs", points: 100 },
    { category: "markdown", exercise_id: "XSS-MD-01", flag_code: "FLAG{xss_markdown_scheme_bypass}", description: "Markdown parser HTML passthrough and malicious URI schemes", points: 100 },
    { category: "encoding", exercise_id: "XSS-ENC-01", flag_code: "FLAG{xss_encoding_filter_regression}", description: "Double-decoding, normalization flaws, and naive tag blacklists", points: 100 }
  ],
  audit_logs: [
    { id: 1, actor: "system", action: "SEED_DATABASE", details: "Initialized seed users, posts, tasks, feedback, and flags.", created_at: new Date().toISOString() }
  ]
};

export function seedMemoryStore() {
  memoryStore.users = JSON.parse(JSON.stringify(SEED_DATA.users));
  memoryStore.posts = JSON.parse(JSON.stringify(SEED_DATA.posts));
  memoryStore.comments = JSON.parse(JSON.stringify(SEED_DATA.comments));
  memoryStore.tasks = JSON.parse(JSON.stringify(SEED_DATA.tasks));
  memoryStore.feedback = JSON.parse(JSON.stringify(SEED_DATA.feedback));
  memoryStore.emails = JSON.parse(JSON.stringify(SEED_DATA.emails));
  memoryStore.flags = JSON.parse(JSON.stringify(SEED_DATA.flags));
  memoryStore.audit_logs = JSON.parse(JSON.stringify(SEED_DATA.audit_logs));
  memoryStore.seqs = { users: 4, posts: 3, comments: 3, tasks: 5, feedback: 2, emails: 2, audit_logs: 2 };
}

// Initialize on load
seedMemoryStore();

export async function initDatabase() {
  if (config.databaseUrl) {
    try {
      const schemaPath = path.join(__dirname, "schema.sql");
      const seedPath = path.join(__dirname, "seed.sql");
      if (fs.existsSync(schemaPath) && fs.existsSync(seedPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        const seedSql = fs.readFileSync(seedPath, "utf-8");
        await dbQuery(schemaSql);
        await dbQuery(seedSql);
        logger.info("PostgreSQL schema and seed loaded successfully");
        return;
      }
    } catch (err) {
      logger.warn("Could not execute PostgreSQL schema/seed files, using memory store", { error: err.message });
    }
  }
  seedMemoryStore();
  logger.info("Memory database initialized with seed state");
}

export async function resetDatabase() {
  seedMemoryStore();
  if (config.databaseUrl) {
    try {
      const schemaPath = path.join(__dirname, "schema.sql");
      const seedPath = path.join(__dirname, "seed.sql");
      if (fs.existsSync(schemaPath) && fs.existsSync(seedPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        const seedSql = fs.readFileSync(seedPath, "utf-8");
        await dbQuery(schemaSql);
        await dbQuery(seedSql);
        logger.info("PostgreSQL database reset and re-seeded");
        return { ok: true, provider: "postgresql" };
      }
    } catch (err) {
      logger.warn("PostgreSQL reset failed, reset memory store instead", { error: err.message });
    }
  }
  return { ok: true, provider: "memory" };
}
