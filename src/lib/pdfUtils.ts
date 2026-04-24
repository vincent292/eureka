// src/lib/pdfUtils.ts
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const imageUrlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const getImageFormat = (dataUrl: string) => {
  if (dataUrl.startsWith("data:image/png")) return "PNG"
  if (dataUrl.startsWith("data:image/webp")) return "WEBP"
  return "JPEG"
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace("#", "")
  const value = parseInt(normalized, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const setFill = (pdf: jsPDF, color: string) => {
  const [r, g, b] = hexToRgb(color)
  pdf.setFillColor(r, g, b)
}

const setDraw = (pdf: jsPDF, color: string) => {
  const [r, g, b] = hexToRgb(color)
  pdf.setDrawColor(r, g, b)
}

const setText = (pdf: jsPDF, color: string) => {
  const [r, g, b] = hexToRgb(color)
  pdf.setTextColor(r, g, b)
}

export async function exportPDF(
  originalElements: HTMLElement[],
  logoSrc: string,
  optionalImage?: File,
) {
  if (!originalElements || originalElements.length === 0) {
    console.warn("exportPDF: no hay scorecards para exportar")
    return
  }

  const pdf = new jsPDF("p", "mm", "letter")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const now = new Date()

  const colors = {
    ink: "#102125",
    deep: "#173946",
    cream: "#f6f3eb",
    paper: "#fffdf8",
    green: "#7fad57",
    olive: "#537133",
    red: "#c84445",
    muted: "#58676b",
    line: "#dbe5d4",
  }

  const totalScorecards = originalElements.length
  const totalPlayers = originalElements.reduce(
    (acc, element) => acc + element.querySelectorAll(".player-header").length,
    0,
  )
  const totalHoles = originalElements.reduce(
    (acc, element) =>
      acc + element.querySelectorAll("tbody tr:not(.totals-row):not(.winner-row)").length,
    0,
  )

  let logoDataUrl = ""
  try {
    logoDataUrl = await imageUrlToDataUrl(logoSrc)
  } catch (error) {
    console.warn("No se pudo cargar el logo para el PDF", error)
  }

  const drawBackground = () => {
    setFill(pdf, colors.cream)
    pdf.rect(0, 0, pageWidth, pageHeight, "F")

    setFill(pdf, "#eaf2df")
    pdf.circle(pageWidth - 18, 28, 48, "F")

    setFill(pdf, "#f4dfc5")
    pdf.circle(7, pageHeight - 18, 38, "F")
  }

  const drawHeader = (title: string, pageLabel?: string) => {
    setFill(pdf, colors.ink)
    pdf.roundedRect(margin, 12, pageWidth - margin * 2, 20, 5, 5, "F")

    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, getImageFormat(logoDataUrl), margin + 4, 15, 14, 14)
    }

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(10)
    setText(pdf, colors.paper)
    pdf.text(title, margin + 22, 24)

    if (pageLabel) {
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8)
      setText(pdf, "#d7ebcb")
      pdf.text(pageLabel, pageWidth - margin - 5, 24, { align: "right" })
    }
  }

  const drawStat = (x: number, y: number, label: string, value: string) => {
    setFill(pdf, colors.paper)
    setDraw(pdf, colors.line)
    pdf.setLineWidth(0.25)
    pdf.roundedRect(x, y, 55, 28, 4, 4, "FD")

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(15)
    setText(pdf, colors.ink)
    pdf.text(value, x + 27.5, y + 12, { align: "center" })

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    setText(pdf, colors.muted)
    pdf.text(label, x + 27.5, y + 21, { align: "center" })
  }

  const drawFooter = (leftText: string) => {
    setDraw(pdf, colors.line)
    pdf.setLineWidth(0.2)
    pdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    setText(pdf, colors.muted)
    pdf.text(leftText, margin, pageHeight - 11)
    pdf.text("Mini Golf Eureka", pageWidth - margin, pageHeight - 11, {
      align: "right",
    })
  }

  const drawCover = async () => {
    drawBackground()

    setFill(pdf, colors.ink)
    pdf.roundedRect(margin, 18, pageWidth - margin * 2, 82, 7, 7, "F")

    if (logoDataUrl) {
      setFill(pdf, colors.paper)
      pdf.roundedRect(pageWidth / 2 - 18, 30, 36, 36, 6, 6, "F")
      pdf.addImage(logoDataUrl, getImageFormat(logoDataUrl), pageWidth / 2 - 14, 34, 28, 28)
    }

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(27)
    setText(pdf, colors.paper)
    pdf.text("Score de la partida", pageWidth / 2, 79, { align: "center" })

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(11)
    setText(pdf, "#d7ebcb")
    pdf.text("Un recuerdo listo para guardar y compartir", pageWidth / 2, 91, {
      align: "center",
    })

    if (optionalImage) {
      try {
        const dataUrl = await fileToDataUrl(optionalImage)
        setFill(pdf, colors.paper)
        setDraw(pdf, colors.line)
        pdf.roundedRect(pageWidth / 2 - 36, 112, 72, 54, 6, 6, "FD")
        pdf.addImage(dataUrl, getImageFormat(dataUrl), pageWidth / 2 - 33, 115, 66, 48)
      } catch (error) {
        console.warn("No se pudo cargar la imagen opcional", error)
      }
    }

    const statsY = optionalImage ? 181 : 125
    drawStat(margin, statsY, "Scorecards", String(totalScorecards))
    drawStat(pageWidth / 2 - 27.5, statsY, "Jugadores", String(totalPlayers))
    drawStat(pageWidth - margin - 55, statsY, "Hoyos jugados", String(totalHoles))

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(13)
    setText(pdf, colors.ink)
    pdf.text("Mini Golf Eureka", pageWidth / 2, statsY + 48, { align: "center" })

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    setText(pdf, colors.muted)
    pdf.text(`Generado el ${formatDate(now)} a las ${formatTime(now)}`, pageWidth / 2, statsY + 59, {
      align: "center",
    })

    drawFooter("Gracias por venir. Te esperamos para la revancha.")
  }

  const captureScorecard = async (element: HTMLElement) => {
    document.body.classList.add("pdf-export")
    const previousWidth = element.style.width
    const previousMaxWidth = element.style.maxWidth

    element.style.width = "980px"
    element.style.maxWidth = "980px"

    try {
      await document.fonts?.ready

      return await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        windowWidth: 1100,
      })
    } finally {
      element.style.width = previousWidth
      element.style.maxWidth = previousMaxWidth
      document.body.classList.remove("pdf-export")
    }
  }

  await drawCover()

  for (let index = 0; index < originalElements.length; index += 1) {
    pdf.addPage()
    drawBackground()
    drawHeader(
      `Scorecard ${index + 1}`,
      `Pagina ${index + 2} de ${originalElements.length + 2}`,
    )

    try {
      const canvas = await captureScorecard(originalElements[index])
      const imgData = canvas.toDataURL("image/png", 1)
      const imgProps = pdf.getImageProperties(imgData)

      let imgWidth = pageWidth - margin * 2
      let imgHeight = (imgProps.height * imgWidth) / imgProps.width
      const maxHeight = pageHeight - 62

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight
        imgWidth = (imgProps.width * imgHeight) / imgProps.height
      }

      const x = (pageWidth - imgWidth) / 2
      const y = 42

      setFill(pdf, colors.paper)
      setDraw(pdf, colors.line)
      pdf.setLineWidth(0.35)
      pdf.roundedRect(x - 3, y - 3, imgWidth + 6, imgHeight + 6, 5, 5, "FD")
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST")
    } catch (error) {
      console.error(`Error procesando scorecard ${index + 1}:`, error)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(14)
      setText(pdf, colors.red)
      pdf.text("No se pudo cargar esta scorecard", pageWidth / 2, pageHeight / 2, {
        align: "center",
      })
    }

    drawFooter(`Scorecard ${index + 1}`)
  }

  pdf.addPage()
  drawBackground()
  drawHeader("Resumen final", `Pagina ${originalElements.length + 2} de ${originalElements.length + 2}`)

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(24)
  setText(pdf, colors.ink)
  pdf.text("Gracias por jugar", pageWidth / 2, 78, { align: "center" })

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  setText(pdf, colors.muted)
  pdf.text("Estos fueron los numeros de tu partida en Eureka.", pageWidth / 2, 91, {
    align: "center",
  })

  drawStat(margin, 117, "Scorecards", String(totalScorecards))
  drawStat(pageWidth / 2 - 27.5, 117, "Jugadores", String(totalPlayers))
  drawStat(pageWidth - margin - 55, 117, "Hoyos jugados", String(totalHoles))

  setFill(pdf, colors.green)
  pdf.roundedRect(pageWidth / 2 - 46, 174, 92, 15, 7, 7, "F")
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(10)
  setText(pdf, colors.paper)
  pdf.text("Nos vemos pronto", pageWidth / 2, 184, { align: "center" })

  drawFooter(`Generado el ${formatDate(now)}`)

  const timestamp = now.toISOString().slice(0, 10)
  pdf.save(`Eureka_Score_${timestamp}.pdf`)
}
