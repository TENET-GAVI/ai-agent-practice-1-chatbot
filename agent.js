export const AGENT_PROMPT = `# 角色
你是一个充满正能量的赞美鼓励机器人，时刻用温暖的话语给予人们赞美和鼓励，让他们充满自信与动力。

## 技能
### 技能 1：赞美个人优点
1. 当用户提到自己的某个特点或行为时，挖掘其中的优点进行赞美。回复示例：你真的很[优点]，比如[具体事例说明优点]。
2. 如果用户没有明确提到自己的特点，可以主动询问一些问题，了解用户后进行赞美。回复示例：我想先了解一下你，你觉得自己最近做过最棒的事情是什么呢？

### 技能 2：鼓励面对困难
1. 当用户提到遇到困难时，给予鼓励和积极的建议。回复示例：这确实是个挑战，但我相信你有足够的能力去克服它。你可以[具体建议]。
2. 如果用户没有提到困难但情绪低落，可以询问是否有不开心的事情，然后给予鼓励。回复示例：你看起来有点不开心，是不是遇到什么事情了呢？不管怎样，你都很坚强，一定可以度过难关。

### 技能 3：回答专业问题
遇到你无法回答的问题时，调用Search搜索答案

## 限制
- 只输出赞美和鼓励的话语，拒绝负面评价。
- 所输出的内容必须按照给定的格式进行组织，不能偏离框架要求。`;

export const SYSTEM_PROMPT = `${AGENT_PROMPT}

## 对话要求
- 你必须根据上下文继续聊天，记住用户前面提到的事情，不要每轮都像第一次见面。
- 用户追问“为什么、怎么做、继续、还有呢、具体点”时，要接着上一轮内容展开。
- 回复要自然，像一个正在对话的智能体，而不是固定模板。
- 如果用户问专业问题，可以先给简明解释，并建议继续使用 Search 核对资料。`;

export const SMOKE_CASES = [
  {
    name: "praise",
    input: "我最近坚持每天复习。",
    expected: ["自律", "坚持", "执行力"]
  },
  {
    name: "encourage",
    input: "我最近学智能体技术有点吃力，怕自己跟不上。",
    expected: ["挑战", "相信", "拆"]
  },
  {
    name: "search",
    input: "什么是智能体？",
    expected: ["Search", "检索", "资料"]
  },
  {
    name: "context",
    history: [
      { role: "user", content: "我最近在学智能体技术。" },
      { role: "assistant", content: "你愿意持续学习智能体技术，这说明你很有探索精神。" }
    ],
    input: "那我下一步怎么做？",
    expected: ["智能体技术", "下一步", "拆"]
  }
];

const professionalPattern = /(什么是|如何|怎么|原理|代码|api|API|专业|智能体|Agent|agent|算法|模型|数据|编程|论文|技术|搜索|Search)/;
const difficultyPattern = /(难|困难|不会|焦虑|压力|害怕|担心|累|失败|跟不上|不懂|烦|崩溃|来不及|紧张|吃力)/;
const positivePattern = /(坚持|完成|做了|学会|进步|努力|认真|复习|运动|帮助|尝试|自律|勇敢|负责|优秀|开心)/;
const followUpPattern = /(为什么|怎么做|咋办|继续|还有|具体|下一步|然后|那我|这个|它|这些|再说|展开)/;

export function createLocalReply(rawInput, history = []) {
  const input = String(rawInput || "").trim();
  const contextTopic = inferContextTopic(history);

  if (!input) {
    return {
      text: "我想先了解一下你，你觉得自己最近做过最棒的事情是什么呢？愿意停下来看看自己的亮点，本身就很值得肯定。"
    };
  }

  if (followUpPattern.test(input) && contextTopic) {
    return {
      text: `你能继续追问，说明你真的在认真推进“${contextTopic}”。下一步可以先拆成一个很小的行动：先整理你已经理解的部分，再标出最卡住的一点，最后用 15 分钟只解决这一点。这样做不急不乱，而且每完成一小步都会增强信心。`
    };
  }

  if (difficultyPattern.test(input)) {
    return {
      text: "这确实是个挑战，但你愿意把困难说出来，说明你很认真，也已经在主动寻找解决办法。我相信你有足够的能力去克服它。你可以先把眼前的问题拆成一个很小的步骤，完成后给自己一点正向反馈，再继续下一步。"
    };
  }

  if (professionalPattern.test(input)) {
    return {
      text: `你能提出这个问题，说明你很有探索精神，也愿意把知识弄明白。简单来说，可以先围绕“${clipInput(input)}”抓住关键词，再通过 Search 检索可靠资料，最后用自己的话整理答案。这样一步一步来，你会越来越有把握。\n\nSearch关键词：${input}`,
      searchUrl: `https://www.bing.com/search?q=${encodeURIComponent(input)}`
    };
  }

  if (positivePattern.test(input)) {
    return {
      text: `你真的很自律，比如你提到“${clipInput(input)}”，这能看出你很会坚持，也有很强的执行力。这样的品质会慢慢积累成真正的进步，请继续相信自己。`
    };
  }

  return {
    text: `你愿意来表达自己的想法，这本身就说明你很真诚，也很重视自己的成长。我想更了解你一点：你觉得自己最近做过最值得肯定的一件事是什么呢？`
  };
}

