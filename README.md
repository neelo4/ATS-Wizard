# JobFit Wizard

Create, tailor, and export job‑fit resumes with AI assistance. Attach your basic details, experience, projects, upload an existing resume (PDF/DOCX) and the job description, add custom goals/instructions (e.g., "pass screening", "focus on backend"), then generate a tailored resume with a live preview.

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
