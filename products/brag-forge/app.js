// Global State
let achievements = [
    {
        id: "1",
        title: "Integrated OAuth2 login flow with security headers",
        category: "feat",
        metric: "35% faster authentication",
        situation: "User login latency was over 1.2 seconds, causing sign-in drops.",
        task: "Redesign the OAuth callback routes and implement token caching.",
        action: "Used Redis to cache session states, replaced blocking database calls, and added standard helmet security headers.",
        result: "Reduced average login time from 1.2s to 780ms (35% speedup) and mitigated token validation vulnerabilities."
    },
    {
        id: "2",
        title: "Optimized database indexes on hot transaction tables",
        category: "perf",
        metric: "40% database latency reduction",
        situation: "The dashboard transaction query was timing out under heavy peak loads.",
        task: "Optimize database queries and clean up redundant table scans.",
        action: "Analyzed query execution plans, consolidated composite indexes, and rewrote slow nested subqueries.",
        result: "Reduced transaction load time by 40% and eliminated timeout errors entirely."
    },
    {
        id: "3",
        title: "Resolved memory leak in WebSocket connection pool manager",
        category: "fix",
        metric: "Zero socket crashes in production",
        situation: "Socket servers crashed daily due to progressive memory growth.",
        task: "Profile memory allocation and identify unreleased client references.",
        action: "Added explicit garbage collection triggers, cleaned up event listeners on socket disconnects, and implemented automatic connection heartbeats.",
        result: "Stabilized memory usage over 7 days, eliminating server restarts and maintaining 100% socket uptime."
    }
];

let selectedId = null;

// DOM Elements loaded
document.addEventListener("DOMContentLoaded", () => {
    renderAchievements();
    renderPreview();
});

// Tab Navigation
function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

    if (tabName === 'parse') {
        document.getElementById("btn-tab-parse").classList.add("active");
        document.getElementById("tab-parse-content").classList.add("active");
    } else {
        document.getElementById("btn-tab-manual").classList.add("active");
        document.getElementById("tab-manual-content").classList.add("active");
    }
}

// Git Log Regex Parser
function handleParseLogs() {
    const rawInput = document.getElementById("git-log-input").value.trim();
    if (!rawInput) {
        alert("Please paste some commit messages first.");
        return;
    }

    const lines = rawInput.split('\n');
    let parsedCount = 0;

    lines.forEach(line => {
        const cleanLine = line.replace(/^[a-f0-9]{7,40}\s+/, '').trim(); // strip git commit hash if present
        if (!cleanLine) return;

        // Pattern matching for conventional commits: prefix(scope): description
        const conventionalMatch = cleanLine.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.*)$/);
        
        let category = 'other';
        let title = cleanLine;
        
        if (conventionalMatch) {
            const prefix = conventionalMatch[1].toLowerCase();
            const scope = conventionalMatch[2];
            const msg = conventionalMatch[3];

            title = scope ? `[${scope}] ${msg}` : msg;

            if (['feat', 'feature'].includes(prefix)) category = 'feat';
            else if (['fix', 'bugfix'].includes(prefix)) category = 'fix';
            else if (['perf', 'performance'].includes(prefix)) category = 'perf';
            else if (['refactor', 'clean'].includes(prefix)) category = 'refactor';
            else if (['docs', 'test', 'testing'].includes(prefix)) category = 'docs';
        } else {
            // General text classification fallback
            const lowerLine = cleanLine.toLowerCase();
            if (lowerLine.includes('fix') || lowerLine.includes('bug') || lowerLine.includes('solve')) category = 'fix';
            else if (lowerLine.includes('add') || lowerLine.includes('create') || lowerLine.includes('implement')) category = 'feat';
            else if (lowerLine.includes('optimize') || lowerLine.includes('speed') || lowerLine.includes('fast')) category = 'perf';
            else if (lowerLine.includes('clean') || lowerLine.includes('refactor')) category = 'refactor';
            else if (lowerLine.includes('document') || lowerLine.includes('test')) category = 'docs';
        }

        // Try parsing metrics (e.g. 50%, 10x, 2 hours, reduce)
        const metricMatch = cleanLine.match(/(\d+(?:\.\d+)?%\s*(?:reduction|increase|faster|boost)?|\d+\s*(?:hrs|hours|days|x))/i);
        let metric = metricMatch ? metricMatch[1] : '';

        // Add to state
        achievements.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            title: title.charAt(0).toUpperCase() + title.slice(1),
            category: category,
            metric: metric,
            situation: '',
            task: '',
            action: '',
            result: metric ? `Achieved a ${metric} improvement.` : ''
        });
        parsedCount++;
    });

    // Clear input
    document.getElementById("git-log-input").value = '';
    
    // Switch to manual tab to show achievements list
    renderAchievements();
    renderPreview();
    showToast(`Successfully parsed ${parsedCount} items!`);
}

