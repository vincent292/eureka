import { useEffect, useState } from "react"
import { fetchPedidosYaPromo, type PedidosYaPromo } from "../lib/contentService"
import "../styles/PedidosYA.css"

const fallbackPromo: PedidosYaPromo = {
  id: "fallback",
  title: "Si el plan sigue en casa, el sabor tambien",
  description:
    "Esta seccion ahora remata mejor la landing con un bloque mas atractivo, claro y alineado al resto del recorrido visual.",
  imagePath: "/image/novedades/novedad2.png",
  ctaLabel: "Pedir en PedidosYa",
  ctaUrl:
    "https://www.pedidosya.com.bo/restaurantes/cochabamba/eureka-cbba-cbf01504-3f94-450c-9c8c-38cbaff401bf-menu",
  points: ["Pedido rapido", "Sin salir de casa", "Postres y antojos"],
}

export default function PedidosYA() {
  const [promo, setPromo] = useState(fallbackPromo)

  useEffect(() => {
    let isMounted = true

    fetchPedidosYaPromo().then((pedidosYaPromo) => {
      if (!isMounted || !pedidosYaPromo) {
        return
      }

      setPromo(pedidosYaPromo)
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="pedidosya-section" data-reveal>
      <div className="pedidosya-container">
        <div className="pedidosya-left">
          <span className="section-eyebrow">Delivery</span>
          <h2 className="section-title">{promo.title}</h2>
          <p className="section-copy">{promo.description}</p>

          <div className="pedidosya-points">
            {promo.points.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>

          <a
            className="pedidosya-link"
            href={promo.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {promo.ctaLabel}
          </a>
        </div>

        <div className="pedidosya-right">
          <div className="pedidosya-card">
            <img src={promo.imagePath} alt={promo.title} />
            <div className="pedidosya-card__content">
              <span>Postres y antojos</span>
              <strong>{promo.title}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
