'use client'

import { useEffect, useState } from 'react'

export function BrandMark() {
  return (
    <svg className="lp-brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="12.5" cy="18" r="8.5" stroke="#17201E" strokeWidth="5" />
      <circle cx="23.5" cy="18" r="8.5" stroke="#A8D936" strokeWidth="5" />
      <path d="M18 10.4C20.2 12 21.7 14.7 21.7 18s-1.5 6-3.7 7.6" stroke="#F1F2EB" strokeWidth="2.2" />
    </svg>
  )
}

const LINKS = [
  { href: '#mechanism', label: 'Mechanism' },
  { href: '#threat', label: 'The boundary' },
  { href: '#footer', label: 'About' },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="lp-header lp-container">
      <a href="#top" className="lp-brand" aria-label="COVENANT home">
        <BrandMark /> COVENANT<span className="lp-brand-index" aria-hidden>/ 01</span>
      </a>
      <nav className="lp-nav" id="primary-nav" aria-label="Primary navigation" data-open={open}>
        {LINKS.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
      </nav>
      <a className="lp-nav-cta" href="#playground">Explore demo <span aria-hidden>↗</span></a>
      <button type="button" className="lp-toggle" aria-expanded={open} aria-controls="primary-nav" aria-label="Toggle navigation" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>{open ? '✕' : '☰'}</span>
      </button>
    </header>
  )
}