// Manual Form Submit
function handleManualSubmit(e) {
    e.preventDefault();
    const titleInput = document.getElementById("manual-title");
    const categoryInput = document.getElementById("manual-category");
    const metricInput = document.getElementById("manual-metric");

    const newAchievement = {
        id: Date.now().toString(),
        title: titleInput.value.trim(),
        category: categoryInput.value,
        metric: metricInput.value.trim(),
        situation: '',
        task: '',
        action: '',
        result: metricInput.value.trim() ? `Successfully achieved ${metricInput.value.trim()}.` : ''
    };

    achievements.push(newAchievement);
    
    // Reset form
    titleInput.value = '';
    metricInput.value = '';
    
    renderAchievements();
    renderPreview();
    showToast("Achievement added!");
}

// Render Achievements Board
function renderAchievements() {
    const listContainer = document.getElementById("achievements-list");
    const countSpan = document.getElementById("achievement-count");
    
    countSpan.textContent = achievements.length;

    if (achievements.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-list-state">
                <span class="empty-icon">📭</span>
                <p>No achievements added yet. Paste git logs or add one manually above.</p>
            </div>
        `;
        hideStarEditor();
        return;
    }

    listContainer.innerHTML = '';
    achievements.forEach(item => {
        const div = document.createElement("div");
        div.className = `achievement-item ${selectedId === item.id ? 'selected' : ''}`;
        div.onclick = () => selectAchievement(item.id);

        div.innerHTML = `
            <div class="item-left">
                <span class="badge badge-${item.category}">${item.category}</span>
            </div>
            <div class="item-mid">
                <div class="item-title">${item.title}</div>
                ${item.metric ? `
                    <div class="item-metric-row">
                        <span class="item-metric">📈 ${item.metric}</span>
                    </div>
                ` : ''}
            </div>
            <div class="item-right">
                <button class="btn-icon btn-delete" onclick="deleteAchievement(event, '${item.id}')" title="Delete">🗑️</button>
            </div>
        `;
        listContainer.appendChild(div);
    });
}

// Select Achievement
function selectAchievement(id) {
    selectedId = id;
    renderAchievements();
    
    const item = achievements.find(a => a.id === id);
    if (!item) return;

    // Show and populate STAR editor
    const container = document.getElementById("star-editor-container");
    container.classList.remove("hidden");

    document.getElementById("star-selected-title").textContent = item.title;
    document.getElementById("star-situation").value = item.situation || '';
    document.getElementById("star-task").value = item.task || '';
    document.getElementById("star-action").value = item.action || '';
    document.getElementById("star-result").value = item.result || '';
}

// Hide STAR Editor
function hideStarEditor() {
    selectedId = null;
    document.getElementById("star-editor-container").classList.add("hidden");
}

// Save STAR Details
function saveStarDetails() {
    if (!selectedId) return;

    const itemIndex = achievements.findIndex(a => a.id === selectedId);
    if (itemIndex === -1) return;

    achievements[itemIndex].situation = document.getElementById("star-situation").value.trim();
    achievements[itemIndex].task = document.getElementById("star-task").value.trim();
    achievements[itemIndex].action = document.getElementById("star-action").value.trim();
    achievements[itemIndex].result = document.getElementById("star-result").value.trim();

    showToast("STAR details saved!");
    renderPreview();
}

// Delete Achievement
function deleteAchievement(e, id) {
    e.stopPropagation();
    achievements = achievements.filter(a => a.id !== id);
    if (selectedId === id) {
        hideStarEditor();
    }
    renderAchievements();
    renderPreview();
    showToast("Item deleted");
}

// Clear All Achievements
function clearAllAchievements() {
    if (confirm("Are you sure you want to delete all accomplishments?")) {
        achievements = [];
        hideStarEditor();
        renderAchievements();
        renderPreview();
    }
}

// Render preview in Selected Template style
function renderPreview() {
    const previewContainer = document.getElementById("preview-output");
    const templateStyle = document.getElementById("select-template").value;

    if (achievements.length === 0) {
        previewContainer.innerHTML = `<p style="color: var(--text-dim); font-style: italic; text-align: center; margin-top: 4rem;">Add tasks to generate your preview...</p>`;
        return;
    }

    let html = '';

    if (templateStyle === 'brag') {
        // Group by category
        const groups = {};
        achievements.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });

        const categoryNames = {
            feat: 'Features & Product Development',
            fix: 'Bugs Resolved & Quality Assurance',
            perf: 'Performance Optimizations',
            refactor: 'Codebase Refactoring & Architecture',
            docs: 'Documentation & Testing Frameworks',
            other: 'Operations & General Support'
        };

        for (const cat in groups) {
            html += `<h3>${categoryNames[cat] || cat}</h3>`;
            html += `<ul>`;
            groups[cat].forEach(item => {
                html += `<li><strong>${item.title}</strong>`;
                if (item.metric) {
                    html += ` (<em>Metric: ${item.metric}</em>)`;
                }
                if (item.action || item.result) {
                    html += `<br><span style="font-size: 0.9em; color: var(--text-muted);">`;
                    if (item.action) html += `<strong>Action:</strong> ${item.action} `;
                    if (item.result) html += `<strong>Result:</strong> ${item.result}`;
                    html += `</span>`;
                }
                html += `</li>`;
            });
            html += `</ul>`;
        }
    } 
    else if (templateStyle === 'star') {
        achievements.forEach(item => {
            html += `<h3>${item.title}</h3>`;
            if (item.situation || item.task || item.action || item.result) {
                html += `<blockquote>`;
                if (item.situation) html += `<p><strong>S:</strong> ${item.situation}</p>`;
                if (item.task) html += `<p><strong>T:</strong> ${item.task}</p>`;
                if (item.action) html += `<p><strong>A:</strong> ${item.action}</p>`;
                if (item.result) html += `<p><strong>R:</strong> ${item.result}</p>`;
                html += `</blockquote>`;
            } else {
                html += `<p style="color: var(--text-dim); font-style: italic;">No STAR details added yet. Click on the item in the list to fill them out.</p>`;
            }
        });
    } 
    else { // minimal list
        html += `<ul>`;
        achievements.forEach(item => {
            let bullet = `<strong>${item.title}</strong>`;
            if (item.metric) bullet += ` &mdash; ${item.metric}`;
            if (item.result) bullet += `. ${item.result}`;
            html += `<li>${bullet}</li>`;
        });
        html += `</ul>`;
    }

    previewContainer.innerHTML = html;
}

// Get raw Markdown string from achievements
function getMarkdownText() {
    const templateStyle = document.getElementById("select-template").value;
    let mdText = `# Developer Achievements & Impact\n\nGenerated using **BragForge** on ${new Date().toLocaleDateString()}\n\n`;

    if (templateStyle === 'brag') {
        const groups = {};
        achievements.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });

        const categoryNames = {
            feat: 'Features & Product Development',
            fix: 'Bugs Resolved & Quality Assurance',
            perf: 'Performance Optimizations',
            refactor: 'Codebase Refactoring & Architecture',
            docs: 'Documentation & Testing Frameworks',
            other: 'Operations & General Support'
        };

        for (const cat in groups) {
            mdText += `## ${categoryNames[cat] || cat.toUpperCase()}\n\n`;
            groups[cat].forEach(item => {
                mdText += `* **${item.title}**`;
                if (item.metric) mdText += ` (Metric: ${item.metric})`;
                mdText += `\n`;
                if (item.action) mdText += `  * **Action:** ${item.action}\n`;
                if (item.result) mdText += `  * **Result:** ${item.result}\n`;
            });
            mdText += `\n`;
        }
    } 
    else if (templateStyle === 'star') {
        achievements.forEach(item => {
            mdText += `## ${item.title}\n\n`;
            if (item.situation) mdText += `* **Situation:** ${item.situation}\n`;
            if (item.task)      mdText += `* **Task:** ${item.task}\n`;
            if (item.action)    mdText += `* **Action:** ${item.action}\n`;
            if (item.result)    mdText += `* **Result:** ${item.result}\n`;
            mdText += `\n`;
        });
    } 
    else {
        mdText += `## Accomplishments List\n\n`;
        achievements.forEach(item => {
            let bullet = `* **${item.title}**`;
            if (item.metric) bullet += ` — ${item.metric}`;
            if (item.result) bullet += `. ${item.result}`;
            mdText += bullet + `\n`;
        });
    }

    return mdText;
}

