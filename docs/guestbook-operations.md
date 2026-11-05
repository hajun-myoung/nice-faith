# 발자취 설치·운영 안내

## 운영 경계

Firestore **Standard edition**, 서울 **asia-northeast3**, 기본 데이터베이스 `(default)`를 사용한다. Firebase **Spark**를 유지하고 **Cloud Billing 계정을 연결하지 않는다**. 월 목표는 0원이다. 무료 한도 초과 시 방명록은 503으로 실패하며 설문은 계속 동작한다. 요금제 변경·결제 계정 연결을 수행하는 코드나 설치 명령은 없다.

브라우저 → 기존 Vercel API → Firebase Admin SDK → Firestore 구조다. Firebase Authentication, 관리자 화면·관리 API, Firebase Hosting·Functions, TTL, 관리형 백업, PITR은 사용하지 않는다. 운영은 Google 계정과 IAM 권한으로 Firebase 콘솔에서만 한다. 브라우저 직접 읽기·쓰기는 Security Rules에서 전부 거절한다.

## 사용자가 해야 하는 콘솔 설정

1. Firebase 프로젝트를 생성한다. Google Analytics는 필요 없다. **Spark**인지, 결제 계정이 연결되지 않았는지 확인한다. 플랜 업그레이드 안내는 진행하지 않는다.
2. Firestore Database 만들기에서 **Standard**, **서울 `asia-northeast3`**, `(default)`, 프로덕션 모드를 선택한다. `asia-northeast2`는 오사카다. 생성 후 지역은 변경할 수 없으므로 생성 전에 확인한다.
3. 운영 Google 계정에 2단계 인증을 설정하고 필요한 프로젝트 IAM 권한을 준다. 서버용 서비스 계정은 별도로 만들고 Firestore 데이터 접근에 필요한 `roles/datastore.user`만 부여한다. Owner/Editor 권한, 결제 권한은 주지 않는다.
4. 그 서비스 계정의 JSON 키는 로컬 안전한 위치에서만 취급한다. 아래 세 필드를 **Vercel Production 환경변수**에 각각 옮긴다. JSON 파일이나 키 내용을 Git·채팅·스크린샷·티켓에 넣지 않는다. 키를 더 이상 보관할 필요가 없으면 안전하게 제거한다.
5. `firestore.rules`와 `firestore.indexes.json`을 배포하고 복합 인덱스가 Enabled가 될 때까지 기다린다. Firebase CLI가 설치된 사용자 환경에서 다음 명령을 사용한다. 이 명령은 규칙·인덱스만 배포하며 결제를 연결하지 않는다. 프로젝트 ID는 실제 값으로 바꾼다.

   ```sh
   firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
   ```

   콘솔만 사용한다면 Rules 탭에 `firestore.rules`의 내용을 붙여 게시하고, Indexes 탭에서 `guestbookEntries`, Collection 범위, `status` 오름차순 + `createdAt` 내림차순 + 문서 이름 내림차순의 복합 인덱스를 만든다. 코드의 인덱스 파일을 기준으로 유지한다.

6. 아래 환경변수를 저장한 뒤 Vercel을 재배포한다. 운영 도메인의 HTTPS에서 확인한다. Preview/Development는 운영 자격 증명을 넣지 않는다. 코드는 `VERCEL_ENV=production`일 때만 실제 DB 연결을 허용하므로 미리보기에서는 503 안내가 정상이다. 테스트는 Emulator로 한다.
7. Vercel 프로젝트의 Cron Jobs에서 `/api/guestbook/cleanup`이 하루 한 번 등록되었는지 확인한다. `vercel.json`의 `0 18 * * *`는 UTC 18시, **한국 시간 다음 날 오전 3시경**이다. 무료 플랜은 실행 시각 지연이 있을 수 있다. 기존 Vercel 플랜·함수·Cron 무료 사용 범위를 확인한다. 함수 리전은 계정의 무료 플랜이 지원하는 가까운 리전으로 콘솔에서 정한다. 유료 리전 전환을 요구하는 코드 설정은 없다.
8. 테스트 글을 남겨 pending 저장 → 콘솔 승인 → 다음 화면 조회에 공개 → 숨김 → 비공개 → 작성자 삭제를 확인한다. 실제 데이터에 테스트 문자열이나 비밀을 남기지 않는다.

