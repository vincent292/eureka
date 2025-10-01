// src/lib/pdfUtils.ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/** helpers */
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

/**
 * Export PDF con diseño Eureka mejorado
 */
export async function exportPDF(originalElements: HTMLElement[], logoSrc: string, optionalImage?: File) {
  if (!originalElements || originalElements.length === 0) {
    console.warn("exportPDF: no hay elements");
    return;
  }

  console.log(`Iniciando exportación de ${originalElements.length} scorecards`);

  const pdf = new jsPDF("p", "mm", "letter");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // COLOR PALETTE
  const colors = {
    red: "#c84445",
    cream: "#fcf4eb", 
    navy: "#0b3152",
    green: "#7fad57",
    gray: "#b4c4d0"
  };

  // ========== PORTADA ==========
  pdf.setFillColor(colors.cream);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Header decorativo
  pdf.setFillColor(colors.navy);
  pdf.rect(0, 0, pageWidth, 80, "F");
  
  // Logo/Empresa
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(colors.cream);
  pdf.text("EUREKA", pageWidth / 2, 45, { align: "center" });
  
  // Círculo decorativo
  pdf.setFillColor(colors.red);
  pdf.circle(pageWidth / 2, 100, 30, "F");
  
  // Mensaje principal
  pdf.setFontSize(20);
  pdf.setTextColor(colors.navy);
  pdf.text("¡Gracias por", pageWidth / 2, 95, { align: "center" });
  pdf.text("venir a Eureka!", pageWidth / 2, 110, { align: "center" });
  
  // Subtítulo
  pdf.setFontSize(14);
  pdf.setTextColor(colors.gray);
  pdf.text("Estos son tus scores — un bonito recuerdo", pageWidth / 2, 130, { align: "center" });

  // Foto del usuario (si existe)
  if (optionalImage) {
    try {
      const dataUrl = await fileToDataUrl(optionalImage);
      const imgW = 50;
      const imgH = 50;
      pdf.setFillColor(colors.cream);
      pdf.circle(pageWidth / 2, 160, 30, "F");
      pdf.addImage(dataUrl, "JPEG", pageWidth / 2 - imgW/2, 160 - imgH/2, imgW, imgH, undefined, 'FAST');
    } catch (e) {
      console.warn("No se pudo cargar la imagen opcional", e);
    }
  } else {
    // Icono de cámara si no hay foto
    pdf.setFontSize(24);
    pdf.setTextColor(colors.gray);
    pdf.text("📷", pageWidth / 2, 160, { align: "center" });
    pdf.setFontSize(10);
    pdf.text("Foto de recuerdo", pageWidth / 2, 175, { align: "center" });
  }

  // Detalles de la partida
  const totalScorecards = originalElements.length;
  const totalPlayers = originalElements.reduce((acc, el) => {
    const players = el.querySelectorAll('.player-header');
    return acc + players.length;
  }, 0);
  
  pdf.setFontSize(12);
  pdf.setTextColor(colors.navy);
  pdf.text(`• ${totalScorecards} Scorecard${totalScorecards > 1 ? 's' : ''}`, pageWidth / 2, 200, { align: "center" });
  pdf.text(`• ${totalPlayers} Jugador${totalPlayers > 1 ? 'es' : ''}`, pageWidth / 2, 212, { align: "center" });
  pdf.text(`• Fecha: ${new Date().toLocaleDateString()}`, pageWidth / 2, 224, { align: "center" });

  // Footer portada
  pdf.setFontSize(10);
  pdf.setTextColor(colors.green);
  pdf.text("¡Esperamos verte pronto de vuelta!", pageWidth / 2, pageHeight - 20, { align: "center" });

  // ========== SCORECARDS ==========
  for (let i = 0; i < originalElements.length; i++) {
    // Nueva página para cada scorecard
    pdf.addPage();
    
    // Fondo de página
    pdf.setFillColor(colors.cream);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    
    // Header de página
    pdf.setFillColor(colors.navy);
    pdf.rect(0, 0, pageWidth, 25, "F");
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(colors.cream);
    pdf.text("EUREKA SCORECARDS", margin, 16);
    
    pdf.setFontSize(10);
    pdf.setTextColor(colors.gray);
    pdf.text(`Página ${i + 2} de ${originalElements.length + 1}`, pageWidth - margin, 16, { align: "right" });

    try {
      // Capturar el scorecard
      const canvas = await html2canvas(originalElements[i], {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      
      // Calcular dimensiones manteniendo aspecto
      let imgWidth = pageWidth - (margin * 2);
      let imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      // Ajustar si es muy alto
      const maxHeight = pageHeight - 60;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (imgProps.width * imgHeight) / imgProps.height;
      }
      
      // Centrar horizontalmente
      const x = (pageWidth - imgWidth) / 2;
      const y = 35; // Debajo del header
      
      // Fondo blanco para el scorecard
      pdf.setFillColor("#ffffff");
      pdf.setDrawColor(colors.green);
      pdf.setLineWidth(0.5);
      
      // Rectángulo con bordes redondeados (simulado)
      const padding = 2;
      pdf.rect(x - padding, y - padding, imgWidth + (padding * 2), imgHeight + (padding * 2), "F");
      pdf.rect(x - padding, y - padding, imgWidth + (padding * 2), imgHeight + (padding * 2), "S");
      
      // Agregar imagen del scorecard
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      
      // Footer del scorecard
      pdf.setFontSize(10);
      pdf.setTextColor(colors.navy);
      pdf.text(`Scorecard #${i + 1}`, margin, pageHeight - 15);
      
      pdf.setFontSize(9);
      pdf.setTextColor(colors.green);
      pdf.text("¡Buen juego!", pageWidth - margin, pageHeight - 15, { align: "right" });

    } catch (error) {
      console.error(`Error procesando scorecard ${i + 1}:`, error);
      
      // Mensaje de error elegante
      pdf.setFontSize(16);
      pdf.setTextColor(colors.red);
      pdf.text("Error al cargar el scorecard", pageWidth / 2, pageHeight / 2, { align: "center" });
    }
  }

  // ========== PÁGINA FINAL ==========
  pdf.addPage();
  
  // Fondo
  pdf.setFillColor(colors.cream);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Mensaje de despedida
  pdf.setFillColor(colors.navy);
  pdf.rect(0, 0, pageWidth, 80, "F");
  
  pdf.setFontSize(20);
  pdf.setTextColor(colors.cream);
  pdf.text("¡Hasta la próxima!", pageWidth / 2, 45, { align: "center" });
  
  // Estadísticas
  pdf.setFontSize(16);
  pdf.setTextColor(colors.navy);
  pdf.text("Resumen de tu partida", pageWidth / 2, 100, { align: "center" });
  
  pdf.setFontSize(12);
  pdf.setTextColor(colors.gray);
  
  const statsYStart = 120;
  const lineHeight = 15;
  
  pdf.text(`• Scorecards completados: ${totalScorecards}`, pageWidth / 2, statsYStart, { align: "center" });
  pdf.text(`• Total de jugadores: ${totalPlayers}`, pageWidth / 2, statsYStart + lineHeight, { align: "center" });
  pdf.text(`• Fecha: ${new Date().toLocaleDateString()}`, pageWidth / 2, statsYStart + (lineHeight * 2), { align: "center" });
  pdf.text(`• Hora: ${new Date().toLocaleTimeString()}`, pageWidth / 2, statsYStart + (lineHeight * 3), { align: "center" });
  
  // Agradecimiento final
  pdf.setFontSize(14);
  pdf.setTextColor(colors.green);
  pdf.text("Gracias por elegir Eureka", pageWidth / 2, pageHeight - 50, { align: "center" });
  
  pdf.setFontSize(10);
  pdf.setTextColor(colors.gray);
  pdf.text("Esperamos que hayas tenido una experiencia memorable", pageWidth / 2, pageHeight - 35, { align: "center" });

  // GUARDAR PDF
  const timestamp = new Date().toLocaleDateString('es-ES');
  pdf.save(`Eureka_Recuerdo_${timestamp}.pdf`);
  console.log("PDF exportado exitosamente con diseño mejorado");
}