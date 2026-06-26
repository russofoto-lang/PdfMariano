import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import mammoth from 'mammoth'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function convertToPdf(file: File): Promise<Uint8Array> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'txt') {
    return convertTxt(file)
  }
  if (ext === 'doc' || ext === 'docx') {
    return convertDocx(file)
  }
  throw new Error('Formato non supportato')
}

async function convertTxt(file: File): Promise<Uint8Array> {
  const text = await file.text()
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595
  const pageHeight = 842
  const margin = 50
  const fontSize = 11
  const lineHeight = fontSize * 1.4
  const maxWidth = pageWidth - margin * 2
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight)

  const rawLines = text.split('\n')
  const wrappedLines: string[] = []

  for (const raw of rawLines) {
    if (raw.trim() === '') {
      wrappedLines.push('')
      continue
    }
    const words = raw.split(' ')
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      const w = font.widthOfTextAtSize(test, fontSize)
      if (w > maxWidth && current) {
        wrappedLines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) wrappedLines.push(current)
  }

  let lineIndex = 0
  while (lineIndex < wrappedLines.length) {
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    for (let i = 0; i < maxLinesPerPage && lineIndex < wrappedLines.length; i++, lineIndex++) {
      const line = wrappedLines[lineIndex]
      if (line) {
        page.drawText(line, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) })
      }
      y -= lineHeight
    }
  }

  return pdfDoc.save()
}

async function convertDocx(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })

  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    padding: 60px;
    background: white;
    font-family: Arial, sans-serif;
    font-size: 12px;
    line-height: 1.6;
    color: #000;
    box-sizing: border-box;
  `
  container.innerHTML = result.value
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = canvas.width
    const imgH = canvas.height
    const ratio = pageW / imgW
    const scaledH = imgH * ratio

    let yOffset = 0
    while (yOffset < scaledH) {
      if (yOffset > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, -yOffset, pageW, scaledH)
      yOffset += pageH
    }

    return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer)
  } finally {
    document.body.removeChild(container)
  }
}
