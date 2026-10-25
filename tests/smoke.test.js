import test from "node:test";
import assert from "node:assert/strict";

test("health route responds with a mode", async()=>{
  const r=await fetch("http://127.0.0.1:4000/health");
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(typeof body.mode,"string");
});
test("reset route restores seed data", async()=>{
  const r=await fetch("http://127.0.0.1:4000/lab/reset",{method:"POST"});
  assert.equal(r.status,200);
});
