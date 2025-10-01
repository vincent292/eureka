
import "../styles/PedidosYA.css";

export default function PedidosYA() {
  return (
    <section className="pedidosya-section">
      <div className="pedidosya-container">
        {/* Lado izquierdo */}
        <div className="pedidosya-left">
          <h2>Servicio a domicilio</h2>
          <p>Realiza tu pedido en línea y recíbelo en la puerta de tu casa</p>
          <a
            href="https://www.pedidosya.com.bo/restaurantes/cochabamba/eureka-cbba-cbf01504-3f94-450c-9c8c-38cbaff401bf-menu"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://s3-eu-central-1.amazonaws.com/bk-bo-demo.menu.app/wp-media-folder-burger-king-bolivia//home/ubuntu/wordpress/web/app/uploads/sites/9/LOGO-pedidos-ya-128x60-1.png"
              alt="PedidosYA"
              className="pedidosya-btn"
            />
          </a>
        </div>

        {/* Lado derecho */}
        <div className="pedidosya-right">
          <img src="/image/novedades/novedad2.png" alt="Producto Eureka" />
        </div>
      </div>
    </section>
  );
}
