import { Link } from "react-router-dom"
import "../styles/Novedades.css"

interface Novedad {
  img: string
  titulo: string
  descripcion: string
  etiqueta: string
}

const novedadesData: Novedad[] = [
  {
    img: "/image/novedades/novedad1.png",
    titulo: "Oktoberfest",
    descripcion: "Promos de temporada para acompanar una ronda con amigos.",
    etiqueta: "Promo destacada",
  },
  {
    img: "/image/novedades/novedad2.png",
    titulo: "Cheesecake de fresas",
    descripcion: "Un postre mas vistoso y antojable para redondear la visita.",
    etiqueta: "Favorito del mes",
  },
  {
    img: "/image/novedades/novedad3.png",
    titulo: "Galletas de la casa",
    descripcion: "Detalle casero para sumar algo rico mientras disfrutas el lugar.",
    etiqueta: "Recien horneado",
  },
]

export default function Novedades() {
  return (
    <section className="novedades-section" id="novedades" data-reveal>
      <div className="section-heading">
        <span className="section-eyebrow">Promos y lanzamientos</span>
        <h2 className="section-title">Lo nuevo que hace que quieras volver</h2>
        <p className="section-copy">
          Estas tarjetas ahora se sienten parte de una marca mas cuidada, con
          mejor composicion y mucho mas protagonismo visual.
        </p>
      </div>

      <div className="novedades-container">
        {novedadesData.map((item) => (
          <article key={item.titulo} className="novedad-card" data-reveal>
            <div className="novedad-media">
              <img src={item.img} alt={item.titulo} className="novedad-img" />
              <span className="novedad-badge">{item.etiqueta}</span>
            </div>

            <div className="novedad-content">
              <h3 className="novedad-titulo">{item.titulo}</h3>
              <p className="novedad-descripcion">{item.descripcion}</p>
            </div>
          </article>
        ))}
      </div>

      <Link to="/NovedadPage" className="novedades-link">
        Ver todas las novedades
      </Link>
    </section>
  )
}
