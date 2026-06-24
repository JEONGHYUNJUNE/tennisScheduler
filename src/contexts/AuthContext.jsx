import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/authService'

const AuthContext = createContext({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async (nextSession) => {
    const resolvedSession = nextSession ?? (await supabase.auth.getSession()).data.session
    setLoading(true)
    setSession(resolvedSession)
    setProfile(null)
    if (!resolvedSession?.user) {
      setLoading(false)
      return
    }
    try {
      setProfile(await getProfile(resolvedSession.user))
    } catch (error) {
      console.error('회원 프로필 조회 실패:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadProfile = async (nextSession) => {
      if (!active) return
      await refreshProfile(nextSession)
    }

    supabase.auth.getSession().then(({ data }) => loadProfile(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => {
        loadProfile(nextSession)
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [refreshProfile])

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin: profile?.role === 'admin', refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