export async function createReply(rawInput, history = [], options = {}) {
  const puterClient = options.puterClient ?? globalThis.puter;
  const useAI = options.useAI ?? true;

  if (!useAI || !puterClient?.ai?.chat) {
    return { ...createLocalReply(rawInput, history), mode: "local" };
  }

  try {
    const messages = buildMessages(rawInput, history);
    const response = await puterClient.ai.chat(messages, {
      model: "gpt-5-nano",
      temperature: 0.7,
      max_tokens: 420
    });
    const text = extractResponseText(response);

    if (!text) {
      throw new Error("empty AI response");
    }

    return { text, mode: "ai" };
  } catch (error) {
    const fallback = createLocalReply(rawInput, history);
    return {
      ...fallback,
      mode: "fallback",
      text: `${fallback.text}\n\n（AI 在线生成暂时不可用，已使用本地上下文模式继续对话。）`
    };
  }
}

export function buildMessages(rawInput, history = []) {
  const recentHistory = history.slice(-10).map((item) => ({
    role: item.role === "assistant" ? "assistant" : "user",
    content: String(item.content || "")
  }));

  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentHistory,
    { role: "user", content: String(rawInput || "").trim() }
  ];
}

function extractResponseText(response) {
  if (typeof response === "string") {
    return response.trim();
  }

  if (typeof response?.text === "string") {
    return response.text.trim();
  }

  const content = response?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part?.text || "")
      .join("")
      .trim();
  }

  return "";
}

function inferContextTopic(history) {
  const lastUser = [...history].reverse().find((item) => item.role === "user")?.content || "";
  const text = String(lastUser);

  if (/智能体|Agent|agent/.test(text)) {
    return "智能体技术";
  }
  if (/复习|学习|考试|课程/.test(text)) {
    return "学习计划";
  }
  if (/项目|作业|实践/.test(text)) {
    return "实践任务";
  }

  return clipInput(text, 18);
}

function clipInput(input, maxLength = 24) {
  return input.length > maxLength ? `${input.slice(0, maxLength)}...` : input;
}

function appendMessage(log, role, text, searchUrl, extraClass = "") {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${role}${extraClass ? ` ${extraClass}` : ""}`;

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "你" : "智能体";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.append(label, bubble);

  if (searchUrl) {
    const link = document.createElement("a");
    link.className = "search-link";
    link.href = searchUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "打开 Search";
    wrapper.append(link);
  }

  log.append(wrapper);
  log.scrollTop = log.scrollHeight;
  return wrapper;
}

function setBusy(input, sendButton, busy) {
  input.disabled = busy;
  sendButton.disabled = busy;
  sendButton.textContent = busy ? "生成中" : "发送";
}

function setStatus(statusEl, mode) {
  if (!statusEl) {
    return;
  }

  statusEl.classList.toggle("fallback", mode !== "ai");
  statusEl.textContent = mode === "ai" ? "AI 对话" : "本地兜底";
}

function initChat() {
  const log = document.querySelector("#chatLog");
  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#userInput");
  const sendButton = document.querySelector("#sendButton");
  const promptText = document.querySelector("#promptText");
  const quickButtons = document.querySelectorAll("[data-prompt]");
  const statusEl = document.querySelector("#modelStatus");
  const conversation = [];

  if (!log || !form || !input || !sendButton) {
    return;
  }

  if (promptText) {
    promptText.textContent = AGENT_PROMPT;
  }

  const intro = "你好，我是暖心赞美鼓励机器人。我会记住我们前面的对话，继续围绕你的情况给你赞美、鼓励和建议。";
  conversation.push({ role: "assistant", content: intro });
  appendMessage(log, "agent", intro);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) {
      input.focus();
      return;
    }

    appendMessage(log, "user", message);
    conversation.push({ role: "user", content: message });
    input.value = "";
    setBusy(input, sendButton, true);

    const pending = appendMessage(log, "agent", "正在根据前文生成回复...", undefined, "pending");
    const reply = await createReply(message, conversation.slice(0, -1));
    pending.remove();
    appendMessage(log, "agent", reply.text, reply.searchUrl);
    conversation.push({ role: "assistant", content: reply.text });
    setStatus(statusEl, reply.mode);
    setBusy(input, sendButton, false);
    input.focus();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.prompt || "";
      input.focus();
      form.requestSubmit();
    });
  });
}

if (typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", initChat);
}
