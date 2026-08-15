const notifyTo = Deno.env.get('PROMOTION_INTEREST_NOTIFY_TO') ?? 'daga4242@gmail.com'
const notifyFrom = Deno.env.get('PROMOTION_INTEREST_NOTIFY_FROM') ?? 'in C <daga42@naver.com>'
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const webhookSecret = Deno.env.get('PROMOTION_INTEREST_WEBHOOK_SECRET')

const roleLabels: Record<string, string> = {
  performer: '연주자',
  planner: '기획자',
  ensemble: '단체/앙상블',
  other: '기타'
}

const recitalStatusLabels: Record<string, string> = {
  scheduled: '날짜가 잡힌 클래식 연주회가 있음',
  planning: '연주회를 준비 중이며 홍보 방향을 미리 잡고 싶음',
  notYet: '아직 정해진 연주회는 없지만 관심 있음'
}

const helpLabels: Record<string, string> = {
  audienceTarget: '관객 타깃 정리',
  copywriting: '연주회 소개 문구와 콘텐츠 방향',
  channels: '홍보 채널 선택',
  report: '홍보 후 반응 리포트',
  design: '홍보 이미지/포스터 디자인',
  notSure: '필요한 것부터 함께 정리'
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  })

const getRecord = async (request: Request) => {
  const payload = await request.json()
  return payload.record ?? payload
}

const requireConfig = () => {
  const missing = [
    !resendApiKey ? 'RESEND_API_KEY' : '',
    !webhookSecret ? 'PROMOTION_INTEREST_WEBHOOK_SECRET' : ''
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(`Missing secret(s): ${missing.join(', ')}`)
  }
}

const assertWebhookSecret = (request: Request) => {
  if (request.headers.get('x-in-c-webhook-secret') !== webhookSecret) {
    return false
  }

  return true
}

const formatText = (record: Record<string, unknown>) => {
  const helpNeeded = Array.isArray(record.help_needed)
    ? record.help_needed.map((value) => helpLabels[String(value)] ?? String(value)).join(', ')
    : '-'

  return [
    'in C 클래식 연주회 홍보 관심 등록이 접수되었습니다.',
    '',
    `이름: ${record.applicant_name ?? '-'}`,
    `역할: ${roleLabels[String(record.role)] ?? record.role ?? '-'}`,
    `전화: ${record.contact_phone ?? '-'}`,
    `이메일: ${record.contact_email ?? '-'}`,
    `인스타 ID: ${record.contact_instagram ?? '-'}`,
    '',
    `현재 상황: ${
      recitalStatusLabels[String(record.upcoming_recital)] ?? record.upcoming_recital ?? '-'
    }`,
    `필요한 도움: ${helpNeeded || '-'}`,
    `비고: ${record.notes ?? '-'}`,
    '',
    `등록 시각: ${record.created_at ?? '-'}`,
    `관리자 화면: https://in-c.mannlab.app/promotion-admin.html`
  ].join('\n')
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    requireConfig()

    if (!assertWebhookSecret(request)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const record = await getRecord(request)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${resendApiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: notifyFrom,
        to: notifyTo,
        subject: '[in C] 클래식 연주회 홍보 관심 등록',
        text: formatText(record)
      })
    })

    if (!response.ok) {
      return jsonResponse(
        {
          error: 'Failed to send notification',
          detail: await response.text()
        },
        502
      )
    }

    return jsonResponse({ ok: true })
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    )
  }
})
