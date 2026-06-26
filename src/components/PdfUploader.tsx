import { useRef, useState } from 'react'
import './PdfUploader.css'

interface Props {
  onFileSelect: (file: File) => void
}

export default function PdfUploader({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    if (file.type === 'application/pdf') {
      onFileSelect(file)
    } else {
      alert('Seleziona un file PDF')
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
  }

  return (
    <div className="uploader-wrapper">
      <div
        className={`uploader-zone ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="uploader-icon">📄</div>
        <h2>Trascina un PDF qui</h2>
        <p>oppure clicca per scegliere un file</p>
        <button className="uploader-btn" type="button">Scegli PDF</button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}
