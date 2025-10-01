import { useEffect, useState, useRef, useCallback } from "react";
import AccessForm from "../components/AccessForm";
import ScoreCard from "../components/ScoreCard";
import PDFExportButton from "../components/PDFExportButton";

export default function Score() {
  const [registered, setRegistered] = useState<boolean>(() => {
    return localStorage.getItem("score_registered") === "true";
  });

  const [cards, setCards] = useState<number[]>([1]);
  const scorecardRefs = useRef<(HTMLDivElement | null)[]>([]);

const handleAccess = (_contactId: string) => {
    setRegistered(true);
  };

  const addCard = () => {
    setCards(prev => [...prev, prev.length + 1]);
  };

  console.log("Referencias actuales:", scorecardRefs.current.filter(Boolean));
<PDFExportButton scorecardRefs={scorecardRefs.current.filter(Boolean)} />
  // 👇 Callback ref mejorado que maneja correctamente cada scorecard
  const setScorecardRef = useCallback((index: number) => {
    return (el: HTMLDivElement | null) => {
      scorecardRefs.current[index] = el;
    };
  }, []);

  // 👇 Limpiar refs cuando se remueven cards (aunque no tienes remove, es buena práctica)
  useEffect(() => {
    scorecardRefs.current = scorecardRefs.current.slice(0, cards.length);
  }, [cards.length]);

  if (!registered) {
    return <AccessForm onAccess={handleAccess} />;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ textAlign: "center" }}>Score Page</h1>

      {/* Botón para exportar al inicio */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <PDFExportButton scorecardRefs={scorecardRefs.current.filter(Boolean)} />
      </div>

      {/* Scorecards */}
      <div>
        {cards.map((id, index) => (
          <div key={id} style={{ marginBottom: '2rem' }}>
            <ScoreCard
              id={id}
              setRef={setScorecardRef(index)}
            />
          </div>
        ))}
      </div>

      {/* Botón para agregar nuevas scorecards */}
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button
          onClick={addCard}
          style={{ padding: "8px 16px", borderRadius: 8 }}
        >
          + Nuevo Score Card
        </button>
      </div>
    </div>
  );
}