## 서버 전용 환경변수

| 이름                    | 값·용도                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `GUESTBOOK_ENABLED`     | 운영 준비 후 `true`. 비활성화하면 공개 API와 정리 작업은 503으로 닫힌다. 설문은 독립적으로 동작한다. |
| `FIREBASE_PROJECT_ID`   | JSON 키의 `project_id`. 기본 DB는 서울에서 생성한 `(default)`여야 한다.                              |
| `FIREBASE_CLIENT_EMAIL` | 전용 서비스 계정 JSON의 `client_email`.                                                              |
| `FIREBASE_PRIVATE_KEY`  | JSON의 `private_key`. PEM 줄바꿈 또는 문자 `\n` 모두 지원. 민감 정보.                                |
| `GUESTBOOK_SECRET`      | 암호학적으로 무작위인 최소 32자 서버 비밀값. 쿠키 서명과 단기 요청 제한 식별값에 사용. 민감 정보.    |
| `CRON_SECRET`           | 위 값과 다른 무작위 최소 32자 비밀값. Vercel Cron이 `Authorization: Bearer …`로 보낸다. 민감 정보.   |
| `VERCEL_ENV`            | Vercel이 자동 제공. 수동으로 Preview를 production처럼 꾸미지 않는다.                                 |

모든 변수에 `VITE_` 접두사를 붙이지 않는다. 브라우저용 Firebase 설정·API 키는 필요 없다. `.env.example`에는 이름만 제공했다. 비밀 생성은 비밀번호 관리자 등 신뢰할 수 있는 수단을 사용하고 출력값을 공유하지 않는다.

`GUESTBOOK_SECRET`을 바꾸면 쿠키와 요청 제한 식별자가 바뀐다. 기존 삭제 링크와 같은 요청의 재시도 권한은 계속 동작한다. 유출 시에는 즉시 키를 폐기·교체하고 운영 데이터를 확인한다. 서비스 계정 키는 별도로 주기적으로 교체한다.

## 콘솔 검토 절차

운영자는 최소 매일 `guestbookEntries`의 `status == pending`, `guestbookReports`의 `status == pending`을 확인한다. 공개 지연을 허용하는 서비스이므로 실제 담당자와 확인 주기를 출시 전에 정한다. 단순히 부정적인 소감이라는 이유로 숨기지 않는다. 원문은 고쳐 공개하지 않는다.

- **승인:** 기존 글 문서가 있고 `expiresAt`이 지나지 않았는지 확인한다. `status`를 문자열 `published`로 바꾸고, `publishedAt`을 Timestamp 타입의 승인 시각으로 기록하고, `expiresAt` 필드를 삭제한다. 세 변경을 한 번에 저장한다. `createdAt`은 바꾸지 않는다. 목록 순서는 승인 시각이 아닌 작성 시각이다.
- **거절·숨김:** 기존 문서에서 `status`를 `hidden`, `expiresAt`을 처리 시각 + 30일의 Timestamp로 함께 저장한다. 개인정보 노출은 먼저 즉시 숨긴다. 다음 API 조회부터 비공개가 되며 이미 열린 화면에는 새로 조회해야 반영된다.
- **영구 삭제:** 글 문서를 삭제하고 `guestbookReports`에서 `entryId == 해당 글 ID`를 조회해 연결 신고도 모두 삭제한다. 상태만 바꾸고 본문을 남기는 방식은 영구 삭제가 아니다. 잔여 신고는 일일 정리에서도 순차 제거하지만 즉시 처리가 필요하면 직접 지운다.
- **신고 처리:** 사유를 확인하고 필요하면 해당 글을 숨기거나 삭제한다. 신고는 자동 비공개로 이어지지 않는다. 처리한 신고는 `status`를 `resolved`, `expiresAt`을 처리 시각 + 30일의 Timestamp로 함께 저장한다. 미처리 신고에는 만료가 없으며 대상 글이 지워지면 함께 정리한다.

`visitType`, `nickname`, `community`, `message`, `createdAt`, `deleteTokenHash`, 요청 제한·중복 기록은 수정하지 않는다. 삭제 후 같은 ID 문서를 재생성하지 않는다. 콘솔에서는 **기존 문서 수정(update)**만 사용한다. 승인·삭제 경합에서 삭제된 글을 재생성하지 않는 운영 규칙이다. 앱 자체의 콘솔 수정 감사 로그는 없다.

