import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JobFit Wizard',
  description: 'A friendly wizard to craft job‑fit resumes that impress.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function(){
              try{
                var s = localStorage.getItem('theme');
                var d = s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                if(d) document.documentElement.classList.add('dark');
              }catch(e){}
            })();
          `}}
        />
        {children}
      </body>
    </html>
  )
}
