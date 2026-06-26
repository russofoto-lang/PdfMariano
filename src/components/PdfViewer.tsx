import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import './PdfViewer.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface Props {
  file: File
  onClose: () => void
}

export default function PdfViewer({ file, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [matchPages, setMatchPages] = useState<number[]>([])
  const [matchIndex, setMatchIndex] = useState(0)
  const [searching, setSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const activeSearchRef = useRef('')

  useEffect(() => {
    let cancelled = false
    file.arrayBuffer().then((buffer) => {
      if (cancelled) return
      pdfjsLib.getDocument({ data: buffer }).promise.then((doc) => {
        if (cancelled) return
        setPdf(doc)
        setTotalPages(doc.numPages)
        setLoading(false)
      })
    })
    return () => { cancelled = true }
  }, [file])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    if (renderTaskRef.current) renderTaskRef.current.cancel()

    pdf.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height

      const task = page.render({ canvas, canvasContext: ctx, viewport })
      renderTaskRef.current = task
      task.promise
        .then(() => {
          if (activeSearchRef.current) {
            drawHighlights(page, activeSearchRef.current, viewport, ctx)
          }
        })
        .catch((err) => {
          if (err?.name !== 'RenderingCancelledException') console.error(err)
        })
    })
  }, [pdf, currentPage, scale])

  async function drawHighlights(
    page: pdfjsLib.PDFPageProxy,
    term: string,
    viewport: pdfjsLib.PageViewport,
    ctx: CanvasRenderingContext2D
  ) {
    if (!term.trim()) return
    const content = await page.getTextContent()
    const lower = term.toLowerCase()
    ctx.save()
    ctx.fillStyle = 'rgba(255, 220, 0, 0.45)'

    for (const item of content.items) {
      if (!('str' in item) || !item.str.toLowerCase().includes(lower)) continue
      const [, , , , x, y] = pdfjsLib.Util.transform(viewport.transform, item.transform)
      const w = item.width * viewport.scale
      const h = item.height * viewport.scale
      ctx.fillRect(x, y - h, w, h)
    }

    ctx.restore()
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  async function runSearch(term: string) {
    if (!pdf || !term.trim()) {
      setMatchPages([])
      activeSearchRef.current = ''
      return
    }
    setSearching(true)
    activeSearchRef.current = term
    const lower = term.toLowerCase()
    const pages: number[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ').toLowerCase()
      if (text.includes(lower)) pages.push(i)
    }

    setMatchPages(pages)
    setMatchIndex(0)
    if (pages.length > 0) setCurrentPage(pages[0])
    setSearching(false)
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runSearch(searchTerm)
    if (e.key === 'Escape') closeSearch()
  }

  function goMatchPrev() {
    const idx = (matchIndex - 1 + matchPages.length) % matchPages.length
    setMatchIndex(idx)
    setCurrentPage(matchPages[idx])
  }

  function goMatchNext() {
    const idx = (matchIndex + 1) % matchPages.length
    setMatchIndex(idx)
    setCurrentPage(matchPages[idx])
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchTerm('')
    setMatchPages([])
    activeSearchRef.current = ''
    // Ridisegna pagina senza highlight
    if (pdf && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      if (renderTaskRef.current) renderTaskRef.current.cancel()
      pdf.getPage(currentPage).then((page) => {
        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const task = page.render({ canvas, canvasContext: ctx, viewport })
        renderTaskRef.current = task
        task.promise.catch((err) => {
          if (err?.name !== 'RenderingCancelledException') console.error(err)
        })
      })
    }
  }

  function prevPage() { if (currentPage > 1) setCurrentPage(p => p - 1) }
  function nextPage() { if (currentPage < totalPages) setCurrentPage(p => p + 1) }

  return (
    <div className="viewer">
      <div className="viewer-toolbar">
        <button className="toolbar-btn" onClick={onClose}>← Chiudi</button>
        <span className="file-name">{file.name}</span>
        <div className="toolbar-controls">
          <button className="toolbar-btn" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>−</button>
          <span className="scale-label">{Math.round(scale * 100)}%</span>
          <button className="toolbar-btn" onClick={() => setScale(s => Math.min(3, s + 0.2))}>+</button>
        </div>
        <button
          className={`toolbar-btn search-toggle ${searchOpen ? 'active' : ''}`}
          onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
        >
          🔍
        </button>
        <div className="pagination">
          <button className="toolbar-btn" onClick={prevPage} disabled={currentPage <= 1}>‹</button>
          <span>Pagina {currentPage} / {totalPages}</span>
          <button className="toolbar-btn" onClick={nextPage} disabled={currentPage >= totalPages}>›</button>
        </div>
      </div>

      {searchOpen && (
        <div className="search-bar">
          <input
            ref={searchInputRef}
            className="search-input"
            type="text"
            placeholder="Cerca nel PDF... (Invio)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKey}
          />
          <button className="search-btn" onClick={() => runSearch(searchTerm)} disabled={searching}>
            {searching ? '...' : 'Cerca'}
          </button>
          {matchPages.length > 0 && (
            <>
              <span className="search-results">
                Pag. {matchPages[matchIndex]} — {matchIndex + 1} / {matchPages.length}
              </span>
              <button className="toolbar-btn" onClick={goMatchPrev} disabled={matchPages.length < 2}>‹</button>
              <button className="toolbar-btn" onClick={goMatchNext} disabled={matchPages.length < 2}>›</button>
            </>
          )}
          {matchPages.length === 0 && searchTerm && !searching && (
            <span className="search-no-results">Nessun risultato</span>
          )}
          <button className="toolbar-btn" onClick={closeSearch}>✕</button>
        </div>
      )}

      <div className="viewer-canvas-area">
        {loading && <div className="viewer-loading">Caricamento...</div>}
        <canvas ref={canvasRef} className="pdf-canvas" />
      </div>
    </div>
  )
}
