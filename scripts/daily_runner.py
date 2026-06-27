"""
Daily Problem Solver Runner
----------------------------
Uses Gemini API (google-genai SDK) to:
1. Identify a genuine real-world developer problem
2. Design and generate a full micro-product (SPA)
3. Write all source files into products/<product-name>/
4. Update the main README.md log with the new entry
"""

import os
import re
import json
import time
import datetime
import pathlib
from google import genai
from google.genai import types

# ─── Config ───────────────────────────────────────────────────────────────────
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
PRODUCTS_DIR = REPO_ROOT / "products"
README_PATH = REPO_ROOT / "README.md"
TODAY = datetime.date.today().isoformat()

# Use gemini-2.0-flash-lite — best free tier support, no grounding needed
MODEL = "gemini-2.0-flash-lite"

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


# ─── Helper: call API with simple retry ───────────────────────────────────────
def call_model(prompt, temperature=0.7, max_tokens=8000):
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )
            return response.text
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                wait = 60 * (attempt + 1)
                print(f"   ⏳ Rate limited. Waiting {wait}s before retry {attempt + 2}/3...")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError("All retries failed.")


# ─── Step 1: Identify a genuine problem ───────────────────────────────────────
def research_problem():
    print("🔍 Step 1: Identifying a real-world problem...")

    prompt = f"""Today is {TODAY}. You are a sharp product researcher who reads Reddit, 
Hacker News, and dev forums daily.

Identify ONE genuine, specific pain point that developers or tech-savvy users face.

Rules:
- Must be REAL and specific (not vague like "debugging is hard")
- Must be solvable by a single-page web app (HTML/CSS/JS)
- Must NOT already have a perfect, widely-known FREE tool for it
- Must be something that would take a developer 1-3 days to build

Return ONLY this JSON (no markdown, no extra text):
{{
  "problem_title": "Short title",
  "problem_description": "1-2 sentence description of the pain point",
  "target_users": "Who faces this problem",
  "product_name": "kebab-case-product-name",
  "product_tagline": "One-line catchy tagline",
  "solution_summary": "How the product solves it in 2-3 sentences"
}}"""

    raw = call_model(prompt, temperature=0.8)
    raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
    raw = re.sub(r"\n?```$", "", raw)

    json_match = re.search(r'\{[\s\S]*\}', raw)
    if not json_match:
        raise ValueError(f"No JSON found in response:\n{raw[:400]}")

    data = json.loads(json_match.group())
    print(f"✅ Problem: {data['problem_title']}")
    print(f"   Product: {data['product_name']} — {data['product_tagline']}")
    return data


# ─── Step 2: Generate the full product codebase ───────────────────────────────
def generate_product(p):
    print(f"\n🏗️  Step 2: Building '{p['product_name']}'...")

    prompt = f"""You are an expert front-end developer. Build a complete, polished micro-product.

PROBLEM: {p['problem_description']}
USERS: {p['target_users']}
PRODUCT: {p['product_name']}
TAGLINE: {p['product_tagline']}
SOLUTION: {p['solution_summary']}

Output exactly 4 files using this format (no extra text before or after):

===FILE: README.md===
(Full markdown: problem, solution, features, how to use)

===FILE: index.html===
(Complete HTML5 linking style.css and app.js)

===FILE: style.css===
(Full CSS: dark mode, glassmorphism, HSL gradients, Google Fonts, animations, responsive)

===FILE: app.js===
(Full vanilla JS: all features working, well-commented, no placeholders)

DESIGN RULES (mandatory):
- Dark background color (#0a0b10 or similar dark)
- Glassmorphic cards (backdrop-filter: blur + rgba border)
- Google Fonts loaded via @import (Inter, Outfit, or Fira Code)
- HSL gradient accents — NO plain red/blue/green
- Hover animations + smooth transitions
- Fully responsive (mobile + desktop)
- Every feature must actually work — zero TODO comments
- Premium look that WOWs a developer instantly"""

    return call_model(prompt, temperature=0.75, max_tokens=8000)


# ─── Step 3: Parse generated files ────────────────────────────────────────────
def parse_files(raw):
    print("📂 Step 3: Parsing generated files...")
    files = {}
    matches = re.findall(r"===FILE:\s*(.+?)===(.*?)(?====FILE:|\Z)", raw, re.DOTALL)
    for name, content in matches:
        name = name.strip()
        files[name] = content.strip()
        print(f"   ✓ {name} ({len(files[name])} chars)")
    return files


# ─── Step 4: Write files to disk ──────────────────────────────────────────────
def write_files(product_name, files):
    print(f"\n💾 Step 4: Writing files...")
    d = PRODUCTS_DIR / product_name
    d.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        (d / name).write_text(content, encoding="utf-8")
        print(f"   ✓ products/{product_name}/{name}")


# ─── Step 5: Update README ────────────────────────────────────────────────────
def update_readme(p):
    print("\n📝 Step 5: Updating README...")
    name = p['product_name']
    entry = f"\n{TODAY} | **[{name}](products/{name}/index.html)** — _{p['product_tagline']}_ | Solves: {p['problem_title']}"
    content = README_PATH.read_text(encoding="utf-8")
    if "## Daily Products Log" in content:
        content = content.replace("## Daily Products Log", f"## Daily Products Log{entry}")
    else:
        content += f"\n\n## Daily Products Log{entry}\n"
    README_PATH.write_text(content, encoding="utf-8")
    print(f"   ✓ README updated")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print(f"🚀 Daily Problem Solver — {TODAY}")
    print("=" * 60)

    try:
        p = research_problem()

        raw = generate_product(p)
        files = parse_files(raw)

        if not files or "index.html" not in files:
            raise ValueError("index.html missing from generated output. Aborting.")

        write_files(p['product_name'], files)
        update_readme(p)

        print("\n" + "=" * 60)
        print(f"✅ Done! '{p['product_name']}' is live on GitHub.")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise


if __name__ == "__main__":
    main()
