import { useRef, useState } from 'react'
import { convertToPdf } from '../utils/convertToPdf'
import './PdfConverter.css'

type Status = 'idle' | 'converting' | 'done' | 'error'

export default function PdfConverter() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState('')

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['txt', 'doc', 'docx'].includes(ext ?? '')) {
      setError('Formato non supportato. Usa .txt, .doc o .docx')
      setStatus('error')
      return
    }

    setFileName(file.name)
    setStatus('converting')
    setError('')
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)

    try {
      const pdfBytes = await convertToPdf(file)
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setDownloadName(file.name.replace(/\.[^.]+$/, '') + '.pdf')
      setStatus('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore conversione')
      setStatus('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function reset() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    setStatus('idle')
    setFileName('')
    setError('')
  }

  return (
    <div className="converter">
      <div
        className={`converter-zone ${dragging ? 'dragging' : ''} ${status !== 'idle' ? 'has-file' : ''}`}
        onClick={() => status === 'idle' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {status === 'idle' && (
          <>
            <div className="converter-icon">🔄</div>
            <h2>Converti in PDF</h2>
            <p>Trascina un file .txt, .doc o .docx</p>
            <button className="converter-btn" type="button">Scegli file</button>
          </>
        )}

        {status === 'converting' && (
          <>
            <div className="converter-icon spinning">⏳</div>
            <h2>Conversione in corso...</h2>
            <p>{fileName}</p>
          </>
        )}

        {status === 'done' && pdfUrl && (
          <>
            <div className="converter-icon">✅</div>
            <h2>Conversione completata</h2>
            <p>{fileName}</p>
            <div className="converter-actions">
              <a className="converter-btn download" href={pdfUrl} download={downloadName}>
                ⬇ Scarica {downloadName}
              </a>
              <button className="converter-btn secondary" type="button" onClick={reset}>
                Converti un altro
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="converter-icon">❌</div>
            <h2>Errore</h2>
            <p className="error-msg">{error}</p>
            <button className="converter-btn" type="button" onClick={reset}>Riprova</button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.doc,.docx"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}
