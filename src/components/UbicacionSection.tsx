import "../styles/UbicacionSection.css"

export default function UbicacionSection() {
  return (
    <section className="ubicacion-section" data-reveal>
      <div className="ubicacion-shell">
        <div className="ubicacion-texto">
          <span className="section-eyebrow">Ubicacion</span>
          <h2 className="section-title">Facil de encontrar, dificil de olvidar</h2>
          <p className="section-copy">
            La zona de ubicacion ahora se siente mas premium, con mejor equilibrio
            entre informacion, mapa y llamada a la accion.
          </p>

          <div className="ubicacion-pills">
            <span>Ideal para salir con amigos</span>
            <span>Plan casual o despues del trabajo</span>
            <span>Minigolf y cafe en un mismo lugar</span>
          </div>

          <a
            className="ubicacion-link"
            href="https://maps.google.com/?q=Eureka%20Mini%20Golf%20Cochabamba"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en Google Maps
          </a>
        </div>

        <div className="ubicacion-mapa">
          <iframe
            title="Google Maps"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237.99581129598806!2d-66.18542143398575!3d-17.3669576316087!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93e3750e3baef25f%3A0xdf485070f31e9514!2sEureka%20-%20Mini%20golf!5e0!3m2!1ses-419!2sbo!4v1759345786420!5m2!1ses-419!2sbo"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}