## 저장·요청 제한·정리

- 글: pending 30일, hidden 처리 후 30일, published는 삭제 요청/종료까지. API가 신규 상태·작성 시각을 정한다. 공개 조회는 DB에서 published만 조회하고 만료된 문서는 응답에서 다시 거른다. 정확한 작성 시각이 커서에서도 드러나지 않게 암호화하고, 20개 문서씩 커서 조회하며 일부가 만료되었으면 표시 글이 20개 미만이거나 빈 페이지일 수 있다. 더 보기로 이어 조회한다.
- 등록: 24시간 유효한 서명된 HttpOnly/SameSite 쿠키의 익명 ID당 **10분 고정 구간에 3회**, IP 보조 제한은 같은 구간에 60회. 신고: 익명 ID당 10회, IP당 120회/10분. 같은 글은 익명 ID당 24시간에 1회. 쿠키 삭제로 익명 제한을 우회할 수 있어 IP 보조 제한·승인제를 함께 쓴다. 자동 입력 숨김 필드와 서버 검증도 적용한다. 실제 도배가 지속되면 별도 봇 검증 도입을 검토한다.
- IP 원문은 DB에 저장하지 않는다. 매일 바뀌는 서버 비밀값으로 해시한 키만 저장한다. Vercel이 덮어쓰는 `x-vercel-forwarded-for`만 신뢰하고 일반 `x-forwarded-for`는 사용하지 않는다.
- 같은 등록은 256비트 무작위 비공개 요청 ID와 내용을 트랜잭션에서 확인해 중복 저장하지 않는다. 클라이언트는 재시도 시 같은 요청을 보낸다. 삭제 권한도 같은 응답으로 복원한다. 응답을 잃었을 때 **같은 탭에서 입력을 유지한 채 다시 시도**해야 하며, 새로고침·쿠키 삭제·내용 변경 후 새 등록은 복구를 보장하지 않는다. 초안·삭제 토큰은 로컬 저장소에 저장하지 않는다. 서버는 비공개 요청 ID에서 서로 다른 해시로 문서 ID와 삭제 토큰을 생성한다. 요청 ID·삭제 토큰 원문은 저장하거나 로그에 남기지 않는다. 이 구조로 쿠키 만료·서버 비밀 교체 중에도 같은 요청은 같은 문서·삭제 권한으로 복구된다.
- 중복 요청 기록은 요청 시작 시각으로부터 24시간 유효하다. 미래 시각은 거절하므로 기기 시계가 서버보다 앞서 있으면 시계를 맞춘 뒤 다시 작성해야 한다. 제한 카운터는 10분 구간 종료, 반복 신고 키는 24시간 후 논리 만료한다. 매일 물리 삭제하며 평상시 최대 약 48시간과 실행 지연 동안 남을 수 있다. 정리 장애·밀린 기록이 많으면 더 남을 수 있으므로 정확한 물리 삭제 시각은 약속하지 않는다.
- Cron은 만료 글·요청 기록·신고를 **컬렉션당 최대 100개**, 고아 신고를 ID 커서로 최대 100개씩 처리한다. 글 삭제 후 연결 신고는 고아 검사로 순차 정리한다. 커서는 `guestbookRequestGuards/cleanup-report-cursor`에 비식별 운영 정보로만 보관하고 만료하지 않는다. 삭제 직전에 트랜잭션에서 만료 조건을 다시 읽으므로 동시에 승인한 글을 과거 조회 결과만 보고 삭제하지 않는다.
- 정리 응답의 `deleted`와 `moreExpiredMayRemain`을 확인한다. 후자는 만료 목록이 한도에 도달했을 수 있다는 보수적인 신호다. Cron 오류/503/밀린 기록이 있으면 콘솔의 무료 일일 사용량을 확인하고 인증된 수동 정리를 반복하거나 콘솔에서 만료 문서를 삭제한다. 수동 정리는 비밀값을 브라우저 주소나 셸 명령 인수에 넣지 않는 안전한 HTTP 클라이언트로 같은 경로에 Authorization 헤더를 보낸다. 로그·명령 기록에 토큰을 남기지 않는다.

