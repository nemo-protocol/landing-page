import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface CarouselProps {
  images: string[]
  interval?: number
}

export default function Carousel({ images, interval = 3000 }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<number>()

  useEffect(() => {
    const startTimer = () => {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
      }, interval)
    }

    startTimer()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [images.length, interval])

  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, interval)
  }

  return (
    <div className="relative overflow-hidden shrink-0 mx-auto lg:mx-0">
      <AnimatePresence initial={false}>
        <div className="w-full mx-auto lg:mx-0 max-w-[600px] xl:h-[140px]">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Slide ${currentIndex + 1}`}
            className="relative w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </AnimatePresence>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-4 h-1.5 rounded-full ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
