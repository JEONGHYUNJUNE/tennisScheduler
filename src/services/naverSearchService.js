import { supabase } from '../lib/supabase'

export async function searchNaver(query) {
  const keyword = query.trim()
  if (!keyword) return []

  const { data, error } = await supabase.functions.invoke('naver-search', {
    body: { query: keyword },
  })

  if (error) throw new Error(error.message || '검색 결과를 불러오지 못했습니다.')
  if (data?.error) throw new Error(data.error)

  return Array.isArray(data?.items) ? data.items : []
}
