# JobFit Wizard

Craft job‑fit, ATS‑friendly resumes in minutes. Upload your existing resume and a job description, give a few goals, and let the wizard tailor a clean, export‑ready resume — with a live preview and an estimated ATS match.

<p align="center">
  <a href="https://github.com/neelo4/ATS-Wizard/stargazers"><img src="https://img.shields.io/github/stars/neelo4/ATS-Wizard?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/neelo4/ATS-Wizard"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome"></a>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneelo4%2FATS-Wizard"><img src="https://vercel.com/button" alt="Deploy with Vercel"></a>
</p>

> If this project helps you, please ⭐ the repo — it really motivates ongoing improvements and helps others discover it.

## ✨ Why JobFit Wizard

- 🎯 Tailored: AI‑assisted summary, skills and bullets aligned to the job description
- 🧠 Smart: Heuristic ATS keyword match indicator and keyword visibility
- 📄 Beautiful: 3 modern templates (Modern, Classic, Vibrant) and print‑perfect PDF export
- 📦 Practical: Works fully client‑side for resume/JD parsing — no keys required
- ⚡ Fast: Next.js 14 + TypeScript + Tailwind + Zustand
- 🧭 Friendly: First‑time guided tour, quick start actions, and “Download Resume” flow

## 🚀 Live Demo / Deploy

- One‑click deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneelo4%2FATS-Wizard)

## 📸 Preview

> Add a short screen capture (GIF) for maximum impact. Suggested path: `docs/demo.gif`.

```<img width="1377" height="706" alt="Screenshot 2025-09-13 at 09 23 40" src="https://github.com/user-attachments/assets/0f8569cc-02fc-48c5-86f0-bad5ef8b8e36" />

docs/
  demo.gif   # drag a 5–8s demo here (UI → Upload → Generate → Download)
```

## 🧩 Features

- Upload existing resume (PDF/DOCX/TXT) and job description
- Client‑side parsing for privacy (pdfjs‑dist, mammoth)
- Goals/keywords/constraints to steer generation
- Live preview with template switching
- ATS badge on preview; hidden in downloaded PDF
- Guided onboarding tour (replay anytime with “Guide”)
- Local sign‑in (name + email) that seeds a polished demo on first login

## 🛠️ Tech Stack

- Framework: Next.js 14 (App Router)
- Language: TypeScript
- UI: Tailwind CSS
- State: Zustand
- Parsing: pdfjs‑dist (PDF), mammoth (DOCX)

## 🧪 Quick Start (Local)

```bash
git clone https://github.com/neelo4/ATS-Wizard.git
cd ATS-Wizard
npm install
npm run dev
# open http://localhost:3000
```

## 🗂️ Project Structure

- `app/` — pages (App Router) and API routes
- `components/` — forms, preview, tour, and UI pieces
- `lib/` — types, store, parsers, templates, AI stub

## 🧙 Templates

- Modern — Profile → Current Role → Experience → Projects → Skills
- Classic — Minimalist, typographic CV style
- Vibrant — Bold header, chips and pills, two‑column content

## 🧭 Roadmap

- [ ] Accent color picker and compact template
- [ ] “Generate Highlights” for Projects based on tech and goals
- [ ] Real LLM integration option (OpenAI/Anthropic/Azure) behind an env flag
- [ ] US Letter/A4 export toggle with margins preview
- [ ] Import from LinkedIn/GitHub for Projects

## 🤝 Contributing

Issues and PRs are welcome! Good places to start:

- “good first issue” labels
- Template polish, accessibility passes, and micro‑copy improvements

## 📣 Spread the word

If you find this useful:

- ⭐ Star the repo
- Share on LinkedIn/Twitter with a short demo clip
- Open issues for feature ideas — feedback shapes the roadmap

---

SEO keywords: resume builder, resume generator, ATS resume, job description parser, AI resume, Next.js, TypeScript, Tailwind, pdfjs, mammoth, job search tools, portfolio project, open-source.

## Highlights

- Modern React (Next.js 14) + TypeScript + Tailwind CSS
- Smart client-side parsers for PDF/DOCX uploads (pdfjs, mammoth)
- Goals, keywords, constraints inputs to steer generation
- Two clean templates (Modern, Classic) with instant preview
- Export via browser Print to PDF
- Pluggable AI: local heuristic by default, bring-your-own LLM later

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the dev server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` and start building.

## Architecture

- `app/` – App Router pages and API routes
- `components/` – Form steps, preview, and UI building blocks
- `lib/` – Types, state store (Zustand), AI stub, file parsers, templates

### AI Integration

Out of the box, `lib/ai.ts` implements a local heuristic that:

- Extracts keywords from the JD and your experience/projects
- Builds a concise summary and skills list
- Marks bullets aligned with the role
- Estimates a simple ATS match score

You can later swap in a real LLM by updating `generateResumeDraft` to call your provider (OpenAI, Azure OpenAI, Anthropic, etc.). Recommended approach:

```ts
// lib/ai.ts
export async function generateResumeDraft(data: ResumeData): Promise<GeneratedResume> {
  const prompt = buildPrompt(data)
  const resp = await fetch('https://api.openai.com/v1/chat/completions', { /* ... */ })
  // parse -> GeneratedResume
}
```

Keep the output schema the same to avoid touching the UI.

### File Parsing

- `lib/fileParsers.ts` uses `pdfjs-dist` for PDFs and `mammoth` for DOCX.
- If a file is unknown, it falls back to text.

## Exporting to PDF

Use your browser's Print (`Cmd/Ctrl+P`) and choose "Save as PDF". The preview is optimized for printing.

## Roadmap Ideas

- More templates + template variables (spacing, accent color)
- Skill extraction and proficiency estimation
- Bullet rewriting with quantification prompts
- Multi-page support and section reordering
- Fine-grained ATS analysis and recommendations
- Direct LinkedIn/GitHub import for projects
- Persistent storage (local-first, with cloud sync option)

## Repo Polish (for GitHub stars)

- Clear demo GIF in README (add after first run)
- Deploy to Vercel one-click badge
- Issues labeled good-first-issue, roadmap milestones
- Small design system with consistent components

## License

MIT
