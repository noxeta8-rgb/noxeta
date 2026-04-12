import { useEffect, useRef } from 'react'

export default function Cursor() {
  const curRef  = useRef()
  const ringRef = useRef()

  useEffect(() => {
    const move = e => {
      if (curRef.current)  { curRef.current.style.left  = e.clientX - 4  + 'px'; curRef.current.style.top  = e.clientY - 4  + 'px' }
      if (ringRef.current) { ringRef.current.style.left = e.clientX - 18 + 'px'; ringRef.current.style.top = e.clientY - 18 + 'px' }
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <>
      <div className="cur"      ref={curRef} />
      <div className="cur-ring" ref={ringRef} />
    </>
  )
}
