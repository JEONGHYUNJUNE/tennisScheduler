import { supabase, toAuthEmail } from '../lib/supabase'

const missingGoogleLinkColumnCodes = new Set(['42703', 'PGRST204'])

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

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error) throw error
  return data
}

export async function completeGoogleProfile({ userId, name, tennisStartDate }, authUser) {
  const normalizedUserId = userId.trim().toLowerCase()
  const displayName = name.trim()

  const { data, error } = await supabase
    .from('otmember')
    .insert({
      id: authUser.id,
      username: normalizedUserId,
      display_name: displayName,
      tennis_start_date: tennisStartDate || null,
      role: 'member',
      is_active: true,
    })
    .select()
    .single()

  if (error?.code === '23505') {
    throw new Error('이미 사용 중인 아이디입니다.')
  }
  if (error) throw error
  return normalizeProfile(data)
}

export async function linkGoogleToExistingProfile({ userId, password }, googleAuthUser) {
  const normalizedUserId = userId.trim().toLowerCase()

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(normalizedUserId),
    password,
  })

  if (verifyError) {
    throw new Error('기존 아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from('otmember')
    .select('*')
    .eq('username', normalizedUserId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!existingProfile) throw new Error('연결할 기존 회원 정보를 찾을 수 없습니다.')
  if (existingProfile.google_auth_user_id && existingProfile.google_auth_user_id !== googleAuthUser.id) {
    throw new Error('이미 다른 Google 계정과 연결된 아이디입니다.')
  }

  const { error: updateError } = await supabase
    .from('otmember')
    .update({ google_auth_user_id: googleAuthUser.id })
    .eq('id', existingProfile.id)

  if (updateError) throw updateError

  const { error: restoreError } = await supabase.auth.setSession({
    access_token: googleAuthUser.access_token,
    refresh_token: googleAuthUser.refresh_token,
  })
  if (restoreError) throw restoreError

  return normalizeProfile({
    ...existingProfile,
    google_auth_user_id: googleAuthUser.id,
  })
}

export async function getProfile(authUser) {
  const linkedProfileResult = await supabase
    .from('otmember')
    .select('*')
    .eq('google_auth_user_id', authUser.id)
    .maybeSingle()

  if (!linkedProfileResult.error) {
    if (linkedProfileResult.data) return normalizeProfile(linkedProfileResult.data)
  } else if (!isMissingGoogleLinkColumnError(linkedProfileResult.error)) {
    throw linkedProfileResult.error
  }

  const { data, error } = await supabase
    .from('otmember')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()
  if (error) throw error

  if (data) return normalizeProfile(data)

  const isGoogleUser = authUser.app_metadata?.provider === 'google'
  if (isGoogleUser) return null

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

export function getGoogleProfileDefaults(authUser) {
  const metadata = authUser?.user_metadata || {}
  const emailPrefix = authUser?.email?.split('@')[0] || ''

  return {
    userId: emailPrefix.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 20),
    name: metadata.full_name || metadata.name || '',
    tennisStartDate: '',
  }
}

function isMissingGoogleLinkColumnError(error) {
  return missingGoogleLinkColumnCodes.has(error.code) || /google_auth_user_id/.test(error.message || '')
}
