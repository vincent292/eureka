import { useRef } from "react"
import { FaBars, FaTimes } from "react-icons/fa"
import "../styles/navbar.css"
import eureka from "../../public/image/eureka.png"

function Navbar() {
  // Tipamos el ref para que apunte a un elemento <nav>
  const navRef = useRef<HTMLElement | null>(null)

  const showNavbar = () => {
    navRef.current?.classList.toggle("responsive_nav")
  }

  return (
    <header>
<div>
  <a href="/" target="_blank" rel="noopener noreferrer">
    <img src={eureka} alt="Eureka logo" className="logo" />
  </a>
</div>
      <nav ref={navRef}>
        <a href="/">Home</a>
        <a href="/Score">Score Bar</a>
        <a href="/NovedadPage">Novedades</a>
        <a href="/admin">Admin</a>
        <button className="nav-btn nav-close-btn" onClick={showNavbar}>
          <FaTimes />
        </button>
      </nav>
      <button className="nav-btn" onClick={showNavbar}>
        <FaBars />
      </button>
    </header>
  )
}

export default Navbar
