import { Link } from 'react-router-dom'
import GameBackground from '../../components/GameBackground'
import SEOHead from '../../components/SEOHead'
import { POSTS } from './posts'

export default function BlogIndex() {
  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <SEOHead
        title="Blog"
        description="Tips, guides and stories about renting gaming and music gear in Bangalore."
      />
      <div className="grid-floor" /><GameBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <p className="section-label mb-2">लोकल Den Blog</p>
        <h1 className="font-bungee mb-2" style={{ fontSize: 'clamp(2rem,6vw,3.5rem)' }}>
          Gear <span className="gradient-text">Stories</span>
        </h1>
        <p className="font-display mb-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Tips, guides and stories from Bangalore's rental community.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map(post => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="block group">
              <div className="glass rounded-2xl p-6 h-full flex flex-col transition-all duration-300 group-hover:scale-[1.02]"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-4xl mb-4">{post.emoji}</div>
                <span className={post.category === 'gaming' ? 'tag-gaming' : 'tag-music'} style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>
                  {post.category}
                </span>
                <h2 className="font-bungee text-base text-white mt-3 mb-2 leading-snug flex-1">{post.title}</h2>
                <p className="text-sm font-display mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs font-display" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <span>{new Date(post.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>{post.readTime} read</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
