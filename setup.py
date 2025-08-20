#!/usr/bin/env python3
"""
Setup script for AI Caption Generator
This script helps you configure your environment variables
"""

import os
import sys
from pathlib import Path

def create_env_file():
    """Create .env file with user input"""
    print("🚀 AI Caption Generator Setup")
    print("=" * 40)
    
    # Get project root
    project_root = Path(__file__).parent
    backend_dir = project_root / "backend"
    env_file = backend_dir / ".env"
    
    if env_file.exists():
        print(f"⚠️  .env file already exists at {env_file}")
        response = input("Do you want to overwrite it? (y/N): ").lower()
        if response != 'y':
            print("Setup cancelled.")
            return
    
    print("\n📝 Please provide the following information:")
    
    # Get HF Token
    hf_token = input("Enter your Hugging Face API token: ").strip()
    if not hf_token:
        print("❌ Hugging Face token is required!")
        return
    
    # Get model preference
    print("\n🤖 Choose your preferred model:")
    print("1. GPT-OSS 120B (Recommended)")
    print("2. GPT-OSS 20B")
    print("3. DeepSeek-R1")
    
    model_choice = input("Enter choice (1-3) [default: 1]: ").strip() or "1"
    
    model_map = {
        "1": "openai/gpt-oss-120b:together",
        "2": "openai/gpt-oss-20b:together", 
        "3": "deepseek-ai/DeepSeek-R1:fireworks-ai"
    }
    
    selected_model = model_map.get(model_choice, "openai/gpt-oss-120b:together")
    
    # Create .env content
    env_content = f"""# Hugging Face API Configuration
HF_TOKEN={hf_token}
HF_GPT_OSS_MODEL={selected_model}

# Note: This file contains sensitive information and should not be committed to git
"""
    
    # Ensure backend directory exists
    backend_dir.mkdir(exist_ok=True)
    
    # Write .env file
    try:
        with open(env_file, 'w') as f:
            f.write(env_content)
        print(f"\n✅ .env file created successfully at {env_file}")
        print(f"🤖 Selected model: {selected_model}")
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return
    
    print("\n🔒 Security Note:")
    print("- The .env file is already added to .gitignore")
    print("- Never commit this file to version control")
    print("- Keep your API token secure")
    
    print("\n🚀 Next Steps:")
    print("1. cd backend")
    print("2. pip install -r requirements.txt")
    print("3. uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print("\n4. In another terminal, cd frontend && npm install && npm run dev")

if __name__ == "__main__":
    try:
        create_env_file()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)
