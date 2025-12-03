"""
Vercel entry point for FastAPI application
"""
import os
import sys

# Ensure the app directory is in the Python path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from app.main import app
except ImportError as e:
    # Provide helpful error message if import fails
    print(f"Error importing app: {e}", file=sys.stderr)
    raise

# Export the app for Vercel's ASGI handler
# Vercel's @vercel/python builder expects the app to be available as 'app'
__all__ = ["app"]
