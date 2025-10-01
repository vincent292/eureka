import { Link } from "react-router-dom"
import HeroCarousel from "../components/HeroCarousel"

export default function Landing() {
  const images = [
    "https://picsum.photos/id/1018/1920/1080",
    "https://picsum.photos/id/1015/1920/1080",
    "https://picsum.photos/id/1016/1920/1080",
  ]

  return (
    <div>
      {/* Carrusel a pantalla completa */}
      <HeroCarousel images={images} interval={4000} />

      {/* Contenido debajo */}
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h1>Bienvenido al Minigolf</h1>
        <p>¡Disfruta tu juego y registra tu score!</p>
        <Link to="/score">Ir a Score</Link>
      </div>
    </div>
  )
}
