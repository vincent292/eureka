import "../styles/UbicacionSection.css"

export default function UbicacionSection() {
  return (
    <section className="ubicacion-section">
      <div className="ubicacion-container">
        {/* Texto lado izquierdo */}
        <div className="ubicacion-texto">
          <h2>📍 Ubicación</h2>
          <p>Encuéntranos cerca de ti y disfruta de la experiencia del Minigolf.</p>
        </div>

        {/* Mapa lado derecho */}
        <div className="ubicacion-mapa">
          <iframe
            title="Google Maps"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237.99581129598806!2d-66.18542143398575!3d-17.3669576316087!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93e3750e3baef25f%3A0xdf485070f31e9514!2sEureka%20-%20Mini%20golf!5e0!3m2!1ses-419!2sbo!4v1759345786420!5m2!1ses-419!2sbo"
           
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </section>
  )
}
