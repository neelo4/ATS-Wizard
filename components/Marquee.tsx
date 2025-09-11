"use client"
export default function Marquee({ text }: { text: string }) {
  return (
    <div className="text-sm text-gray-600 dark:text-gray-300">
      <span className="marquee-bang inline-block">{text}</span>
    </div>
  )
}
