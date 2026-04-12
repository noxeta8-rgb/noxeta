import { useEffect, useRef } from 'react'

export default function ScrollReveal({ children, className = '', delay = 0 }) {
  const ref = useRef()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('vis'); obs.unobserve(el) } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const delayClass = delay ? `d${delay}` : ''
  return (
    <div ref={ref} className={`rv ${delayClass} ${className}`}>
      {children}
    </div>
  )
}
