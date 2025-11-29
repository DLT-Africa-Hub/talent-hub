"""
Vercel entry point for FastAPI application
"""
from app.main import app

# Export the app for Vercel
__all__ = ["app"]
