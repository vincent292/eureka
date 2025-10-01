import React, { useState, useEffect } from "react";
import "../styles/HeroCarousel.css";

interface CarouselProps {
  images: string[];
  interval?: number;
}

const HeroCarousel: React.FC<CarouselProps> = ({ images, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const slide = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(slide);
  }, [images.length, interval]);

  return (
    <div className="hero-carousel">
      <div
        className="hero-carousel__slides"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            className="hero-carousel__slide"
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
      </div>

      {/* indicadores */}
      <div className="hero-carousel__indicators">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`hero-carousel__dot ${
              currentIndex === idx ? "active" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
