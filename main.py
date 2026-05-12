from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import json

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/mobile/search")
async def search(q: str = Query(...)):
    ydl_opts = {'quiet': True, 'extract_flat': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        results = ydl.extract_info(f"ytsearch10:{q}", download=False)['entries']
        
        tracks = []
        for entry in results:
            track = {
                "id": entry['id'],
                "title": entry['title'],
                "artist": entry.get('uploader', 'Unknown'),
                "duration": entry.get('duration'),
                "cover": entry.get('thumbnail')
            }
            tracks.append(track)
        return tracks

@app.get("/api/mobile/play")
async def play(id: str = Query(...)):
    ydl_opts = {'quiet': True, 'format': 'bestaudio'}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
        return {"url": info['url']}
