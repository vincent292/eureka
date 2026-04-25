import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import HeroCarousel from "../components/HeroCarousel"
import UbicacionSection from "../components/UbicacionSection"
import Novedades from "../components/Novedades"
import PedidosYA from "../components/PedidosYA"
import { fetchHeroSlides } from "../lib/contentService"
import "../styles/Landing.css"

gsap.registerPlugin(ScrollTrigger)

const fallbackImages = [
  "image/hero/hero1.webp",
  "image/hero/hero2.webp",
  "image/hero/hero3.webp",
  "image/hero/hero4.webp",
  "image/hero/hero5.webp",
]

export default function Landing() {
  const landingRef = useRef<HTMLDivElement | null>(null)
  const [images, setImages] = useState(fallbackImages)

  useEffect(() => {
    let isMounted = true

    fetchHeroSlides().then((slides) => {
      if (!isMounted || slides.length === 0) {
        return
      }

      setImages(slides.map((slide) => slide.imagePath))
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const heroTimeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      })

      heroTimeline
        .from(".landing-pill", {
          y: 14,
          autoAlpha: 0,
          duration: 0.32,
        })
        .from(
          ".landing-hero__title-line",
          {
            y: 34,
            autoAlpha: 0,
            duration: 0.46,
            stagger: 0.07,
          },
          "-=0.08",
        )
        .from(
          ".landing-hero__description",
          {
            y: 18,
            autoAlpha: 0,
            duration: 0.34,
          },
          "-=0.2",
        )
        .from(
          ".landing-hero__actions > *",
          {
            y: 14,
            autoAlpha: 0,
            duration: 0.28,
            stagger: 0.07,
          },
          "-=0.15",
        )
        .from(
          ".landing-panel",
          {
            x: 24,
            autoAlpha: 0,
            duration: 0.42,
          },
          "-=0.24",
        )

      gsap.to(".landing-panel__glow", {
        x: 18,
        y: -18,
        duration: 4.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      })

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(
          element,
          {
            y: 26,
            autoAlpha: 0,
          },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.42,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 88%",
            },
          },
        )
      })
    }, landingRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="landing-page" ref={landingRef}>
      <HeroCarousel images={images} interval={4500} />

      <section className="landing-hero">
        <div className="landing-hero__content">
          <span className="landing-pill">Minigolf, cafe y una salida distinta</span>

          <h1 className="landing-hero__title">
            <span className="landing-hero__title-line">EUREKA convierte</span>
            <span className="landing-hero__title-line">
              una tarde normal en planazo
            </span>
          </h1>

          <p className="landing-hero__description">
            Ven a jugar, compartir y registrar tu partida con una experiencia mas
            moderna, visual y lista para enganchar desde el primer vistazo.
          </p>

          <div className="landing-hero__actions">
            <Link to="/score" className="landing-hero-link landing-hero-link--primary">
              Registrar score
            </Link>
            <a href="#novedades" className="landing-hero-link landing-hero-link--ghost">
              Ver novedades
            </a>
          </div>
        </div>

        <aside className="landing-panel">
          <div className="landing-panel__glow" />
          <span className="landing-panel__eyebrow">Tu visita</span>
          <h2>Un espacio para jugar, compartir y pasarla bien</h2>
          <p>
            Minigolf, cafe y un ambiente relajado para venir en pareja, con
            amigos o en grupo y disfrutar algo distinto en la ciudad.
          </p>

          <ul className="landing-panel__list">
            <li>Ideal para una salida casual y diferente</li>
            <li>Promos, snacks y postres para acompanar la ronda</li>
            <li>Acceso rapido al score para registrar la partida</li>
          </ul>
        </aside>
      </section>

      <Novedades />
      <UbicacionSection />
      <PedidosYA />
    </div>
  )
}
