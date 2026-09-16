import { useParams, Link } from 'react-router-dom'
import GameBackground from '../../components/GameBackground'
import SEOHead from '../../components/SEOHead'
import { POSTS } from './posts'

export default function BlogPost() {
  const { slug } = useParams()
  const post = POSTS.find(p => p.slug === slug)

  if (!post) return (
    <div className="relative min-h-screen pt-24 flex items-center justify-center">
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 text-center px-4">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="font-bungee text-2xl text-white mb-4">Post Not Found</h2>
        <Link to="/blog" className="btn-primary">Back to Blog</Link>
      </div>
    </div>
  )

  const paragraphs = post.body.trim().split('\n\n')

  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <SEOHead title={post.title} description={post.excerpt} />
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        <Link to="/blog"
          className="inline-flex items-center gap-2 text-sm font-display mb-8 transition-colors hover:text-white"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          ← Back to Blog
        </Link>

        <div className="text-5xl mb-4">{post.emoji}</div>
        <span className={post.category === 'gaming' ? 'tag-gaming' : 'tag-music'} style={{ fontSize: '0.65rem' }}>
          {post.category}
        </span>
        <h1 className="font-bungee text-3xl text-white mt-4 mb-3 leading-snug">{post.title}</h1>
        <div className="flex items-center gap-4 text-xs font-display mb-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>{new Date(post.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span>{post.readTime} read</span>
        </div>

        <div className="space-y-5">
          {paragraphs.map((p, i) => {
            if (p.startsWith('## ')) return (
              <h2 key={i} className="font-bungee text-xl text-white mt-8 pt-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {p.replace('## ', '')}
              </h2>
            )
            const lines = p.split('\n')
            if (lines.every(l => l.startsWith('- '))) return (
              <ul key={i} className="space-y-2 pl-2">
                {lines.map((item, j) => (
                  <li key={j} className="flex gap-2 text-sm font-display" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ color: '#ff2e6d', flexShrink: 0 }}>▸</span>
                    {item.replace('- ', '')}
                  </li>
                ))}
              </ul>
            )
            return (
              <p key={i} className="text-sm font-display leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {p}
              </p>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 rounded-2xl text-center"
          style={{ background: 'rgba(255,46,109,0.08)', border: '1px solid rgba(255,46,109,0.2)' }}>
          <p className="font-bungee text-lg text-white mb-2">Ready to Rent?</p>
          <p className="font-display text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Browse gear near you in Bangalore.
          </p>
          <Link to="/browse" className="btn-primary">Browse Listings →</Link>
        </div>
      </div>
    </div>
  )
}
