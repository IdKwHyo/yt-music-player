from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import yt_dlp
import httpx
import asyncio

# --- FastAPI App Setup ---
app = FastAPI()

# --- CORS Configuration (Your key fix!) ---
# This tells the browser to allow requests from your frontend's origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Your frontend's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Proxy Endpoint (The CORS solution) ---
async def proxy_stream(url: str):
    """Fetches the audio stream from YouTube and streams it back to the client."""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    yield chunk
    except Exception as e:
        print(f"Error in proxy stream: {e}")
        yield b""

@app.get("/api/mobile/play")
async def play_song(id: str = Query(...)):
    """Fetches the actual audio URL from YouTube and returns a proxied URL."""
    ydl_opts = {
        'format': 'bestaudio',
        'quiet': True,
        'extract_flat': False,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
            # Get the 'direct' audio URL from the extracted info
            audio_url = info.get('url')
            if not audio_url:
                # Fallback: find the best audio format
                formats = info.get('formats', [])
                for f in formats:
                    if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        audio_url = f.get('url')
                        break
            
            if not audio_url:
                raise HTTPException(status_code=500, detail="Could not extract audio URL")
            
            # Return a URL that points to our own proxy endpoint
            return {"source": "proxy", "url": f"http://127.0.0.1:5000/proxy/audio?audio_url={audio_url}"}
    except Exception as e:
        print(f"Error in /api/mobile/play: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/proxy/audio")
async def proxy_audio(audio_url: str):
    """The internal proxy endpoint that streams the audio from YouTube."""
    return StreamingResponse(proxy_stream(audio_url), media_type="audio/webm")

# --- Helper function for search (your original one, unchanged) ---
@app.get("/api/mobile/search")
async def search_songs(q: str = Query(...)):
    ydl_opts = {'quiet': True, 'extract_flat': True, 'force_generic_extractor': False}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            results = ydl.extract_info(f"ytsearch10:{q}", download=False)['entries']
        except Exception:
            return []
        tracks = []
        for entry in results or []:
            if entry:
                tracks.append({
                    "id": entry.get('id'),
                    "title": entry.get('title'),
                    "artist": entry.get('uploader', 'Unknown'),
                    "duration": entry.get('duration'),
                    "cover": entry.get('thumbnail')
                })
        return tracks

# --- Implemented Missing Endpoints ---
@app.get("/api/mobile/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/mobile/chart")
async def get_chart():
    """Returns a default chart (e.g., top results for 'Top Tracks Global')"""
    return await search_songs(q="top tracks global")

@app.get("/api/mobile/up_next")
async def get_up_next(song_id: str = Query(...), limit: int = 8):
    """Returns suggested songs based on the current one."""
    # A simple but effective recommendation: search for related music
    search_term = f"music like {song_id} songs"
    results = await search_songs(q=search_term)
    # Format as required by the frontend and limit the results
    return [{"id": r["id"], "title": r["title"], "artist": r["artist"], "duration": r.get("duration")} for r in results[:limit]]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
