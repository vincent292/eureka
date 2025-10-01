import { Link } from "react-router-dom"
import HeroCarousel from "../components/HeroCarousel"
import UbicacionSection from "../components/UbicacionSection"


export default function Landing() {
  const images = [
    "image/hero/hero1.jpg",
    "image/hero/hero2.jpg",
    "image/hero/hero3.jpg",
    "image/hero/hero4.jpg",
    "image/hero/hero5.jpg",
  ]

  return (
    <div>
      {/* Carrusel a pantalla completa */}
      <HeroCarousel images={images} interval={4000} />

      {/* Contenido debajo */}
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h1>Bienvenido al Minigolf</h1>
        <h1>EUREKA</h1>
        <p>¡Disfruta tu juego y registra tu score!</p>
        <Link to="/score">Ir a Score</Link>
      </div>
      <UbicacionSection />
    </div>
  )
}
