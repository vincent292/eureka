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
      <img src={eureka} alt="Eureka. logo" className="logo"/>
    </div>
      <nav ref={navRef}>
        <a href="/#">Home</a>
        <a href="/Score">Score Bar</a>
        <a href="/#">Blog</a>
        <a href="/#">About me</a>
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
