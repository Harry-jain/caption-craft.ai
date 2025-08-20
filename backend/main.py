from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import shutil
import os
import uuid
import base64
import json
import re
import hashlib
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv
from openai import OpenAI

app = FastAPI()

load_dotenv()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
HISTORY_FILE = "history.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)

OLLAMA_URL = "http://localhost:11434/api/generate"
LLAVA_MODEL = "llava:7b"

# Hugging Face Router API configuration for GPT-OSS models
HF_ROUTER_URL = "https://router.huggingface.co/v1"
HF_GPT_OSS_MODEL = os.getenv("HF_GPT_OSS_MODEL", "openai/gpt-oss-120b:together")
HF_TOKEN = os.getenv("HF_TOKEN")

VISION_PROMPT = (
    "Look at this image and describe it in a detailed and insightful way. Go beyond literal descriptions—capture the emotion, atmosphere, and what the moment might feel like. "
    "Mention people, expressions, scenery, actions, and overall vibe, but avoid guessing or reasoning. Just describe what’s there vividly and neutrally. "
    "Avoid phrases like 'I think', 'maybe', or 'it seems'. Present your output as a JSON with keys such as 'people', 'emotion', 'setting', 'actions', and 'overall_vibe'. "
    "The full output should be at least 400 words."
)
CAPTION_PROMPT = (
    "You are a caption writing assistant. First, reflect privately about the best angles for the requested platform, then write 5 distinct caption types.\n\n"
    "CRITICAL: Put your private reasoning ONLY between <think> and </think>. After </think>, output exactly 5 captions in the format below.\n\n"
    "Platform tone: {tone_instructions}\n\n"
    "Image description: {summary}\n\n"
    "Output format (exactly this):\n"
    "<think>your step-by-step reasoning about how to adapt captions for this specific platform</think>\n"
    "SHORT: your concise, punchy caption with relevant hashtags\n"
    "STORY: your narrative, storytelling caption with hashtags\n"
    "PHILOSOPHY: your deep, thought-provoking caption with hashtags\n"
    "LIFESTYLE: your aspirational, lifestyle-focused caption with hashtags\n"
    "QUOTE: your inspirational quote-style caption with hashtags\n\n"
    "Rules: Do not use markdown. Keep reasoning strictly inside <think> tags. Each caption must be distinctly different in style and approach."
)

def _tone_to_instructions(tone: str | None) -> str:
    if not tone:
        return (
            "General social media style. Create 5 distinctly different caption approaches: punchy, narrative, philosophical, aspirational, and inspirational."
        )
    tone_lower = tone.lower()
    if tone_lower == "instagram":
        return "Instagram style: Create 5 distinctly different captions - trendy/punchy, storytelling, philosophical, lifestyle/aspirational, and inspirational/quote-style. Use emojis strategically, focus on aesthetics and trends, include strong hashtags. Each caption should feel unique and capture different moods."
    if tone_lower == "facebook":
        return "Facebook style: Create 5 distinctly different captions - engaging, narrative/storytelling, thoughtful, community-focused, and motivational. Use conversational tone, relatable language, community-oriented hashtags. Each caption should feel personal and encourage interaction."
    if tone_lower == "linkedin":
        return "LinkedIn style: Create 5 distinctly different captions - professional, insightful, thought-leadership, career-focused, and inspirational. Use professional language, industry insights, value-driven content, relevant hashtags. Each caption should demonstrate expertise and professional growth."
    return "General social media style. Create 5 distinctly different caption approaches: punchy, narrative, philosophical, aspirational, and inspirational."

def load_history() -> List[Dict[str, Any]]:
    """Load history from JSON file"""
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading history: {e}")
    return []

def save_history(history: List[Dict[str, Any]]):
    """Save history to JSON file"""
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving history: {e}")

def calculate_image_hash(image_data: bytes) -> str:
    """Calculate SHA-256 hash of image data"""
    return hashlib.sha256(image_data).hexdigest()

def find_duplicate_image(image_hash: str) -> Dict[str, Any] | None:
    """Find duplicate image in history by hash"""
    history = load_history()
    for entry in history:
        if entry.get("image_hash") == image_hash:
            return entry
    return None

def add_to_history(image_name: str, description: str, caption: str, think: str = None, image_hash: str = None):
    """Add a new entry to history"""
    history = load_history()
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "image_name": image_name,
        "description": description,
        "caption": caption,
        "think": think,
        "image_hash": image_hash
    }
    history.append(entry)
    # Keep only last 50 entries
    if len(history) > 50:
        history = history[-50:]
    save_history(history)

