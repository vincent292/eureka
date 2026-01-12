import { useEffect, useState, useRef, useCallback } from "react";
import ScoreCard from "../components/ScoreCard";
import PDFExportButton from "../components/PDFExportButton";

export default function Score() {
  const [cards, setCards] = useState<number[]>([1]);
  const scorecardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const addCard = () => {
    setCards(prev => [...prev, prev.length + 1]);
  };

  // Callback ref para cada scorecard
  const setScorecardRef = useCallback((index: number) => {
    return (el: HTMLDivElement | null) => {
      scorecardRefs.current[index] = el;
    };
  }, []);

  // Limpia refs si cambia el número de cards
  useEffect(() => {
    scorecardRefs.current = scorecardRefs.current.slice(0, cards.length);
  }, [cards.length]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ textAlign: "center" }}>Score Page</h1>

      {/* Botón exportar PDF */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <PDFExportButton scorecardRefs={scorecardRefs.current.filter(Boolean)} />
      </div>

      {/* Scorecards */}
      <div>
        {cards.map((id, index) => (
          <div key={id} style={{ marginBottom: "2rem" }}>
            <ScoreCard
              id={id}
              setRef={setScorecardRef(index)}
            />
          </div>
        ))}
      </div>

      {/* Agregar nuevas scorecards */}
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
