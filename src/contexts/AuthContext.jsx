import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
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
  const profileRef = useRef(null)

  const refreshProfile = useCallback(async (nextSession) => {
    const resolvedSession = nextSession ?? (await supabase.auth.getSession()).data.session
    const currentProfile = profileRef.current
    const isSameUser = currentProfile?.auth_user_id && currentProfile.auth_user_id === resolvedSession?.user?.id
    setSession(resolvedSession)

    if (!resolvedSession?.user) {
      profileRef.current = null
      setProfile(null)
      setLoading(false)
      return
    }

    if (isSameUser) {
      setLoading(false)
    } else {
      profileRef.current = null
      setProfile(null)
      setLoading(true)
    }

    try {
      const nextProfile = await getProfile(resolvedSession.user)
      profileRef.current = nextProfile
      setProfile(nextProfile)
    } catch (error) {
      console.error('회원 프로필 조회 실패:', error)
      setProfile((currentProfile) => currentProfile || null)
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
