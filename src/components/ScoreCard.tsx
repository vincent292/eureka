import { useState, useEffect } from "react";
import "../styles/scorecard.css";
import logo from "../../public/image/eureka.png";

interface Player {
  id: number;
  name: string;
  scores: number[];
}

interface ScoreCardProps {
  id: number;
  setRef: (el: HTMLDivElement | null) => void;
}

export default function ScoreCard({ id, setRef }: ScoreCardProps) {
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem(`scorecard_players_${id}`);
    return saved
      ? JSON.parse(saved)
      : [{ id: 1, name: "Player 1", scores: Array(10).fill(0) }];
  });

  const [holes, setHoles] = useState<number>(() => {
    const saved = localStorage.getItem(`scorecard_holes_${id}`);
    return saved ? JSON.parse(saved) : 10;
  });

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem(`scorecard_players_${id}`, JSON.stringify(players));
    localStorage.setItem(`scorecard_holes_${id}`, JSON.stringify(holes));
  }, [players, holes, id]);

  const addHole = () => {
    setHoles(holes + 1);
    setPlayers(players.map(p => ({ ...p, scores: [...p.scores, 0] })));
  };

  const removeHole = () => {
    if (holes > 1) {
      setHoles(holes - 1);
      setPlayers(players.map(p => ({ ...p, scores: p.scores.slice(0, -1) })));
    }
  };

  const addPlayer = () => {
    const newId = players.length + 1;
    setPlayers([...players, { id: newId, name: `Player ${newId}`, scores: Array(holes).fill(0) }]);
  };

  const updateScore = (playerId: number, holeIndex: number, value: string) => {
    if (/^\d*$/.test(value)) {
      const parsed = value === "" ? 0 : parseInt(value);
      setPlayers(players.map(p =>
        p.id === playerId
          ? { ...p, scores: p.scores.map((s, i) => (i === holeIndex ? parsed : s)) }
          : p
      ));
    }
  };

  const updateName = (playerId: number, newName: string) => {
    setPlayers(players.map(p => p.id === playerId ? { ...p, name: newName } : p));
  };

  const totalScores = players.map(p => p.scores.reduce((acc, s) => acc + s, 0));
  const minScore = Math.min(...totalScores);
  const winner = players.find((p, i) => totalScores[i] === minScore)?.name || "N/A";

  return (
    <div className="scorecard-container" ref={setRef}>
      <div className="scorecard-header">
        <img src={logo} alt="Logo" className="scorecard-logo" />
        <h2>Score Card #{id}</h2>
      </div>

      <table className="scorecard-table">
        <thead>
          <tr>
            <th className="hole-col">Hoyos</th>
            {players.map(p => (
              <th key={p.id} className="player-header">
                <div className="player-name-wrapper">
                  <input
                    value={p.name}
                    onChange={e => updateName(p.id, e.target.value)}
                    className="player-name"
                  />
                  <button
                    className="remove-player-btn"
                    onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))}
                  >
                    ✕
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: holes }, (_, i) => (
            <tr key={i}>
              <td className="hole-col">{i + 1}</td>
              {players.map(p => (
                <td key={p.id}>
                  <input
                    type="text"
                    value={p.scores[i] === 0 ? "" : p.scores[i]}
                    onChange={e => updateScore(p.id, i, e.target.value)}
                    className="score-input"
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr className="totals-row">
            <td className="hole-col">Total</td>
            {totalScores.map((t, i) => <td key={i}>{t}</td>)}
          </tr>
          <tr className="winner-row">
            <td className="hole-col">Ganador</td>
            <td colSpan={players.length}>{winner}</td>
          </tr>
        </tbody>
      </table>

      <div className="buttons">
        <button onClick={addHole}>Agregar Hoyo</button>
        <button onClick={removeHole}>Eliminar Hoyo</button>
        <button onClick={addPlayer}>Agregar Jugador</button>
      </div>
    </div>
  );
}
