"""
Daily Problem Solver Runner
----------------------------
Uses Gemini API to:
1. Research a genuine real-world problem from developer/tech communities
2. Design and generate a full micro-product (SPA, utility, or CLI tool)
3. Write all source files into products/<product-name>/
4. Update the main README.md log with the new entry
"""

import os
import re
import json
import datetime
import pathlib
import textwrap
import google.generativeai as genai

# ─── Config ───────────────────────────────────────────────────────────────────
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
PRODUCTS_DIR = REPO_ROOT / "products"
README_PATH = REPO_ROOT / "README.md"
TODAY = datetime.date.today().isoformat()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# ─── Step 1: Research a genuine problem ───────────────────────────────────────
def research_problem():
    print("🔍 Step 1: Searching for a real-world problem...")
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        tools="google_search_retrieval"
    )

    response = model.generate_content(
        """Search Reddit, Hacker News, and developer forums for a genuine, real-world frustration 
        that developers or tech-savvy users face TODAY. 

        Requirements:
        - Must be a REAL, specific pain point (not vague)
        - Must be solvable by a lightweight web app, CLI tool, or utility
        - Must NOT already have a perfect, widely-known free solution
        - Something that would take a developer 1–3 days to build manually

        Return ONLY a JSON object with these exact keys (no markdown, no explanation):
        {
          "problem_title": "Short title of the problem",
          "problem_description": "1–2 sentence description of the pain point",
          "target_users": "Who faces this problem",
          "product_name": "kebab-case-name-for-the-product",
          "product_tagline": "One-line catchy tagline for the product",
          "product_type": "spa|cli|utility",
          "solution_summary": "How the product solves this problem in 2-3 sentences"
        }"""
    )

    raw = response.text.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    data = json.loads(raw)
    print(f"✅ Problem found: {data['problem_title']}")
    print(f"   Product: {data['product_name']} — {data['product_tagline']}")
    return data


# ─── Step 2: Generate the full product codebase ───────────────────────────────
def generate_product(problem_data):
    print(f"\n🏗️  Step 2: Building product '{problem_data['product_name']}'...")
    model = genai.GenerativeModel(model_name="gemini-1.5-pro")

    prompt = f"""
You are an expert front-end developer and product designer.

Build a complete, production-quality micro-product based on the following:

PROBLEM: {problem_data['problem_description']}
TARGET USERS: {problem_data['target_users']}
PRODUCT NAME: {problem_data['product_name']}
TAGLINE: {problem_data['product_tagline']}
SOLUTION: {problem_data['solution_summary']}

Generate ALL files for this product. Use this EXACT output format with file delimiters:

===FILE: README.md===
(Full markdown README with problem, solution, features, how to use)

===FILE: index.html===
(Complete, self-contained HTML5 file with semantic structure)

===FILE: style.css===
(Complete CSS — dark mode, glassmorphism, HSL colors, responsive, animations, Google Fonts)

===FILE: app.js===
(Complete JavaScript — no frameworks, vanilla JS, full functionality, comments)

DESIGN REQUIREMENTS (mandatory):
- Dark mode theme with glassmorphism panels
- Use Google Fonts (Inter, Outfit, or Fira Code)
- Smooth hover animations and micro-interactions
- Vibrant gradient accents using HSL colors (avoid plain red/blue/green)
- Fully responsive layout (mobile + desktop)
- Completely functional — no placeholder features, no TODO comments
- Premium, polished look that would WOW a developer
- All features must actually work using pure HTML/CSS/JS

Output ONLY the file blocks. No intro text, no explanations outside the file blocks.
"""

    response = model.generate_content(prompt)
    return response.text


# ─── Step 3: Parse generated files ────────────────────────────────────────────
def parse_files(raw_output):
    print("📂 Step 3: Parsing generated files...")
    files = {}
    pattern = r"===FILE:\s*(.+?)===(.*?)(?====FILE:|\Z)"
    matches = re.findall(pattern, raw_output, re.DOTALL)

    for filename, content in matches:
        filename = filename.strip()
        content = content.strip()
        files[filename] = content
        print(f"   ✓ Parsed: {filename} ({len(content)} chars)")

    return files


# ─── Step 4: Write files to disk ──────────────────────────────────────────────
def write_product_files(product_name, files):
    print(f"\n💾 Step 4: Writing files to products/{product_name}/...")
    product_dir = PRODUCTS_DIR / product_name
    product_dir.mkdir(parents=True, exist_ok=True)

    for filename, content in files.items():
        filepath = product_dir / filename
        filepath.write_text(content, encoding="utf-8")
        print(f"   ✓ Written: {filepath.relative_to(REPO_ROOT)}")

    return product_dir


# ─── Step 5: Update main README.md log ────────────────────────────────────────
def update_readme(problem_data):
    print("\n📝 Step 5: Updating main README.md log...")
    product_name = problem_data["product_name"]
    tagline = problem_data["product_tagline"]
    problem = problem_data["problem_title"]

    readme_content = README_PATH.read_text(encoding="utf-8")

    # Find the daily products log section and append
    new_entry = f"\n1. **[{product_name}](products/{product_name}/index.html)** ({TODAY}) — _{tagline}_ | Solves: {problem}"

    if "## Daily Products Log" in readme_content:
        # Insert after the section header
        readme_content = readme_content.replace(
            "## Daily Products Log",
            f"## Daily Products Log{new_entry}"
        )
    else:
        readme_content += f"\n\n## Daily Products Log{new_entry}\n"

    README_PATH.write_text(readme_content, encoding="utf-8")
    print(f"   ✓ README updated with: {product_name}")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print(f"🚀 Daily Problem Solver — {TODAY}")
    print("=" * 60)

    try:
        # Step 1: Research
        problem_data = research_problem()

        # Step 2: Generate product code
        raw_output = generate_product(problem_data)

        # Step 3: Parse files
        files = parse_files(raw_output)

        if not files:
            raise ValueError("No files were parsed from the generated output. Aborting.")

        # Ensure at least index.html exists
        if "index.html" not in files:
            raise ValueError("index.html was not generated. Aborting.")

        # Step 4: Write files
        write_product_files(problem_data["product_name"], files)

        # Step 5: Update README
        update_readme(problem_data)

        print("\n" + "=" * 60)
        print(f"✅ SUCCESS! Product '{problem_data['product_name']}' built and ready to push.")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise


if __name__ == "__main__":
    main()
