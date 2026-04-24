import { useEffect, useRef } from "react"
import { FaBars, FaTimes } from "react-icons/fa"
import { Link, NavLink, useLocation } from "react-router-dom"
import "../styles/navbar.css"

function Navbar() {
  const navRef = useRef<HTMLElement | null>(null)
  const location = useLocation()

  const toggleNavbar = () => {
    navRef.current?.classList.toggle("responsive_nav")
  }

  const closeNavbar = () => {
    navRef.current?.classList.remove("responsive_nav")
  }

  useEffect(() => {
    closeNavbar()
  }, [location.pathname])

  return (
    <header className="site-header">
      <div className="site-header__shell">
        <Link to="/" className="brand" aria-label="Ir al inicio">
          <img src="/image/eureka.png" alt="Eureka logo" className="logo" />
          <div className="brand-copy">
            <span className="brand-kicker">Eureka</span>
            <strong>Mini golf and cafe</strong>
          </div>
        </Link>

        <nav ref={navRef} className="site-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/score"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Score
          </NavLink>
          <NavLink
            to="/reservas"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Reservas
          </NavLink>
          <NavLink
            to="/NovedadPage"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Novedades
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `nav-link nav-link--cta${isActive ? " active" : ""}`
            }
          >
            Admin
          </NavLink>

          <button
            type="button"
            className="nav-btn nav-close-btn"
            onClick={toggleNavbar}
            aria-label="Cerrar menu"
          >
            <FaTimes />
          </button>
        </nav>

        <button
          type="button"
          className="nav-btn nav-open-btn"
          onClick={toggleNavbar}
          aria-label="Abrir menu"
        >
          <FaBars />
        </button>
      </div>
    </header>
  )
}

export default Navbar
