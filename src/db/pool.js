import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger.js";

const { Pool } = pg;

let pool = null;
let useMemoryStore = false;

// In-memory store fallback when PostgreSQL is not available
export const memoryStore = {
  users: [],
  posts: [],
  comments: [],
  tasks: [],
  feedback: [],
  emails: [],
  flags: [],
  audit_logs: [],
  seqs: { users: 4, posts: 3, comments: 3, tasks: 5, feedback: 2, emails: 2, audit_logs: 2 }
};

if (config.databaseUrl) {
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
      max: 10
    });
    pool.on("error", (err) => {
      logger.warn("PostgreSQL pool idle client error, falling back to memory store", { error: err.message });
      useMemoryStore = true;
    });
  } catch (err) {
    logger.warn("PostgreSQL pool initialization failed, using memory store", { error: err.message });
    useMemoryStore = true;
  }
} else {
  useMemoryStore = true;
}

export async function checkDbHealth() {
  if (!config.databaseUrl) {
    return {
      ok: true,
      provider: "memory",
      ready: true,
      notice: "In-memory test store active (DATABASE_URL not configured)"
    };
  }

  if (useMemoryStore || !pool) {
    return {
      ok: false,
      provider: "memory_fallback",
      ready: false,
      error: "PostgreSQL pool failed to initialize. Operating in in-memory fallback mode."
    };
  }

  try {
    const res = await pool.query("SELECT 1 AS ready");
    return { ok: true, provider: "postgresql", ready: res.rows[0]?.ready === 1 };
  } catch (err) {
    logger.warn("PostgreSQL health check failed, operating with memory store fallback", { error: err.message });
    return {
      ok: false,
      provider: "memory_fallback",
      ready: false,
      error: `PostgreSQL health check failed: ${err.message}. Operating in memory fallback.`
    };
  }
}

export async function dbQuery(text, params = []) {
  if (!useMemoryStore && pool) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      logger.warn("PostgreSQL query error, attempting in-memory fallback", { sql: text, error: err.message });
      // If table doesn't exist yet or connection failed, use memory store
      return executeMemoryQuery(text, params);
    }
  }
  return executeMemoryQuery(text, params);
}

function executeMemoryQuery(text, params = []) {
  const norm = text.trim().toLowerCase();
  
  if (norm.startsWith("select 1")) {
    return { rows: [{ ready: 1 }], rowCount: 1 };
  }

  // Users queries
  if (norm.includes("from users")) {
    if (norm.includes("where username =") || norm.includes("where email =")) {
      const val = params[0]?.toLowerCase();
      const user = memoryStore.users.find(u => u.username?.toLowerCase() === val || u.email?.toLowerCase() === val);
      return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
    }
    if (norm.includes("where id =")) {
      const id = Number(params[0]);
      const user = memoryStore.users.find(u => u.id === id);
      return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
    }
    return { rows: memoryStore.users.map(u => ({ ...u })), rowCount: memoryStore.users.length };
  }

  // Posts queries
  if (norm.includes("from posts")) {
    if (norm.includes("where id =")) {
      const id = Number(params[0]);
      const post = memoryStore.posts.find(p => p.id === id);
      return { rows: post ? [{ ...post }] : [], rowCount: post ? 1 : 0 };
    }
    // Return posts sorted newest first
    const posts = [...memoryStore.posts].sort((a, b) => b.id - a.id);
    return { rows: posts, rowCount: posts.length };
  }

  // Insert post
  if (norm.startsWith("insert into posts")) {
    const id = memoryStore.seqs.posts++;
    const [userId, author, title, body, tags] = params;
    const post = { id, user_id: userId, author_name: author, title, body, tags: tags || "", created_at: new Date().toISOString() };
    memoryStore.posts.unshift(post);
    return { rows: [post], rowCount: 1 };
  }

  // Comments queries
  if (norm.includes("from comments")) {
    if (norm.includes("where post_id =")) {
      const postId = Number(params[0]);
      const comments = memoryStore.comments.filter(c => c.post_id === postId);
      return { rows: comments, rowCount: comments.length };
    }
    return { rows: memoryStore.comments, rowCount: memoryStore.comments.length };
  }

  if (norm.startsWith("insert into comments")) {
    const id = memoryStore.seqs.comments++;
    const [postId, userId, author, body] = params;
    const comment = { id, post_id: postId, user_id: userId, author_name: author, body, created_at: new Date().toISOString() };
    memoryStore.comments.push(comment);
    return { rows: [comment], rowCount: 1 };
  }

  // Tasks queries (Kanban)
  if (norm.includes("from tasks")) {
    return { rows: memoryStore.tasks, rowCount: memoryStore.tasks.length };
  }

  if (norm.startsWith("insert into tasks")) {
    const id = memoryStore.seqs.tasks++;
    const [title, description, status, priority, assignee] = params;
    const task = { id, title, description, status: status || "todo", priority: priority || "medium", assignee_name: assignee || "Mira", created_at: new Date().toISOString() };
    memoryStore.tasks.push(task);
    return { rows: [task], rowCount: 1 };
  }

  if (norm.startsWith("update tasks set status =")) {
    const [status, id] = params;
    const task = memoryStore.tasks.find(t => t.id === Number(id));
    if (task) task.status = status;
    return { rows: task ? [task] : [], rowCount: task ? 1 : 0 };
  }

  // Feedback queries
  if (norm.includes("from feedback")) {
    return { rows: memoryStore.feedback, rowCount: memoryStore.feedback.length };
  }

  if (norm.startsWith("insert into feedback")) {
    const id = memoryStore.seqs.feedback++;
    const [name, email, message, category] = params;
    const item = { id, name, email, message, category: category || "general", status: "pending", created_at: new Date().toISOString() };
    memoryStore.feedback.unshift(item);
    return { rows: [item], rowCount: 1 };
  }

  // Emails queries
  if (norm.includes("from emails")) {
    return { rows: memoryStore.emails, rowCount: memoryStore.emails.length };
  }

  if (norm.startsWith("insert into emails")) {
    const id = memoryStore.seqs.emails++;
    const [recipient, subject, body] = params;
    const email = { id, recipient_email: recipient, subject, body_html: body, status: "queued", created_at: new Date().toISOString() };
    memoryStore.emails.unshift(email);
    return { rows: [email], rowCount: 1 };
  }

  // Flags queries
  if (norm.includes("from flags")) {
    if (norm.includes("where category =")) {
      const cat = params[0];
      const flag = memoryStore.flags.find(f => f.category === cat);
      return { rows: flag ? [{ ...flag }] : [], rowCount: flag ? 1 : 0 };
    }
    return { rows: memoryStore.flags.map(f => ({ ...f })), rowCount: memoryStore.flags.length };
  }

  // Audit logs queries
  if (norm.includes("from audit_logs")) {
    return { rows: memoryStore.audit_logs, rowCount: memoryStore.audit_logs.length };
  }

  if (norm.startsWith("insert into audit_logs")) {
    const id = memoryStore.seqs.audit_logs++;
    const [actor, action, details] = params;
    const log = { id, actor, action, details, created_at: new Date().toISOString() };
    memoryStore.audit_logs.unshift(log);
    return { rows: [log], rowCount: 1 };
  }

  // Update profile
  if (norm.startsWith("update users set bio =")) {
    const [bio, id] = params;
    const user = memoryStore.users.find(u => u.id === Number(id));
    if (user) user.bio = bio;
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  return { rows: [], rowCount: 0 };
}
