import { useRef, useState } from "react"
import { exportPDF } from "../lib/pdfUtils"
import "../styles/PDFExportButton.css"
import logo from "../../public/image/eureka.png"

interface Props {
  scorecardRefs?: (HTMLElement | null)[]
}

export default function PDFExportButton({ scorecardRefs }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFileName, setSelectedFileName] = useState("")

  const handleExport = async () => {
    const file = fileInputRef.current?.files?.[0]

    let elements: HTMLElement[] = []

    if (scorecardRefs && scorecardRefs.length > 0) {
      elements = scorecardRefs.filter(
        (element): element is HTMLElement => element !== null && element !== undefined,
      )
    }

    if (elements.length === 0) {
      const nodeList = document.querySelectorAll<HTMLElement>(".scorecard-container")
      elements = Array.from(nodeList)
    }

    if (elements.length === 0) {
      alert("No se encontraron scorecards para exportar.")
      return
    }

    try {
      await exportPDF(elements, logo, file)
    } catch (err) {
      console.error("Error exportando PDF:", err)
      alert("Ocurrio un error al generar el PDF. Revisa la consola.")
    }
  }

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0]
    setSelectedFileName(file ? file.name : "")
  }

  return (
    <div className="score-export-controls" data-score-reveal>
      <label className="score-export-controls__field">
        <span>Agregar foto de recuerdo</span>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>

      <p className="score-export-controls__file-state">
        {selectedFileName || "Sin archivos seleccionados"}
      </p>

      <button
        type="button"
        className="score-export-controls__button"
        onClick={handleExport}
      >
        Generar PDF
      </button>

      <p className="score-export-controls__hint">
        Incluye portada personalizada y todas tus scorecards
      </p>
    </div>
  )
}
