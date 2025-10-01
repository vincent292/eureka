// src/components/PDFExportButton.tsx
import  { useRef } from "react";
import { exportPDF } from "../lib/pdfUtils";
import logo from "../../public/image/eureka.png";

interface Props {
  scorecardRefs?: (HTMLElement | null)[];
}

export default function PDFExportButton({ scorecardRefs }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const file = fileInputRef.current?.files?.[0];

    let elements: HTMLElement[] = [];
    
    if (scorecardRefs && scorecardRefs.length > 0) {
      elements = scorecardRefs.filter((el): el is HTMLElement => 
        el !== null && el !== undefined
      );
    }

    // Fallback: buscar por className
    if (elements.length === 0) {
      const nodeList = document.querySelectorAll<HTMLElement>(".scorecard-container");
      elements = Array.from(nodeList);
    }

    console.log("Exportando:", elements.length, "scorecards");

    if (elements.length === 0) {
      alert("No se encontraron scorecards para exportar.");
      return;
    }

    try {
      await exportPDF(elements, logo, file);
    } catch (err) {
      console.error("Error exportando PDF:", err);
      alert("Ocurrió un error al generar el PDF. Revisa la consola.");
    }
  };

  const handleFileChange = () => {
    // Opcional: mostrar preview de la imagen seleccionada
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      console.log("Foto seleccionada:", file.name);
    }
  };

  return (
    <div style={{ 
      margin: "20px 0", 
      textAlign: "center",
      padding: "20px",
      backgroundColor: "#fcf4eb",
      borderRadius: "12px",
      border: "2px solid #0b3152"
    }}>
      <h3 style={{ 
        color: "#0b3152", 
        marginBottom: "15px",
        fontFamily: "Arial, sans-serif"
      }}>
        🎯 Crear Recuerdo de la Partida
      </h3>
      
      <div style={{ marginBottom: "15px" }}>
        <label style={{
          display: "block",
          color: "#0b3152",
          marginBottom: "8px",
          fontWeight: "bold"
        }}>
          📸 Agregar foto de recuerdo (opcional):
        </label>
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={handleFileChange}
          style={{
            padding: "8px",
            border: `2px dashed #7fad57`,
            borderRadius: "8px",
            backgroundColor: "white",
            width: "80%",
            maxWidth: "300px"
          }}
        />
      </div>

      <button
        onClick={handleExport}
        style={{
          backgroundColor: "#c84445",
          color: "#fff",
          padding: "12px 24px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "16px",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#0b3152";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "#c84445";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        📄 Generar PDF de Recuerdo
      </button>
      
      <p style={{
        color: "#7fad57",
        fontSize: "12px",
        marginTop: "10px",
        fontStyle: "italic"
      }}>
        Incluye portada personalizada + todos tus scorecards
      </p>
    </div>
  );
}