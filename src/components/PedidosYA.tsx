import "../styles/PedidosYA.css"

export default function PedidosYA() {
  return (
    <section className="pedidosya-section" data-reveal>
      <div className="pedidosya-container">
        <div className="pedidosya-left">
          <span className="section-eyebrow">Delivery</span>
          <h2 className="section-title">Si el plan sigue en casa, el sabor tambien</h2>
          <p className="section-copy">
            Esta seccion ahora remata mejor la landing con un bloque mas atractivo,
            claro y alineado al resto del recorrido visual.
          </p>

          <div className="pedidosya-points">
            <span>Pedido rapido</span>
            <span>Visual mas limpio</span>
            <span>CTA mas visible</span>
          </div>

          <a
            className="pedidosya-link"
            href="https://www.pedidosya.com.bo/restaurantes/cochabamba/eureka-cbba-cbf01504-3f94-450c-9c8c-38cbaff401bf-menu"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pedir en PedidosYa
          </a>
        </div>

        <div className="pedidosya-right">
          <div className="pedidosya-card">
            <img src="/image/novedades/novedad2.png" alt="Producto Eureka" />
            <div className="pedidosya-card__content">
              <span>Postres y antojos</span>
              <strong>Listo para seguir el plan sin salir</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
