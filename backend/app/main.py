from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
from contextlib import asynccontextmanager

from app.core.config import DATA_DIR, settings
from app.core.data_manager import data_manager
from app.core.ai_assistant import AIAssistant

# 导入所有路由
from app.api import questions, quiz, ai, wrong, stats, categories, auth, import_export, papers, paper_compare

# ⚠️ 设置模板目录
templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(templates_dir))

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    print(f"🚀 {settings.PROJECT_NAME} v{settings.VERSION} 正在启动...")
    await data_manager.load_data()
    print(f"📊 已加载 {len(data_manager.questions)} 道题目")
    print(f"❌ 已加载 {len(data_manager.wrong_questions)} 道错题")
    print(f"🏷️  已加载 {len(data_manager.categories.get('subjects', []))} 个学科分类")

    ai_assistant = AIAssistant()
    if ai_assistant.is_available:
        print("🤖 AI批改服务: 可用")
        print(f"  模型: {ai_assistant.client.model}")
    else:
        print("⚠️  AI批改服务: 不可用")

    print("✅ 应用启动完成")
    yield
    print(f"🛑 {settings.PROJECT_NAME} 正在关闭...")
    print("✅ 应用已安全关闭")


# 创建应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# 挂载 images 静态目录（用于访问题目原图）
images_dir = DATA_DIR / "images"
images_dir.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(questions.router, prefix="/api/questions", tags=["题目管理"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["组卷测试"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI批改"])
app.include_router(wrong.router, prefix="/api/wrong", tags=["错题本"])
app.include_router(stats.router, prefix="/api/stats", tags=["统计分析"])
app.include_router(categories.router, prefix="/api/categories", tags=["分类管理"])
app.include_router(auth.router, prefix="/api/auth", tags=["认证管理"])
app.include_router(import_export.router, prefix="/api/import-export", tags=["导入导出"])
app.include_router(papers.router, prefix="/api/papers", tags=["卷子管理"])
app.include_router(paper_compare.router, prefix="/api/paper-compare", tags=["卷子对比"])

# ⚠️ 暴露 templates 以便在路由中使用
app.templates = templates

# ===== 基础端点 =====
@app.get("/")
async def root():
    return {
        "message": "全能题目管理器 API",
        "version": settings.VERSION,
        "docs": "/api/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    """健康检查"""
    ai_assistant = AIAssistant()
    return {
        "status": "healthy",
        "data": {
            "questions_loaded": len(data_manager.questions) > 0,
            "questions_count": len(data_manager.questions),
            "wrong_questions_count": len(data_manager.wrong_questions),
            "categories_loaded": len(data_manager.categories) > 0
        },
        "ai_service": {
            "available": ai_assistant.is_available,
            "model": ai_assistant.client.model if ai_assistant.is_available else None
        }
    }


@app.get("/api/info")
async def api_info():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": settings.DESCRIPTION,
        "endpoints": [
            {"path": "/api/questions", "methods": ["GET", "POST"], "description": "题目管理"},
            {"path": "/api/quiz", "methods": ["POST"], "description": "组卷测试"},
            {"path": "/api/ai", "methods": ["POST"], "description": "AI批改"},
            {"path": "/api/wrong", "methods": ["GET", "POST", "DELETE"], "description": "错题本"},
            {"path": "/api/stats", "methods": ["GET"], "description": "统计分析"},
            {"path": "/api/papers", "methods": ["GET", "POST"], "description": "卷子管理"},
            {"path": "/api/health", "methods": ["GET"], "description": "健康检查"},
            {"path": "/api/docs", "methods": ["GET"], "description": "API文档"}
        ]
    }


# ===== 异常处理 =====
@app.exception_handler(404)
async def not_found_exception_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"code": 404, "message": "资源未找到", "details": str(exc)}
    )


@app.exception_handler(500)
async def internal_exception_handler(request, exc):
    import traceback
    print("=== 500错误详情 ===")
    print(f"路径: {request.url}")
    print(f"错误: {exc}")
    print(traceback.format_exc())
    print("===================")
    return JSONResponse(
        status_code=500,
        content={"code": 500, "message": "服务器内部错误", "details": str(exc)}
    )


@app.exception_handler(422)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"code": 422, "message": "数据验证失败", "details": str(exc)}
    )


# 直接运行（开发模式）
if __name__ == "__main__":
    import uvicorn
    print("🔧 开发模式启动...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"],
        log_level="info"
    )