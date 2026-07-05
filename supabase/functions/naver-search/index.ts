// @ts-nocheck
// Supabase Edge Function runs on Deno; IntelliJ's Node TypeScript checker does not resolve Deno globals.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const naverSearchEndpoint = 'https://openapi.naver.com/v1/search/webkr.json'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'POST 요청만 지원합니다.' }, 405)
    }

    const authHeader = request.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: '로그인이 필요합니다.' }, 401)
    }

    const clientId = Deno.env.get('NAVER_CLIENT_ID') || ''
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET') || ''
    if (!clientId || !clientSecret) {
      return jsonResponse({ error: '네이버 검색 API 키가 설정되지 않았습니다.' }, 500)
    }

    const payload = await request.json().catch(() => ({}))
    const query = String(payload.query || '').trim()
    if (!query) {
      return jsonResponse({ items: [] })
    }
    if (query.length > 80) {
      return jsonResponse({ error: '검색어는 80자 이하로 입력해 주세요.' }, 400)
    }

    const url = new URL(naverSearchEndpoint)
    url.searchParams.set('query', query)
    url.searchParams.set('display', '5')
    url.searchParams.set('start', '1')
    url.searchParams.set('sort', 'sim')

    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })

    if (!response.ok) {
      const message = await response.text().catch(() => '')
      return jsonResponse({ error: message || '네이버 검색 결과를 불러오지 못했습니다.' }, response.status)
    }

    const data = await response.json()
    const items = (data.items || []).map((item) => {
      const link = String(item.link || '')
      return {
        title: cleanNaverText(item.title),
        snippet: cleanNaverText(item.description),
        link,
        source: getLinkHost(link),
      }
    }).filter((item) => item.title && item.link)

    return jsonResponse({ items })
  } catch (error) {
    console.error(error)
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})

function cleanNaverText(value: unknown) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function getLinkHost(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
