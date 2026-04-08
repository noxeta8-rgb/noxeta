import { useState, useEffect, useRef } from 'react'

export default function ImageSlider({
  images = [],
  slideClass = 'card-slide',
  dotClass   = 'card-dot',
  autoplay   = 0,
  showArrows = false,
  showThumbs = false,
  onSlideChange,
}) {
  const [idx, setIdx]   = useState(0)
  const timerRef        = useRef()

  const goTo = (i) => {
    const n = ((i % images.length) + images.length) % images.length
    setIdx(n)
    onSlideChange?.(n)
  }

  useEffect(() => {
    if (autoplay && images.length > 1) {
      timerRef.current = setInterval(() => setIdx(i => (i + 1) % images.length), autoplay)
    }
    return () => clearInterval(timerRef.current)
  }, [autoplay, images.length])

  if (images.length === 0) {
    return (
      <div className={slideClass} style={{ background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
        <span style={{ fontFamily:'var(--font-m)', fontSize:'9px', color:'var(--text-dim)', letterSpacing:'2px' }}>NO IMAGE</span>
      </div>
    )
  }

  return (
    <>
      {/* ✅ ADDED: outer wrapper forces Safari to clip overflow */}
     <div style={{ width:'100%', height:'100%', overflow:'hidden', position:'relative', transform:'translateZ(0)', WebkitMaskImage:'-webkit-radial-gradient(white, black)' }}>
        <div style={{ display:'flex', height:'100%', transform:`translateX(-${idx*100}%)`, transition:'transform .5s cubic-bezier(.77,0,.18,1)', willChange:'transform' }}>
          {images.map((src, i) => (
            <div key={i} className={slideClass} style={{ minWidth:'100%', height:'100%', flexShrink:0 }}>
              <img src={src} alt={`View ${i+1}`} loading={i===0?'eager':'lazy'}
                style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}
                onError={e => { e.target.style.display='none'; e.target.parentElement.style.background='var(--surface2)' }}
              />
            </div>
          ))}
        </div>
      </div>
      {/* ✅ ADDED: closing </div> for the wrapper above */}

      {/* Dots */}
      {images.length > 1 && (
        <div className="card-dots">
          {images.map((_, i) => (
            <button key={i} className={`${dotClass} ${i===idx?'active':''}`}
              onClick={e => { e.stopPropagation(); goTo(i) }} aria-label={`Slide ${i+1}`} />
          ))}
        </div>
      )}

      {/* Arrows */}
      {showArrows && images.length > 1 && (
        <>
          <button className="pd-arrow left"  onClick={() => goTo(idx-1)}>←</button>
          <button className="pd-arrow right" onClick={() => goTo(idx+1)}>→</button>
        </>
      )}

      {/* Thumbnails */}
      {showThumbs && images.length > 1 && (
        <div className="pd-thumbs">
          {images.map((src, i) => (
            <img key={i} src={src} className={`pd-thumb ${i===idx?'active':''}`}
              alt={`Thumb ${i+1}`} onClick={() => goTo(i)}
              onError={e => { e.target.style.background='var(--surface2)'; e.target.removeAttribute('src') }}
            />
          ))}
        </div>
      )}
    </>
  )
}
