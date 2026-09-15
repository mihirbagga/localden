import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useWallet() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState({ available: 0, pending: 0 })
  const [entries, setEntries] = useState([])
  const [referrals, setReferrals] = useState([])
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(Boolean(user))

  const load = useCallback(async () => {
    if (!user) {
      setWallet({ available: 0, pending: 0 })
      setEntries([])
      setReferrals([])
      setCode('')
      setLoading(false)
      return
    }
    setLoading(true)
    const ensured = await supabase.rpc('ensure_referral_code')
    if (!ensured.error && ensured.data) setCode(ensured.data)

    const [w, e, r, p] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('wallet_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('referrals').select('*, referee:profiles!referee_id(full_name)').eq('referrer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('referral_code').eq('id', user.id).maybeSingle(),
    ])

    if (!w.error && w.data) setWallet({ available: w.data.available || 0, pending: w.data.pending || 0 })
    if (!e.error) setEntries(e.data || [])
    if (!r.error) setReferrals(r.data || [])
    if (!p.error && p.data?.referral_code) setCode(p.data.referral_code)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  return { wallet, entries, referrals, code, loading, refresh: load }
}
