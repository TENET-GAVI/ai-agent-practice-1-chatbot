export const WEBLLM_CDN_URL = "https://esm.run/@mlc-ai/web-llm";
export const DEFAULT_MODEL_ID = "Qwen2-1.5B-Instruct-q4f16_1-MLC";

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

## 本地大模型对话要求
- 你正在作为一个真正的聊天机器人运行，必须根据上下文继续对话。
- 记住用户前面说过的学习内容、困难和情绪，追问时要接着上一轮回答展开。
- 回复要自然、具体、有温度，不要机械套模板。
- 用户问专业问题时，先给简明解释，再鼓励用户用 Search 核对资料。`;

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

let webllmModulePromise;
let engine;
let loadedModelId = "";

export function isWebGPUSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.gpu);
}

export async function loadLocalModel(modelId = DEFAULT_MODEL_ID, progressCallback = () => {}) {
  if (!isWebGPUSupported()) {
    throw new Error("当前浏览器不支持 WebGPU，无法运行浏览器本地大模型。请使用最新版 Chrome 或 Edge。");
  }

  if (engine && loadedModelId === modelId) {
    return engine;
  }

  const webllm = await loadWebLLMModule();
  progressCallback({ text: "开始加载本地大模型..." });
  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (progress) => {
      progressCallback(progress);
    }
  });
  loadedModelId = modelId;
  return engine;
}

async function loadWebLLMModule() {
  if (!webllmModulePromise) {
    webllmModulePromise = import(WEBLLM_CDN_URL);
  }

  return webllmModulePromise;
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

export async function createModelReply(rawInput, history = [], modelEngine = engine, onToken = () => {}) {
  if (!modelEngine?.chat?.completions?.create) {
    throw new Error("本地大模型还没有加载完成。");
  }

  const chunks = await modelEngine.chat.completions.create({
    messages: buildMessages(rawInput, history),
    temperature: 0.75,
    top_p: 0.9,
    max_tokens: 420,
    stream: true
  });

  let text = "";
  for await (const chunk of chunks) {
    const delta = chunk.choices?.[0]?.delta?.content || "";
    if (delta) {
      text += delta;
      onToken(text);
    }
  }

  return {
    text: text.trim(),
    mode: "local-llm"
  };
}

export async function createReply(rawInput, history = [], options = {}) {
  const modelEngine = options.engine ?? engine;
  const onToken = options.onToken ?? (() => {});
  const useModel = options.useModel ?? true;

  if (useModel && modelEngine) {
    try {
      return await createModelReply(rawInput, history, modelEngine, onToken);
    } catch (error) {
      const fallback = createLocalReply(rawInput, history);
      return {
        ...fallback,
        mode: "fallback",
        text: `${fallback.text}\n\n（本地大模型生成暂时失败，已使用上下文兜底回复。原因：${error.message}）`
      };
    }
  }

  return { ...createLocalReply(rawInput, history), mode: "fallback" };
}

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
    text: "你愿意来表达自己的想法，这本身就说明你很真诚，也很重视自己的成长。我想更了解你一点：你觉得自己最近做过最值得肯定的一件事是什么呢？"
  };
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

  statusEl.classList.toggle("ready", mode === "ready" || mode === "local-llm");
  statusEl.classList.toggle("fallback", mode !== "ready" && mode !== "local-llm");

  const text = {
    unloaded: "未加载模型",
    loading: "加载中",
    ready: "本地大模型",
    "local-llm": "本地大模型",
    fallback: "兜底回复"
  };
  statusEl.textContent = text[mode] || "未加载模型";
}

function setProgress(progressEl, progress) {
  if (!progressEl) {
    return;
  }

  if (typeof progress?.text === "string") {
    progressEl.textContent = progress.text;
    return;
  }

  if (typeof progress?.progress === "number") {
    progressEl.textContent = `模型加载中：${Math.round(progress.progress * 100)}%`;
  }
}

async function ensureModelLoaded({ modelSelect, loadButton, progressEl, statusEl }) {
  setStatus(statusEl, "loading");
  loadButton.disabled = true;
  loadButton.textContent = "加载中";

  try {
    await loadLocalModel(modelSelect.value, (progress) => setProgress(progressEl, progress));
    setStatus(statusEl, "ready");
    progressEl.textContent = "本地大模型已加载，可以连续聊天。";
    loadButton.textContent = "已加载";
  } catch (error) {
    setStatus(statusEl, "fallback");
    progressEl.textContent = error.message;
    loadButton.disabled = false;
    loadButton.textContent = "重试加载";
    throw error;
  }
}

function initChat() {
  const log = document.querySelector("#chatLog");
  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#userInput");
  const sendButton = document.querySelector("#sendButton");
  const promptText = document.querySelector("#promptText");
  const quickButtons = document.querySelectorAll("[data-prompt]");
  const statusEl = document.querySelector("#modelStatus");
  const modelSelect = document.querySelector("#modelSelect");
  const loadButton = document.querySelector("#loadModelButton");
  const progressEl = document.querySelector("#loadProgress");
  const conversation = [];

  if (!log || !form || !input || !sendButton || !modelSelect || !loadButton || !progressEl) {
    return;
  }

  if (promptText) {
    promptText.textContent = AGENT_PROMPT;
  }

  const intro = "你好，我是暖心赞美鼓励机器人。点击“加载本地大模型”后，我会在你的浏览器里用本地模型连续聊天。";
  conversation.push({ role: "assistant", content: intro });
  appendMessage(log, "agent", intro);

  loadButton.addEventListener("click", async () => {
    try {
      await ensureModelLoaded({ modelSelect, loadButton, progressEl, statusEl });
    } catch {
      // The visible progress text already explains the failure.
    }
  });

  modelSelect.addEventListener("change", () => {
    setStatus(statusEl, "unloaded");
    progressEl.textContent = "模型已切换，点击加载后开始本地推理。";
    loadButton.disabled = false;
    loadButton.textContent = "加载本地大模型";
    engine = undefined;
    loadedModelId = "";
  });

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

    const pending = appendMessage(log, "agent", "正在准备用本地大模型生成回复...", undefined, "pending");

    try {
      if (!engine) {
        await ensureModelLoaded({ modelSelect, loadButton, progressEl, statusEl });
      }

      const reply = await createReply(message, conversation.slice(0, -1), {
        onToken: (partial) => {
          pending.querySelector(".bubble").textContent = partial;
        }
      });
      pending.classList.remove("pending");
      pending.querySelector(".bubble").textContent = reply.text;
      conversation.push({ role: "assistant", content: reply.text });
      setStatus(statusEl, reply.mode);
    } catch (error) {
      const fallback = createLocalReply(message, conversation.slice(0, -1));
      pending.classList.remove("pending");
      pending.querySelector(".bubble").textContent = `${fallback.text}\n\n（本地大模型未能启动：${error.message}）`;
      if (fallback.searchUrl) {
        const link = document.createElement("a");
        link.className = "search-link";
        link.href = fallback.searchUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "打开 Search";
        pending.append(link);
      }
      conversation.push({ role: "assistant", content: fallback.text });
      setStatus(statusEl, "fallback");
    } finally {
      setBusy(input, sendButton, false);
      input.focus();
    }
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
