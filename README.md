# 📚 全能题目管理器

🚀 一个快速高效的题目管理全栈应用，支持AI智能批改和智能组卷。

## ✨ 功能特性
- ✅ 完整的题目管理系统
- ✅ AI智能批改（集成Qwen2.5）
- ✅ 智能组卷生成
- ✅ 错题本管理
- ✅ 学习统计和分析
- ✅ 用户认证系统

## 🛠️ 技术栈
- **前端**: React + TypeScript + Ant Design
- **后端**: FastAPI + Python  
- **AI**: Ollama + Qwen2.5
- **数据库**: JSON文件存储
```
question_manager
├─ backend
│  ├─ app
│  │  ├─ api
│  │  │  ├─ ai.py
│  │  │  ├─ auth.py
│  │  │  ├─ categories.py
│  │  │  ├─ import_export.py
│  │  │  ├─ questions.py
│  │  │  ├─ quiz.py
│  │  │  ├─ stats.py
│  │  │  ├─ wrong.py
│  │  │  └─ __init.py
│  │  ├─ core
│  │  │  ├─ ai_assistant.py
│  │  │  ├─ config.py
│  │  │  ├─ data_manager.py
│  │  │  ├─ quiz_engine.py
│  │  │  ├─ statistics.py
│  │  │  └─ __init.py
│  │  ├─ main.py
│  │  ├─ models
│  │  │  ├─ ai.py
│  │  │  ├─ common.py
│  │  │  ├─ question.py
│  │  │  ├─ quiz.py
│  │  │  ├─ stats.py
│  │  │  ├─ user.py
│  │  │  ├─ wrong.py
│  │  │  └─ __init.py
│  │  ├─ utils
│  │  │  ├─ export_helpers.py
│  │  │  ├─ helpers.py
│  │  │  ├─ validation_utils.py
│  │  │  └─ __init.py
│  │  └─ __init__.py
│  ├─ data
│  │  ├─ question_categories.json
│  │  ├─ question_database.json
│  │  └─ wrong_questions.json
│  ├─ debug_api.py
│  ├─ Dockerfile
│  ├─ requirements.txt
│  └─ start.py
├─ docker-compose.yml
├─ frontend
│  ├─ create-project.bat
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ public
│  ├─ src
│  │  ├─ api
│  │  │  ├─ aiClient.ts
│  │  │  └─ client.ts
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ components
│  │  │  ├─ Auth
│  │  │  │  ├─ LoginForm.tsx
│  │  │  │  └─ RegisterForm.tsx
│  │  │  ├─ Common
│  │  │  │  └─ CategorySelectors.tsx
│  │  │  ├─ Latex
│  │  │  │  ├─ KatexRenderer.tsx
│  │  │  │  └─ SimpleLatexToolbar.tsx
│  │  │  ├─ Layout
│  │  │  │  ├─ Header.tsx
│  │  │  │  ├─ Layout.tsx
│  │  │  │  └─ Sidebar.tsx
│  │  │  ├─ Questions
│  │  │  │  ├─ ImportExport.tsx
│  │  │  │  ├─ QuestionForm.tsx
│  │  │  │  └─ QuestionList.tsx
│  │  │  ├─ Quiz
│  │  │  │  ├─ QuizGenerator.tsx
│  │  │  │  ├─ QuizResults.tsx
│  │  │  │  └─ QuizTaker.tsx
│  │  │  ├─ Stats
│  │  │  │  ├─ AnalyticsCharts.tsx
│  │  │  │  ├─ Charts.tsx
│  │  │  │  ├─ Dashboard.tsx
│  │  │  │  └─ ImprovementSuggestions.tsx
│  │  │  └─ WrongBook
│  │  │     ├─ WrongDetails.tsx
│  │  │     └─ WrongList.tsx
│  │  ├─ hooks
│  │  │  ├─ useApi.ts
│  │  │  └─ useDarkMode.ts
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ pages
│  │  │  ├─ Home.tsx
│  │  │  ├─ Login.tsx
│  │  │  ├─ Questions.tsx
│  │  │  ├─ Quiz.tsx
│  │  │  ├─ Register.tsx
│  │  │  ├─ Statistics.tsx
│  │  │  └─ WrongBook.tsx
│  │  ├─ store
│  │  │  ├─ appStore.ts
│  │  │  ├─ authStore.ts
│  │  │  ├─ index.ts
│  │  │  └─ questionStore.ts
│  │  ├─ styles
│  │  │  └─ globals.css
│  │  ├─ types
│  │  │  └─ index.ts
│  │  ├─ utils
│  │  └─ vite-env.d.ts
│  ├─ tailwind.config.js
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  └─ vite.config.ts
├─ LICENSE
├─ package-lock.json
├─ package.json
├─ question_manager.code-workspace
└─ README.md

```
/*