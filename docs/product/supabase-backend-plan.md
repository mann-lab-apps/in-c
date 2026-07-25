# Supabase Backend Plan

작성일: 2026-07-14

이 문서는 #316의 구현 전 설계 기준이다. 실제 Supabase 프로젝트 생성, schema 적용,
환경 변수 등록은 외부 운영 변경이므로 사용자 승인 후 진행한다.

## 목표

정적 사이트로 시작한 in C가 계정, 공개 콘텐츠 관계, 피드백, 공연/Creator/Class
데이터를 점진적으로 서버로 옮길 수 있게 한다.

## MVP 테이블

| 테이블 | 목적 | 공개 읽기 | 관리자 쓰기 |
| --- | --- | --- | --- |
| `works` | 작품 페이지와 관계 허브 | 가능 | 필요 |
| `creators` | 작곡가, 연주자, 강사, 기획자 프로필 | 가능 | 필요 |
| `concerts` | 공연 프리뷰 | 가능 | 필요 |
| `classes` | 감상 클래스와 레슨 정보 | 가능 | 필요 |
| `columns` | Columns metadata와 발행 상태 | public만 가능 | 필요 |
| `scores` | Compositions/Chromatics 원본 metadata | 가능 | 필요 |
| `feedback_events` | 선택지 기반 비식별 피드백 | 불가 | append-only |

## 관계 테이블

- `work_creators`: 작품과 작곡가/작사가/연주자/해설자 연결.
- `work_scores`: 작품과 MusicXML/Chromatics 원본 연결.
- `work_columns`: 작품과 Columns 연결.
- `concert_works`: 공연과 작품 연결.
- `creator_concerts`: Creator와 공연 연결.
- `creator_classes`: Creator와 클래스 연결.
- `class_works`: 클래스와 작품 연결.

## RLS 원칙

- 공개 콘텐츠는 `status = 'public'`일 때만 anon read를 허용한다.
- draft/private 콘텐츠는 service role 또는 관리자 계정만 읽고 쓴다.
- `feedback_events`는 anon insert만 허용하고 select는 관리자만 허용한다.
- 결제, 이메일, 전화번호, 주소처럼 민감한 정보는 MVP schema에 넣지 않는다.

## 환경 변수

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`VITE_` 값은 public client에서 읽을 수 있으므로 anon key만 둔다. service role key는
GitHub Actions, server function, local admin script 같은 비공개 실행 환경에서만 쓴다.

## 로컬 준비물

Supabase project 생성 전까지 저장소 안에서 관리하는 준비물은 다음이다.

- `supabase/.env.example`: public anon key와 service role key의 환경 변수 이름.
- `supabase/migrations/0001_initial_content_schema.sql`: 공개 콘텐츠, 관계 테이블,
  feedback_events, RLS policy 초안.

이 파일들은 실제 Supabase 프로젝트에 적용하지 않았다. 프로젝트 생성, migration
적용, environment variable 등록은 모두 외부 운영 변경이므로 사용자 승인 후 진행한다.

## 1차 SQL 초안

```sql
create table public.works (
  id text primary key,
  slug text unique not null,
  title text not null,
  original_title text,
  summary text not null,
  era text,
  genre text,
  copyright_status text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creators (
  id text primary key,
  slug text unique not null,
  name text not null,
  roles text[] not null default '{}',
  summary text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.concerts (
  id text primary key,
  slug text unique not null,
  title text not null,
  starts_at timestamptz,
  venue text,
  city text,
  preview_note text not null,
  external_url text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_slug text not null,
  answer text not null,
  created_at timestamptz not null default now()
);
```

## 프론트엔드 적용 순서

1. 현재 `site/*.js` 정적 데이터를 source of truth로 유지한다.
2. Supabase project가 준비되면 read-only fetch adapter를 추가한다.
3. 네트워크 실패 시 정적 데이터 fallback을 유지한다.
4. 관리자 쓰기 화면은 별도 인증/RLS 검증 후 추가한다.

네트워크 실패, 정상 빈 결과, 공개 범위, 오래된 데이터 안내는
[정적 사이트와 Supabase fallback 기준](static-supabase-fallback-policy.md)을 따른다.

## 완료 판단

프로젝트 생성 전 단계에서는 이 문서, `supabase/.env.example`,
`supabase/migrations/0001_initial_content_schema.sql`이 완료 조건이다. 실제 구축
완료는 다음 사용자 승인 후 별도 작업으로 본다.
