import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AGENT_PROMPT, SMOKE_CASES, createReply } from "./agent.js";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");

assert.match(html, /id="chatLog"/, "chat log is present");
assert.match(html, /id="chatForm"/, "chat form is present");
assert.match(html, /type="module" src="\.\/agent\.js"/, "agent module is loaded");
assert.match(css, /\.chat-panel/, "chat layout styles are present");
assert.match(AGENT_PROMPT, /赞美鼓励机器人/, "source prompt role is preserved");
assert.match(AGENT_PROMPT, /调用Search搜索答案/, "Search instruction is preserved");

for (const testCase of SMOKE_CASES) {
  const reply = createReply(testCase.input);
  for (const expected of testCase.expected) {
    assert.ok(
      reply.text.includes(expected),
      `${testCase.name} reply should include ${expected}`
    );
  }
}

const searchReply = createReply("什么是智能体？");
assert.ok(searchReply.searchUrl?.startsWith("https://www.bing.com/search"), "Search URL is generated");

console.log("Smoke tests passed.");