def clean_summary(text: str) -> str:
    import re
    patterns = [
        r"It appears[\w\W]*?\. ",
        r"It appears[\w\W]*?\. ",
        r"It seems[\w\W]*?\. ",
        r"Maybe[\w\W]*?\. ",
        r"Probably[\w\W]*?\. ",
        r"[Ii]t looks like[\w\W]*?\. ",
        r"[Ii]t is possible[\w\W]*?\. ",
        r"[Ii]t could be[\w\W]*?\. ",
        r"[Ii]n my opinion[\w\W]*?\. ",
        r"[Ii] think[\w\W]*?\. ",
        r"[Ii] believe[\w\W]*?\. ",
        r"[Ii] guess[\w\W]*?\. ",
        r"[Ii] suppose[\w\W]*?\. ",
        r"[Ii] would say[\w\W]*?\. ",
        r"[Ii]magine[\w\W]*?\. ",
        r"[Pp]erhaps[\w\W]*?\. ",
        r"[Ff]iller text[\w\W]*?\. ",
        r"[Ss]peculative reasoning[\w\W]*?\. ",
    ]
    for pat in patterns:
        text = re.sub(pat, '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def generate_caption(summary: str, tone: str | None = None, model_id_override: str | None = None) -> dict:
    """Generate caption using Hugging Face Router API with OpenAI client for GPT-OSS or DeepSeek models."""
    try:
        model_to_use = model_id_override or HF_GPT_OSS_MODEL
        print(f"Generating caption (HF Router {model_to_use}) for summary: {summary[:100]}...")

        if not HF_TOKEN:
            return {"error": "HF_TOKEN not set in environment.", "success": False}

        # Initialize OpenAI client with HF Router
        client = OpenAI(
            base_url=HF_ROUTER_URL,
            api_key=HF_TOKEN,
        )

        tone_instructions = _tone_to_instructions(tone)
        prompt = CAPTION_PROMPT.format(summary=summary, tone_instructions=tone_instructions)

        # Use OpenAI chat completion format
        completion = client.chat.completions.create(
            model=model_to_use,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=512,
            temperature=0.7,
            top_p=0.95,
            timeout=120
        )

        caption_text = completion.choices[0].message.content
        print(f"Generated caption text: {caption_text[:200]}...")

        # Extract thinking process
        think_match = re.search(r'<think>([\s\S]*?)</think>', caption_text, re.IGNORECASE)
        think = think_match.group(1).strip() if think_match else ""

        # Remove thinking process from caption text for parsing
        if think_match:
            caption_text = caption_text.replace(think_match.group(0), '').strip()

        # Parse the different caption styles
        captions = {
            "short": "",
            "story": "",
            "philosophy": "",
            "lifestyle": "",
            "quote": ""
        }

        # Clean up the text first
        caption_text = re.sub(r'\*\*([^*]+)\*\*:', r'\1:', caption_text)  # Remove bold formatting
        caption_text = re.sub(r'\*([^*]+)\*', r'\1', caption_text)  # Remove italic formatting
        caption_text = re.sub(r'undefined', '', caption_text)  # Remove undefined text

        # Extract captions based on the format
        lines = caption_text.split('\n')
        current_style = None

        for line in lines:
            line = line.strip()
            if line.startswith("SHORT:"):
                current_style = "short"
                captions["short"] = line.replace("SHORT:", "").strip()
            elif line.startswith("STORY:"):
                current_style = "story"
                captions["story"] = line.replace("STORY:", "").strip()
            elif line.startswith("STORYTelling:"):
                current_style = "story"
                captions["story"] = line.replace("STORYTelling:", "").strip()
            elif line.startswith("PHILOSOPHY:"):
                current_style = "philosophy"
                captions["philosophy"] = line.replace("PHILOSOPHY:", "").strip()
            elif line.startswith("LIFESTYLE:"):
                current_style = "lifestyle"
                captions["lifestyle"] = line.replace("LIFESTYLE:", "").strip()
            elif line.startswith("QUOTE:"):
                current_style = "quote"
                captions["quote"] = line.replace("QUOTE:", "").strip()
            elif current_style and line and not line.startswith("**") and not line.startswith("*"):
                captions[current_style] += " " + line

        # If no structured captions found, create simple ones
        if not any(captions.values()):
            print("No structured captions found, creating simple captions")
            clean_text = re.sub(r'<[^>]+>', '', caption_text).strip()
            clean_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean_text)
            clean_text = re.sub(r'\*([^*]+)\*', r'\1', clean_text)
            clean_text = re.sub(r'undefined', '', clean_text)
            captions["short"] = clean_text[:200] + "..." if len(clean_text) > 200 else clean_text

        print(f"Final captions: {captions}")

        return {
            "captions": captions,
            "think": think,
            "success": True
        }

    except Exception as e:
        print(f"Exception in generate_caption: {str(e)}")
        # Fallback: simple captions
        try:
            print("Attempting fallback caption generation...")
            fallback_captions = {
                "short": f"Capturing moments in {summary[:50]}... #Life #Moments #Joy",
                "story": f"Every journey tells a story. This moment captures the essence of {summary[:30]}... #Story #Journey #Life",
                "philosophy": f"Life is about finding beauty in simple moments. {summary[:40]}... #Philosophy #Life #Beauty",
                "lifestyle": f"Living life to the fullest. {summary[:35]}... #Lifestyle #Living #Adventure",
                "quote": f"Inspiration found in {summary[:40]}... #Inspiration #Motivation #Life"
            }

            return {
                "captions": fallback_captions,
                "think": "Generated fallback captions due to model error",
                "success": True
            }
        except Exception as fallback_error:
            print(f"Fallback also failed: {str(fallback_error)}")
            return {"error": f"Caption generation failed: {str(e)}", "success": False}

