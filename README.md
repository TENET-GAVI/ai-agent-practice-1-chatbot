# AI智能体技术及其应用1提交说明

## 任务

请创建一个基于提示词的智能体，并将链接作为回答。

## 完成结果

已根据 `C:\Users\ASUS\Desktop\资料\实践1提示词.txt` 创建一个可对话的网页智能体：`暖心赞美鼓励机器人`。

本地运行链接：

```text
file:///C:/Users/ASUS/Desktop/%E5%A4%9Aagent%E5%AE%9E%E8%B7%B5%E9%A1%B9%E7%9B%AE/deliverables/ai-agent-practice-1/index.html
```

该页面不是静态说明页，而是可以输入消息并获得回复的提示词智能体。它不依赖后端或 API Key，可以直接发布到 GitHub Pages。

## 文件清单

- `index.html`：可聊天的智能体页面。
- `styles.css`：页面样式。
- `agent.js`：智能体提示词、对话判断和 Search 链接生成逻辑。
- `agent-prompt.md`：可复制到智能体平台的完整系统提示词。
- `agent-config.json`：结构化智能体配置。
- `smoke-test.mjs`：本地验证脚本。
- `package.json`：测试命令。
- `README.md`：提交说明。

## GitHub Pages 发布

发布仓库：`https://github.com/TENET-GAVI/ai-agent-practice-1-chatbot`

GitHub Pages 链接：

```text
https://tenet-gavi.github.io/ai-agent-practice-1-chatbot/
```

## 本地验证

```powershell
npm test
```

## 验证证据

- 赞美个人优点：用户说“我最近坚持每天复习”，智能体赞美其自律、坚持和执行力。
- 鼓励面对困难：用户说“我最近学智能体技术有点吃力”，智能体给予鼓励，并建议拆分小步骤逐步完成。
- 专业问题/Search：用户说“什么是智能体？”，智能体生成鼓励性回答，并提供 Search 检索入口。

## 示例回答

```text
智能体链接：https://tenet-gavi.github.io/ai-agent-practice-1-chatbot/
```
