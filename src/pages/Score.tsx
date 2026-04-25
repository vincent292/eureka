import { useCallback, useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import ScoreCard from "../components/ScoreCard"
import PDFExportButton from "../components/PDFExportButton"
import "../styles/Score.css"

export default function Score() {
  const [cards, setCards] = useState<number[]>([1])
  const pageRef = useRef<HTMLDivElement | null>(null)
  const scorecardRefs = useRef<(HTMLDivElement | null)[]>([])
  const previousCardsCount = useRef(cards.length)

  const addCard = () => {
    setCards((prev) => [...prev, prev.length + 1])
  }

  const setScorecardRef = useCallback((index: number) => {
    return (element: HTMLDivElement | null) => {
      scorecardRefs.current[index] = element
    }
  }, [])

  useEffect(() => {
    scorecardRefs.current = scorecardRefs.current.slice(0, cards.length)
  }, [cards.length])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
      })

      intro
        .from(".score-hero__eyebrow", {
          y: 12,
          autoAlpha: 0,
          duration: 0.24,
        })
        .from(
          ".score-hero__title-line",
          {
            y: 26,
            autoAlpha: 0,
            duration: 0.36,
            stagger: 0.06,
          },
          "-=0.08",
        )
        .from(
          ".score-hero__description",
          {
            y: 16,
            autoAlpha: 0,
            duration: 0.3,
          },
          "-=0.16",
        )
        .from(
          ".score-export-controls",
          {
            y: 18,
            autoAlpha: 0,
            duration: 0.32,
          },
          "-=0.12",
        )
        .from(
          ".score-card-shell",
          {
            y: 20,
            autoAlpha: 0,
            duration: 0.34,
            stagger: 0.05,
          },
          "-=0.14",
        )
    }, pageRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (cards.length <= previousCardsCount.current) {
      previousCardsCount.current = cards.length
      return
    }

    const ctx = gsap.context(() => {
      const lastCard = document.querySelector<HTMLElement>(".score-card-shell:last-child")

      if (lastCard) {
        gsap.fromTo(
          lastCard,
          {
            y: 22,
            autoAlpha: 0,
            scale: 0.985,
          },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.34,
            ease: "power3.out",
          },
        )
      }
    }, pageRef)

    previousCardsCount.current = cards.length

    return () => ctx.revert()
  }, [cards.length])

  return (
    <div className="score-page" ref={pageRef}>
      <div className="score-page__glow score-page__glow--left" />
      <div className="score-page__glow score-page__glow--right" />

      <div className="score-page__shell">
        <section className="score-hero">
          <div className="score-hero__copy">
            <span className="score-hero__eyebrow">Recuerdo de la partida</span>
            <h1 className="score-hero__title">
              <span className="score-hero__title-line">
                Exporta tu score en PDF
              </span>
              <span className="score-hero__title-line">con una foto opcional</span>
            </h1>
            <p className="score-hero__description">
              Genera una version lista para guardar o compartir con todos los
              scorecards de la ronda en un solo archivo.
            </p>
          </div>

          <PDFExportButton scorecardRefs={scorecardRefs.current.filter(Boolean)} />
        </section>

        <section className="score-page__cards">
          {cards.map((id, index) => (
            <div key={id} className="score-card-shell">
              <ScoreCard id={id} setRef={setScorecardRef(index)} />
            </div>
          ))}
        </section>

        <div className="score-page__footer">
          <button type="button" className="score-page__add-button" onClick={addCard}>
            + Nueva scorecard
          </button>
        </div>
      </div>
    </div>
  )
}
