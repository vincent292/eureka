
import "../styles/Novedades.css";

interface Novedad {
  img: string;
  titulo: string;
  descripcion: string;
}

const novedadesData: Novedad[] = [
  {
    img: "/image/novedades/novedad1.png",
    titulo: "Oktoberfest",
    descripcion: "Las mejores promociones en Eureka beer.",
  },
  {
    img: "/image/novedades/novedad2.png",
    titulo: "Chesscake de Fresas",
    descripcion: "2x1 25Bs en cualquier chesscake.",
  },
  {
    img: "/image/novedades/novedad3.png",
    titulo: "Galletas de la casa",
    descripcion: "Galletas sabor vainilla recien horneadas.",
  },
];

export default function Novedades() {
  return (
    <section className="novedades-section">
      <h2 className="novedades-title">Novedades</h2>
      <div className="novedades-container">
        {novedadesData.map((item, index) => (
          <div key={index} className="novedad-card">
            <img src={item.img} alt={item.titulo} className="novedad-img" />
            <h3 className="novedad-titulo">{item.titulo}</h3>
            <p className="novedad-descripcion">{item.descripcion}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
