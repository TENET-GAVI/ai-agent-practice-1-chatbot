import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AGENT_PROMPT,
  DEFAULT_MODEL_ID,
  SMOKE_CASES,
  WEBLLM_CDN_URL,
  buildMessages,
  createLocalReply,
  createReply
} from "./agent.js";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");

assert.doesNotMatch(html, /js\.puter\.com/, "Puter.js is not used");
assert.match(html, /id="loadModelButton"/, "local model load button is present");
assert.match(html, /id="modelSelect"/, "local model selector is present");
assert.match(html, /id="chatLog"/, "chat log is present");
assert.match(html, /id="chatForm"/, "chat form is present");
assert.match(html, /type="module" src="\.\/agent\.js"/, "agent module is loaded");
assert.match(css, /\.chat-panel/, "chat layout styles are present");
assert.match(AGENT_PROMPT, /赞美鼓励机器人/, "source prompt role is preserved");
assert.match(AGENT_PROMPT, /调用Search搜索答案/, "Search instruction is preserved");
assert.match(WEBLLM_CDN_URL, /@mlc-ai\/web-llm/, "WebLLM CDN is configured");
assert.match(DEFAULT_MODEL_ID, /Qwen2-1\.5B-Instruct/, "default Chinese-friendly local model is configured");

for (const testCase of SMOKE_CASES) {
  const reply = createLocalReply(testCase.input, testCase.history || []);
  for (const expected of testCase.expected) {
    assert.ok(
      reply.text.includes(expected),
      `${testCase.name} reply should include ${expected}`
    );
  }
}

const messages = buildMessages("那我下一步怎么做？", [
  { role: "user", content: "我最近在学智能体技术。" },
  { role: "assistant", content: "你愿意持续学习智能体技术，这说明你很有探索精神。" }
]);
assert.equal(messages[0].role, "system", "system prompt is included");
assert.ok(messages.some((message) => message.content.includes("我最近在学智能体技术")), "conversation history is sent to AI");

const streamedPartials = [];
const aiReply = await createReply("继续说说", [], {
  engine: {
    chat: {
      completions: {
        create: async function* (request) {
          assert.equal(request.stream, true, "local model request is streamed");
          assert.equal(request.messages[0].role, "system", "local model receives system prompt");
          yield { choices: [{ delta: { content: "我会根据" } }] };
          yield { choices: [{ delta: { content: "上下文继续聊。" } }] };
        }
      }
    }
  },
  onToken: (partial) => streamedPartials.push(partial)
});
assert.equal(aiReply.mode, "local-llm", "local LLM mode is used when an engine is available");
assert.match(aiReply.text, /上下文继续聊/, "streamed local model response text is extracted");
assert.ok(streamedPartials.length >= 2, "streaming partial updates are emitted");

const searchReply = createLocalReply("什么是智能体？");
assert.ok(searchReply.searchUrl?.startsWith("https://www.bing.com/search"), "Search URL is generated");

console.log("Smoke tests passed.");
