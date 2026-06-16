import { supabase, toAuthEmail } from '../lib/supabase'

export async function signIn(userId, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(userId),
    password,
  })
  if (error) throw error
  return data
}

export async function signUp({ userId, password, name, tennisStartDate }) {
  const normalizedUserId = userId.trim().toLowerCase()
  const { data, error } = await supabase.auth.signUp({
    email: toAuthEmail(normalizedUserId),
    password,
  })
  if (error) throw error

  if (data.user) {
    const { error: profileError } = await supabase.from('otmember').insert({
      id: data.user.id,
      username: normalizedUserId,
      display_name: name.trim(),
      tennis_start_date: tennisStartDate || null,
      role: 'member',
      is_active: true,
    })
    if (profileError) throw profileError
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(authUser) {
  const { data, error } = await supabase
    .from('otmember')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()
  if (error) throw error

  if (data) return normalizeProfile(data)

  const username = authUser.email?.split('@')[0]?.toLowerCase()
  if (!username) throw new Error('로그인 아이디를 확인할 수 없습니다.')

  const metadata = authUser.user_metadata || {}
  const { data: created, error: createError } = await supabase
    .from('otmember')
    .insert({
      id: authUser.id,
      username,
      display_name: metadata.name || metadata.display_name || username,
      tennis_start_date: metadata.tennis_start_date || null,
      role: 'member',
      is_active: true,
    })
    .select()
    .single()

  if (createError?.code === '23505') {
    return normalizeProfile({
      id: authUser.id,
      username,
      display_name: metadata.name || metadata.display_name || username,
      tennis_start_date: metadata.tennis_start_date || null,
      role: 'member',
      is_active: true,
    })
  }
  if (createError) throw createError
  return normalizeProfile(created)
}

function normalizeProfile(profile) {
  return {
    ...profile,
    auth_user_id: profile.id,
    user_id: profile.username,
    name: profile.display_name,
  }
}
