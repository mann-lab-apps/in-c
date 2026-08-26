# 관심 등록 확인과 이메일 알림

작성일: 2026-08-15

## 확인 화면

관리자는 `https://in-c.mannlab.app/promotion-admin.html`에서 관심 등록 목록을
확인한다. 이 페이지는 공개 navigation과 sitemap에 노출하지 않는다.

접근 조건:

- Google 로그인 세션이 있다.
- `public.profiles`에서 해당 `user_id`의 `role`이 `admin`이고 `status`가
  `active`다.
- `0004_promotion_interest_admin_review.sql` migration이 적용되어 있다.

관리 화면에서 할 수 있는 일:

- 최근 관심 등록 100건 확인
- 새 등록, 확인 완료, 보관 건수 확인
- 관심 등록을 `확인 완료` 또는 `보관` 상태로 변경

## 이메일 알림

관심 등록이 저장될 때 이메일 알림을 받으려면 Supabase Edge Function
`notify-promotion-interest`를 배포하고, Supabase Database Webhook에서
`promotion_interest_registrations` insert 이벤트를 이 함수로 보낸다.

기본 발신/수신 주소:

```text
From: in C <daga42@naver.com>
To: daga4242@gmail.com
```

필수 secret:

```text
RESEND_API_KEY=
PROMOTION_INTEREST_NOTIFY_FROM='in C <daga42@naver.com>'
PROMOTION_INTEREST_WEBHOOK_SECRET=
PROMOTION_INTEREST_NOTIFY_TO=daga4242@gmail.com
```

`PROMOTION_INTEREST_NOTIFY_FROM`은 실제 발송 서비스에서 인증된 발신 주소여야 한다.
`daga42@naver.com`을 발신자로 쓰려면 Naver SMTP 또는 발송 서비스의 sender 인증이
필요하다. 인증 없이 임의로 Naver 주소를 From에 넣으면 스팸 또는 스푸핑으로
차단될 수 있다.

Supabase CLI 예시:

```bash
supabase secrets set \
  RESEND_API_KEY=... \
  PROMOTION_INTEREST_NOTIFY_FROM='in C <daga42@naver.com>' \
  PROMOTION_INTEREST_WEBHOOK_SECRET='긴-랜덤-문자열' \
  PROMOTION_INTEREST_NOTIFY_TO='daga4242@gmail.com'

supabase functions deploy notify-promotion-interest --no-verify-jwt
```

Database Webhook 설정:

- Table: `promotion_interest_registrations`
- Event: `Insert`
- Method: `POST`
- URL: `https://lwlligkcikxvuinajpug.supabase.co/functions/v1/notify-promotion-interest`
- Header: `x-in-c-webhook-secret: <PROMOTION_INTEREST_WEBHOOK_SECRET와 같은 값>`

## 운영 기준

- 이메일은 즉시 알림용이고 원본 확인은 관리자 화면에서 한다.
- 연락처와 비고 원문은 GA4로 보내지 않는다.
- 공개 사용자는 관심 등록 원본을 조회할 수 없어야 한다.
- 알림 실패가 관심 등록 저장 자체를 막지 않아야 한다.
