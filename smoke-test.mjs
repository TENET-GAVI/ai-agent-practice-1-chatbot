import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AGENT_PROMPT, SMOKE_CASES, buildMessages, createLocalReply, createReply } from "./agent.js";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");

assert.match(html, /https:\/\/js\.puter\.com\/v2\//, "Puter.js is loaded");
assert.match(html, /id="chatLog"/, "chat log is present");
assert.match(html, /id="chatForm"/, "chat form is present");
assert.match(html, /type="module" src="\.\/agent\.js"/, "agent module is loaded");
assert.match(css, /\.chat-panel/, "chat layout styles are present");
assert.match(AGENT_PROMPT, /赞美鼓励机器人/, "source prompt role is preserved");
assert.match(AGENT_PROMPT, /调用Search搜索答案/, "Search instruction is preserved");

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

const aiReply = await createReply("继续说说", [], {
  puterClient: {
    ai: {
      chat: async (chatMessages) => ({
        message: {
          content: `我会根据上下文继续聊：${chatMessages.at(-1).content}`
        }
      })
    }
  }
});
assert.equal(aiReply.mode, "ai", "AI mode is used when puter.ai.chat is available");
assert.match(aiReply.text, /继续聊/, "AI response text is extracted");

const searchReply = createLocalReply("什么是智能体？");
assert.ok(searchReply.searchUrl?.startsWith("https://www.bing.com/search"), "Search URL is generated");

console.log("Smoke tests passed.");
