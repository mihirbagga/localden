import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, MapPin, Star, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import SEOHead from '../components/SEOHead'

export default function ListerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      
      const { data: lData } = await supabase
        .from('listings')
        .select('*, profiles(full_name, rating, kyc_status)')
        .eq('user_id', id)
        .eq('is_published', true)
        
      if (pData) setProfile(pData)
      if (lData) setListings(lData)
      setLoading(false)
    }
    
    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-20">
        <GameBackground />
        <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[var(--magenta)] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-20">
        <GameBackground />
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bungee text-white mb-4">Lister Not Found</h2>
          <button onClick={() => navigate('/browse')} className="btn-primary">Browse Listings</button>
        </div>
      </div>
    )
  }

  const isVerified = profile.kyc_status === 'verified'
  const rating = profile.rating || 0
  const joinYear = new Date(profile.created_at || Date.now()).getFullYear()

  return (
    <div className="min-h-screen pt-24 px-4 pb-20">
      <SEOHead 
        title={`${profile.full_name}'s Hardware Store | localDen`}
        description={`Rent hardware from ${profile.full_name} on localDen.`}
      />
      <GameBackground />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors text-sm font-display font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="glass p-6 rounded-3xl mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-white/5 border-2 border-white/10 flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-white font-bungee">{profile.full_name?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bungee text-white">{profile.full_name}</h1>
              {isVerified && (
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 backdrop-blur-md">
                  <Shield size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Verified Owner</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm font-display text-white/60 flex-wrap mb-4">
              {profile.city && (
                <div className="flex items-center gap-1">
                  <MapPin size={14} className="text-[var(--magenta)]" />
                  <span>{profile.city}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>Member since {joinYear}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-display font-bold uppercase tracking-wider text-white flex-wrap">
              <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                <span className="text-[var(--magenta)] text-base mr-1">{listings.length}</span> Listings
              </div>
              {rating > 0 && (
                <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-1">
                  <Star size={14} className="text-[#ffd23f]" />
                  <span className="text-[#ffd23f]">{rating.toFixed(1)}</span>
                </div>
              )}
              <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                ⚡ &lt;15 min reply
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 mb-6">Active Listings</h2>
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(l => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 glass rounded-3xl">
              <p className="text-white/50 font-display">No active listings right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
