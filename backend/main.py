import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import auth

app = FastAPI(title="GST ReconGraph Backend")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# Mount static files
dist_path = os.path.join(os.path.dirname(__file__), "..", "dist")

if os.path.exists(dist_path):
    # Mount the assets directory (js, css, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    # Serve the index.html for all other routes to support React Router
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow requests to /api to 404 naturally if not caught by include_router
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "FastAPI backend is running (React frontend not built)"}