@app.get("/api/history")
async def get_history():
    """Get all history entries"""
    history = load_history()
    return {"history": history}

@app.get("/api/history/{entry_id}")
async def get_history_entry(entry_id: str):
    """Get a specific history entry"""
    history = load_history()
    entry = next((entry for entry in history if entry["id"] == entry_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")
    return entry

@app.delete("/api/history/{entry_id}")
async def delete_history_entry(entry_id: str):
    """Delete a specific history entry"""
    history = load_history()
    history = [entry for entry in history if entry["id"] != entry_id]
    save_history(history)
    return {"message": "Entry deleted successfully"}

@app.delete("/api/history")
async def clear_history():
    """Clear all history"""
    save_history([])
    return {"message": "History cleared successfully"}

@app.post("/api/describe")
async def describe_image(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only JPG/PNG images are supported.")
    
    # Read file content for hash calculation
    file_content = await file.read()
    image_hash = calculate_image_hash(file_content)
    
    # Check for duplicate image
    duplicate_entry = find_duplicate_image(image_hash)
    if duplicate_entry:
        return {
            "description": duplicate_entry["description"],
            "image_hash": image_hash,
            "is_duplicate": True,
            "original_timestamp": duplicate_entry["timestamp"]
        }
    
    # Save file for processing
    file_id = str(uuid.uuid4())
    ext = ".jpg" if file.content_type == "image/jpeg" else ".png"
    file_path = os.path.join(UPLOAD_DIR, file_id + ext)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    with open(file_path, "rb") as img_f:
        img_b64 = base64.b64encode(img_f.read()).decode()
    
    ollama_payload = {
        "model": LLAVA_MODEL,
        "prompt": VISION_PROMPT,
        "images": [img_b64]
    }
    
    try:
        ollama_resp = requests.post(OLLAMA_URL, json=ollama_payload, timeout=60, stream=True)
        ollama_resp.raise_for_status()
        description = ""
        for line in ollama_resp.iter_lines():
            if line:
                try:
                    chunk = json.loads(line.decode("utf-8"))
                    description += chunk.get("response", "")
                except Exception:
                    continue
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Ollama error: {str(e)}"})
    
    try:
        os.remove(file_path)
    except Exception:
        pass
    
    cleaned_summary = clean_summary(description)
    return {"description": cleaned_summary, "is_duplicate": False}

@app.post("/api/caption")
async def generate_caption_endpoint(data: dict = Body(...)):
    description = data.get("description", "")
    image_name = data.get("image_name", "Unknown Image")
    image_hash = data.get("image_hash", None)
    tone = data.get("tone", None)
    model_id = data.get("model_id", None)
    if not description:
        raise HTTPException(status_code=400, detail="Description is required.")
    
    # Call the generate_caption function
    caption_result = generate_caption(description, tone, model_id_override=model_id)
    
    if caption_result.get("success"):
        captions = caption_result["captions"]
        think_text = caption_result["think"]
        
        # Truncate captions
        short_caption = captions.get("short", "").strip()
        if len(short_caption) > 180:
            short_caption = short_caption[:180] + '...'
        
        # Add to history
        add_to_history(image_name, description, short_caption, think_text, image_hash)
        
        return {"caption": captions, "think": think_text}
    else:
        return JSONResponse(status_code=500, content={"error": caption_result["error"]})
