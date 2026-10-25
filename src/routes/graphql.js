import express from "express";
import { graphql, buildSchema } from "graphql";
import { dbQuery } from "../db/pool.js";
import { isVulnerable } from "../config.js";

const router = express.Router();

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const schema = buildSchema(`
  type User {
    id: Int!
    username: String!
    email: String!
    role: String!
    bio: String
    avatar_url: String
  }

  type Post {
    id: Int!
    author_name: String!
    title: String!
    body: String!
    safe_body: String!
    created_at: String
  }

  type Task {
    id: Int!
    title: String!
    description: String!
    status: String!
    priority: String
    assignee_name: String
  }

  type Query {
    posts: [Post!]!
    post(id: Int!): Post
    users: [User!]!
    tasks: [Task!]!
    search(query: String!): [Post!]!
  }

  type Mutation {
    createPost(title: String!, body: String!, author: String): Post!
  }
`);

const root = {
  posts: async () => {
    const res = await dbQuery("SELECT * FROM posts ORDER BY id DESC");
    return res.rows.map(p => ({
      ...p,
      safe_body: isVulnerable() ? p.body : esc(p.body)
    }));
  },
  post: async ({ id }) => {
    const res = await dbQuery("SELECT * FROM posts WHERE id = $1", [id]);
    const p = res.rows[0];
    if (!p) return null;
    return {
      ...p,
      safe_body: isVulnerable() ? p.body : esc(p.body)
    };
  },
  users: async () => {
    const res = await dbQuery("SELECT id, username, email, role, bio, avatar_url FROM users");
    return res.rows;
  },
  tasks: async () => {
    const res = await dbQuery("SELECT * FROM tasks");
    return res.rows;
  },
  search: async ({ query }) => {
    const res = await dbQuery("SELECT * FROM posts WHERE LOWER(title) LIKE $1 OR LOWER(body) LIKE $1", [`%${query.toLowerCase()}%`]);
    return res.rows.map(p => ({
      ...p,
      safe_body: isVulnerable() ? p.body : esc(p.body)
    }));
  },
  createPost: async ({ title, body, author }) => {
    const authorName = author || "Guest";
    const res = await dbQuery(
      "INSERT INTO posts (author_name, title, body) VALUES ($1, $2, $3) RETURNING *",
      [authorName, title, body]
    );
    const p = res.rows[0];
    return {
      ...p,
      safe_body: isVulnerable() ? p.body : esc(p.body)
    };
  }
};

router.use(express.json());

// POST /graphql - GraphQL execution endpoint
router.post("/", async (req, res) => {
  const { query, variables } = req.body || {};
  if (!query) {
    return res.status(400).json({ errors: [{ message: "Missing GraphQL query" }] });
  }

  try {
    const response = await graphql({
      schema,
      source: query,
      rootValue: root,
      variableValues: variables
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ errors: [{ message: err.message }] });
  }
});

// GET /graphql - Schema explorer and documentation
router.get("/", (_req, res) => {
  res.type("json").send(JSON.stringify({
    info: "NimbusBoard GraphQL API",
    note: "Trust-boundary demonstration: GraphQL responses deliver structured data; frontend consumer is responsible for safe sink handling.",
    queries: ["posts", "post(id: Int!)", "users", "tasks", "search(query: String!)"],
    mutations: ["createPost(title: String!, body: String!, author: String)"]
  }, null, 2));
});

export default router;
