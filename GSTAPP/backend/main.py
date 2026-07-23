import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, graph, reconciliation, dashboard, fraud
from utils import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

app = FastAPI(title="GST ReconGraph Backend", version="2.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security Headers Middleware ────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── CORS — restrict origins explicitly ────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router,           prefix="/api/auth",           tags=["auth"])
app.include_router(graph.router,          prefix="/api/graph",          tags=["graph"])
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["reconciliation"])
app.include_router(dashboard.router,      prefix="/api/dashboard",      tags=["dashboard"])
app.include_router(fraud.router,          prefix="/api/fraud",          tags=["fraud"])

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve React Frontend Static Files
dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist")

@app.get("/health")
async def health():
    return {"status": "ok"}

if os.path.exists(dist_dir):
    # Mount assets folder
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve other files in dist (e.g. logo.png, etc.) or SPA routing
    @app.get("/{catchall:path}")
    async def serve_spa(catchall: str):
        # Prevent catching API/docs routes
        if catchall.startswith("api/") or catchall.startswith("docs") or catchall.startswith("openapi.json") or catchall == "health":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = os.path.join(dist_dir, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Fallback to index.html for SPA routing
        index_path = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend build files not found")
