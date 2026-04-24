import { useEffect, useState } from "react"
import "../styles/scorecard.css"
import logo from "../../public/image/eureka.png"

interface Player {
  id: number
  name: string
  scores: number[]
}

interface ScoreCardProps {
  id: number
  setRef: (el: HTMLDivElement | null) => void
}

export default function ScoreCard({ id, setRef }: ScoreCardProps) {
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem(`scorecard_players_${id}`)
    return saved
      ? JSON.parse(saved)
      : [{ id: 1, name: "Player 1", scores: Array(10).fill(0) }]
  })

  const [holes, setHoles] = useState<number>(() => {
    const saved = localStorage.getItem(`scorecard_holes_${id}`)
    return saved ? JSON.parse(saved) : 10
  })

  useEffect(() => {
    localStorage.setItem(`scorecard_players_${id}`, JSON.stringify(players))
    localStorage.setItem(`scorecard_holes_${id}`, JSON.stringify(holes))
  }, [players, holes, id])

  const addHole = () => {
    setHoles((prev) => prev + 1)
    setPlayers((prev) =>
      prev.map((player) => ({ ...player, scores: [...player.scores, 0] })),
    )
  }

  const removeHole = () => {
    if (holes <= 1) {
      return
    }

    setHoles((prev) => prev - 1)
    setPlayers((prev) =>
      prev.map((player) => ({ ...player, scores: player.scores.slice(0, -1) })),
    )
  }

  const addPlayer = () => {
    const newId = players.length + 1
    setPlayers((prev) => [
      ...prev,
      { id: newId, name: `Player ${newId}`, scores: Array(holes).fill(0) },
    ])
  }

  const removePlayer = (playerId: number) => {
    if (players.length === 1) {
      return
    }

    setPlayers((prev) => prev.filter((player) => player.id !== playerId))
  }

  const updateScore = (playerId: number, holeIndex: number, value: string) => {
    if (/^\d*$/.test(value)) {
      const parsed = value === "" ? 0 : parseInt(value, 10)

      setPlayers((prev) =>
        prev.map((player) =>
          player.id === playerId
            ? {
                ...player,
                scores: player.scores.map((score, index) =>
                  index === holeIndex ? parsed : score,
                ),
              }
            : player,
        ),
      )
    }
  }

  const updateName = (playerId: number, newName: string) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, name: newName } : player,
      ),
    )
  }

  const totalScores = players.map((player) =>
    player.scores.reduce((accumulator, score) => accumulator + score, 0),
  )
  const minScore = Math.min(...totalScores)
  const winners = players
    .filter((_, index) => totalScores[index] === minScore)
    .map((player) => player.name)
  const winner = winners.join(", ") || "N/A"

  return (
    <div className="scorecard-container" ref={setRef}>
      <div className="scorecard-header">
        <div className="scorecard-header__brand">
          <img src={logo} alt="Logo" className="scorecard-logo" />
          <div>
            <span className="scorecard-kicker">Mini golf Eureka</span>
            <h2>Score Card #{id}</h2>
          </div>
        </div>

        <div className="scorecard-header__stats">
          <div className="scorecard-stat">
            <strong>{players.length}</strong>
            <span>Jugadores</span>
          </div>
          <div className="scorecard-stat">
            <strong>{holes}</strong>
            <span>Hoyos</span>
          </div>
        </div>
      </div>

      <p className="scorecard-scroll-note">Desliza lateralmente para ver toda la tabla.</p>

      <div className="scorecard-table-shell">
        <table className="scorecard-table">
          <thead>
            <tr>
              <th className="hole-col">Hoyos</th>
              {players.map((player) => (
                <th key={player.id} className="player-header">
                  <div className="player-name-wrapper">
                    <input
                      value={player.name}
                      onChange={(event) => updateName(player.id, event.target.value)}
                      className="player-name"
                    />
                    <button
                      type="button"
                      className="remove-player-btn"
                      onClick={() => removePlayer(player.id)}
                      disabled={players.length === 1}
                      aria-label={`Eliminar a ${player.name}`}
                    >
                      x
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: holes }, (_, index) => (
              <tr key={index}>
                <td className="hole-col">{index + 1}</td>
                {players.map((player) => (
                  <td key={player.id}>
                    <input
                      type="text"
                      value={player.scores[index] === 0 ? "" : player.scores[index]}
                      onChange={(event) =>
                        updateScore(player.id, index, event.target.value)
                      }
                      className="score-input"
                      inputMode="numeric"
                    />
                  </td>
                ))}
              </tr>
            ))}

            <tr className="totals-row">
              <td className="hole-col">Total</td>
              {totalScores.map((total, index) => (
                <td key={index}>{total}</td>
              ))}
            </tr>

            <tr className="winner-row">
              <td className="hole-col">Ganador</td>
              <td colSpan={players.length}>{winner}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="buttons">
        <button type="button" className="scorecard-action" onClick={addHole}>
          Agregar hoyo
        </button>
        <button
          type="button"
          className="scorecard-action scorecard-action--muted"
          onClick={removeHole}
        >
          Eliminar hoyo
        </button>
        <button
          type="button"
          className="scorecard-action scorecard-action--accent"
          onClick={addPlayer}
        >
          Agregar jugador
        </button>
      </div>
    </div>
  )
}
