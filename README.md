# QTG · 全能题目管理器

AI 驱动的教育管理系统，打通「卷子导入 → 智能组卷 → 在线答题 → AI 批改 → 错题学习」完整闭环。

## 技术栈

- **后端**：FastAPI · Pydantic · JSON 本地存储
- **前端**：React 18 · TypeScript · Vite · Zustand
- **UI**：Ant Design 5 · Tailwind CSS · KaTeX
- **AI**：智谱 GLM-4-Flash（文本）· GLM-4V-Flash（视觉）

## 快速开始

```bash
# 后端
cd backend
pip install -r requirements.txt
# 配置 ZHIPU_API_KEY 后：
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev
前端默认 http://localhost:5173，/api 代理到后端 8000。

环境变量
ini
# backend/.env
ZHIPU_API_KEY=your_api_key_here
功能亮点
导入：图片/文本识别，自动拆分题干、选项、答案、知识点

组卷：按学科 + 题量 + 难度从全库抽题

批改：并发逐题批改，返回得分与详细分析

错题学习：考点 + 前置知识 + 分步讲解 + 费曼检验 + 同类题 + 「我卡住了」求助

秒开体验：错题本后台静默预热学习材料，点击即开

深色模式：全组件使用 CSS 变量，主题无缝切换
```
question_manager
├─ backend
│  ├─ app
│  │  ├─ api
│  │  │  ├─ ai.py
│  │  │  ├─ auth.py
│  │  │  ├─ categories.py
│  │  │  ├─ import_export.py
│  │  │  ├─ learn.py
│  │  │  ├─ papers.py
│  │  │  ├─ paper_compare.py
│  │  │  ├─ questions.py
│  │  │  ├─ quiz.py
│  │  │  ├─ stats.py
│  │  │  ├─ wrong.py
│  │  │  └─ __init.py
│  │  ├─ core
│  │  │  ├─ ai_assistant.py
│  │  │  ├─ config.py
│  │  │  ├─ data_manager.py
│  │  │  ├─ learning_manager.py
│  │  │  ├─ quiz_engine.py
│  │  │  ├─ statistics.py
│  │  │  └─ __init.py
│  │  ├─ main.py
│  │  ├─ models
│  │  │  ├─ ai.py
│  │  │  ├─ common.py
│  │  │  ├─ paper.py
│  │  │  ├─ question.py
│  │  │  ├─ quiz.py
│  │  │  ├─ stats.py
│  │  │  ├─ user.py
│  │  │  ├─ wrong.py
│  │  │  └─ __init.py
│  │  ├─ templates
│  │  │  └─ paper.html
│  │  ├─ utils
│  │  │  ├─ export_helpers.py
│  │  │  ├─ helpers.py
│  │  │  ├─ validation_utils.py
│  │  │  └─ __init.py
│  │  └─ __init__.py
│  ├─ debug_api.py
│  ├─ Dockerfile
│  ├─ requirements.txt
│  ├─ scripts
│  ├─ start.py
│  └─ test_ai.py
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
│  │  │  ├─ Geometry
│  │  │  │  ├─ GeometryBoard.tsx
│  │  │  │  └─ GeometryRenderer.tsx
│  │  │  ├─ Latex
│  │  │  │  ├─ KatexRenderer.tsx
│  │  │  │  └─ SimpleLatexToolbar.tsx
│  │  │  ├─ Layout
│  │  │  │  ├─ Header.tsx
│  │  │  │  ├─ Layout.tsx
│  │  │  │  └─ Sidebar.tsx
│  │  │  ├─ Learn
│  │  │  │  ├─ ExamPointCard.tsx
│  │  │  │  ├─ FeynmanInput.tsx
│  │  │  │  ├─ LearnHeader.tsx
│  │  │  │  ├─ PrerequisitesCard.tsx
│  │  │  │  ├─ QuestionCard.tsx
│  │  │  │  ├─ SimilarQuestionsCard.tsx
│  │  │  │  └─ StepCard.tsx
│  │  │  ├─ Questions
│  │  │  │  ├─ AIImport.tsx
│  │  │  │  ├─ ImageImportPaperModal.tsx
│  │  │  │  ├─ ImageRecognizeModal.tsx
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
│  │  │  ├─ Learn.tsx
│  │  │  ├─ Login.tsx
│  │  │  ├─ PaperCompare.tsx
│  │  │  ├─ PaperEdit.tsx
│  │  │  ├─ Papers.tsx
│  │  │  ├─ Questions.tsx
│  │  │  ├─ Quiz.tsx
│  │  │  ├─ Register.tsx
│  │  │  ├─ Statistics.tsx
│  │  │  ├─ Utils.tsx
│  │  │  └─ WrongBook.tsx
│  │  ├─ store
│  │  │  ├─ appStore.ts
│  │  │  ├─ authStore.ts
│  │  │  ├─ geometryStore.ts
│  │  │  ├─ index.ts
│  │  │  ├─ questionStore.ts
│  │  │  └─ themeStore.ts
│  │  ├─ styles
│  │  │  └─ globals.css
│  │  ├─ types
│  │  │  ├─ geometry.ts
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