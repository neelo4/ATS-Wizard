"use client"
import { useResumeStore } from '@/lib/store'
import { useState } from 'react'

export default function InstructionsForm() {
  const instructions = useResumeStore((s) => s.instructions)
  const setInstructions = useResumeStore((s) => s.setInstructions)
  const [goal, setGoal] = useState('')
  const [keyword, setKeyword] = useState('')
  const [constraint, setConstraint] = useState('')

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="md:col-span-3">
        <Box title="Instruction Prompt (free text)">
          <textarea
            className="input h-24"
            placeholder="Tell the wizard what to emphasize (e.g., emphasize backend, highlight leadership, keep to one page)."
            value={instructions.prompt || ''}
            onChange={(e) => setInstructions({ prompt: e.target.value })}
          />
        </Box>
      </div>
      <Box title="Goals (e.g., Pass ATS, Senior role, Emphasize backend)">
        <TagEditor
          tags={instructions.goals}
          onAdd={(v) => setInstructions({ goals: [...(instructions.goals || []), v] })}
          onRemove={(v) => setInstructions({ goals: (instructions.goals || []).filter((x) => x !== v) })}
          input={goal}
          setInput={setGoal}
          id="tour-goals"
        />
      </Box>
      <Box title="Keywords to include">
        <TagEditor
          tags={instructions.keywords || []}
          onAdd={(v) => setInstructions({ keywords: [...(instructions.keywords || []), v] })}
          onRemove={(v) => setInstructions({ keywords: (instructions.keywords || []).filter((x) => x !== v) })}
          input={keyword}
          setInput={setKeyword}
        />
      </Box>
      <Box title="Constraints (e.g., 1 page, no buzzwords)">
        <TagEditor
          tags={instructions.constraints || []}
          onAdd={(v) => setInstructions({ constraints: [...(instructions.constraints || []), v] })}
          onRemove={(v) => setInstructions({ constraints: (instructions.constraints || []).filter((x) => x !== v) })}
          input={constraint}
          setInput={setConstraint}
        />
      </Box>
    </div>
  )
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card min-w-0">
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function TagEditor({ id, tags, onAdd, onRemove, input, setInput }: { id?: string; tags: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; input: string; setInput: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
            {t}
            <button className="text-gray-500 hover:text-gray-700" onClick={() => onRemove(t)}>×</button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input id={id} className="input min-w-0 h-10 flex-1" value={input} placeholder="Type and press Enter" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim()) { e.preventDefault(); onAdd(input.trim()); setInput('') }
        }} />
        <button className="btn h-10" onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput('') } }}>Add</button>
      </div>
    </div>
  )
}
