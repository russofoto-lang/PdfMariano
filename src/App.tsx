import { useState } from 'react'
import PdfUploader from './components/PdfUploader'
import PdfViewer from './components/PdfViewer'
import PdfConverter from './components/PdfConverter'
import './App.css'

type Tab = 'reader' | 'converter'

function App() {
  const [tab, setTab] = useState<Tab>('reader')
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  function handleTabChange(t: Tab) {
    setTab(t)
    setPdfFile(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📄 PDF Studio</h1>
        {!pdfFile && (
          <nav className="app-tabs">
            <button
              className={`tab-btn ${tab === 'reader' ? 'active' : ''}`}
              onClick={() => handleTabChange('reader')}
            >
              Lettore
            </button>
            <button
              className={`tab-btn ${tab === 'converter' ? 'active' : ''}`}
              onClick={() => handleTabChange('converter')}
            >
              Converti in PDF
            </button>
          </nav>
        )}
      </header>
      <main className="app-main">
        {tab === 'reader' && (
          pdfFile
            ? <PdfViewer file={pdfFile} onClose={() => setPdfFile(null)} />
            : <PdfUploader onFileSelect={setPdfFile} />
        )}
        {tab === 'converter' && <PdfConverter />}
      </main>
    </div>
  )
}

export default App
