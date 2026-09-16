import { useEffect } from 'react'

/**
 * SEOHead — sets document title + meta tags per page.
 * No external dependencies needed.
 */
export default function SEOHead({ title, description, image, url }) {
  useEffect(() => {
    const base = 'लोकल Den'
    document.title = title
      ? `${title} · ${base}`
      : `${base} — Rent Gaming & Music Gear in Bangalore`

    const setMeta = (name, content, isProp = false) => {
      if (!content) return
      const attr = isProp ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const desc = description || 'Rent gaming gear and music instruments in Bangalore by the day.'
    const img  = image  || '/og-image.png'
    const href = url    || window.location.href

    setMeta('description', desc)
    setMeta('og:title',       title || base,  true)
    setMeta('og:description', desc,           true)
    setMeta('og:image',       img,            true)
    setMeta('og:url',         href,           true)
    setMeta('og:type',        'website',      true)
    setMeta('twitter:card',        'summary_large_image')
    setMeta('twitter:title',       title || base)
    setMeta('twitter:description', desc)
    setMeta('twitter:image',       img)
  }, [title, description, image, url])

  return null
}