// Copy Markdown to Clipboard
function copyToClipboard() {
    const text = getMarkdownText();
    navigator.clipboard.writeText(text).then(() => {
        showToast("Markdown copied to clipboard!");
    }, (err) => {
        alert("Failed to copy text: ", err);
    });
}

// Download JSON state
function downloadJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(achievements, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bragforge_state_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("State file downloaded!");
}

// Export Standalone Beautiful HTML Page
function downloadHTML() {
    const previewContent = document.getElementById("preview-output").innerHTML;
    const bragSheetTitle = "Developer Accomplishments Sheet";
    
    const standaloneHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bragSheetTitle}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        body {
            background-color: #0f1015;
            color: #e5e7eb;
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 4rem 2rem;
            position: relative;
        }
        .glow {
            position: absolute;
            top: -10%;
            left: 20%;
            width: 60vw;
            height: 60vw;
            background: radial-gradient(circle, rgba(124, 77, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
            filter: blur(80px);
            z-index: -1;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 3rem;
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 2.5rem;
            font-weight: 800;
            margin-top: 0;
            background: linear-gradient(135deg, #7c4dff, #00e5ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .meta {
            font-size: 0.9rem;
            color: #6b7280;
            margin-bottom: 2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 1rem;
        }
        h3 {
            font-family: 'Outfit', sans-serif;
            color: #00e5ff;
            font-size: 1.3rem;
            margin: 2rem 0 1rem 0;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        li {
            position: relative;
            padding-left: 1.5rem;
            margin-bottom: 1rem;
        }
        li::before {
            content: "✦";
            position: absolute;
            left: 0;
            color: #7c4dff;
        }
        blockquote {
            background: rgba(255, 255, 255, 0.01);
            border-left: 3px solid #7c4dff;
            padding: 0.5rem 1rem;
            margin: 1rem 0;
            font-style: italic;
        }
        p {
            color: #9ca3af;
        }
        strong {
            color: #ffffff;
        }
        .footer-badge {
            margin-top: 3rem;
            text-align: center;
            font-size: 0.8rem;
            color: #6b7280;
        }
        .footer-badge a {
            color: #00e5ff;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="glow"></div>
    <div class="container">
        <h1>${bragSheetTitle}</h1>
        <div class="meta">Exported on ${new Date().toLocaleDateString()} via BragForge</div>
        <div class="sheet-content">
            ${previewContent}
        </div>
        <div class="footer-badge">
            Generated using <a href="https://github.com/Anji-91/daily-problem-solver" target="_blank">BragForge</a>
        </div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([standaloneHtml], {type: "text/html;charset=utf-8"});
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", URL.createObjectURL(blob));
    downloadAnchor.setAttribute("download", `bragforge_sheet_${Date.now()}.html`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Standalone HTML landing page downloaded!");
}

// Toast popup notification
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    
    // Cancel any previous timer
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 2500);
}
