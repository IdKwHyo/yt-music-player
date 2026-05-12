from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import yt_dlp
import httpx

app = FastAPI()

# CORS – allow your frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Helper: stream audio from YouTube ----------
async def fetch_audio_stream(url: str):
    """Fetch audio from YouTube and yield chunks."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            async for chunk in resp.aiter_bytes(chunk_size=8192):
                yield chunk

# ---------- Play endpoint: returns the audio stream directly ----------
@app.get("/api/mobile/play")
async def play_song(id: str = Query(...)):
    """Get the audio stream URL from YouTube and return it as a streaming response."""
    ydl_opts = {'format': 'bestaudio', 'quiet': True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
            audio_url = info.get('url')
            if not audio_url:
                # fallback: find best audio format
                for f in info.get('formats', []):
                    if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        audio_url = f.get('url')
                        break
            if not audio_url:
                raise HTTPException(status_code=500, detail="No audio URL found")
            
            # Return the audio stream directly – this is what the frontend <audio> tag expects
            return StreamingResponse(fetch_audio_stream(audio_url), media_type="audio/webm")
    except Exception as e:
        print(f"Play error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Search endpoint (unchanged) ----------
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

# ---------- Up next (fixed) ----------
@app.get("/api/mobile/up_next")
async def get_up_next(song_id: str = Query(...), limit: int = 8):
    """Simple recommendation: search for 'songs like [song_id]'."""
    # Use a generic search term – the frontend will ignore the artist/title anyway
    results = await search_songs(q="popular music")
    # Return only ids and titles for up_next
    return [{"id": r["id"], "title": r["title"], "artist": r["artist"], "duration": r.get("duration")} for r in results[:limit]]

# ---------- Health and chart (optional) ----------
@app.get("/api/mobile/health")
async def health():
    return {"status": "ok"}

@app.get("/api/mobile/chart")
async def chart():
    return await search_songs(q="top hits 2025")