무료 한도는 저장 1 GiB, 하루 읽기 50,000·쓰기 20,000·삭제 20,000건을 기준으로 운영하되 출시 시 최신 콘솔을 다시 확인한다. 카운터·트랜잭션 재시도·인덱스·정리도 사용량에 포함된다. 무료 한도를 넘으면 실패를 받아들이며 유료 전환하지 않는다. 정확한 매월 0원은 Firebase Spark와 결제 미연결, Vercel 기존 플랜 사용량을 사용자가 유지해야 한다.

## 개인정보 안내 출시 확인

앱 내 안내와 문의 경로는 `fe.dev.denver@gmail.com`을 사용한다. 설문·점수·개인화 성찰은 방명록과 연결하지 않는다. 별명·모임명·내용·한국 날짜만 공개한다. 교회·모임명은 자기 기재 정보로 공식 참여·제휴·인증이 아니다.

삭제 링크는 URL의 `#` 뒤에 두므로 HTTP 요청 URL·일반 접근 로그로 보내지 않는다. 삭제 확인 POST 본문에만 토큰을 보내고 API는 본문·쿠키·토큰·키를 로그로 출력하지 않는다. 삭제 페이지는 자체 번들의 로컬 자원만 사용하고 외부 분석·외부 글꼴·외부 리소스 요청은 없다. 전역 `no-referrer`를 유지한다. Vercel의 본문 수집 도구·Session Replay·외부 분석 도구를 새로 붙이지 않는다.

**출시 전 사용자 확인 필요:** Vercel/Firebase의 실제 접근 로그 항목·보관 기간·지원/삭제 정책을 각 계정·플랜에서 확인해 앱의 개인정보 안내에 반영한다. 이번 구현에서는 해당 계정에 접근하지 않았으므로 특정 일수나 즉시 완전 소거를 주장하지 않는다. 관리형 백업·PITR은 켜지 않는다. 기존 별도 백업이나 외부 내보내기가 있다면 삭제 후 언제 제거되는지도 안내하고 운영 절차에 넣는다. 현재 자동 복구 수단은 없다. 실제 검토 담당자·주기도 확정한다.

## 로컬 검증

Node.js 24, Java 21 이상, Firebase CLI가 필요하다. 서비스 계정·운영 키를 로컬 테스트에 넣지 않는다.

```sh
npm ci
npm run typecheck
npm test
npm run build
firebase emulators:exec --only firestore --project demo-nice-faith 'npm test'
```

기본 테스트는 UI/API 경계/기존 흐름을 검사하고 Emulator 테스트 10개는 명시적으로 건너뛴다. 마지막 명령은 `FIRESTORE_EMULATOR_HOST`를 주입해 규칙 직접 접근 거절, 승인 공개, 병렬 재시도, 요청 제한과 논리 만료, 커서, 삭제 권한, 신고·정리, 승인/삭제 경합을 실제 Firestore Emulator에서 검사한다. 복합 인덱스의 운영 생성 여부·IAM·서울 위치·무료 플랜은 Emulator로 보증되지 않으며 배포 후 확인해야 한다.

UI에서 Emulator를 사용하려면 CLI로 `firebase emulators:start --only firestore --project demo-nice-faith`를 실행하고 다른 터미널에서 `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=demo-nice-faith GUESTBOOK_SECRET="$(openssl rand -hex 32)" npm run dev`로 시작한다. 비밀값은 셸 기록에 남기지 않는 방식으로 주입한다. Vite dev/preview도 같은 로컬 API 핸들러를 사용한다. `FIRESTORE_EMULATOR_HOST`는 Vercel에서는 거절된다.

## 의존성 감사 기록

구현 검증 당시 `npm audit`는 9건(critical 2, moderate 7)을 보고했다. 기존 Vitest 3 개발 의존성(`tinypool`, `@vitest/mocker`)과 Firestore SDK 전이 의존성(`glob`·`rimraf` 등)에 해당한다. 호환 범위의 `npm audit fix`로는 해결되지 않았다. 테스트 도구의 강제 메이저 업그레이드는 이번 방명록 변경에 섞지 않았다. 테스트 도구는 개발 전용이며 SDK 전이 의존성은 서버 설치에도 포함된다. 남은 공급망 위험은 후속 의존성 업데이트에서 다시 확인한다. 참조: [tinypool](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [Vitest mocker](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
