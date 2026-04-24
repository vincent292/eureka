import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchNoveltyItems, type NoveltyItem } from "../lib/contentService"
import "../styles/Novedades.css"

const fallbackNovedades: NoveltyItem[] = [
  {
    id: "oktoberfest",
    imagePath: "/image/novedades/novedad1.png",
    title: "Oktoberfest",
    description: "Promos de temporada para acompanar una ronda con amigos.",
    badge: "Promo destacada",
    price: null,
  },
  {
    id: "cheesecake",
    imagePath: "/image/novedades/novedad2.png",
    title: "Cheesecake de fresas",
    description: "Un postre mas vistoso y antojable para redondear la visita.",
    badge: "Favorito del mes",
    price: null,
  },
  {
    id: "galletas",
    imagePath: "/image/novedades/novedad3.png",
    title: "Galletas de la casa",
    description: "Detalle casero para sumar algo rico mientras disfrutas el lugar.",
    badge: "Recien horneado",
    price: null,
  },
]

export default function Novedades() {
  const [items, setItems] = useState(fallbackNovedades)

  useEffect(() => {
    let isMounted = true

    fetchNoveltyItems().then((novedades) => {
      if (!isMounted || novedades.length === 0) {
        return
      }

      setItems(novedades)
    })

    return () => {
      isMounted = false
    }
  }, [])

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
        {items.map((item) => (
          <article key={item.id} className="novedad-card" data-reveal>
            <div className="novedad-media">
              <img src={item.imagePath} alt={item.title} className="novedad-img" />
              <span className="novedad-badge">{item.badge}</span>
            </div>

            <div className="novedad-content">
              <div className="novedad-heading">
                <h3 className="novedad-titulo">{item.title}</h3>
                {item.price !== null ? (
                  <span className="novedad-price">Bs {item.price.toFixed(2)}</span>
                ) : null}
              </div>
              <p className="novedad-descripcion">{item.description}</p>
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
