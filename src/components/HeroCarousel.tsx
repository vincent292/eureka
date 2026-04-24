import React, { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import "../styles/HeroCarousel.css"

interface CarouselProps {
  images: string[]
  interval?: number
}

const HeroCarousel: React.FC<CarouselProps> = ({ images, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const slider = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, interval)

    return () => window.clearInterval(slider)
  }, [images.length, interval])

  useEffect(() => {
    slideRefs.current.forEach((slide, index) => {
      if (!slide) {
        return
      }

      gsap.set(slide, { autoAlpha: index === currentIndex ? 1 : 0 })
    })
  }, [currentIndex])

  useEffect(() => {
    const activeSlide = slideRefs.current[currentIndex]
    const activeImage = imageRefs.current[currentIndex]

    if (!activeSlide || !activeImage) {
      return
    }

    slideRefs.current.forEach((slide, index) => {
      if (!slide || index === currentIndex) {
        return
      }

      gsap.to(slide, {
        autoAlpha: 0,
        duration: 0.85,
        ease: "power2.out",
      })
    })

    gsap.fromTo(
      activeSlide,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: 1.1,
        ease: "power2.out",
      },
    )

    gsap.fromTo(
      activeImage,
      { scale: 1.14 },
      {
        scale: 1,
        duration: interval / 1000 + 1.2,
        ease: "none",
      },
    )
  }, [currentIndex, interval])

  return (
    <section className="hero-carousel">
      <div className="hero-carousel__ambient hero-carousel__ambient--left" />
      <div className="hero-carousel__ambient hero-carousel__ambient--right" />

      <div className="hero-carousel__viewport">
        {images.map((img, index) => (
          <div
            key={img}
            ref={(element) => {
              slideRefs.current[index] = element
            }}
            className={`hero-carousel__slide ${
              currentIndex === index ? "is-active" : ""
            }`}
          >
            <div
              ref={(element) => {
                imageRefs.current[index] = element
              }}
              className="hero-carousel__image"
              style={{ backgroundImage: `url(${img})` }}
            />
          </div>
        ))}
      </div>

      <div className="hero-carousel__overlay" />

      <div className="hero-carousel__indicators">
        {images.map((_, index) => (
          <button
            key={`indicator-${index}`}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={`hero-carousel__dot ${
              currentIndex === index ? "active" : ""
            }`}
            aria-label={`Mostrar imagen ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

export default HeroCarousel
