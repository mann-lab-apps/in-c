# Studio 현재 작업

2026-11-03 릴리즈 체크포인트: 사용자 승인으로 별도 `release/studio-alpha38-final-20261103` 브랜치의 소스 `7732441ca6586672f3f1ad12794d6b3f6d6c5ce1`을 `v0.1.0-alpha.38` prerelease로 게시했다. 현재 태그의 세 OS 전체 CI·패키지·native smoke와 게시 파일 전체 체크섬, 다운로드한 macOS 앱의 서명·공증·Gatekeeper·격리 실행을 확인했다. 사이트 변경은 draft PR #790이며 별도 머지 전에는 배포하지 않는다. 원본 worktree의 미커밋 변경은 보존했고 아래 기존 작업/목표 상태는 당시 기록이다. 상세 결과와 잔여 제한은 `docs/releases/studio-alpha38-20261103/handoff.md` 참조. 이번 게시가 전체 Studio/Commercial V1/RC 완료를 의미하지 않는다.

2026-11-03 사용자 재개 요청에 따라 현재 턴의 구현을 이어간다. 목표 도구는 paused이며 재개 API는 없다. 이를 active라고 보고하지 않는다. 이전 재확인 HEAD는 `b5e0e9ce6d3d4b233d97c22d7206638e6d2a9aa6`(이전 792 검증 기준은 `3e4bd8d3bef89d6f92b317ebac60182b48b5580b`; 사이의 별도 Score 문서 커밋은 이번 성과가 아님), 브랜치는 `feature/chromatics-expanded-v1-checkpoint-20260913`, 버전은 `0.1.0-alpha.14`다. 이번 변경은 미커밋이며 커밋·푸시·머지·릴리즈·버전·사이트 갱신 승인은 없다. 다른 작업과 worktree, 브랜드·모바일 변경, 원래 Electron PID 88653을 보존한다. env/secret 및 iOS metadata는 작업 대상이 아니다.

반환 경로는 `docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28/`다. 실제 앱 검증은 해시를 고정한 `.codex/recovery/studio-validation-20261101-<id>` 복제본과 자체 IPC·임시 파일을 사용한다. 물리 OS 파일 대화상자·IME·스크린리더 검사와 구분한다.

## 현재 검증 상태

833 최신 전체 검사는 정확한 npm run test:all exit0/590.28초, Vitest352파일3767검사 PASS·외부opt-in1파일1검사skip·Node-native5 PASS다. source2914/build/install lock 전후 동일이며 live 차이는 진행3문서뿐이고 전체 중 제품·테스트·QA 편집이나 build/Electron 병행은 없었다. 사용자 승인대로 무이동 native thumb/track press도 즉시 중단하는 정책이 원본에 적용됐다. 일반 내용·도크 클릭/내부 wheel·공개 following 복귀를 유지했고 실제12장면/Native36·재열기/history0/type/build/profile/fixed도 PASS다. 이전 Tooltip/mark focus/tracker 보호 해시는 같으며 baseline·버전 변경 없음·미커밋이다. 822 결정 대기는 해소됐고 828 과거 시안은 역사적 기록으로 보존한다. 829 touch1400 무이동 실패는 별도 원인 미확정으로 유지한다. 자체 검증 프로세스 종료·목표 도구 paused/재개API 없음과 현재 턴 실제 수행을 구분하며 사용자 앱/live out/별도 변경·물리/OS/청음/SR/외부 미검증을 보존했다. 반환833/full-addendum.md와acceptance-reviewed.md 참조.

833은 사용자 승인에 따라 native scrollbar press 즉시 중단 정책을 현재 원본에 적용했다. 무이동 thumb click도 중단하고 body/content/dock/secondary/range없음과 공개following복귀는보존한다. 지연scroll/frame후보관측기를제거하고823/826tracker·830Tooltip·831focus를해시로보존했다. 새단위4red/11pass·관련18red/161pass뒤12files179tests/type/build/profile/fixedPASS다. 최신변경전빌드도actual track/resize scrollBy2 red를보존하고새빌드는fast/held4장면7.90초·thumbdrag/click4장면7.31초·contained2장면4.82초·content2장면3.92초PASS,총12장면Native36/재열기/history0보존·실제이미지검토·baseline변경없음이다. 다음source2914전체gate를실행하며이전3750/Node5는이번정책전이다. 822답대기는해소됐고828과거시안기록은보존한다. 829touch1400실패는미해결·목표paused/현재턴구분·미커밋/버전유지·사용자앱/liveout/별도변경과물리/OS/청음/SR/외부미검증보존. 반환833/focused-handoff.md 참조.

831/832 최신 전체는 정확한 npm run test:all exit0/572.89초, Vitest351files3750tests PASS·외부opt-in1file1testskip·Node-native5PASS다. source2913/build/install lock 전후 동일·live진행3문서만차이·전체중제품/테스트/QA편집이나build/Electron병행없음이다. 830Tooltip수정과831기호focus/새App2회귀를포함한다. type/build/profile/fixed·960/1400글자200%실제잉크/Native보존·832수동wheel후resize0호출/새Tab복귀를확인했고baseline변경없음·미커밋·버전유지다. 자체검증프로세스는종료됐으며목표도구paused/재개API없음과현재턴의실제수행을구분한다. 다음은822/828정책답대기/live미적용과829touch1400원인미확정으로새가설없이반복하지않는다. 832/next-backlog.md에실행/검토경계를기록했다. 사용자앱/liveout/별도변경·물리/OS/청음/SR/외부미검증보존. 반환831/full-addendum.md·832/full-addendum.md 참조.

832는831동일제품의 실제 수동wheel→resize→명시적 Tab 복귀 회귀 QA다. 960dark/1400light×셈여림/코드4장면8.32초PASS·실제문서150px이동후resize root유지/scrollBy0·새ShiftTab/Tab뒤잉크와focus ring노출·Native12/재열기/history0보존을확인했다. 1400셈여림복귀캡처검토·제품수정/기존노출성과중복합산/baseline변경없음이다. 다음동일831 source2913 최신전체gate를실행한다. 830전체3748/Node5는831수정전이다. 829touch1400실패·822/828정책답대기/live미적용 및물리/OS/청음/SR/외부미검증을유지한다. 목표paused/현재턴구분·미커밋. 반환832/handoff.md 참조.

831은 실제 Tab으로 셈여림/코드에 도달한 뒤 짧은 창·chrome글자200%에서 잉크가 footer 뒤에 남는 3장면을 재현했다. 기본글자4장면은 정상 대조군이다. App 네 기존 selector에 지원 중인 dynamic/harmony만 연결해 실측rect/resize/명시적 focus/menu origin을 재사용했다. 새 App2 red 뒤6files35tests/type/build/profile/fixed PASS·실제960/1400 네장면5.89초/Native12/재열기/history0 보존 PASS, 수정전후960코드캡처 검토·baseline변경없음·미커밋이다. 전체8303748/Node5는이번두회귀/제품수정전이며 다음832는 실제manual wheel 뒤resize 소유권 검증이다. 829touch1400실패·822/828정책답대기/live미적용은유지. 목표paused/현재턴구분·물리/OS/청음/SR/외부미검증. 반환831/handoff.md 참조.

830 전체 gate는 정확한 npm run test:all exit0/564.02초, Vitest350files3748tests PASS·외부opt-in1file1testskip·Node-native5PASS다. source2912/build/install lock 전후 동일·live 차이는 진행3문서뿐이며 실행중 제품/테스트/QA 편집이나 build/Electron 병행 없음이다. 공통 Tooltip 수정과 새12회귀를 포함한다. 960dark/1400light의 실제 설명과 이탈 후 화면 검토·baseline 변경없음·미커밋이다. 829touch1400 실패 및822/828 정책 답 대기/live미적용은 별도 유지한다. 다음831 실제 mark keyboard focus 여백 후보로 진행한다. 목표paused/현재턴 구분·물리/OS/청음/SR/외부 미검증. 반환830/full-addendum.md 참조.

830에서 배치 변경 뒤 남는 공통 Tooltip을 실제로 재현하고 수정했다. 마지막 포인터와 새 trigger/설명 경계를 비교하며 실제 keyboard focus·글자 읽기·disabled hover·Escape·재진입을 보존한다. 새 12검사 중 7 red, 초기 green-a의 실측 guard 누락 9실패도 보존했다. 최종 공통 UI 165·Studio focus/menu 12·type/build/profile/fixed PASS, 실제 960/1400 native 9.25초/Native6/재열기/history0 보존 PASS다. 초기 hover 캡처의 이른 프레임은 표시 증거에서 제외하고 두 RAF/캡처 후 열린 상태를 검사한 paint-c의 실제 설명과 이탈 후 화면을 검토했다. API/토큰/기보/Flutter/baseline 변경 없음·미커밋이다. 전체 최신 826의3736/Node5는 이번 수정 전이며 새 전체는 다음 gate다. 829 touch1400 실패와822/828 정책 답 대기/live미적용은 유지한다. 목표 paused/현재 턴 구분·물리/OS/청음/SR/외부 미검증. 반환830/focused-handoff.md 참조.

829는동일826제품의nested-touch진단이다. 1400 두번째/세번째dock gesture는root0, 직접지면pan은A250/C237px였다. 실제ASIDE hit·ancestor touch-action auto·default취소없음을확인했으나원인은미확정이며원래movement assertion/exit1을유지한다. B고정선택기대실패는기존재생선택동기화계약의QA작성오류로보존하고C에서실제timeline과선택전체주소를현재beat기준으로검사했다. 9602.1/14001.8beat 선택일치·caret없음/history0·Native진단포함6쓰기보존을확인했으나1400최종재열기승인아니다. 새제품수정/build/full성과없음·동일826전체3736/Node5재사용·baseline변경없음이다. 1400touch미확정과822/828정책답대기/live미적용을남기고같은무가설실행은반복하지않는다. 목표paused/현재턴구분·물리/OS/청음/SR/외부미검증·사용자앱/liveout/별도변경보존. 반환829/handoff.md 참조.

828은822정책질문답대기중별도복제본에만만든미적용시안이다. 원본helperSHA전후같음·823/826tracker보존·live정책/테스트미변경이다. 시안15단위/공유31검사(typefocused다른30skip)/type/build/profile/fixedPASS, 전체시안suite는미실행이다. 동일Native track/resize의최신원본control은scrollBy2회실패, 시안fast/held960/1400은0회/root0보존PASS다. thumbdrag/무이동click은둘다중단인제안정책과실제이동차이를검사하고공개following으로복구했다. contained/hit-grid포함12장면Native36/선택/history0/재열기보존·실제이미지검토·baseline변경없음이다. 승인전live반영없고승인뒤기존정책fixture이행/fullgate필수다. live전체8263736/Node5와native실패는별도유지한다. 목표paused/현재턴구분·다음826touch1400gesture독립조사·물리/OS/청음/SR/외부미검증보존. 반환828/handoff.md·prototype-source.json 참조.

827은동일826제품의 실제두번째파트보audible/muted×960/1400 네장면13.93초PASS다. 표시lower-part만그려지고실제커서주소/X/Y와viewport노출이일치했다. audible실제초기음61/37, muted61·decoded8·믹서DOM재생중/대기·pause/stop/선택/Native16쓰기재열기/history0보존을확인했다. 1400muted이미지직접검토·화면밖mixerDOM상태를새시각승인으로확대하지않는다. A/B pointer전실패는root602.5고정/pane249→781/document1470→1661/target703.78→894.78,추가scrollBy없음으로QA준비원인을분리했다. C는기존783nativeguard재사용+실제좌표연속동일/최대3pass유한노출준비만보완했고제품수정없다. 과거801실패전체원인으로확대하지않는다. 전체8263736/Node5재사용·baseline변경없음·822답대기/live미적용·826touch1400미확정유지다. 목표paused/현재턴구분·다음828별도복제본정책시안·물리/OS/청음/SR/외부미검증보존. 반환827/handoff.md 참조.

826 최신정확한npm run test:all은exit0/572.11초, Vitest349files3736tests PASS·외부opt-in1file1testskip·Node-native5PASS다. source2911/build/install lock전후동일·live진행3문서만차이·전체중제품/검사/QA편집이나build/Electron병행없음이다. 하단소수점경계수정과새17회귀포함·baseline변경없음·미커밋이다. H/I의1400touch movement실패/원인미확정과822정책답대기/live미적용은별도유지한다. 다음827실제두번째파트보cursor/mixer/audio검증으로진행한다. 목표도구paused/현재턴구분·사용자앱/liveout/별도변경·물리/외부미검증보존. 반환826/full-addendum.md 참조.

826은 실제하단 scrollTop1144.5/1075.5와정수extent차이1145/1076에서 문서0→151.5/164 이동후followtrue인 두red를재현했다. 아래여유1CSSpx미만의정밀도경계를기존tracker에서처리했고실제1px내부소비는유지한다. 단위6red뒤11files163tests/type/build/profile/fixed PASS·17새회귀다. fine E/J와coarse G의실제1px/다음문서wheel·Native12/재열기/history0보존PASS, 실제캡처검토·baseline변경없음이다. C/F의준비가정오류원문을보존했고assertion은유지했다. touch960은PASS이나1400은followfalse/문서무이동으로H/I movementgate실패이며scrollend관찰도같아원인미확정유지다. 824전체3719는이번제품수정전·새전체예정/미커밋source2911이다. 822답대기/live미적용 및native track실패별도유지·과거patch로823/826앞부분덮어쓰기금지다. 목표paused/현재턴구분·사용자앱/liveout/별도변경/물리·외부미검증보존. 반환826/focused-handoff.md 참조.

825는 동일제품의 팝오버 Tab→checkbox/button→PageUp/Down 현행 확인이다. 960dark/1400light×2focus의 각4장면이9.47/10.38초 PASS했다. trusted/defaultPreventedfalse이나 실제문서·팝오버이동/scrollBy없어 제품수정없다. 문서 wheel 이동/followfalse·Native24/재열기/history0·960focus이미지를 확인했다. 초기IPC반환QA오류와C의도크대조군무이동실패는 보존하고D는canvas padding에서같은문서이동assertion을검증했다. 도크fractional관찰은826별도조사이고해결로세지않는다. 824전체3719/Node5·823build/profile/fixed재사용, baseline변경없음·미커밋·822답대기/live미적용이다. 목표paused/현재턴구분·물리/OS/청음/SR/외부미검증유지. 반환825/handoff.md 참조.

824는823동일제품의App 선택/입력 소유권에 짧은contain/auto×wheel/touch 8회귀를추가한검증slice다. green-a의input기대값작성오류2실패/144통과원문을보존하고기존문서chaining정책으로정정한green-b는11files146tests/typePASS다. 정확한npm run test:all은exit0/576.25초, Vitest349files3719tests PASS/외부opt-in1file1testskip·Node-native5PASS다. source2911/install lock전후동일·전체중코드/QA편집이나build/Electron병행없음·live진행active-work만차이다. 새snapshot은빌드없어buildArtifactsStable은빈목록동일성이고동일제품823의실제build/profile/fixed/wheel/touch/Native를재사용한다. baseline변경없음·미커밋·822정책답대기/live미적용과native track/resize실패는미해결유지다. 목표도구paused/현재턴진행구분·자체전체종료·다음825키보드popup QA. 물리OS/IME/dialog/touch·청음·SR·외부미검증유지. 반환824/handoff.md와runs/suite-green-b/참조.

824 진행: 823 동일제품의 선택/입력 cursor App 계약에 짧은 contain/auto × wheel/touch 8대조군을 추가한다. green-a의 auto 기대값 2개 작성 오류/144통과를 보존하고 green-b를 재검증한다. 새 제품결함이나 822 native track 실패 해결로 계산하지 않는다. focused/type 뒤 전체 gate, 실행중 소스/QA 수정·build/Electron 병행 없음 정책을 유지한다.

823은 내용이 딱 맞는 contain 팝오버에서 문서 이동 없이 따라가기만 꺼지던 결함을 수정했다. 실제960/1400 두 red와 단위3 red를 보존하고 기존 tracker에 양의clientHeight/auto·scroll/contain·none 판정을 연결했다. 관련11files138tests·type/build/profile/fixed PASS, 실제wheel4.82초와CDP touch4.91초 각각두폭/native6쓰기·재열기/history0 PASS다. 팝오버486/486 또는528/528에서root/follow유지, 바깥문서휠은실제이동/중단을확인했고960dark·1400light이미지직접검토·baseline변경없음이다. source2911/미커밋·전체8213704는이번수정전이며새전체예정이다. 822정책답대기/live미적용, stationary native track/resize실패는별도미해결유지다. 목표도구paused/현재턴진행을구분하고물리OS/IME/touch/dialog·청음·SR·외부미검증유지. 반환823/handoff.md와outputs-reviewed.json 참조.

전체821-green-a의정확한test:all이exit0/564.36초로완료됐다. Vitest349파일3704검사PASS·외부opt-in1파일1검사skip·Node-native5PASS·source2911/build/install lock동일·live진행3문서만차이·전체중제품/테스트/QA수정·build/Electron병행없음. **native track/동시resize는계속실패이며이전체PASS와구분**·822정책답대기/live미적용·원래실패/baseline보존·미커밋. 다음823짧은contained popover wheel 독립QA진행·목표도구paused/재개API없음·현재턴계속·보호/물리/외부미검증유지.

822정책답대기와독립적인823짧은contained popover wheel QA를등록했다. 공유CSS contain과helper의range>0조건을대조해실제root/follow를관찰한다. 코드관찰만의가설이며아직결함아님·821전체gate중문서만등록/제품·QA미착수.

821은stale/equal RAF timestamp2red후11파일131/type/build PASS지만nativegate는미해결이다. 960두조건통과후1400SVGcap준비실패·cap보완C도9602scroll실패. ownership-d가release968.7→staleframe968.4/현재freshframe976.7에도root151.5→자동marker985.8/focus985.9true→scroll986.2를기록해새frame도native완료보장아님확인. 지연증가/기준완화없이822nativeUI press통일안을patch/baseSHA/hit audit로준비·사용자정책답대기/live미적용. 독립전체gate/기록계속·818전체3698은수정전·Native실패숨기지않음·미커밋·목표도구paused/재개API없음·현재턴계속·보호/물리/외부미검증유지.

820은pending root의focusin취소에기존자동SVG marker를재사용했다. unit automatic1red/explicit1대조후11파일129/type/build PASS. native width+2 race는수정전후여전히2회scroll로실패:추가계측이release973/RAF실행973.1/frameAt965→scroll975.1을보여focus이전프레임만료가별도원인임확인. 이를marker native수정성공으로보고하지않는다. 현819fastthumb4/Native12PASS이나818track그룹1400실패·profile/fixed미실행·전체8183698은이번수정전. 원래실패유지·821시간계약으로즉시진행·미커밋·목표도구paused/재개API없음·현재턴계속·보호/물리/외부미검증유지.

819는fast native thumb의다른좌표up뒤늦게scroll이오는경계를수정했다. A23.5px준비실패와B120px단일move의151.5→10.5/native2red보존. one-frame green-a실패·로깅C동일제품PASS의타이밍차이도보존하며앞선정확취소시점확정아님. 최종B는좌표바뀐동일HTML drag를release에서즉시확정·대기증가없음·무이동/track/expiry/새focus/외부release보존. 새2의manual계약강화/unit2red후11파일127/type/build·native선택/playing8조건/Native24·현818/8178회귀·profile/fixed PASS·baseline없음. 전체8183698은수정전·820후넓은gate예정. 목표도구paused/재개API없음·현재턴계속·미커밋·보호/물리/청음/외부미검증유지.

전체818-green-a의 정확한npm run test:all이 exit0/577.93초로완료됐다. Vitest349파일3698검사PASS·외부opt-in1파일1검사skip·Node-native5PASS·source2911/build/install lock동일·live진행3문서만차이. 817/818새16회귀·실제native/회귀/profile/fixed와구분·원래실패/타입실패/baseline보존·미커밋. 전체중제품/테스트/QA수정·build/Electron병행없음·819/820문서만등록. 다음819빠른thumb release 실제순서QA를이어간다. 목표도구paused/재개API없음·현재턴계속·물리/OS/청음/외부/새출력미검증유지.

다음 실행 큐819는 빠른 thumb drag가 다른 좌표의 up 뒤 scroll을 전달하는지 실제 순서를 관찰한다. 820은 pending root 활성화의 focusin 취소가 기존 자동/명시 SVG marker 계약과 일치하는지 확인한다. 각 contract.md에 근거와 수용 기준을 등록했으며818 전체 gate 중 제품/테스트/QA 구현은 미착수다.

818은빠른overlay track down/up 뒤scroll이늦게시작돼resize가되돌리던경계를수정했다. native root151.5의up뒤150.5→0 smooth scroll/red2회·unit1red/3대조보존. 같은HTML위치의완료활성화만다음frame후보유지·실제scroll한번확정·무이동/새focus/cancel/다른release폐기. 기존thumb클릭/해제후scroll/내부/classic정책보존. 최종11파일125/type/build·native track/playing8조건/Native24·명시follow복귀·현8178조건/813touch4조건·profile/fixed PASS·baseline없음. source2911전체818gate다음실행·813전체3682는수정전. 목표도구paused/재개API없음·현재턴계속·미커밋·물리/OS/청음/외부/새출력미검증유지.

817은 실제overlay scrollbar drag 뒤resize가151.5→10.5수동위치를189.5로되돌리던 결함을수정했다. HTML/x957pointer와scrollBy2 native red·unit3red/9대조 보존. classic즉시중단은유지하고HTML주버튼후보+실제document scroll만감지·click/내부scroll/무이동/up/cancel/blur대조보존. 최종11파일121(새12)/type/build·native선택/playing8조건/Native24·명시follow복귀·현재touch16조건/Native48·profile/fixed PASS·baseline변경없음. 타입green-a실패로그보존후대상비교수정. source2911미커밋·813전체3682는이번수정전. 다음818짧은트랙click확인뒤넓은전체gate실행예정·아직PASS아님. 목표도구paused/재개API없음·현재턴계속·보호/물리/청음/외부미검증유지.

816은 동일813 제품의 실제Space재생→Space일시정지→수동wheel/resize QA다. 960dark/1400light×내부/경계4조건8.5초 PASS·paused/선택/dirty/history0 유지·수동root0/scroll0·정상노출/명시복귀·Native12/재열기·960화면검토. 재개따라가기정책은변경하지않았다. source2911동일·813전체3682/Node5재사용·새제품/build/visual/baseline없음. 다음817은overlay scrollbar native drag 관찰이며실제이동확인전결함아님. 목표도구paused/재개API없음·현재턴계속·미커밋·물리/출력/청음/외부미검증유지.

815는 동일813 제품의 미완성tuplet touch QA다. 실제N/Cmd3/C→1/3·960dark/1400light×내부/경계4조건9.04초 PASS·멤버3/잔여1/실제다음잉크·수동root20.5/0유지/scroll0·명시복귀/Escape취소·Native12/재열기/history0·1400화면검토. source2911동일·813전체3682/Node5재사용·새제품/build/visual/baseline변경없음. 다음816은일시정지전환뒤수동viewport→resize 독립QA이며재개정책변경으로확대하지않는다. 목표도구paused/재개API없음·현재턴계속·미커밋·물리/출력/청음/외부미검증유지.

814는 동일813 제품의 실제PageUp/PageDown QA다. 960dark/1400light4조건8.41초 PASS·trusted/최종prevented=false·실제문서이동·resize root0/151.5/164유지/scroll0·공개악보복귀·Native12/재열기/history0·1400화면검토. A의PageDown최하단 준비실패를보존하고 B는실제PageUp/새음선택으로이동여유를확보했다. 제품변경없음·source2911동일·813전체3682/Node5재사용·새build/visual/baseline없음. 다음815는 미완성tuplet의 touch 경계·취소 경로QA다. 목표도구paused/재개API없음·현재턴계속·미커밋·물리/출력/청음/외부미검증유지.

전체813-green-c의 npm run test:all이 exit0/575.62초로 완료됐다. Vitest349파일3682검사 PASS·외부opt-in1파일1검사 skip·Node-native5 PASS·source2911/build/install lock 동일·live 진행3문서만차이. touch 새15회귀와 실제재생/입력12조건·Native36 및807/811/81212회귀/profile/fixed를 구분한다. 전체중 제품/테스트/QA 수정·build/Electron 병행없음·원래실패/baseline보존·미커밋. 다음814 실제PageUp/PageDown 독립QA를 이어간다. 목표도구paused/재개API없음·현재턴계속·물리/청음/외부 미검증 유지.

다음 실행 큐814는일반음표의 실제 PageUp/PageDown 문서 이동→resize→공개 악보 복귀 QA다. 814-native-page-viewport/contract.md에 수용 기준을 등록했다. 813 전체 gate 중에는 제품/테스트/QA 스크립트를 수정하지 않으며 아직814를 실행하지 않았다.

813은 도크 경계 touch가 문서를 이동해도 재생 추적이 유지되던 실제 결함을 수정했다. native red-a에서960302→7/1400265.5→0인데following=true·unit3red를 보존했다. listener별 기존 scroll helper에 touch 첫 이동/제스처 latch를 적용하고 unknown fallback·wheel·outer/contain 정책 보존. B의 잔여1px 과도중단과 fallback red도 보존해 C에서 수정했다. 최종11파일109검사(새15)/type/build/profile/fixed PASS·baseline변경없음. 실제재생/잔여1px/입력12조건·Native36/재열기/history0·960/1400화면 직접검토, 현runtime807/811/81212조건도PASS. source2911 전체C gate는다음실행·810전체3667은수정전. 목표도구paused/재개API없음·현재턴계속·미커밋·물리touch/OS/청음/외부/새출력 미검증 유지.

812는 동일810 제품의 공개 파트보 viewport QA다. 보기 메뉴·공통 Select End/Enter로 전환한 뒤960dark/1400light×내부wheel/경계wheel/경계 뒤 새 선택6조건13.68초 PASS·수동root0/scroll0·명시복귀·정상 노출·Native24/재열기/history0·score/partLayouts/settings 보존·1400화면 직접 검토. view mode/partId만 의도적으로 변경됐다. source2911 동일·전체8103667/Node5 재사용·새build/visual/baseline/제품 변경 없음. 한 파트 projection 범위이며 여러 파트 전체 승인이나 출력/물리/청음 검증이 아니다. 목표도구paused/재개API없음·현재턴 계속·미커밋·보호 유지.

811은 동일810 제품의 실제 큰wheel 잔여 공간 QA다. 960dark/1400light×충분한 공간/잔여1px4조건7.71초 PASS:도크160→80/1→0에서 clamp·문서151.5/164 유지·추적true, 다음 경계 새wheel은 문서0/추적false였다. 같은 이벤트의 잔여 문서전달 결함은 미재현이므로 제품 변경 없음. A의20RAF 애니메이션82 잔여를 보존하고 B는 실제좌표4회 안정/4초deadline으로 종료80을 확인했다. Native12/재열기/history0·원본 보존·1400 화면 검토. source2911 동일·810전체3667/Node5 재사용·새build/visual/baseline 없음. 다음812는 파트보 projection의 수동 viewport·명시복귀 독립QA다. page focus 에뮬레이션·목표도구paused/재개API없음·현재턴 계속·미커밋·물리/출력/청음/외부 미검증 유지.

전체810-green-a의 정확한 npm run test:all이 exit0/557.15초로 완료됐다. 선택viewport/자동·명시focus 분리와 새8회귀를 포함해 Vitest349파일3667검사 PASS·외부opt-in1파일1검사 skip·Node-native5 PASS다. source2911/build/install lock 전후동일·live 차이는 진행3문서·전체중 제품/테스트/QA 수정이나 build/Electron 병행 없음. 원래 실패/로그·baseline 유지·미커밋. 실제 선택8조건/Native30·입력/미완성8조건/Native24와 분리 기록했다. 다음811은 같은 제품에서 큰 wheel의 내부 잔여 공간/문서 전달을 실제 관찰한다. 목표도구paused/재개API없음·현재턴 계속·물리/청음/외부 미검증 유지.

810은 비입력 선택의 경계wheel→resize에서root0이960189.5/1400145.5px로 되돌아가던 실제 결함을 수정했다. App red3/대조4·native-red-b scroll2회 실패를 보존했다. 기존 입력 viewport ref를 score 소유권으로 재사용하고 동일score/동일대상의 자동redraw와 새 선택·편집의 명시focus를 분리했다. 기존 identity/generation/필드intent·공개API/기보/저장계약 유지. 최종11파일94검사(새8)/type/build/profile/fixed PASS·baseline 변경 없음. 실제8조건:수동root0유지/scroll0·정상/새선택/한음높이편집 노출·undo/redo·Native30/재열기 PASS·1400화면 검토. 현runtime의808/8098조건/Native24도PASS. source2911의810 전체gate 실행 중이며8083659는 새 수정 전이다. page focus 에뮬레이션·목표 도구 paused/재개API없음·현재턴 진행·미커밋·물리/출력/청음/외부 미검증 유지.

809는 동일808 제품의 pending tuplet 실제 회귀 QA다. score-core/Native 함수로8마디 쉼표 악보를 생성해 실제N/Cmd3/C로1/3 상태를 만들었다. 960dark/1400light×내부/경계4조건7.8초 PASS·실제 glyph/stroke 다음멤버 잉크·정상 노출·수동root0/resizeScroll0·명시 복귀·Escape 취소·Native12/재열기/history0 보존·1400 화면 검토. 멤버3+잔여쉼표1을 놓친 초기 count 가정과 Escape defaultPrevented 가정의 QA 실패는 보존하고 실제 계약으로 정정했다. source2910 제품 동일·808전체3659/Node5 재사용·새build/visual/baseline 없음. 다음810은 비입력 선택의 manual wheel→redraw anchor를 별도 측정한다. page focus 에뮬레이션·목표도구paused/재개API없음·현재턴 계속·미커밋·물리/출력/청음/외부 미검증 유지.

전체808-green-e의 정확한 npm run test:all이 exit0/564.69초로 완료됐다. 입력 wheel/자동SVG focus/예약canvas reveal 수정과 새13회귀를 포함해 Vitest348파일3659검사 PASS·외부opt-in1파일1검사 skip·Node-native5 PASS다. source2910/build/install lock 전후동일·live 차이는 진행3문서·전체중 제품/테스트/QA 수정이나 build/Electron 병행 없음. 원래 실패/로그와baseline유지·미커밋. 다음809는 같은 제품의 pending tuplet 실제 wheel/resize/취소 회귀 QA이며 전체 gate를 그 조건의 승인으로 확대하지 않는다. 목표 도구 paused/재개API 없음·현재턴 진행·물리/청음/외부 미검증 유지.

808은 입력모드의 도크 경계 wheel→창높이900→650 뒤 root가960에서189/1400에서145.5px로 되돌아가던 실제 결함을 수정했다. 경계 판정만 고친 첫 green-b는 실제 실패했으며 renderer anchor/자동focus/예약canvas reveal을 추가로 분리했다. 내부 wheel helper를 입력/재생에 재사용하고 자동 SVG focus 복원은 유지하되 수동 입력 viewport 이동을 생략한다. 공개 공통API/schema/geometry 변경 없음. red2+후속red2/부분실패 보존·최종10파일86검사/type/build/profile/fixed PASS·baseline 변경 없음. 실제 native-green-c4조건7.37초, 경계root0유지/resizeScroll0·정상 cue노출·명시복귀·Native12/재열기/history0 PASS·화면2개 검토. 현재runtime의807 재생회귀/Native6도 PASS. source2910의808 전체gate 실행 중이며8073646은 새 수정 전이다. 목표 도구 paused/재개API 없음·현재턴 진행·미커밋·물리/청음/외부 미검증 유지.

전체807-green-a의 npm run test:all이 exit0/555.93초로 완료됐다. 도크 wheel 방향/경계 수정과 새9회귀를 포함해 Vitest347파일3646검사 PASS·외부opt-in1파일1검사 skip·Node-native5 PASS다. source2907/build/install lock 전후동일·live 차이는 진행3문서·전체중 제품/테스트/QA 수정이나 build/Electron 병행 없음. baseline 변경 없음·미커밋. 다음808은 입력 커서의 유사 분기를 별도 실제 입력모드에서 재현하며807의 결과를 자동 확대하지 않는다. 목표 도구 paused/재개API 없음·현재턴 진행·물리/청음/외부 미검증 유지.

807은 실제 팔레트 경계 wheel의 문서 이동 뒤 재생 추적이 true로 남던 결함을 수정했다. 수정 전 960/1400 native wheel은 root151.5/164→0인데 추적true였고 strict native-red-c 및 새 단위2실패를 보존했다. 화면 되돌림까지 재현한 것은 아니다. 기존 scrollport loop에서 방향별 소비 가능성과 overscroll contain/none·바깥 소비를 구분한다. 관련5파일49검사(새9)/type/build/profile/fixed PASS·baseline 변경 없음. 실제 native-green-d는 내부 소비 root유지/true, 문서 전달0/false와 명시 재개true·Native6/재열기/history0 보존 PASS·960 화면 검토. 준비실패audit-a도 보존했다. 현재 source2907의807 전체gate 실행 중이며8053637은 새 수정 전이다. 목표 도구 paused/재개 API 없음·현재 턴 진행·미커밋·물리/touch/청음/외부 미검증 유지.

806은 동일805 제품의 실제 PNG 회귀 QA다. File 메뉴·PNG 버튼·renderer rasterizer·실제 savePngExport/파일 쓰기로 960dark/1400light×정지/재생/일시정지/재정지8출력 PASS(최종D6.43초). 모두300dpi2480×3508·파일해시3c3f2733... 동일·CRC/pHYs 정상·실제 decoder에서 대표 강조색 pixel0·snapshot 선택/커서/focus0. Native6 전체/재열기/history0·원본 보존과 실제 화면/제품 PNG를 검토했다. pointer focus-visible 및 cursor-selection-sync를 놓친 초기QA 실패와 C 파일명 충돌은 보존·정정했다. page focus 에뮬레이션/OS 미검증을 구분한다. source2907 제품 동일·805전체3637/Node5 재사용·새 build/visual/baseline 없음. 다음807은 도크 끝의 wheel이 문서로 전파될 때 재생 추적 소유권을 실제 측정한다. 아직 결함 확정 아님·목표 도구 paused/재개API 없음·현재턴 계속·미커밋.

전체 805-green-a gate가 exit0/554.28초로 완료됐다. Vitest 347파일/3637검사 PASS·외부opt-in 1파일/1검사 skip·Node-native 도구5 PASS다. 803~805 제품 변경과 새 회귀6개를 포함한 고정입력2907/build/install lock이 전후 동일했다. 전체 중 제품·테스트·QA 코드 수정 또는 build/Electron 병행은 없었고 live 차이는 진행3문서뿐이다. baseline 변경 없음·미커밋·목표 도구 paused/재개 API 없음·현재 턴 계속. 다음806은 동일 제품의 실제 PNG 출력과 화면 강조 격리 QA이며 전체 목표 완료가 아니다. 원래 로그와 실패·물리/외부 미검증은 유지한다.

805는 정적 선택과 live 재생의 stroke 상속 불일치를 실제 renderer에서 재현해 수정했다. 줄기가 검정으로 바뀌고 명시적 회색 덧줄이 붉어지던 자식별 덧칠을 기존 VexFlow 이벤트 그룹 fill/stroke 방식으로 정리했다. hit 투명성·focus ring·명시적 색·style 복원·glyph/geometry/native는 유지한다. red-b의 두 실패 후 관련 5파일/24검사·type/build/profile/fixed PASS, baseline 변경 없음. 실제 비에뮬레이션 Space 960/1400 두 조건과 별도 page-focus emulated Play/Space 네 조건을 구분한다. 후자는 OS 활성화 검증이 아니다. PDF 두 개 각1쪽의 150dpi raster는 804 기준과 동일하며 화면/PDF 직접 검토했다. 초기 focus 실패와 load 전 CDP hang·자체 종료 증거도 보존했다. 803~805를 포함한 2907 frozen 입력의 전체 test:all을 실행 중이며 결과는 아직 없다. 목표 도구 paused/재개 API 없음·현재 턴 진행·미커밋·물리/청음/외부 미검증 유지.

804는 실제 Space 재생에서 focus hit rect의 inline fill이 음표를 가리는 결함을 수정했다. 정지 keyboard focus는투명했지만live중opacity1/rgb180,61,47로가렸다. 기존 screen selector의interaction rect만색칠에서제외하고음악rect/beam·focusring·glyph/localgeometry/font·hitbounds는보존했다. 새2red→green포함4파일18검사/type/build/profile/fixed PASS. 실제960dark/1400light×button/Space4조건6.54초·Native12/재열기/history0·sample60/4decode·Pause/Stop PASS, 두Space이미지검토. 별도803/804×960/1400 PDF4개각1쪽/150dpi1240×1754전체PNG해시동일2a10c434...·현재1400페이지검토·pairNative12보존. rawPDFmetadata와screen문제는구분하고baseline변경없음. 최신전체8023631은803/804전·안정화묶음gate대기. 다음805는stem/ledger의정적/live computedstroke감사이며아직결함아님. 목표도구paused/재개API없음·현재턴구현진행·미커밋·다른작업보존·물리/청음/외부미검증.

803에서는 믹서 focus 뒤 새 wheel/touch intent가 들어와도 예약 RAF가 예전 필드로 스크롤하던 순서를 단위 검사로 재현했다(checkbox/range 각각296px). 기존 workspaceViewportIntent 가드를 재사용한 App의 좁은 수정 후 관련4파일/30검사·type/build/profile/fixed PASS, baseline 변경 없음. 실제 Tab→wheel→RAF 순서는 old/new960/1400 모두 관찰됐지만 첫 frame에 field가 아직 보여 JS reveal 호출은 둘 다0이었다. 이를 production 결함 실패 재현으로 확대하지 않는다. native-old-a의 후속 클릭 실패는 큰 wheel의 compositor 이동이 남은 상태였고 별도 helper가 실제 geometry4회 연속 안정/4초 deadline을 확인하도록 보완했다. strict pointer·hit·가시성 조건은 유지한다. native-green-c5.5초·Native6/재열기/history0·cache/재생/Pause/Stop 보존,960 paused 이미지 검토. 801 A의 원인은 미규명이다. 전체8023631은 이번 가드 전이며804 뒤 안정화 묶음 gate로 진행한다. 현재 턴 구현은 진행 중이나 목표 도구는 paused/재개 API 없음이다. 미커밋·다른 작업 보존·물리/청음/외부 미검증 유지.

사용자 요청에 따라802까지 일단락한다. 최종 npm run test:all은 exit0/867.53초, Vitest346files3631tests PASS/외부optin1file1testskip·Node-native5 PASS다. 고정입력2906/build/install lock 전후동일·새code추가없음·live delta는진행3문서뿐. 새6검사/기존mixer2/type/build/profile/fixed·실제960/1400 두행재생중/Pause뒤대기/Native6/history0 보존을확인했다. baseline변경없음·제품은isPartPlaying기반믹서표시만수정·단일cursor/기보/예약유지. 정리HEAD776edfe22b422fb94ac748adc651981d14b0f39b의별도커밋을성과로세지않고이번Studio수정미커밋. 자체검증프로세스없음·원래88653/다른작업보존. 사용자중단뒤새구현없으며803queuedfocus/804hit채색관찰은다음작업. 목표pause는마지막도구반환확인·물리/청음/외부미검증. 802/full-addendum.md, session-stop.json, resume-goal-prompt.md 참조.

802는 동시 재생 믹서 표시의 제품 수정이다. 799 실제0.4박에61/37sample이 있어도 UI재생중/대기인 red를 보존했다. 단일 cursor/getActiveEventForPart는 유지하고 기존 timeline/gain을 사용한 isPartPlaying으로 각 행을 계산한다. 다른 보표의 음/쉼표·mute/solo/volume0·pause/stop을 구분하며 tail/장치 meter는 아니다. 새 hook5/App1·기존 mixer2/type/build/profile/fixed PASS. 기존 quartet의 가짜 쉼표 active fixture는 같은 ID의 실제 Cello음 Native로 바꾸고 기존 assertion 유지. 실제960/1400 두 행 active/Pause 뒤 둘 다 대기/Native6/history0/캐시 보존 PASS·1400playing과960visiblepaused 이미지 검토. D의 offviewport 캡처를 E에서 실제 view/경계 검사로 보완·중복 성과 합산 없음. 소스2906 전체 gate는 다음 실행·7993625는 이번 수정 전이다. 799 실측875초 근거로 전체 controller만 실행 전1200초 유한 deadline·테스트 명령/timeout/assertion 변경 없음. 목표 active·미커밋·원래88653/별도 작업 보존·물리/청음/외부 미검증 유지.

801은799동일제품의실제두파트cache/mixerQA다. 생성Native빠르기만120→40/문구일치로파생·원본보존. 960dark/1400light 두장면3.82초PASS·초기muted저음root36와상성root60의8samples준비·처음위음만예약·nativepointer/checkboxSpace로해제/재뮤트/해제때동일Context1/decode8유지·전역pause없음. 실제61/37과동일resumeoffset확인·Native6전체/재열기/history0/이웃파트보존. A pointer전위치실패원인미규명보존;B의1400실패는저장된mixeropen을다시닫은검증기오류로C초기state처리수정·assertion유지. 960이미지검토중동시저음이대기로표시돼802에등록했다. 제품수정없음·799전체3625/Node5재사용·새build/PDF/전체승인으로중복계산없음. 목표active·미커밋·원래88653/다른작업/물리·외부미검증유지.

799 전체gate가 정확한 npm run test:all exit0/875.12초로 완료됐다. Vitest344files3625tests PASS/외부optin1file1testskip, Node-native5 PASS. source2904/build/install lock모두전후동일·전체중코드/QA수정이나build/Electron병행없음. 새piano/cache-plan과795CSS를포함하며794이전전체와구분한다. live delta는진행3문서와별도verify-piano-package.mjs뿐이며패키징승인이아니다. Canvas/scrollBy로그보존·baseline변경없음·목표active·다음801실제muted-part cache/mixer복귀검증. 반환799/full-addendum.md와runs/suite-integration-a/참조. 원래88653/liveout/다른작업보존·물리/청음/외부미검증유지.

800은799동일제품의 실제 선택 재생 QA다. 960dark/1400light×첫/두번째음×trusted Play/native Space 8조건이 PASS했다. 실제 decoded sample SHA/AudioBuffer/root/rate로 MIDI61/60/60 또는60/60과 상대시작0/.5/1초 또는0/.5초를 확인했다. 각음2layer·4decode·offset0, Native24/재열기/수동slur0/history0보존. A의이전로딩프레임은보존하고 B에서실제UI/RAF대기후8조건13.55초PASS·1400Space1.0박이미지검토. Stop시각/stop호출/예약을분리해모든source의즉시중단을확인했고새예약은클릭+.016초였다(단순stopped=true는미래noteoff일수있음). 제품수정/청음/물리장치승인아님·목표active·다음동일799입력전체suite. 전체중코드/QA수정·build/Electron병행없음·원래88653/다른작업보존·물리/외부미검증유지.

799 focused는별도피아노코드수정없이현재런타임을새20261103snapshot2904입력에고정한통합QA다. 누락새cache-plan code/test2개포함·capture두번hash일치. playback20files163tests/App선택재생4/mixer2/type/build/profile/fixedPASS다. 기존verifier의assertion유지·자체window음소거·HTTP차단하에실제decoder/BufferSource/정지재개/Worker/SVG보존/programmaticContext중단복원이4.25초PASS다(DOMclick·physical/청음아님). previewfirst256ms4samples18436608bytes후score273ms누적28samples128733696bytes48kHz·warm15ms/preview4ms/Worker208ms관측이며완전coldscore273ms로부르지않는다. 새renderer속성12조건Native36/F6/clip/history도37.23초PASS. source/build/install보존·baseline/API/모델/버전변경없음·미커밋·목표active. live의verify-piano-package.mjs추가delta는보존하고패키징승인아님. 새전체는아직미실행·최신794는CSS/piano전이다. 다음800실제선택Space/Play의sample/rate mapping후동일고정입력전체gate로간다. 원래88653/liveout/다른작업보존·물리/외부미검증유지.

798은795 chromeCSS이후실제PDF공백을검증했다. 동일75자이름Native를고정792/795renderer×960/1400에넣어PDF4개각1페이지·Native12쓰기/재열기·수동slur0/양보표tuplet rest ink보존이PASS다. pdftotext에이름전체남고150dpi전체페이지PNG4개모두SHA01d3f43af297650bc70de9249a294ff3782ac54803e22b4066dc93d581f49d12다. 현재1400페이지직접검토·rawPDFmetadata동일성/새XML/MIDI승인으로과장하지않는다. source7952902는고정이지만live에별도piano sampler/loading/useScorePlayback/device/lifecycle·verify script6파일delta가발생했다. 이를보존하고798을새live전체승인으로확대하지않는다. 다음799에서최신인계/추가inventory와소스를읽어새안정snapshot통합gate를준비한다. 최신전체794는795CSS와새piano변경전·이전gate와구분한다. 제품추가수정/API/schema/버전/baseline/manifest변경/commitpush없음·목표active·원래88653/다른작업보존·물리/외부미검증유지.

797은795동일제품의짧은창·긴대상명QA로현행PASS·제품수정없다. 960/1400×Window640/900×짧은/75자이름8조건/coarseCDP·chrome200,실제CSS높이608/868에서기존footer40vh(최대243.2/347.2)·내부스크롤을확인했다. scrollable5조건wheel은inner22/44/44/44/6이동·root1px이내보존이다. 실제Tab25→footer radio/방향키fixed→Tab확대율→fit복원/F6동일Ncaret·주소tick/history0·min48/outline·Native24쓰기/재열기PASS다. A/B는nativeLabel연결을안읽고100%만읽은observer오류이며실제field가보이고안정전후좌표같은증거를보존했다. C는native labels와strict가시성/ring을유지하며Chromium partialAX8개에서고정확대율이름을확인했다(OS AX/실제SR승인아님). 960640long반환이미지검토·생략/접힘/폰트축소새정책없음·미커밋·목표active다. 최신전체794는795CSS전,795focused39/type/build/profile/fixed와구분한다. 다음798은같은긴이름Native로이전/현재실제PDF/텍스트/raster를대조한다. 88653/다른작업보존·물리/외부미검증유지.

796은795동일제품의긴읽기값·마디/범위선택QA다. 생성Native의partname만공개120자이내75자임시ASCII로바꿨다(초안74자표기는실제len75로정정). 960dark/1400light×dock207/360×coarseCDP·chrome200의4장면/12상태가PASS했다. 실제rest pointer·glyph없는measure background trustedclick·F6→ShiftArrowRight로선택하며DOMselection주입없다. 긴위치는207에서9줄/360에서5줄로emergencywrap되고전체text/가로clip/nativewheel을유지한다. range2이벤트·one-event카드없음·6fields전부disabled,menu/F6 focus·history0·Native20쓰기/재열기동등성PASS다. Escape는none선택명령아니고빈첫voice초기선택도measure라없는none앱상태를만들지않았다. 실제960207measure이미지검토·새제품/모델/API/폰트/schema/baseline/버전변경없음·미커밋·목표active. 최신전체7943616tests는795CSS전,795focused39/type/build/profile/fixed와구분하고새전체/PDF/XML/MIDI성과로반복세지않는다. 다음797은같은긴이름의footer와640px창편집공간을실측한다. 795-A단발wheel원인은미확정유지·원래88653/다른작업보존·물리/외부미검증유지.

795는선택속성의1:2고정열과한국어중간줄바꿈을두서비스CSS에서수정했다. 실제12장면중8장면14대상그룹16단어red후같은엄격한probe의green12장면/48텍스트그룹이37.37초PASS다. 960dark/1400light×dock207/280/360×fine100/coarseCDP·chrome200에서실제TextRange·Canvas advance·nativewheel clip/hit·F6동일rest·history0·Native36쓰기/재열기를확인했다. dt/dd의미/순서·기존gaptoken/가변높이를유지한flexwrap과keep-all/anywhere fallback이며Text문구/폰트/모델/명령/엔진/API/schema/버전/baseline변경없다. 3files39tests/type/build/profile/fixedPASS, red207/green207·280이미지직접검토. 12조건text/font signature동일·지면40px·도크오른쪽지정viewport bitmap12쌍동일이며PDF전체증거로과장하지않는다. Pillow부재분석실패후nativeImage실제비교를사용했다. 최초A wheel소유권QA실패원인은미확정으로보존하고B/green의진단성공으로고쳤다고주장하지않는다. 최신전체794343files/3616tests·Node5는이번CSS직전이며새전체/PDF/XML/MIDI실행아니다. source2902고정·미커밋·목표active·원래88653/다른작업보존·물리/외부미검증유지. 다음긴읽기값/지원선택범위공백을audit한다.

794 원래npm run test:all이804.68초/exit0으로PASS했다. Vitest343files/3616tests·외부opt-in1skip·Node디자인도구5다. source2902/install hash유지,live차이는세작업문서뿐이며실행중제품/테스트/QA-script편집·build/Electron병행없었다. 새snapshot은빌드를만들지않아buildArtifactsStable은빈목록동일성으로명시하고792/793실제renderer/PDF증거와구분한다. A/B170검사의시간범위가겹쳐속도개선/기존timeout원인확정으로해석하지않는다. 기존timeout/진단로그·observer오류red-a와실제중복진단red-b도보존했다. 변경은test-only harness/경계검사두파일이며제품/API/폰트/기보/schema/baseline/버전변경없음·미커밋·목표active다. 자체전체프로세스는종료했고원래Electron88653보존. 다음795는실제한국어readout/범위줄바꿈을측정한다. 물리/외부미검증유지·V1/RC전체완료아님.

794 focused는 test-only App Canvas 환경 정리다. 같은170검사 A/B/B/A 모두PASS·이름/상태/고정소스동일이며 기준245.000/206.719초,실험212.122/226.163초로시간범위가겹친다. 속도개선이나792 timeout원인으로단정하지않는다. 알려진null2D fallback은유지하고188168진단/18817281bytes를0/479bytes로줄인관측성개선이다. 다른context는원래메서드위임·afterEach복원을유지한다. workerconsole관측오류red-a를보존하고 공개VirtualConsole관측red-b의중복2진단실패후 green-c 경계1·관련9files47tests/typePASS다. 실제값/엔진/기보/폰트/API/schema/baseline/버전변경없음·미커밋이다. 신규경계1개포함현재testinventory344가고정복제본과같다. 지금원래npm run test:all을source2902의794-green-c에서실행중이며아직PASS가아니다. 실행중제품/검사/QA-script수정·build/Electron병행없다. 동일792/793production증거와구분하고다음795읽기값한국어줄바꿈공백을등록했다. 원래timeout/실패로그보존·목표active·외부/물리미검증유지.

793은792동일제품의 실제 rest pointer·touch QA다. 960dark/1400light × 대보표/두파트 × fine100/coarse CDP touch·chrome200의8장면에서16쉼표 선택, 실제 메뉴 속성 진입·native wheel로32읽기값의 clip/hit 노출, F6동일선택 복귀와 Native24쓰기·재열기 보존이 통과했다. SVG는mousedown에서 재그려져 click이 없으므로 실제down/up와 정확한주소로 검증했다. C/D의패널35px 관찰은안정전좌표였고 E는4연속동일좌표후기존가시성assertion그대로41.78초PASS다. 실패로그를보존하고 제품scroll수정은하지않았다. 960coarse읽기값/선택이미지를직접검토했다. source2901/build동일·live차이는세작업문서뿐이며 새PDF/MIDI/전체suite성과로중복계산하지않는다. 792의원래test:all timeout과동등한verbose전체PASS를구분해재사용한다. baseline/API/schema/버전변경없음·미커밋·목표active. 다음794는159MB Canvas진단과App전체170검사의실행비용을같은assertion으로A/B조사한다. 물리touch/IME/OSdialog/SR/청취/외부앱은미검증이다.

792의 전체 진단 실행은 Vitest 342파일/3,615검사와 Node 디자인 도구 5개가 모두 통과했다. 동일2workers·전체 검사 목록에 verbose reporter를 적용했고 실행은 881.15초, Node 도구는0.24초였다. 고정 입력2901개·빌드·설치 해시가 유지됐으며 live 차이는 세 현재 작업 문서뿐이다. 최초 `npm run test:all`의900.08초 timeout은 삭제하지 않았다. 따라서 그 원래 명령을 PASS로 바꾸지 않고 상세 로그의 동등한 전체 검증 결과와 구분한다. 실제 rest 높이 수정과 Native22/PDF6/XML8·모델 MIDI 동등성, profile/fixed 결과도 각각 보존했다. 기준 이미지·공통API·schema·버전 변경과 커밋/푸시는 없다. 목표는 active이고 다음793 실제 rest pointer/touch 선택으로 이어간다. 외부 opt-in1skip은 호환성 PASS가 아니며 물리 IME/OS dialog/SR/청취/실기기는 미검증이다.

792의 첫 전체 `npm run test:all`은 900.08초에 exit124로 종료됐다. 최종 테스트 합계나 Node 도구 실행에 도달하지 못했으므로 전체 PASS가 아니다. 고정 입력 2901개·빌드·설치 해시는 유지됐고 live 차이는 roadmap/work-queue/active-work 문서뿐이다. 로그에는 Canvas 미구현 진단 약159MB가 남았으나 최종 실패 위치를 식별할 테스트 이름이 없었다. 소스나 assertion을 바꾸지 않고 같은 전체 Vitest 목록·동일2workers를 verbose reporter로 실행한 뒤 Node 도구를 이어 실행하는 유한 1200초 진단을 추가한다. 첫 timeout과 새 결과를 따로 보존하며, 현재 마지막 전체 PASS는 수정 전 788이다.

792에서 잇단음표 생성자가 기본 쉼표를 인접 낮은 음높이로 옮기는 문제를 수정했다. main/passive가 같은 private 생성 함수를 사용하며, 기존 clef/성부별 rest line과 offset만 보존하고 음가·tuplet 연결·모델은 유지한다. 새 25개 실패 재현 후 33개 검사, 관련 48개, type/build/profile/fixed가 통과했다. 실제 960/1400의 preview·확정·재열기에서 두 8분쉼표 잉크가 SVG y155.04→125.04로 이동해 오선 기본 위치에 놓였다. Native22건, PDF6개 각1쪽, red/green XML8건 XSD와 실제 저장본의 생성 MIDI4건 바이트/음높이61·60·60/길이1·1·1⁄3/velocity42 동등성을 확인했다. MIDI는 모델 serializer 검사이며 새 MIDI UI/OS dialog 검사가 아니다. 기존 baseline을 바꾸지 않았고 대표 단일·대보표 PDF를 직접 검토했다. 현재 2901개 고정 입력의 전체 검사는 다음 단계다. 미커밋·목표 active이며 외부 MuseScore 실행, 물리 IME/OS dialog/SR/청취/실기기는 미검증이다.

791는788 동일제품에서 canvas 내부 포커스의 실제 PageDown→높이640/760/640 변경을 일반 입력/잇단음표1/3×960/1400 4경로로 검증했다. 8회 resize는 기존viewport와 포커스/커서/preview를 보존하며 실제문서끝의 자연clamp만 적용했다. 새 명시적 악보이동은 기존정책대로 안정적인canvas로focus하고현재cue/preview영역을노출했다. 미완결저장 bridge차단2/Native12 전체원본·재열기 PASS, 960pending복귀화면을직접검토했다. 초기4실행의 정확canvas vs자식SVG·남은48px에고정80px요구·명시적복귀에수동focus동일요구·점유음표에서tuplet시작 준비가정 오류는 보존했다. 최종rest-target-e는 실제ArrowRight로여유쉼표를선택했다. 제품/테스트 변경 없이 전체788341files/3590tests·Node도구5 재사용. 다음792는캡처에서관찰한낮은tuplet쉼표의배치와preview/확정결과를reference와대조한다. baseline/API/schema/버전변경없음·미커밋·목표active·물리IME/OSdialog/SR/청취/외부앱/실기기 미검증.

790은788 동일제품에서 실제 N으로 입력모드를 켠 뒤 PDF 응답 대기 중 trusted wheel/PageDown×960/1400 4경로를 검증했다. 커서의part/staff/measure/voice/tick0과 선택/Native전체내용이 보존되고 같은 음표 위치 오차는0.109375px였다. 실제PDF4 한쪽/raster동일·788일반선택출력과도동일, Native12 저장/재열기 PASS다. 실제960키보드완료화면을 직접검토했다. 추가제품수정 없이 기존canvas-focus guard가 작동한 회귀coverage이며 전체788341files/3590tests·Node도구5를 재사용한다. 다음791은canvas 자체focus에서 실제PageDown→창높이변경·부분잇단음표와 명시적복귀를 조사한다. baseline/API/schema/버전변경없음·미커밋·목표active·물리IME/OSdialog/SR/청취/외부앱/실기기 미검증.

789는788 동일제품에서 PDF 지연취소/실패×trusted wheel/PageDown×960dark/1400light 8경로를 검사했다. 실제 ff 한명령으로 dirty/history1을 만든 뒤 완료 전후 같은 음표 위치 오차0px·선택/dirty/history 유지, 새 PDF 재시도 정상focus·실제8개 한쪽출력/raster동일·Native40 전체snapshot/undo-redo/재열기 PASS다. 960오류화면과1400PDF를 직접 검토했다. 최초 current-a는 두번째 창의 포인터 준비 wheel대상 검사에서 실패했고 보존했으며, 프레임계측 diagnostic-b8PASS를 원인해결로 과장하지 않는다. fault-injection의 QA_PDF_PREWRITE_FAILURE는 의도한 IPC오류이며 renderer error/unhandled는0이다. 제품/테스트 변경 없이 전체788의341files/3590tests·Node도구5를 재사용한다. 다음790은 입력모드 상태의 파일버튼 PageDown과 커서추적 소유권을 독립검증한다. baseline/API/schema/버전변경없음·미커밋·목표active·물리IME/OSdialog/SR/청취/외부앱/실기기 미검증.

전체788-green-f PASS:559.0초/exit0, Vitest341files/3590tests·외부opt-in1skip·Node디자인도구5. 파일 완료의 viewport 의도 수정과 새18회귀를 포함하며 source2899/build/install 해시는 유지됐다. 실행 중 live 차이는 roadmap/work-queue/active-work 세 문서뿐이다. 실제 PDF4/Native12·무휠 정상 복귀와 manual anchor 유지·수정전후 PDF8 raster 동일 검증과 분리 기록했다. baseline/API/schema/버전 변경 없음·미커밋·목표active. 다음789는 같은 PDF 버튼 포커스의 지연 취소/실패와 wheel/PageDown, 새 명시적 재시도를 검사한다. 기존778 새팔레트포커스 검증과 중복 계산하지 않는다. 물리IME/OSdialog/SR/청취/외부앱/실기기 미검증.

788은 PDF 파일 쓰기 후 응답을 지연한 실제 wheel에서 같은 음표가 960px에서 319.390625px, 1400px에서 27.390625px 이동하는 오류를 재현했다. 파일 요청 시작의 기존 workspaceViewportIntent를 private focus 요청·버튼 unlock observer·RAF에서 검사하도록 App만 좁게 수정했다. 새 18회귀와 기존 파일 focus17/viewport14/type/build/profile/fixed PASS. 실제 960/1400×무휠/지연휠 4경로는 수정 후 같은 음표 오차0.109375px 이하·trusted File 직접click·Native12 전체source동일·PDF4 한쪽 PASS다. 수정전/후 PDF8의100dpi raster는 모두 같고 대표 화면/PDF를 직접 검토했다. QA의 단일 큰 wheel=맨위 가정과 queued-wheel 이전 호출 집계 오류는 별도 보존했다. 이전 간헐 pointer 준비 실패 전체 원인을 해결했다고 과장하지 않는다. 현재 2899 frozen source의 전체 suite를 다음으로 실행한다. baseline/API/schema/버전 변경 없음·미커밋·목표active. 물리IME/OSdialog/SR/청취/외부앱/실기기 미검증.

전체787-green-c PASS:552.57초/exit0,Vitest340files/3572tests·외부opt-in1skip·Node디자인도구5.형상요약CSS를포함한source2898/build/install 해시유지,실행중live차이는roadmap/work-queue/active-work 세문서뿐이다.원래red4·green8/긴값2·현재CSS F6/Native/PDF/MIDI회귀와분리기록했다.다음788은실제PDF쓰기후응답만지연하고같은파일버튼/BODYfocus에서trusted세로wheel을보내늦은focus/reveal의viewport소유권을검증한다.DOM준비실패를제품결함으로과장하지않고새실패가확인될때만수정한다.목표active/미커밋·baseline/API/schema/버전변경없음·물리IME/OSdialog/SR/청취/외부앱/실기기미검증.

787은형상요약의자동단어분할4조건을실제TextRange/화면으로재현하고서비스CSS의keep-all/필드inline-block·max100%만수정했다.960/1400×도크200/280/360·coarse2006조건+기본280/fine1002조건모두단어/단위1줄·overflow없음,원래textContent/도크prefs/Native16전후동일PASS.최소폭-7.75sp long2조건은Native4/한명령만변경PASS,초기native선택준비실패는별도보존했다.441focused·앱/공통type/build/profile/fixed,현재CSS의786실제F6/초안/저장차단/undo/재열기회귀Native14/MIDI4/PDF2PASS,PDF raster/MIDIbytes는수정전동일이다.새source2898의787-green-c 전체gate실행중이며7853572tests는CSS변경전이다.전체중제품/테스트/QA스크립트수정·build/Electron병행금지.다음788은DOMscroll준비없이trustedwheel→보이는File직접click으로미해결즉시전환을분리한다.목표active/미커밋·baseline/API/schema/버전변경없음·물리IME/OSdialog/SR/청취/외부앱/실기기미검증.

786은785동일제품에서실제S키로slur생성후형상0한명령·닫힌선택F6→같은SVG복귀·미확정0.25F6유지/저장차단/Escape·자동↔0 undo-redo/Native재열기를검증했다.최종measured-f960fine100/1400coarse200 Native14/MIDI4/PDF2각1쪽·raster동일·원본/선택/전체snapshot보존PASS.1400숫자16→32px/높이74px·overflow없음,PDF/F6이미지직접검토.초기Cmd+A 대소문자/선택준비QA오류와PDF직후Filepointer실패는보존했다.일반완료흐름은busy/snapshot종료까지기다려통과했으나즉시전환원인은미해결이며제품수정으로주장하지않는다.전체7853572tests/Node5재사용·source2898동일·baseline/API/schema/버전변경없음·미커밋·목표active.다음787은큰글자요약의자동자/동분할을측정하고서비스CSS내그룹줄바꿈을검토한다.물리IME/OSdialog/SR/청취/외부앱/실기기미검증.

전체785-green-k PASS:553.13초/exit0,Vitest340files/3572tests·외부opt-in1skip·Node디자인도구5.최종공유도크F6어댑터와새9회귀포함,source2898/build/install 해시유지,실행중live차이는roadmap/work-queue/active-work 세문서뿐이다.실제fine/coarse4장면의Native28/MIDI24·저장차단8·기존입력/undo/재열기와profile/fixed결과를분리기록했다.baseline/API/schema/버전변경없음·미커밋·목표active.다음786 선택slur의닫힌속성Select→같은SVG복귀·형상draft/명시적0/저장차단을현재제품으로검증한다.782간헐pointer QA실패는미해결이며외부skip은호환성PASS가아니다.물리IME/OSdialog/SR/청취/외부앱/실기기미검증.

785는공유도크의F6복귀누락을수정했다.원래팔레트2red와확장3focusred를보존하고닫힌속성Select의키차단을분리했다.기존focusScore/isWorkspaceNavigation을재사용하며일반도구는bubble,직접닫힌combobox의F6만capture로연결한다.열린선택/텍스트초안/IME/보조키·헤더/canvas전파를유지한다.최종green-k9tests/공통153/기존탐색191/선택속성31/SpanProperties57/앱·공통type/build/profile/fixedPASS.실제fine-l/coarse-m×960/1400에서팔레트/속성버튼/닫힌Select/탭·canvas왕복/열린Selectguard와pending완성/Native28/MIDI24/저장차단8·undo-redo·재열기PASS.대표960coarse이미지직접검토.새frozen2898의전체suite-green-k가실행중이며777전체3563으로이번수정을승인하지않는다.전체중제품/테스트/QA스크립트수정·build/Electron병행을중단한다.미커밋·목표active·baseline/API/schema/버전변경없음,물리IME/OSdialog/SR/청취/외부앱/실기기·이번새XML/PDF미검증.

784은실제pendingtuplet1중p→ff명령후3멤버를완성하는교차QA다.960/1400 Native14/MIDI12·저장차단4건,ff history1/tuplet확정history2·pending2/1 undo복원·명시적Escape뒤정확한전체Native/redo/재열기와기존ID/anchor보존PASS.첫current-a는동일마디C natural기억을빠뜨린QA기대61오류며원본실패를보존하고60근거를기록한musical-b가통과했다.제품수정이아니다.별도로trustedF6이두폭모두ff팔레트에남는빠진경로를확인해785에등록하고단위red를준비했다.784제품은777과같아전체3563tests/Node5재사용,785의수정승인으로세지않는다.미커밋/목표active·물리IME/OSdialog/SR/청취/외부앱·새XML/PDF미검증.

783은기존727pointer조건을유지한QAframe진단이다.coarse200/960·1400에서공개native click14회와Native4·키보드/원본보존PASS,마지막Filetrigger는준비후8RAF동안위치가안정적이었다.782실패는재현되지않아원인/해결을주장하지않고미해결관찰로남긴다.조건완화/DOMclick/제품변경없으며무가설반복을중단한다.다음784는pendingtuplet1중p→ff명령·저장차단·MIDI사본·멤버완성·두historyundo-redo를기존coverage와구분해검증한다.전체7773563tests/Node5재사용·baseline/API/schema/버전변경없음·미커밋·목표active.물리touch/IME/OSdialog/SR/외부앱/청취미검증.

782 내부scroll 양자화가설은현재제품에서미재현이다.fine200의실제Tab/역방향7단계×두폭은최소위8/아래11.8047px,coarse의완료한진단두실행은위8/아래12.2031px을통과했다.소스/Native/history/선택보존·제품변경없음이다.단,reverse-coarse-d는960키보드검사뒤SaveAs를준비하던727pointer adapter의휠후viewport검사에서exit1이며전체PASS가아니다.후속e/f는통과했지만원인을해결했다고하지않고원래실패/이미지를보존한다.다음783은target/scroll/focus의frame진단과QA안정화정책을조사한다.전체7773563tests/Node5재사용·baseline/API/schema/버전변경없음·미커밋·목표active.물리touch/IME/OSdialog/SR/청취/외부앱미검증.

781은780의실제Native/XML파일을사용한PDF회귀coverage다.960dark/1400light×두문서에서실제열기/가져오기/SaveAs/PDF4·Native8을검증했다.p실제textink·표기10개와PDF내입력/preview/선택UI없음을확인했다.네PDF각1쪽·100dpi raster해시동일,1400XML실제페이지직접검토.출력전후전체Native/history/선택/clean·원본bytes와renderer오류0을보존했다.777frozen2897소스모두동일/live차이세문서뿐,전체7773563tests/Node5재사용.제품/API/schema/baseline/버전변경없음·미커밋·목표active.다음실제검증공백을기존handoff와대조한다.OSdialog/물리IME/SR/청취/외부앱/실기기는미검증이다.

780은777 동일제품의 실제779 p Native→샤프 편집→MusicXML사본/가져오기 QA다.960/1400에서Native12/MIDI10/XML4,사본의dirty/선택/history·Native ID/p anchor 보존과정확한undo-redo가PASS다.XML재가져오기뒤의MIDI전체bytes·61/60·velocity42·시작/길이와의미상모델이같고실제XML4건pinned4.0 XSD통과다.첫캡처header노출을보존하고capture-b로실제음표/조표/p화면을추가검토했다.추가반복파일은독립성과로계산하지않는다.제품/API/schema/baseline/버전변경없음·미커밋·목표active,전체7773563tests/Node5재사용.708strict8px은734에서이미해결됐음을확인해재등록하지않았다.다음781은Native/XML의실제PDF잉크·raster비교다.외부앱/청취/물리IME/OSdialog/SR·이번새PDF는미검증이다.

779은777 동일제품의 실제p 편집중snapshot QA다. fine mouse2와coarse trusted CDP tap2에서제자리표history1후옛Native를쓰고응답만지연했다. 실제p명령은history2·마디전체mark를만들고늦은옛성공은현재p/선택/focus/manualroot/dirty를유지하며미포함변경을안내했다. 새저장만p까지포함해clean이고옛파일bytes는그대로다. Native32/MIDI24,두단계undo-redo·동적ID/anchor·view/partLayouts·재열기·원본보존PASS. MIDI두velocity75→42외전체event동일,시작/길이·60/60보존. 터치p는실제58x48에trusted click각1회이고renderer오류0이다. 1400옛완료안내이미지직접검토. 새제품/API/schema/baseline/버전변경없음·미커밋·목표active,전체7773563tests/Node5재사용. 다음780은실제저장한p Native에서MusicXML사본/가져오기·MIDI·pinnedXSD를검증한다. 물리touch/IME/OSdialog/SR/청취/외부앱·이번새XML/PDF는미검증이다.

778은777 동일제품의dirty SaveAs취소/실패 QA다. fine4/coarse4에서실제제자리표history1후응답대기중p로focus이동·trustedwheel소유권을만들었다. 취소/실패8은대상파일을쓰지않고dirty/history/선택/새focus/manualroot를보존했다. 재시도는요청1회로이전요청과동일한전체Native를저장하고그성공만clean이다. Native40실제쓰기/bridge48요청/MIDI32,undo-redo전체Native·MIDIbytes·retry재열기·원본보존PASS. renderer error/unhandledrejection은8모두0이며의도된Node IPC실패로그는보존했다. 1400fine오류이미지직접검토. owner전체footer가림은이번8조건에서성립하지않아잔류수정승인으로세지않는다. 모든프로젝트기록은실제SaveAs이고일반CmdS경로재사용검증이아니다. 제품/API/schema/baseline/버전변경없음·미커밋·목표active. 최신전체7773563tests/Node5를같은제품gate로재사용한다. 다음779는SaveAs대기중실제p명령을추가한뒤옛snapshot성공이최신편집을clean으로오인하지않는지조사한다. 물리IME/OSdialog/SR/청취/실기기/다른앱과이번새XML/PDF는미검증이다.

전체777-green-d PASS:555.75초/exit0,Vitest339files/3563tests·외부opt-in1skip·Node도구5. Tooltip의문서body 레이아웃관찰과새회귀3개를포함한다. 고정소스2897/build/install 해시유지,실행중live차이는roadmap/work-queue/active-work 세문서뿐이다. baseline/API형태/token/CSS/기보/schema/버전변경없음·미커밋·목표active. 외부skip은호환성PASS가아니며물리IME/OSdialog/SR/청취/다른앱GUI는미검증이다. 다음778 dirty SaveAs취소/실패·새focus/manual viewport·실제retry와undo/redo를진행한다.

777은늦은SaveAs결과가상태바를키우는경로를보완했다. 실제1400/글자200/수동viewport에서footer+96px·새focus/scroll보존중Tooltip잔류1red(다른3조건분리)를보존했다. 진단ResizeObserver는body1187.78→1283.78px를확인했다. 기존Tooltip ResizeObserver에동일문서body를추가하고새polling/전역characterData/scroll이동/API는만들지않았다. 단위새2red/8controls→10PASS,공통153/nav191/props31/앱·공통type/build/profile/fixed/tooltipquick/AST66 PASS. fine4/coarse4실제지연응답은수동root차이0·새p focus·가림뒤닫힘,자동추적은기존47/96px노출을유지했다. Native24쓰기·251byte파일명실제저장/재열기·원본/score/view/partLayouts 보존. 776partial/가림/재열기회귀2도PASS. 1400red/green직접검토,baseline/token/CSS/기보/schema/버전변경없음·미커밋·목표active. 새전체777-green-d실행중이며7763560tests/Node5를이번수정의전체PASS로대체하지않는다. 다음778은dirty SaveAs취소/실패·새focus/manual viewport·retry와정확한undo를기존coverage에대조한다. 물리IME/OSdialog/SR/청취/실기기/다른앱GUI·이번새PDF/XML/MIDI는미검증이다.

전체776-green-d PASS:553.55초/exit0,Vitest339files/3560tests·외부opt-in1skip·Node도구5. 공통Tooltip의fixed/sticky전체가림수정과새단위7개를포함한다. 고정소스2897/build/install 해시유지,실행중live차이는roadmap/work-queue/active-work 세문서뿐이다. baseline/API형태/token/CSS/기보/schema/버전변경없음·미커밋·목표active. 외부skip을호환성PASS로세지않고물리IME/OSdialog/SR/청취/다른앱GUI미검증을유지한다. 다음777은실제지연SaveAs응답의상태바성장·새focus·수동viewport소유권을조사한다. 초기큐나테스트수만으로전체CommercialV1/RC완료를선언하지않는다.

776은상태바뒤Tooltip지속잔류를수정했다. 상단성부시도는스크롤조건미성립으로분리했고 실제p팔레트의960/1400에서owner전체가림·실제hit후700ms잔류2red를보존했다. 단위fixed/sticky×focus/pointer4red/3controls→7PASS. 기존private가시성에전체사각형과중심/네모서리hit를함께확인하며서비스selector/새polling/scroll이동/API를추가하지않았다. 공통150/nav191/props31/앱·공통type/build/profile/fixed/tooltipquick PASS. fine32/coarse48 네장면은닫힘,추가부분가림/같은owner재진입 네장면은유지→닫힘→재열림/Escape를검증했다. Native각8쓰기와문서/선택/history/view/partLayouts·원본보존. 960red/green이미지직접비교. API AST66동일이나basic private body SHA는변경됐다. baseline/token/CSS/기보/schema/버전변경없음·미커밋·목표active. 새전체776-green-d실행중이며7733553tests/Node5를이번수정의전체PASS로대체하지않는다. 물리IME/OSdialog/SR/청취/다른앱GUI/clip-path전반·이번새PDF/XML/MIDI는미검증이다.

775은773 동일제품의 범위 음가준비 QA다. 960/1400×640·chrome200/coarse에서 범위의8분음표 선택은Native/선택/history0/clean을 유지하고 다음입력 설정만 바꾼다. N 뒤 실제D 입력은기존쉼표ID를유지해tick26880의D#4 8분음표로전환하고앞두음표와점4분쉼표를보존한다. Native12·MIDI6,명령1/정확한undo-redo/재열기·원본bytes/view/partLayouts PASS. MIDI63은2~2.5PPQ이고사본은dirty를유지한다. 초기QA가새ID를요구한오류는원본을보존하고명시적쉼표ID보존으로바로잡았다. 960화면직접검토. 제품/API/schema/baseline/버전변경없음·미커밋·목표active. 전체7733553tests/Node5 재사용하며새전체성과로중복계산하지않는다. 다음776 footer가림tooltip가설을조사한다. 물리IME/OSdialog/SR/청취/외부앱·이번새PDF/XML은미검증이다.

전체773-green-d PASS:554.62초/exit0,Vitest338files/3553tests·외부opt-in1skip·Node도구5. 772 가사 범위 보호와773 범위 타이의 범위 밖 수정 보호 및새App10tests를포함한다. 고정소스2896/build/install 해시유지,실행중live차이는roadmap/work-queue/active-work 세문서뿐이다. 774는동일제품의QA이며새전체성과로중복계산하지않는다. 외부skip은호환성PASS가아니고물리IME/OSdialog/SR/청취/실기기미검증을유지한다. baseline/API/schema/버전변경없음·미커밋·목표active. 다음775 범위의음가준비→실제N/입력/undo·Native/MIDI검증,776 footer가림tooltip가설로이어간다.

774은773과 동일한 제품의 tooltip 시점별 QA다. 실제4장면에서 960은 모든 시점 tooltip없음,1400은 scroll직후 owner top-185.71/bottom-111.71인데 tip top28.79가 잠시 보였고600ms후 모두 사라졌다. 정상owner노출로 오해하지 않지만 지속잔류 재현/제품수정으로 보고하지 않는다. 선택직후/즉시/안정화 JSON과 캡처를 보존했다. 공통Tooltip/API/CSS/baseline 변경없음·미커밋·목표active. 기존 Native/MIDI 성공을 새기능성과로중복계산하지 않는다. 772/773을 포함한 새전체773-green-d가 실행중이다. 다음775는 범위 상태에서 음가 선택이 다음 입력 준비에만 반영되는 기존 계약과 실제 N/입력/undo를 검증한다.

773: 범위 타이의 실제 범위 밖 수정을 차단했다. D4/C4/C4/C4의 앞 두 음표만 선택했는데 버튼/T가 둘째·셋째 연결을 바꾸던 8actual red와 Native36쓰기를 보존했다. 단위4red/1대조군 뒤5PASS. App 타이 상태·builder·오류 안내를 단일 선택 위치에 맞추고 엔진/키맵/동일 화음 정책은 유지했다. 최종8범위시도는 버튼disabled/pressedfalse·실제T명령없음·범위와Native/MIDI동일이며 단일 생성/해제는 한명령/undo/redo/재열기를 유지한다. Native28·MIDI12파일, 원본/view/partLayouts 보존 PASS. 기존화음7/core·repeat27/가사5/범위속성8/type/build/profile/fixed와 772actual가사2회귀 PASS. 1400 단일선택 이미지를 직접 검토했다. baseline/API/schema/버전 변경 없음·미커밋·목표 active. 최신전체7713543tests/Node5는772/773 수정 전이며 새전체 gate가 필요하다. 캡처의 성부 도움말 노출은 후속 tooltip 소유권 조사 후보이며 잔류 결함으로 미리 단정하지 않는다. 물리IME/OSdialog/SR/청취/외부앱과 이번 신규XML/PDF는 미검증이다.

772: 범위의 마지막 음표에 개별 가사 입력기/속성이 열리지만 확정은 거절되던 불일치를 수정했다. 단위 red-b 3실패/2대조군 뒤 5PASS, 실제 current-e 두 폭에서 입력/blur 오류와 Native/범위/history 불변을 확인했다. 단일 선택 위치를 UI와 가사 callback에 사용하고 탐색용 위치/쉼표 Enter는 보존한다. 실제 green-g/large-j 각2경로·Native각12쓰기, 단일 한국어 삽입/명령1/undo1/redo/재열기와 source/view/partLayouts 보존 PASS. 새 안내는 caption기본12→24px로 확인했고 큰글자 두폭 footer 위 잉크를 측정했다. 초기 QA의 작업대/입력 CmdS/28px 가정 오류와 로그는 보존했다. 새5/기존가사1/inline19/범위8/common143/nav191/props31/type/build/profile/fixed PASS. 771 전체3543tests/Node5는 이번 수정 전이며 새전체 PASS로 보고하지 않는다. 기보/schema/API/baseline/버전 변경 없음·미커밋·목표 active. 다음은 범위 타이의 범위 밖 이웃 수정 가설 audit다. 물리IME/OSdialog/SR/청취/외부앱과 이번 신규 PDF/XML/MIDI는 미검증이다.

전체 771-green-c PASS: 546.49초/exit0, Vitest336files/3543tests·외부 opt-in1skip·Node도구5. 소스2894/build/install 해시 유지, 실행 중 live 차이는 roadmap/work-queue/active-work 세 문서뿐이다. 771의 범위/단일 표기 분리와 8개 새 App 회귀를 포함한다. 외부 opt-in skip은 호환성 PASS가 아니며 historical R3 revision 차이를 해소한 결과도 아니다. baseline/API/schema/버전 변경 없음·미커밋·목표 active. 다음772 가사 범위 포커스 조사로 진행한다.

다음 실행 큐: 771 전체 gate 완료 후 772-range-lyric-context/contract.md의 가사 범위 포커스 가설을 재현한다. 현재는 코드 관찰 단계이며 새 결함 수정이나 production PASS가 아니다. 768 canvas 복귀 후 이전 음표가 footer 근처에 있던 관찰은 현재 입력 caret 우선 정책과 구분해 후속 audit 후보로 유지한다.

771: 범위 포커스를 단일 표기 편집 대상으로 노출하던 오류를 수정했다. 단위 4red/4대조군 뒤 8PASS, 실제 4red에서 마지막 쉼표만 바뀌던 Native를 보존했다. 단일 선택 전용 위치로 UI/콜백을 보호하며 범위 탐색 위치는 유지한다. green 실제 4경로·Native28, 단일 음표/다음 입력과 화음 회귀 Native16/10·XML 재가져오기/MIDI, 공통143/nav191/props31/범위11/장식12/type/build/profile/fixed PASS. baseline/API/schema/버전 변경 없음·미커밋·목표 active. 현재 고정 소스2894의 전체 검사 실행 중이며 766 전체를 이번 수정의 전체 PASS로 대체하지 않는다. 다음은 가사 도구의 범위 포커스/개별 명령 계약 audit다. 실제 OS dialog/물리 IME/SR/청취/외부 앱은 미검증이다.

770은기존714의SHA동일한단일4음화음을사용했다. Ebb4/Fb4/Gbb4/Ab4의기보이름을유지한채기존제자리표버튼으로4alter만0으로바꿨다. 960/1400×640·글자200/coarse에서화음전체안내·history1·정확한undo/redo와Native10쓰기를검증했다. MIDI각59음중2/3PPQ의4on/off8event·8byte만62/64/65/68→64/65/67/69로변했고원본714MIDI와baseline도byte동일했다. 다른Native/수동geometry/view/partLayouts는같고사본성공은dirty를유지했다. 실제제자리표E261 glyph각4개(총8)의잉크가viewport/footer안에있고960이미지를직접검토했다. XML2 pinnedXSD·실제가져오기후전체MIDIevent동등성도통과했다. initial-a는XML이재생성하는measure/event ID에NativeID를요구한QA조회오류로마지막에실패했고보존했다. b는NativeID엄격보존검사는그대로두고XML만유일한마디번호/tick/화음·duration·pitch/key와MIDI로대조해통과했다. 새mixed/부분화음타이모델·제품/API/baseline/버전변경없음·미커밋·목표active. 전체7663535tests/Node5를재사용한다. 다음771은범위선택의개별표기편집진입과enablement를엔진계약에대조한다. 물리IME/OSdialog/SR/청취/외부앱은미검증이다.

769는766동일제품의실제다음입력/선택음표적용범위QA다. 960/1400×640·큰글자200/coarse에서첫C#4입력후제자리표를선택해도history1/기존Native/선택을바꾸지않고다음설정만natural로바뀌었다. 다음C는C4natural로들어가history2가되고설정은자동으로복귀했다. 입력종료후첫음표를기존SVG/nativeEnter로선택하고같은버튼을누르면그음표의alter만0으로변해history3이된다. Native16쓰기의score/view/partLayouts·정확한undo/redo,복사중dirty·선택을보존했다. 실제MIDI는61,60→60,60이고시작0/PPQ·종료PPQ/2PPQ를유지하며XML실제가져오기후event도같다. XML2는pinned4.0/localcatalog/--nonet으로통과했다. 1400선택natural이미지를직접검토했다. 초기긴Unicode QA작성은Python decode전에실패해제품/QA실행이없었고apply_patch로작성해통과했다. 음표선택은키보드coverage이며전체pointer/물리IME/OSdialog/청취/외부앱검증이아니다. 새제품/엔진/API/baseline/버전변경없음·미커밋·목표active. 최신전체7663535tests/Node5를재사용하며새전체성과로세지않는다. 다음770은현재지원하는단일화음전체임시표변경을기존모델그대로검증한다.

전체766-green-c PASS:543.33초/exit0,Vitest335files/3535tests·외부opt-in1skip·Node도구5. source2893/build/install hash유지,live차이는roadmap/work-queue/active-work 세문서뿐이다. 공통Dialog의실제rounded-hit수정과12추가회귀를포함한다. 767은같은제품의QA이므로새전체성과로중복계산하지않는다. 별도historical R3 읽기전용hash check는218입력의과거기준차이로exit1이며로그/manifest전후동일SHA를보존했다. system-review가명시한현재shared-baseline/support-matrix/service-theme기준과역사적R1~R3를구분하고manifest를재생성하지않았다. 제품전체test:all PASS와역사적revision차이를혼용하지않는다. API형태/기보/schema/baseline/버전변경없음·미커밋·목표active. 다음768덧줄paint검증과769임시표다음입력/선택범위실제조작을진행한다.

767은766동일제품에서실제765wizard로만든Emajor Native파일을그대로사용했다. 960/1400×640·글자200/coarse에서기존N/C명령한번으로C#4를입력했다. head실제ink와caret소유권·history1/dirty·정확한undo/redo·Native재열기를확인했다. Native12쓰기·XML2·MIDI4가성공했고, MIDI는note61각1개/시작0/종료PPQ이며실제XML재가져오기뒤event배열도같다. MusicXML pitch C/alter1/octave4와fifths4를보존하고사본출력은dirty를유지했다. XML2는byte동일하며pinned4.0 XSD3파일hash/SOURCE/catalog를확인하고--nonet으로통과했다. 첫xmllint는catalog누락으로schema compile exit5였으며원래로그를보존했다. 초기QA괄호syntax오류도Electron시작전에잡아원본/로그를보존했다. 960첫입력이미지를직접검토했다. 이것은새제품수정아닌추가상태전환coverage다. head노출은확인했지만그캡처의C4덧줄stroke는768독립SVG/paint검사대상이며누락결함으로미리단정하지않는다. 물리IME/OSdialog/청취/외부앱·실기기는미검증이다. baseline/API/기보/schema/버전변경없음·미커밋·목표active. 766수정의새전체gate를실행한뒤768로진행한다.

766은native Dialog의둥근모서리hit를보완했다. 사각bbox안이지만radius16곡선밖의bottom2폭×wheel/touch4경로는root+120/+56으로실패했다. old763 top추가4경로중1400wheel/touch2실패,960top2는현행통과로분리했다. 단위8실패/28대조군후기존private backdrop판정에실제CSScorner radius·겹침축소를반영했다. finalbottom4/top4모두root보존(TopTouch준비root120유지),Native16쓰기·focus/draft/선택·geometry를보존했다. 내부wheel/touch·닫은뒤정상root scroll을유지하고rounded안쪽/사각sheet모서리대조군도통과했다. 공통143(gesture36)/nav191/props31·앱/공통type/build/profile/fixed와backdrop6·nestedSelect/multicontact2회귀PASS. API66선언/기본값/reexport는같고index private body만변경됐다. 1400top-touch이미지를직접검토했다. 기보/glyph/font/CSSsurface/token/schema/baseline/버전변경없음·미커밋·목표active. 실제sheet GUI/임의clipPath·부모transform/다른앱/물리touch·pinch/IME/OSdialog/SR은미검증이다. 최신전체7633523tests는이번12추가및수정전이며767실제Emajor입력/파일교환검증후새전체gate가필요하다.

765는763과동일한제품의실제keyboard 조표Tab확정 QA다. 960/1400×취소/생성4경로에서 c-major 선택을유지한채 e-major를highlight한뒤Tab으로확정하고박자표로focus를넘겼다. 이단계에는submit0/문서변경없음/root보존이다. 취소2경로는clean/history0/원래선택과Native를정확히보존했고, 생성2경로는trusted formsubmit각1회로제목·8마디모두fifths4 major를만들어프로젝트저장/재열기했다. Native총10쓰기·원본fixturebytes를보존했다. 첫current-a는새문서CmdS를Native저장으로오인한QA경로오류로MusicXML handler부재/deadline에실패했고보존했다. current-b는실제File>프로젝트저장으로첫Native저장,이후Native단축키를사용해통과했다. 키맵/제품을변경하지않았으며전체keyboard-only lifecycle로주장하지않는다. 1400commit이미지를직접검토했다. 최신전체763335files/3523tests·Node5를재사용하며새전체성과가아니다. baseline/공통API/기보/schema/버전변경없음·미커밋·목표active. 다음766은실제둥근모서리hit감사다.

전체763-green-g PASS:545.91초/exit0,Vitest335files/3523tests·외부opt-in1skip·Node도구5. 고정소스2893/build/install 해시유지,live차이는roadmap/work-queue/active-work 세작업문서뿐이다. 762 backdrop wheel과763 single-contact touch 수정 및24공통회귀를 포함한다. 764 QA는 같은제품이며새전체성과로중복계산하지않는다. baseline/API/기보/schema/버전변경없음·미커밋·목표active. 다음765는실제wizard 조표Tab확정후취소/생성·Native재열기,766은둥근모서리hit 가설을확인한다. 외부opt-in skip은호환성PASS가아니며물리IME/touch/OSdialog/SR은미검증이다.

763은 Dialog backdrop의 단일손가락 pan을 보완했다. current-a6실패 뒤 red-b에서도6실제 root+53~59.5와 정상 내부pan/닫은뒤root pan 대조군을 분리했다. ::backdrop touch-action:pinch-zoom 시도는 computed style이 반영돼도 두폭 실제green-e에서 실패해 되돌렸으며 snapshot/log를 보존했다. 단위red-f4실패/20대조군 후 기존Dialog adapter에 backdrop 시작 contact ID를 기록하고 해당 single-contact move만 취소한다. 내부에서 시작한gesture·다른target·다중contact·end/cancel·닫기재열기는 보존한다. green-h6경로 root0,내부touch36.5~44/일반wheel40,닫은뒤 wheel120과 touch약36.5~43.5 이동을 유지했다. Native12쓰기·focus/draft/선택/score/view/partLayouts를 보존했다. 24gesture단위/공통131/nav191/props31·앱/공통type/build/profile/fixed 및762wheel6·긴backupretry2 회귀PASS. API66 선언/기본값/재export는 같고 index body는 변경됐다. 1400light backups 이미지를 직접 검토했다. 별도764에서중첩Select touch2·두contact 취소없음·Native4도 확인했다. physical pinch/IME/touch/OSdialog/SR/다른앱GUI는미검증이다. CSS후보는최종소스에없으며 glyph/font/schema/baseline/버전변경없음·미커밋·목표active. 최신전체761은762/763전이므로 현재고정소스2893으로전체gate를다음실행한다.

762는 native Dialog 배경의 일반 세로 휠이 악보를 움직이던 6실제 red를 수정했다. element-local passive:false 시도는 단위11 통과 뒤 실제 green-e에서 cancelable:false/root+120으로 실패했고 그대로 보존했다. 열린 동안 window capture의 non-passive listener를 두되 target=해당 Dialog·border 밖·unmodified vertical 조건만 취소한다. 최종 green-g의6경로는 cancelable:true/prevented:true/root0, 내부40·닫은 뒤 root120을 유지했다. 중첩 조표Select2의 실제 wheel은 취소되지 않고 정상 이동하며 draft/focus/Native4를 보존했다. 기존 내부Dialog6/Popup6/긴 백업retry2 회귀도 통과했다. 공통118/nav191/props31·앱/공통type/build/profile/fixed PASS. 공개API66 선언/기본값/재export는 같지만 index 구현body는 변경됐다. 960dark/1400light·Window640(CSS608)·coarse·글자200이며 960wizard 이미지를 직접 검토했다. backdrop gesture 전체 차단이 아니며 modifier/horizontal·touch/pinch는 이 승인 범위가 아니다. 공통웹Dialog/sheet에 영향, 다른 앱GUI/OSdialog/물리touch/IME/SR 미검증. 기보/font/token/schema/baseline/버전 변경 없음·미커밋·목표active. 최신전체7613499tests는762 전이며 새 전체 gate가 남았다. 다음763은 CDP backdrop 단일손가락 pan을 별도 조사한다.

전체761-green-c PASS:542.60초/exit0,Vitest334files/3499tests·외부opt-in1skip·Node5. source2892/build/install 해시 유지, live차이는 세 작업문서뿐이다. 757 비활성menu pointerfocus와759/760/761의service/publicPopup/nativeDialog 경계수정을 포함한다. baseline/API/기보/schema/버전 변경 없음/미커밋/목표active. 다음762는 native modal backdrop의 실제 wheel target과 background 소유권을 확인한다. 외부opt-in skip은 호환성 PASS가 아니다.

703의 큰 글자/보기 focus 수정은 실제8경로와 Native·MIDI·PNG/undo, focused/type/build/native gate를 통과했다. 704는 실제 잉크3쪽 뒤의 모델 예약4쪽을 제거하며 원점·수동 경로를 보존했다. 159focused/조판DOM50/common93/속성31/type/build/profile/fixed, 실제125% 경계 차단·undo·3쪽 출력과 과대17파트 정책을 확인했다. 일반75/100/125 여섯 대조군의 PNG/PDF는 모두 이전과 같다. 높이를 바꾼 사례의 작은 가장자리 raster 차이는 직접 검토/수치 기록했고 raw identity를 주장하지 않는다. 705의 없어진4쪽 거절/300dpi3쪽 재시도도 통과했다. 704-green-b 전체 gate도 통과했다. 상세는704/full-704-addendum.md에 있다. 목표 active, 물리IME/OSdialog/SR/청취/외부앱은 별도 미검증이다.

634/635는 각각192/200 focused,typecheck/build/profile/fixed 및 실제 Native/파일 검증을 통과했다. 포커스8경로의 실제완료저장48·재열기와 중첩12+추가6/출력14/XML/MIDI/PDF·실제획분리를 확인했다. 기준이미지변경없음. 상세원래실패/미검증은각handoff에있다.

## 이전 slice 요약

- 598–605: 단일/범위 쉼표 편집·span 연결점 보호, 붙여넣기 후 Native 저장, 범위 기호 진입, 전체 쉼표 no-op 비교 등을 수정하고 검증했다. 이전 인계에 실제 결과를 보존했다.
- 606/607: 미완성 잇단음표의 사본 포함 범위 안내와 PNG 설정의 실제 필드 focus를 보완했다. 607 전체 결과와 610 전체 결과가 이를 포함한다.
- 604/608/609/610: 페르마타 연결, 아래 보표 아티큘레이션 누락, 표준 strong-accent MusicXML, 실제 보표 간격을 수정했다. 전체610과 실제 XML 재가져오기/PDF 후속 검증이 통과했다.
- 611: 스타카토·테누토를 실제 음표 머리 또는 기존 성부의 외측 줄기와 연결했다. 실제24화면/28기호에서 간격 약8–15.25와 오선 경계를 확인했다. accent/marcato의 기존 거리 정책은 이 slice에서 바꾸지 않았다.
- 612: 다른 성부의 투명 줄기 사각형이 n2 머리 클릭을 가로채던 문제를 이전610에서 재현했다. 고유한 실제 머리가 있으면 이벤트·전체 주소를 판별한다. 양쪽 성부 클릭, 같은 성부 범위 drag와 Native 보존이960/1400에서 통과했다. 유니슨·줄기·키보드·focus ring geometry는 유지한다.
- 613: 기본악보의 스타카토/mf 잉크가2.35634단위 겹침을 재현했다. 기존 shared music ink에 소유가 명확한 아티큘레이션을 포함해 mf간격8.00364를 확보했다. 낮은 덧줄/두 절 가사/페르마타/수동slur4경로, Native 재열기·출력을 검증했다. 명시적0/height4는 보존하며 수동곡선의 authored 쉼표 통과를 자동 무충돌 성공으로 세지 않는다.

613 focused100, MusicXML122, typecheck/build, profile/fixed PASS. 실제 XML14건이 pinned4.0 XSD를 통과했고, 비교 가능한 XML/MIDI10쌍이 이전 bytes와 같다. PDF14개는 각각1쪽이고 같은 사례의 화면 폭별 raster가 같다. 대표 화면/PDF를 직접 검토했다. 기준값은 두 baseline의 각12수치만 검토 후 갱신했고 이전 기준·실패·이미지를 보존했다. 613-b는 baseline만 다른 동일 renderer 빌드다.

## 다음 실행

1. **710-green 전체 gate는539.80초/exit0으로 통과했다**. 현재 source2882는710 가로 clip 보정/추가 회귀3개를 포함한다. common93/navigation162/properties31/typecheck/build/profile/fixed, 실제710 두 화면과711 오른쪽 현재 음표 검증은 통과했다. 전체704(3448tests)는 이 수정 전이다. 실행 중 source/build/install 해시 보존을 확인했고 자체 전체 프로세스는 종료됐다.
2. **712 rest current-tick**은 같은710제품에서960오른쪽/1400왼쪽 실제glyph와pan/회신/복귀·Native14/MIDI2/PNG보존을 통과했다. 첫generator canonicalJSON/undefined 비교오류는 보존했다. 제품·baseline 변경은 없다.
3. **713–716 QA**는 빈 성부·임시표 실제 잉크·75/125/200 가로 이동과 F6 반복을 검증했다. 제품 수정 없이710 runtime을 유지했다. **717**은 QA 키 입력 도구의 최종 취소 상태를 고치고 실제 두 소비 흐름을 확인했다. 현재 **718 PDF 늦은 응답과 가로 pan** 검증을 진행한다.
4. **708의 엄격8px 세로 gutter**는10단계에서7.8828125로 실패한 관찰을 보존한다. 실제 ring clipping은 없지만 assertion을 줄여 PASS로 만들지 않았다. 전체 test:all/profile PASS와 이 standalone QA 실패를 혼용하지 않는다.
5. HTML header와 notation의 물리 배율 정책은 별도 조사다.699는 기존 PDF header를 보존했으며 전체 PDF/PNG pixel equivalence로 보고하지 않는다. 외부 MuseScore는 새 가설이 있을 때만 재시도하고 이미 정상인 반복 검사를 새 성과로 계산하지 않는다.

Commercial V1/RC 전체 완료가 아니다. 청취·실기기·외부 앱은 실제 수행한 범위만 보고한다. 역사적 로그·manifest·baseline 변경 전 자료를 보존한다.


### 614 복합 아티큘레이션·빔·타이 회귀 coverage

전체613-b와 동일한제품에서960/1400의12경로/32기호를 실제포인터/Native저장·재열기/출력으로 확인했다. 복합표기끼리8단위, 오선회피, 실제빔/타이0.2단위샘플+보수적stroke/paint안쪽검사를 통과했다. XML12 pinned XSD, 실제MIDI의polyphony·tie timing, PDF12 한페이지·폭별동일 및 대표PDF직접검토를 기록했다. 새결함은재현되지않아제품·baseline변경없고새전체PASS로계산하지않는다. 현재전체기준은613-b의287files/3186tests,Node5,external1skip이다. 다음615 외측accent/marcato거리audit.

615 진행: accent의 실제16화면/18기호 조사에서 원점 고정 거리 문제를 확인했다. 높은덧줄에서 실제head/mark 경계가 가로4.28464·세로6.208단위 겹쳤다. 이전613-b의 실제red와 단위2red/기존6대조군을 보존하고 staff-anchored private배치를 구현했다. 기존close배치는 유지하며 glyph/font/Native/배열·DOM순서를 바꾸지 않는다. focused102+MusicXML122/type 통과, production build/실제검증 진행 중. 최신전체613-b는615를 포함하지 않는다.


### 615 악센트 staff 연결 진행

기존613-b의실제16화면/18기호에서고정원점문제를재현했고고음PDF의head/mark겹침을직접확인했다. private staff-anchor로실제오선/음표바깥에배치하며 close계산순서만조정하고모델·배열/DOM·glyph/font는보존한다. 단위2red/기존6대조군→관련102/MusicXML122/type/build/profile/fixed통과. 실제16+복합4경로,XML20 XSD,이전XML/MIDI16쌍동일,PDF20 한페이지·폭별동일/대표직접검토. 기본baseline변경없음. 전체615 실행중이며전체PASS전에는현재성공으로세지않는다. 다음616은기존upward marcato형태를보존한거리조사다.


### 616–617 주음 기준과 부착modifier 분리 진행

현재upward marcato의실제거리문제를수정하고,부착꾸밈음/임시표/flag를주음head/stem으로잘못읽던경계를VexFlow공개객체기준으로좁혔다. 실제head중심11.86449단위밀림,낮은grace56단위이상거리,높은grace빔21.3331단위밀림의단계별red를보존했다. 정상low-pair와가로분리된두marcato는수정성과로세지않는다. 최종617-c의104조판/122MusicXML/type/build/profile/fixed통과,grace/임시표/화음/두grace48경로+복합현재4경로Native재열기/출력통과. 616기준20을합친XML72 XSD,이전XML/MIDI61쌍동일,PDF72 한페이지·폭별raster동일/대표직접검토. 기본baseline/모델/glyph/font/수동geometry보존. 전체617-c진행중이며최신전체615는이수정을포함하지않는다.


## 전체617-c 검증 확정

전체test:all PASS: Vitest287files/3190tests,외부opt-in1skip,Node-native5.478.28초동안snapshot입력2826개·build·설치잠금해시가유지됐고live차이는작업문서3개다. 이전pending문구는실행시점기록이며현재전체는성공했다.616/617을포함한다. 기본baseline변경없음. 자체검증프로세스는종료됐고다음618의실제포인터소유권을조사한다. 외부opt-in skip은외부호환성PASS가아니다. 현재미커밋이며커밋/푸시/릴리즈승인없음.


### 618 실제꼬리 클릭 소유권 진행

임시표/꾸밈음/성부12화면36head클릭은현행정상으로확인했다. 주음flag의opaque픽셀에서다른성부quarter가선택되는실제red를재현하고privateowner판별에vf-flag text를포함했다. 단위1red/기존5대조군,105조판/122MusicXML/type/build/profile/fixed통과. up/down4음가×2폭16경로의click/Native재열기/XML16 XSD/MIDI16 실제6note타이밍·기존bytes/PDF16 한페이지·기존/폭별raster동일을확인했다. flag시작range/realEnter4경로도통과했다. MIDI리뷰의잘못된fixture기대값과원본실패는보존했다. 비canonicalvoice순서의guard차단은별도619로등록하며생산자수정으로섣불리해석하지않는다. baseline/기보geometry/모델변경없음. 전체618진행중이며최신전체617-c는이선택수정을포함하지않는다.


619: 원래 voice 배열 순서로 인한 정상 XML 차단과 실제 성부 번호 손실의 false-negative를 수정했다. private writer 정렬을 signature/span 참조에도 재사용하고 성부 번호·표시 역할을 함께 비교한다. App9(6red/3control→전부PASS), 관련 focused/type/build/profile/fixed, 실제16경로의 XML48 XSD/MIDI16/PDF16과 동일Native 이전빌드 bytes/raster 보존을 확인했다. 전체618은 이 수정을 포함하지 않으며620 후 전체 gate 예정. 반환619/handoff.md.


620: 성부 배열index가 대상 번호로 나오던 오류를 기존 ID parser로 수정했다. 5red/1control→6PASS, corrected15focused/type/build/profile/fixed 및 실제12경로/24클릭/Native 재열기/XML12XSD/MIDI12/PDF12 보존을 확인했다. 자동슬러의 과도한 곡률은 기존PDF에서도 재현돼621에 등록했다. 전체620-b 시작예정이며 baseline변경없음.


621: 실제다성부 자동slur253–288높이 문제를 양쪽자동후보 비교로12.6까지 줄였다. 중간PDF의hairpin SVG잘림을추가red로고정하고기존system/page음악잉크예약에연결했다. 기존76focused/type/build,실제12경로의ink간격·화면/PDFcontainment·Native/XML/MIDI보존·XSD12/PDF12·추가4span포인터/profile/fixed통과. 수동/정상raster6개동일,baseline변경없음. 전체621-b진행예정이며현재확정전체는620-b다. guard조건/cross-system 방향전환은미해결로유지한다. 다음622는grace/principal stem endpoint audit.


621 후속 우선순위: 현재실제검증은한보표다. `621-lower-voice-slur-curvature/neighbor-followup.md`의다중보표 이웃 높은음/스템 여백을전체621-b종료후먼저확인하고,그다음622 grace/principal endpoint를조사한다.둘다아직실제결함확정은아니다.


621-c 다중보표 후속: C5는정상대조군, C7은실제3stem교차/14여백위반으로red를고정했다. 새자동hairpin ink를기존보표간격에전달하는1줄수정후960/1400×C5/C7 4경로가통과했다. C7 head y238→263.37, 실제hairpinbottom255.36과8.01여백이다. Native/XML/MIDI4쌍동일·XSD4·MIDI12note timing·PDF4 한페이지, C5 raster2개동일과C7최종PDF직접검토를완료했다. 기존단일보표12경로도현재c에서재검증했고XML12XSD/원본bytes/PDF수동·정상6raster동일이다. focused76/type/build/profile/fixed통과. 전체621-b는이1줄수정을포함하지않으며622후넓은gate를실행한다. baseline변경없음.


622/623: beamed/whole host의grace-stem endpoint오류를수정하고보통자동hairpin의실제stroke를기존system/page예약에반영했다. 76focused/type/build,실제20경로Native·XML20XSD·MIDI·PDF20/printstroke containment 및수동0controls 통과. profile/fixed실패는이미지/SVG검토후각4numeric leaves만갱신했고623-b 동일제품build로두gate가통과했다. 현재전체623-b예정,기존전체621-b는최근수정미포함. 새624 실제paint와투명span hit소유권오류를등록했다. 외부검증/whole곡선관계는미완이다.


## 629 전체 검증 확정

628/629 포함 test:all: Vitest294files/3232tests, 외부opt-in1skip, Node-native5 통과. 485.05초 동안 소스2838개·빌드·설치 잠금 해시 유지, live 차이는 세 작업 문서다. 기존 pending 문구는 실행 시점 기록이며 현재 전체는 성공했다. 다음630은 같은 보표/다른 시스템의 수동기호·가사 영향을 조사한다. 기준 이미지 변경 없음.


## 630 다른 악보단의 보호 기호 영향 수정

둘째 시스템의 수동슬러/헤어핀/가사로 첫 자동슬러가12.6→339/490으로 커지던 실제 문제를 수정했다. 기존 owner/system과 실제 잉크를 함께 사용하며 같은/걸친/불명확한 시스템과 실제 근접·수동geometry 보호는 유지한다. focused155/type/build, Native12·XML12XSD·Native/XML/MIDI동일·MIDI24음·PDF12(현재16쪽/이전22쪽)·폭별/대조모든페이지동일·profile/fixed 통과. baseline 변경없음. fixture/JSON 비교 오류는 원래 증거와 구분한다. 최신전체629는이수정전이며631 뒤전체gate예정이다. 다음631은dynamic/expression global guard 범위를 실제 조사한다.


## 631 셈여림·표현 텍스트 보호 범위 수정

무관한 보표/시스템의 mf/dolce global guard를 실제14경로/strictred로 재현하고 기존 measure owner+실제 font/stroke 잉크로 좁혔다. private reader를 dynamic spacing과 slur 보호가 공유하며 공통UI/API/schema/재생값은 바꾸지 않는다. 미확인·같은시스템·실제근접 보호 유지. focused162/type/build, Native14+630회귀12, XML14XSD/Native·XML·MIDI동일/24음timing, PDF14 현재18쪽·이전26쪽 모든페이지 비교, profile/fixed 통과. 기준이미지변경없음. 새 전체631 gate를 실행하며 최신확정전체629와 구분한다. 다음632는 많은 수동기호의 측정비용을 실제 조사한다.


## 632 수동 잉크 임시 측정 지연 실행

자동 방향 비교가 없는 실제8경로의 불필요한 임시 제거4/32(초기),6/48(선택까지)를0회로 줄였다. Native strictred6→0, 기존162/type/build/profile/fixed 통과. 전체SVG/Native보존8, 수동먼저/두후보4, 실제보호12·XML12XSD/MIDI/Native/PDF16페이지 전체동일을 확인했다. 열기시간 개선이나 지연버그로 과장하지 않으며 baseline 변경없음. 전체631은이최적화전이다. 다음633은같은시스템의다른마디텍스트가멀리있는자동슬러를막는지실제조사한다.


## 633 같은 시스템 텍스트의 가로 범위

먼 마디 mf/dolce가 자동슬러를6.6/9.52→132.53/207.54로 키우던 실제문제를 수정했다. 실제 measure text만 수평lane허용하며 가로8단위 겹침/불명확system/manual/가사는 계속보호한다. 추가unknown-system unitred도 보존해633-b에서최종승인했다. focused165/type/build/profile/fixed, Native10·XML10XSD/MIDI/Native동일·PDF10 모든페이지/폭별·대조동일, 실제잉크 가로여백86.20–122.52 확인. baseline변경없음. 전체633-b는632/633포함예정이며현재확정전체631과구분한다. 다음634는기호선택/삭제/undo/focus/재계산상태전환을실제조사한다.


## 634 마디 간 Inspector history focus

실제 먼마디 셈여림 삭제/undo의 BODY focus를 중간저장없는16frame·App1red·component3red/2controls로 분리재현했다. private문서/뷰scope와 한frame의 새입력취소로 고쳤으며 공통API/명령/모델/기보는그대로다. notation165+focus27/type/build/profile/fixed, Native8경로48완료저장·실제재열기8, frame대조2/시각4조건이통과했다. baseline변경없음. 원복score의633출력증거를재사용하며 삭제score의실제출력은후속공백으로남긴다. 최신전체633은이focus수정전이다. 다음635는중첩자동슬러의실제교차를조사한다.


## 635 중첩 자동슬러 실제 획 충돌

1400의2중앙선교차와960의실제획접촉을Native로재현했다. voice/staff/system의엄격한자동중첩만안쪽geometry먼저계산하고, 실제얇은획을기존solver에전달하되모델/DOM/keyboard순서는유지한다. pure8+기존192=200/type/build/profile/fixed, Native12+추가6·pointer10/keyboard4, XML14XSD/MIDI/Native동일·PDF14한페이지/폭별·대조6raster동일·실제print거리/페이지경계가통과했다. baseline변경없음. 수동대조자동곡선의음수y는정상승인하지않으며636에서viewBox/PDF차단을조사한다. 현재전체635 gate를시작하며최신확정전체633과구분한다.

### 656 현재 coverage와 다음 공백

과대악보단의실제선택PNG전체/1/2/3쪽8경로와coarse/글자200%전체/3쪽4경로를검증했다.모두native전차단,score/실제SVG선택·dirty·8Native저장보존.기존40vh내부스크롤정책에서실제PageDown/PageUp으로끝줄접근통과.최초무스크롤전체표시가정의실패2개는보존했다.readable-*이미지는PageUp복귀후이므로full655-b종료후PageDown중간상태를직접캡처하는657 QA를추가한다.그다음PdfSnapshot.samePdfSource의score/plan참조비교와정확한undo복원coverage를audit한다.현재는후보이며제품결함으로확정하지않는다.

### 657–658 후속

657은같은655-b제품에서PageDown상태4장만보완했고960dark끝문장을직접검토했다.새coverage숫자로중복계산하지않는다.658은PDF/PNG각각정확한undo복원에서false누락안내2red/삭제대조군2green을재현했다.첫test수집beforeEach import오류는0tests setup실패로별도보존했다.이전655-b실제PDF에서도삭제대조군후undo안내red를확인했다.동일source의score/planJSON내용복원을구분하는좁은비교를추가했고관련18tests통과.문서generation/범위/제목/실제paper·target차이는계속거절한다.새658source2861preflight진행중이며655-b의전체3352PASS는이제품수정을포함하지않는다.

### 658 실제출력 완료·전체gate진행

새658frozen2861에서restored-print20/copy25/print/MIDI30/XML523/조판176/App66/type/build/profile/fixed통과.실제PDF/PNG8경로와28Native저장에서source2보표/current1또는복원2·실제선택/포커스/dirty보존을확인했다.PDF4는각1쪽/같은raster/이전655-b와동일,실제PNG4는동일bytes·1240x1754/150dpi/CRC검사통과.현재전체658 test:all실행중이므로끝날때까지제품/테스트/QA스크립트수정이나build/Electron을병행하지않는다.다음659는범위안수동값·8파트음역대비로과대첫악보단과다른안전음악페이지의PNGscope를조사한다.아직fixture생성전이다.

### 660 기본 300dpi 검증 완료 / 661 예정

동일659제품의실제기본300dpi에서정상3쪽/재열기3쪽PNG4개가2480×3508,pHYs11811,CRC와폭별동일bytes를통과했고8보표이미지를직접검토했다.새전체PASS로중복계산하지않는다.다음661은supported75%설정후전체PDF/PNG수정재시도,선택3쪽의실제범위검사,정확한undo100/redo75경로를본다.현재실행전이다.


## 660-661: actual output retry on unchanged659 product

Default300dpi PNG4 and staff75% PDF4/PNG8 passed on960dark/1400light. Actual PDF has2pages; selected3 is rejected before native with snapshot1-2 range and retains input3. One undo100 restores fullPDF/PNG blocking, redo75 restores output. Native10 saves/2 reopens preserve manual0/8/4. Full6593359tests/Node5 remains the product gate; external opt-in1skip is not compatibility approval. No product/baseline change. See660/661 handoff and preserved QA failures. Next662 audits selected-page oversized-system ownership at125%.


## 662: selected oversized system ownership

At125%, both actual systems exceed the physical869.072-unit page. Whole/page1 correctly identify system1, selectedpage3 identifies system2 before native; undo100 restores the exact660 default300dpi safe3 PNG. Actual960dark/1400light, native6 saves, source/manual preservation passed. No product/baseline change; full659 remains current. Next663 investigates the unhandled interior normal system between two oversized systems.


## 663 current product change, not yet production-approved

Target2 four-system control printed4 normal pages due forced compact plan. Public target10 exposes actual interior normal band947.530 spanning2/3 between oversized systems1281.070/1167.170. New DOM regression red before fix; output-only planner moves subsequent system origins forward to isolate complete normal pages. First oversized prefix and all relative manual geometry remain; oversized systems still blocked, unknown owners and original normal/manual overlap remain conservative. Production and full663 gate pending; full659 does not cover this change.


## 663: interior normal system pagination fix

Actual target10 fixture reproduced a947.530-unit normal system split across2/3 between oversized neighbours. DOM and old659Native red are preserved. Output-only measured planner now isolates subsequent complete normal systems on3/6 while keeping oversized1/2/4/5 and whole output blocked. Native10 saves/2 reopens and manual0/8/4 preserved; actual PNG8 default300dpi and PDF2x4pages passed at960dark/1400light. Normal control PNG18 bytes/PDF4 rasters unchanged; suffix and safe-page controls/profile/fixed/type/build passed. No baseline/version/commit change. Full663 pending; full659 does not include this fix. Details:663 handoff and original failures.


## Full663 running /664 discovery queued

Full test:all started on frozen663 source2863 after preflight/type/build/native/profile/fixed and outputs passed. Product/test/QA script edits and further Electron/build are suspended until it exits. Next664 contract records leading-normal plus consecutive oversized systems; no fixture or product judgement yet. Goal active, actual full suite running.


## Full663 complete

504.03sec/exit0: Vitest310files/3360tests and Node-native5 passed; externalopt-in1skip. Frozen source2863/build/install hashes stable; live deltas only3 workdocs. This gate includes663 interior-system pagination fix. No baseline/version/commit change. Next664 leading-normal/consecutive-oversized audit remains unexecuted.


## 664 leading-normal and consecutive oversized systems

Same663 product: leading normal51.132-1045.610 fits page1; consecutive oversized systems block2-5; normal1/6 actual default300dpi PNG8 and native10/2reopens passed at960dark/1400light. Staff75 retry PDF2x4pages, XSD and exact undo/native/manual preservation passed. This is QA coverage, no product fix or new full gate. Full663 remains current. Next665 follows actual part-view output guidance for manual-owner Scope8 and neighbour Scope1.


## 665 actual part-view output retry

Same663 product after oversized score guard: Scope8 manual-owner PDF1page/PNG1 and Scope1 PDF4pages/PNG4 passed at960dark/1400light. Actual PDF IDs onlyP8/P1, hairpin lines2/0; PNG14 CRC/default300dpi and all width/reopen comparisons passed. Native10/2reopens preserve whole8-part score/manual0/8/4 and partLayouts[]. Returning score restores blocking and exact664 safe1 bytes. Existing independent part-break policy is preserved, no model/layout change. Full663 remains current. Next666 checks persisted selected6 across actual part-view page-count change.


## 666 persisted selected page across part view

Actual960dark/1400light: score6 saved, partScope8 retains typed6 and reports immutable1-page/1-1 range before native, focus returnsPNG. Correcting1 and realEnter+char saves exactly once; score1/6 restored files match664. PNG8 default300dpi/CRC/native6 pass. Original literal-aria-label QA failure preserved; reviewed adapter uses common Input label/htmlFor. No product change/new PDF/full rerun. Next667 audits actual HTML header boundary coverage within native8192 text range. Full663 remains current.


## 667 actual HTML header defect, current product change

Native title8120/composer8100 within8192 reproduced actual clipped header letters in selected PNG1/2 on frozen663. Actual boundary bitmap dark strokes and crops preserved; notation lies onpage4. New DOM regression red before implementation; actual Canvas glyph envelope plus DOM line baseline is now checked before native output. Em-box-only crossing control remains allowed. No automatic text truncation/font/schema change. Full663 does not include this new change. Frozen667 production/font calibration and full gate pending.


## 667 HTML header actual-ink guard

Valid imported Native8120/8100 (UI limits120/80) produced real split header PNG1/2 on663; actual cropped/pixel evidence preserved. New DOM-line/Canvas actualBoundingBox private guard blocks affected PNG/PDF before native; no text/font/schema/bridge/common API changes. DOM red->green, all preflight/type/build/profile/fixed pass. Native14/reopen2, short Korean PNG6 and PDF4x1page, undo/redo/original preservation pass. Public7mm safe em-cross control remains byte-identical on960/1400 (Native4); wrong9mm safe assumption correctly failed and preserved. Normal PNG18/PDF4 unchanged and501safe-control passed. Full667 pending; full663 excludes this fix. Next668 Korean long-header fallback boundary audit.


## Full667 running

Frozen source2865 full test:all started after preflight/type/build/Native/normal-output/profile/fixed checks passed. Product/test/QA-script edits and further build/Electron are suspended until exit. Current latest confirmed full663 excludes the667 header guard. Next668 contract only; no Korean-long fixture or run yet. Goal active, actual full suite running.


## Full667 complete

503.87sec/exit0: Vitest311files/3361tests and Node-native5 passed; externalopt-in1skip. Frozen source2865/build/install hashes stable, live deltas only3 workdocs. Current gate includes667 HTML header ink guard. Baseline/version/commit unchanged. Next668 Korean long-header boundary and exact pixel metric audit continues; no external/OS-wide approval claim.


## 668 Korean actual header boundary QA

Same667 product: valid imported Korean6500/4900 (UI120/80 distinct) old actual split PNG1/2 matches candidate196 glyph bounds. New960dark/1400light block/retry/Escape/two-undo-redo/native14/reopen2 pass. Safe7 em-cross control Native4 and PNG2 exact previous bytes; exact10 sampled rows RGB/alpha255. TotalPNG8 CRC/default300dpi and PDF4x1page match widths and667 same corrected text. No product/new suite/baseline/version/commit change. Full667 remains current. Filename candidate closed by existing240-byte coverage. Next669 audits public-limit combining/space runs and actual top overhang.


## 669 public-limit text runs

Same667 product,1400light: collapsed120-character title,combining accents,NFD,emoji/NBSP preserve Native text. Actual PNG4 default300dpi/CRC match old663 bytes; PDF4x1page rasters match. Upper ink remains y>=1, so no top clipping defect reproduced and no product change. Full667 remains current; no baseline/version/commit change. Next670 generated ensemble integration contract/fixture starts independently.


## 670 generated ensemble integration

Original4part/5staff/16measure fixture: independent22measure/80beat/52sec oracle matches400 MIDI attacks/releases, written-key/transposition and ordinary/expanded roundtrip. Actual960dark/1400light import/export/native6/reopen2 passed; XML7 pinnedXSD; PDF2x4pages all raster/text equal and4pages directly reviewed. Product same667, no new full/baseline/version/commit. New671 candidate: neighbouring measure noteheads look close in real PDF; measure actual glyph/stroke bounds before judging defect.


## 671 actual measure-width fix, full gate pending

Generated ensemble PDF exposed5 actual repeat-start head overlaps7.24x5 and changed-signature heads outside own measures. Existing formatter minima now cover text-free repeat starts and clef/key/time changes; renderer repeat ownership is reused. Unit4red/1control plus final74 repeat-layout tests/type/build passed. Final960dark/1400light: all280 heads inside own bars,60 adjacent pairs with0overlaps, event IDs/ticks preserved. Actual XML4 XSD/MIDI oracle/native6/reopen2/PDF4pages passed; normalPNG18/PDF4 unchanged, safe-page/profile/fixed pass; final4pages directly reviewed. No baseline/version/commit change. Current full667 excludes671; final671-d full suite starts next.672 pointer/caret/history transition candidate remains unexecuted.


## Full671 complete

507.98sec/exit0: Vitest312files/3366tests and Node-native5 passed; external opt-in1skip. Frozen source2866/build/install hashes stable; live deltas only3workdocs. Gate includes text-free repeat/signature minimum widths and actual note factory test adapter. No baseline/version/commit change. Next672 actual pointer/caret/history transition QA starts after this completed suite. Goal remains active.


## 672 reflowed score input/history QA

Same671-d product: actual960dark/1400light pointer4 targets, keyboard neighbour traversal, one Alt+Up/exact undo-redo, Native14/reopen2 and C-staff measure9/tick0 cursor passed. Actual MIDI4 match independent two repeated attack/release +2 oracle and exact undo bytes. Programmatic scrollIntoView reversal c/d is preserved; actual CDP wheel e succeeds in both widths, so no user-scroll defect/product change claimed. Full671-d remains current, no new suite/baseline/version/commit. Next673 initial non-repeat key-header width audit starts from a fresh original fixture.


## 673 initial/system-start header width fix; full pending

Actual non-repeat0/4/7-key scenes exposed5/10/35 heads outside own bars and E/7-key adjacent overlaps. New6red regressions pass: optional readonly systemStart minima apply only at actual line starts via existing formatter; ordinary Map/body policy retained, no schema/common-UI change. Actual6scenes all280heads contained/60pairs clear,Native6/PDF6x4pages/12uniquepages reviewed. NormalPNG18/PDF4 unchanged; actual XML4XSD/MIDI oracle/native/pointer/caret/history controls pass. Reviewed profile9/fixed8 box numbers updated with original failures/captures preserved; runtime132files identical between673-a/b, finalprofile/fixed pass. Full671-d excludes673;673-b full starts next.674 flats/cancellation actual-font audit is queued, not executed.


## Full673 complete

518.82sec/exit0: Vitest313files/3372tests and Node-native5 passed; external opt-in1skip. Frozen source2867/build/install hashes stable, live deltas only3workdocs. Gate includes system-start header minima and reviewed profile9/fixed8 box changes. Original jsdom warnings/log retained; not real-font/performance approval. No version/commit/push/release. Next674 actual flat/cancel key widths; goal active.


## 674 flat/cancellation actual-font QA

Same673-b product:8 sourceXML pinnedXSD,16PDF/72pages width-paired raster equality, representative6pages reviewed. Nonzero-to-neutral cancellation paints35 actual natural glyphs per scene, distinct from opposite-sign policy. Public dock280/360/200 on960/1400 yields36 valid screen scenes,280heads contained/key-to-head and adjacent collisions0/no document overflow. Native12 source equality passes. Original screen-b initial-width persistence mislabel is preserved; c/e assert actual stored widths. No product/baseline/new full/version/commit. Full673-b remains current;675 actual playback/frame audit follows.


## 675 actual playback/frame QA

Old671-d/current673-b each2trials at1400light: selected measure9 starts56.1, advances60.1 after4sec, pause stable/source preserved/native8. rAF median8.3ms/p959.7-9.8; steady CanvasmeasureText0/cursor intersects viewport. No regression evidence in this sample, no cache/product change. Extra playing/paused and keyboardSpace capture runs excluded from n=2 comparison; original misnamed stopped image is preserved and not used as pause proof. Muted output is not listening/device approval. Full673-b reused. Next676 delayed real-font readiness/minimum-map audit.


## 676 delayed real-font width fix; full pending

Held exact installed Bravura bytes exposed stale header minima after readiness:960/1400 geometry and PDF differ until identical document reopened. Native strict-red-g fails both;3 lifecycle reds/1 control preserved. App now uses the existing formatter through a font-readiness/loadingdone-invalidated memo with cleanup; no score/undo/schema/glyph/common-UI change. Current960dark/1400light delayed/ready/reopened geometry equal,Native8 preserved,PDF4x4pages raster-identical to old normal-ready control;4unique pages reviewed. Focused/typecheck/build/profile/fixed pass; no baseline change. Full673-b does not include676; new full676-green follows.


## Full676 complete

518.75sec/exit0: Vitest314files/3376tests and Node-native5 passed; external opt-in1skip. Frozen source2868/build/install hashes stable, live deltas only3workdocs. Includes delayed-font minimum-width lifecycle fix and four new tests. Original warnings/logs and red output preserved; baseline unchanged. Next678 pending-font export request audit takes priority over677 label-gap candidate. No publication/version action; goal active.


## 678 pending-font PDF/PNG request fix; full pending

Actual676 runtime pending PDF/PNG pages differ from ready controls at960/1400; original completed runs and separate failing byte/raster acceptance logs preserved. Request-owned refresh now recalculates only minima/plan after fonts settle, retaining original score/scope/title/generation and ownership checks. Three unit reds now pass; focused/typecheck/build/profile/fixed pass without baseline change. Current PDF6/24pages,PNG6/24pages(300dpi,CRC,size,pHYs) and intervening-title-edit PDF6/24pages agree with ready output. Normal-ready bytes/rasters unchanged. Dirty/title/selection and one undo/native source preserved; no live-score recapture. Full676 excludes678; full678-green follows.677 future-annotation label audit fixture/native/MIDI equality prepared, actual GUI not yet run.


## Full678 complete

515.86sec/exit0: Vitest315files/3379tests and Node-native5 passed; external opt-in1skip. Frozen2870source/build/install hashes stable, live deltas only3workdocs. Includes original-request PDF/PNG font-ready layout refresh and three new tests. Baseline/version/publication unchanged. The earlier running checkpoint is historical. No owned full/native process remains. Next677 prepared label-gap actual GUI/PDF comparison; general goal active.


## 677 future annotation / label-gap QA

Same678-green product. Actual960/1400 visible/hidden future-tempo twins retain Native4 and public MIDI4 equality. Hidden tempo remains a screen ghost and has no printed positioned ink. InitialPDF4x4pages width-paired equal; first visible/hidden pages reviewed. First Voice actual label-to-line gap129.82 vs51.82: +78 from global reservation, not clipping/overlap. No product/baseline/new full.680 per-system actual label clearance is queued with span/glyph fallback requirements;679 pending-font document ownership is next.


## 679 pending-font replacement coverage

Same678-green product: actual960/1400 File replacement during held real font discards obsolete PDF before native and preserves newer PNG job. Only current source/title reaches output; Native8/reopen4 exact. PDF2x4 text/raster pairs andPNG2x4 actual300dpi size/pHYs/CRC/byte pairs pass; representative PDF/PNG page1 viewed. Replacement selection/clean state retained. No product/baseline/new full; currentfull678 reused. Next680 per-system label actual-ink planning from677 gap evidence.


## 680 system-local label clearance; full pending

Derived per-system name candidate with final actual glyph/shape/span clearance and conservative fallback. No staff origins/manual paths/glyph metrics/source commands change.2unit reds/5controls and actual old acceptance failure preserved; current12scenes Native/MIDI and staff/viewBox/manual paths pass. NormalPNG12/18 identical;6name-only changes verified pixel masks;PDF4 only scorepages2/3 name pixels change. Source/page plans and all nonlabel ink preserved. Safe-page/profile/fixed/delayed-font/playback smoke pass; baseline unchanged. Representative visible/long/near-clear/guardPDF pages reviewed. Full678 excludes680; full680-green follows.


## Full680 complete

514.64sec/exit0: Vitest316files/3386tests and Node-native5 passed; external opt-in1skip. Frozen2872source/build/install hashes stable, live deltas only3workdocs. Includes conservative actual-ink-guarded per-system label placement and7newtests. Normal output label changes reviewed explicitly; profile/fixed baseline unchanged. Staff/source/manual paths retained. Earlier running checkpoint is historical. Next681 actual interaction replay, then682 long-part-name output guidance investigation; general goal active.


## 681 current interaction replay

Same680-green product/full result. Unmodified672 actual wheel/pointer/keyboard oracle passes960/1400 after label changes: Native14/reopen2/MIDI4, one pitch command/exact undo-redo, current C-part measure9/tick0 caret and Escape. Cursor captures viewed. No new product/baseline/full run. Simple foreignObject fallback hypothesis ruled out by creation order; next682 supported long-name output guidance.


### 682 파트 이름·약어 출력 안내 확정

공개80자 이름의 실제 가로 잉크 초과에서 기존 PDF차단은 유지하고 잘못된 offset/reset 문구를 형식>악보 설정의 이름·약어 수정 안내로 고쳤다. 단위2red/2control→4PASS, print12files44와 관련focused/type/build PASS. 실제960dark/1400light에서 PDF native0·안전PNG2·이름수정 재시도PDF2×4쪽·Native12/재열기2/정확undo-redo/MIDI/dirty/선택 보존을 확인했다. 이전/현재 성공PDF8 raster페이지와 PNG2bytes동일,300dpi/CRC검사 및 실제화면·PDF를 직접검토했다. 글자200%/coarse emulation의 오류 전체를 실제내부wheel로 확인하고 focus/48px를 유지했다. 물리입력/OSdialog/SR은미검증. baseline변경없음. 최신전체680은682를포함하지않으며 다음683 배치변경 뒤 broad gate예정이다. 반환682/handoff.md. 다음683은긴입력보표선택기의 기존192px폭/690px높이를 공통Select줄바꿈정책을보존하는로컬배치로조사한다.


### 683 긴 입력보표 선택기의 로컬 배치

192px고정폭의80자이름186/690px높이를실제재현하고다중보표만로컬grid로넓혔다. 공통Select의전체라벨/가변높이/API·토큰과단일status를보존하며짧은이름높이는기존과같다. 960 fine81/200%228px,1400 fine60/200%144px로줄고가로overflow없음. 실제keyboard취소/보표·성부이동,Native14/재열기2/정확undo-redo/MIDI/재시도PDF8쪽보존. 기존normalPNG18bytes/PDF10raster페이지동일,profile/fixed/focused/type/build통과·baseline변경없음. 검증도구의Enter중복char/Arrow키문자열오류는실제trusted이벤트로분리했다. 전체680은682/683미포함. 큰글자stickyfooter가focusring을가릴가능성은684실제Tab재현으로넘기며최소48px검사를전체노출승인으로세지않는다. 반환683/handoff.md.


### 684 입력보표·성부 focus의 상태창 여백

실제Tab으로960px/글자200%에서선택기아래와ring이stickyfooter에가리는red를재현했고1400대조군은정상이다. App기존reveal/소유권을입력탐색과공개label에연결했다. 단위3red/2cancelcontrol→5PASS,기존export/viewport포함12와관련focused/type/build통과. 실제960/1400×fine/coarse200의staff/성부2총8경로에서ring/네변중앙hit/선택/Native보존을확인하고화면을직접검토했다. 사용자wheel/새focus우선정책유지,commonAPI/model/font/payload변경없음. 원래683g의현재runtime재실행/profile/fixed/전체684는실행후확정한다. 최신전체680은682–684미포함이며현재전체PASS로과장하지않는다. 반환684/handoff.md.


684 production 후속: 원래683g를변경없이현재684runtime에서실행해Native14/재열기2/정확undo-redo/MIDI2/PDF2×4쪽을확인했다. PDF8raster페이지와MIDI가683과같고현재profile/fixed통과·baseline변경없음. 최신소스2874개를고정한684-green에서test:all을지금시작했다. 아직전체PASS가아니며실행중제품·테스트·QA스크립트수정이나build/Electron을병행하지않는다.


## 전체684 검증 확정

682–684를포함한test:all이exit0으로종료됐다. Vitest318files/3395tests PASS,외부opt-in1skip,Node-native5 PASS. 514.32초source2874/build/install잠금유지,live차이는세작업문서다. 이전pending문구는실행시점기록이다. 현재전체는684이며full-684-addendum.md에확정했다. baseline변경없음. 자체검증프로세스는종료됐고goal은active다. 다음685는실제desktop최소960×640과이미focus된상태의resize/수동wheel소유권을조사한다. V1/RC/외부호환성전체완료가아니다.


### 685 최소높이 resize의 입력포커스 보존

실제minimum960×640에서새Tab은정상이지만이미focus된800→640은960/1400×fine/coarse4경로가footer아래로가리는red였다. 기존resizeobserver허용대상과focus소유surface에입력탐색을추가했다. 단위3red/2control→5PASS,navigation33/properties31/type/build PASS. 실제18노출/4manual대조·trustedwheel/popup취소/Native2/선택·dirty보존과대표캡처검토완료. 새command/model/commonAPI/기보변경없음. 전체684와마지막PDF684는685미포함이며686입력모드복귀후combined출력/broadgate예정. 반환685/handoff.md.


### 686 입력도구 F6 복귀 연결

실제N입력모드의640높이/960·1400/fine·coarse200에서닫힌보표·성부F6 8경로가복귀하지않았고공개악보이동버튼은같은caret로정상복귀했다. 기존F6/focusScore를로컬Toolbarcapture에연결했다. 첫단위한보표setup실패를보존하고수정fixture의4red/3guard→7PASS,navigation44/properties31/type/build통과. 현재실제8F6+열린Select4대조/EndEscape/동일caret·입력mode/Native2·선택보존을검증하고대표화면검토. 새keymap/model/commonAPI/기보변경없음. combined출력/profile/fixed/전체686은후속확정하며전체684는최근수정미포함이다. 반환686/handoff.md.


### 687 최소창 프레임/컨텐츠 측정 정정

685/686의640은renderer높이였으며네이티브minHeight와같다고본표현을정정한다. 실제darwin/Electron42.4.1에서외부640→컨텐츠608(초기컨텐츠800→외부832),minimum[960,640]을API실측했다. 같은686제품으로960/1400/fine·coarse200의18노출/4manual대조와팝업·Native2·선택보존/실제캡처를검증했다. 새결함/제품·baseline변경없고기존기록을덮어쓰지않는다. 실제물리드래그/다른OS승인은아니다. 반환687/handoff.md.


686 combined production:기존g를현재686runtime에서재실행해Native14/재열기2/정확undo-redo/MIDI2/PDF2×4쪽을검증했다. PDF8raster와MIDI가684와같고현재profile/fixed통과·baseline변경없음. 685/686을포함한고정source2876개에서전체test:all을시작했다. 아직PASS가아니며검사중제품/테스트/QA스크립트또는build/Electron을변경/병행하지않는다.


## 전체686 검증 확정

685/686을포함한test:all이exit0으로종료됐다. Vitest320files/3407tests PASS,외부opt-in1skip,Node-native5 PASS.521.08초source2876/build/install잠금유지,live차이는세작업문서다. 이전pending은실행시점기록이며full-686-addendum.md에확정했다.687은같은제품의Native640/content608 QA로단위숫자를더하지않는다. 자체검증은종료됐고goal active,다음688한보표status/실제입력→caret/F6/정확undo-save검증을진행한다. baseline/버전/커밋/배포변경없음.


### 688 한 보표 실제입력·앞선caret·저장 QA

동일686제품의generated한파트/한보표Native왕복/MIDIfixture를실제메뉴로열었다. OUTPUT/선택기0,긴80자·글자200%·fine/coarse·Native외부640/content608의성부32중앙hit/8coarse최소48px/가로overflow없음을검증했다. 실제N/D는첫D#4한음만변경하며선택tick0/입력caret13440을분리보존했고F6가그caret로돌아왔다. Native16/재열기2/정확한한undo-redo/원래이름·음표복원MIDI2동일,대표도구·caret캡처검토. 구문검사누락/저장후Filefocus의QA오류와원래실패를보존하고실행도구/흐름을바로잡았다. 새제품/단위/baseline변경없음,전체686동일제품재사용. 다음689는일반N입력중확정음표의사본출력과UIcaret제외/dirty보존비교다. 반환688/handoff.md.


### 689 일반N입력 중 사본 출력/dirty 보존

같은686제품의실제Native최소창에서N/D한음편집·선택0/caret13440을만들고입력on/off/Native재열기별PDF6·300dpiPNG6을저장했다. 실제12snapshot의56이벤트/cursor·preview·selectionUI0,PDF6각1쪽raster동일/PNG6bytes동일·2480×3508/pHYs11811/CRC를검증하고대표PDF/PNG를직접검토했다. 사본dirty·선택/mode보존,MIDI2예상편집동일/정확한한undo-redo/Native8·재열기2도확인했다. 새제품/단위/baseline변경없고전체686동일제품재사용. 다음690은기존658계약의새N입력/caret/focusconsumer만조사하며postwritephase자체를새성과로세지않는다. 반환689/handoff.md.


### 690 지연 PNG 알림 뒤 실제 다음입력 커서

686제품의실제960retain-E에서4rAF후에도커서하단531.664가footer아래에남는red를보존했다. 기존input observer에main/status관찰만연결하며generation/focus/manualwheel취소를유지했다. 단위2red/3control→5PASS,관련60/properties31/type/build/profile/fixedPASS·baseline변경없음. 실제960/1400×E유지/정확D복원4scenes에서nextcaret/Canvasfocus/선택/dirty/문구보존,Native28/재열기4/정확undo-redo/MIDI4와기존PNG4bytes동일/300dpi/CRC를확인하고대표화면검토했다. 전체686은690미포함이며새broadgate예정,PDF는이번화면수정후미재실행이다. 다음691중간빠르기표기의소유악보단/실제잉크거리audit. 반환690/handoff.md.


### 691 중간 빠르기 표기 소유·출력 audit

같은690runtime의실제960/1400screen/PDF에서60BPM은measure9/첫tick과Native·MIDI가일치했다. 실제font잉크와소유보표간80.464,이전단과19.922로가까운이전단에붙어보일가능성을기록했다. 충돌/잘림은없으며거리만으로기존upperlane상수를바꾸지않았다. Native4/MIDI2/PDF2각1쪽·이전689raster동일,실제PDF/screen검토. 제품/단위/baseline변경없음. 후속692는다른상단기호/수동span과함께가까운후보를검증할배치audit이며현재미해결UX후보다. 먼저690broadgate실행. 반환691/handoff.md.


## 전체690 검증 확정

522.54초/exit0. Vitest321files/3412tests PASS,외부opt-in1skip,Node-native5PASS. 고정source2877/build/install잠금유지,live차이는세작업문서다.690의커서노출수정과새5tests를포함한다.691은같은제품의QA로별도단위수를더하지않는다. baseline/버전/커밋/배포변경없음. 자체full프로세스는종료됐고goal은active다. 다음은같은690수정의실제manualwheel/newfocus대조후692상단빠르기배치후보audit다.


### 692 중간 빠르기 보표 기준 후보 연구

같은690제품/임시DOM의8scenes를비교했다. 실제보표원점차이40.5후보는깨끗한2개만소유여백80.464→39.964로줄고,보표글자/명시적수동슬러/숨김6개는기존배치를유지한다. a의가로겹침만본stack순서공백을보존하고b에서같은보표원점의상단글자fallback으로보완했다. Nativealias생성도구실패a/b도보존하고기존resolver의c를사용했다. Native16/MIDI8/PDF8은기존제품출력이고후보가PDF제품에적용된것이아니다. 실제후보/수동PDF검토,제품/단위/baseline변경없음. 다음693실제renderer의제한적보표기준연결을red부터검토한다. 반환692/handoff.md.


### 693 단순 중간 빠르기 표기의 보표 기준 연결

기존실제renderer의소유단80.464/이전19.922red를보존하고실제Vex윗선/원점차이를받는최종paint후보를연결했다. shared잉크8여백/이동sweep를보호하며상단stack·복수tempo·숨김·font미준비·불명확paint는fallback한다. 단위DOM9/관련100/properties31/type/build/profile/fixedPASS. 실제8scenes Native16/MIDI8/PDF8각1쪽,clean만40이동/소유40.464대이전59.922,6대조유지. snapshotDOM의다른잉크/수동path동일,PDF6raster동일/clean2각360변경은기존·새tempoink안에만있고밖0·실제PDF검토. baseline/model/schema/commonAPI변경없음. 전체690은693미포함,다음694실제font-ready전환후새broadgate. 반환693/handoff.md.


### 694 새 빠르기 배치의 실제font-ready 경계

같은693제품에서동일Bravurabytes를실제보류하고960/1400×delayed/ready4scenes의loading→ready를검증했다. 문서수정/재열기없이소유40.464/이전59.922와대조군의동일geometry로수렴,Native8/재열기4/MIDI4/PDF4raster쌍동일이다. a의navigation대기QA오류와자체그룹종료기록을보존하고기존8초CDP의b로통과했다. pendingglyph승인/새제품/단위/baseline변경없음. 다음전체693gate뒤695다중보표/파트보·복수빠르기/출력크기계약을조사한다. 반환694/handoff.md.


693/694 검증 뒤 고정source2879개에서 전체test:all을 시작한다. 아직전체PASS가아니며실행중제품/테스트/검증스크립트수정이나build/Electron을병행하지않는다. 최신확정전체690은693을미포함한다. 다음695의다중보표/파트보및복수tempo/출력크기공백은contract로등록했다.


## 전체693 검증 확정

524.82초/exit0. Vitest322files/3421tests PASS,외부opt-in1skip,Node-native5PASS. 고정source2879/build/install잠금유지,live차이는세작업문서다.693의제한적보표기준빠르기배치와새DOM9tests를포함한다.694는같은제품의실제font-ready QA로새단위수를더하지않는다. baseline/버전/커밋/배포변경없음. 자체전체프로세스는종료됐고goal은active다. 다음695는다중보표/피아노파트보·복수빠르기소유권대조부터진행한다.


### 695 다중보표/파트보·복수 빠르기 scope와 696 숨김 이웃 수정

695의실제8scenes는총보5보표/피아노2보표,Native24/재열기8/MIDI8/PDF8총20쪽을통과했다. 그러나old690/current693대조로hidden이웃만visible60의screen0/print+40차이가생겼고696 actualrelativeY -42대-2red와단위1red/9controls를보존했다. ghost의재생/표시는유지하되visible표기의개수/장애물계산에서만제외했다. DOM10/관련101/properties31/type/build/profile/fixedPASS. 현재실제8scenes의screen/printrelativeY일치·Native/MIDI/재열기보존,PDF20raster이전과같고원래693actual8controls도재통과했다. baseline변경없음. 전체693은696미포함이며다음697공개75/125%파트보기크기/undo consumer후새broadgate. 물리/외부미검증유지.


### 697 공개75/100/125%피아노파트보 consumer

같은696제품의960/1400실제공개range/Home/End·독립P파트pageSetup을검증했다. Native26/재열기6/MIDI6/정확한한undo-redo4쌍,다른파트·총보score불변및visible/hidden모델과표기소유권보존. PDF6의실제쪽수는75=1/100=2/125=5,폭별raster쌍동일이며125의2·5쪽과75screen직접검토했다. 마지막쪽에는실제마지막악보단이있어빈후행이라고세지않는다. 초기예약/packing효율은조사후보이며현재결함승인이아니다. 제품/단위/baseline변경없고전체693은696미포함이다. 다음698View메뉴발견성공백후새broadgate,699는125실제잉크/예약공간audit후보다.


### 698 총보·파트보 보기의 메뉴/검색 진입

기존Viewinventory에한진입점만추가해StudioScoreView공개Select로focus한다. App3red→3PASS,관련113/properties31/type/build/profile/fixed통과. 실제960/1400의Home/Arrow/Enter메뉴·검색Enter4경로와부분tupletdraft2대조에서선택/입력주소/preview/노출focus를보존하고가로overflow없음. Native16/재열기4/MIDI4/PDF4각2쪽이전raster동일,960실제focus화면검토. a의occupied-note부분입력준비전제실패를보존하고공식fullrestfixture-b로분리했다. 새API/model/단축키/style/baseline없음. 전체693은696/698미포함,새698broadgate예정. 다음699실제잉크packing/700보기surface밀도audit후보. 반환698/handoff.md.


696/698의제품수정과4개새tests를포함하는고정source2880개에서test:all을시작한다. 아직전체PASS가아니다. 실행중제품/테스트/검증스크립트수정이나build/Electron을병행하지않고현재확정전체는693이다. 끝난뒤699의125%실제잉크/예약공간audit로이어간다.


## 전체698 검증 확정

530.09초/exit0. Vitest323files/3425tests PASS,외부opt-in1skip,Node-native5PASS. 고정source2880/build/install잠금유지,live차이는세작업문서다.696의hidden-ghost예외와698의기존보기Select메뉴진입및새4tests를포함한다. baseline/버전/커밋/배포변경없음. 자체전체프로세스는종료됐고goalactive다. 다음699는125%예약공간보다먼저실제PDF물리확대비율과PNG페이지모델의차이를진단한다.697의설정값/파일성공과실제scale승인을구분한다.


### 706 PNG 키보드 오류 수정/재시도

동일704-green-b 제품에서960dark/1400light의 실제 오류→Tab6→Cmd+A/3→Shift+Tab6→Enter로 native1회/PNG300dpi3쪽을 검증했다. Native6/재열기2·선택/dirty/history/정지 보존, PNG2개2480×3508/pHYs11811/CRC/705 bytes동일. 첫 QA 이동방향 가정 실패는 보존하고 실제 DOM 순서로 교정했다. 제품·baseline 변경 없이 전체704 기준 유지. 반환706/handoff.md, 다음707 큰 글자/coarse focus 노출.


### 707 큰 글자/coarse PNG 수정 흐름

동일704 제품에서960dark/1400light×fine200/coarse200 4경로 통과. 실제15단계 focus/ring 노출, 최소높이60/66px, 글자28/32px, footer 최소여백8.25px. Native12/재열기4, PNG4개706 bytes동일. 제품·baseline 변경 없음. 설명문 한 줄 관찰은 별도708 실제 range/내부 가로 배치로 조사하며 이번 focus 승인을 설명문 가독성 승인으로 확대하지 않는다. 반환707/handoff.md.


### 708 설명문 실제 범위·스크롤 조사

가로 잘림은 미재현.960 두 줄/1400 한 줄의 실제 Text range와 작업면 scrollWidth는 정상이며 trusted wheel150으로 네 조건의 모든 도움말을 footer 위에 노출했다. 추가 역방향 Tab strict8px gutter는 실제ring상단7.8828125로10단계 실패, diagnostic c는 assertion을 유지해exit1이다. 전체PASS나 제품 잘림 수정으로 보고하지 않는다. 새 inline오류14px는 helper적용후생성범위로 구분했다. 제품·baseline변경없음,704전체/707원래PASS유지. 상세708/handoff.md, 다음709 fixed200 가로pan/늦은PNG회신.


### 709 fixed200 가로 pan/late PNG 소유권

실제960/1400 content608에서 horizontal wheel로canvas.scrollLeft6→1206/872, 늦은PNG회신후동일과최신focus/주소/dirty/selection유지. 명시적악보이동은603으로현재cue복귀. Native14/재열기2/정확undo-redo/MIDI2, 같은현재fit-width PNG2와bytes동일. 옛690빠르기위치차이·selectfocus QA오류·canvas clip을빠뜨린helper실패를원본보존하고분리교정했다. 제품/baseline변경없음. 다음710은복귀bbox의0.230042 경계차이가실제잉크잘림인지조사하며아직결함으로선언하지않는다. 반환709/handoff.md.


### 710 실제 cursor triangle clip 수정

fixed200 복귀의실제triangle0.230042px clip을 shared ink로확인하고 App 기존screen reveal의canvas horizontal clip/token 여백/outward rounding만추가했다. unit2red/6control→8PASS, common93/nav162/속성31/type/build/profile/fixed와실제960dark/1400light native14/재열기2/정확undo-redo/MIDI2/기존fit PNGbytes보존통과. 실제cue왼쪽여백8.769958. baseline/기보/model변경없음. 전체704는이수정전이며711 오른쪽 실제잉크후넓은gate예정.708 세로gutter 관찰은별도미해결. 상세710/handoff.md.


### 711 오른쪽 현재 음표 실제 clip 검증

960dark/팔레트360/fixed200에서704는cue만들어오고현재tick head/stem이27.37px밖에남는actual red. 같은probe/ink assertion의710은오른쪽여백9.629982로통과. Native7/재열기1/정확undo-redo/MIDI1/현재fit PNGbytes보존. 이전/현재캡처직접검토.711추가제품/baseline변경없음. 이제710전체gate를시작하며그동안제품/테스트/QA스크립트수정과build/Electron중지. 다음712 rest/빈입력위치공백. 반환711/handoff.md.


### 712 actual rest current-tick QA

기존rest명령으로같은id/tick26880/duration을보존한fixture와exactinverse를검증했다. MIDI56→55, 해당on/off2외의모든event동일. 같은710의960오른쪽/1400왼쪽 fixed200·저장팔레트360에서실제rest glyph/cue clip과pan/late reply/명시복귀통과. Native14/재열기2/정확undo-redo/MIDI2/현재rest fit PNGbytes동일. 첫fixture rawundefined/canonicalJSON 비교실패는보존하고codec계약으로교정. 제품/baseline변경없음,전체710기준유지. 다음713 emptyvoice 실제fallback기존coverage대조. 상세712/handoff.md.


### 713 empty-owner fixed200 pan QA

기존340 fixed150 coverage를대조하고같은source의새fixed200 가로pan/latePNG/명시복귀2경로만검증했다. voice3/tick0/matching event0, pan1200/872유지,복귀cue실제여백8.77961. Native12/재열기2,실제D1입력/undo1 정확복원·redo동일IDs,MIDI4의추가62@0–480외모든SMFevent동일. empty-source fit/fixed PNG4bytes동일;entered PNG/PDF/XML성공주장없음. 제품/baseline변경없고전체710유지. 다음714 current pitch 임시표실제수평잉크audit. 상세713/handoff.md.


### 714 principal accidental actual QA

지원4tone모델/원본·정확inverse/MIDI59notes+기존모든event보존fixture로fixed200 두폭을검증했다. 실제임시표는vf-notehead text에이미포함돼기존reader가측정한다. 별도클래스를가정한QA a/b 실패/markup을보존하고c에서4glyph를분리해모든ink clip assertion을유지했다. 실제왼쪽여백9.614014px,Native14/재열기2/정확undo-redo/MIDI2/fit PNGbytes동일. 제품·baseline변경없고새결함미재현. 다음715 최소75/소수125/200에서overflow/noscroll조건을분리한다. 반환714/handoff.md.


### 715 최소/소수 fixed pan QA

960dark/1400light×75/125/200 여섯조건에서실제head/stem/cue clip과owner를검증했다. 1400/75 noscroll0, 실제manual변위3경로와무이동대조3을구분했다. Native14/재열기2/history0/선택·dirty/MIDI6/fit2+fixed6 PNGbytes보존. 제품/baseline변경없음. 일부최초/재복귀6–6.5px차이는안전한위치이며누적드리프트로선언하지않는다. 다음716 반복F6/배율왕복재현성조사. 상세715/handoff.md.


### 716 반복F6/배율왕복 camera QA

실제4조건의F6 4왕복/75%왕복은동일left338/894.5/0/454.5·원래glyph root좌표·owner/선택/history0보존. 초기defaultPrevented사본false를썼던a실패를보존하고b에서같은nativeEvent의최종true/trusted40건을확인했다. Native10/재열기2/MIDI4/fit2+fixed4PNGbytes보존. 제품/baseline변경없음. 다음717 keyadapter char전송시점 독립검증,718 actualPDF late reply/pan. 상세716/handoff.md.


### 717 키보드 QA 입력 시점

취소된 native key의 최종 상태를 읽도록 QA 전용 helper를 수정했다. 기존 protocol4실패/새7사례통과를 함께 보존했고 중복 제품 명령은 관측되지 않았다. 실제 Studio F6/배율4조건 및 PNG 키보드 재시도2조건이 통과했다. 제품·baseline 변경 없음. 상세: `docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28/717-native-key-event-timing/handoff.md`. 현재 전체710-green 유지,708 strict8px 독립 실패 보존. 다음718 실제PDF쓰기 후 늦은회신/가로pan.


### 718 실제 PDF 후 늦은 응답

960/1400 fixed200에서 실제PDF쓰기 후 추가E/수동가로pan/응답/명시복귀,Native14/재열기2/정확undo-redo/MIDI2 통과. PDF4개 A4각1쪽/fit대조raster동일,대표화면과PDF검토. 제품·baseline변경없음,전체710유지. 자체IPC와OSdialog범위를구분했다. 상세718-fixed-pdf-reply/handoff.md. 다음719 current flag/덧줄 실제잉크 reveal audit.


### 719 실제 flag clip 수정

fixed200/960/팔레트360에서꼬리8.538021px잘림을실제font로재현하고현재고유event의직접flag text만화면잉크에포함했다. unit2red/12control→관련165/common93/properties31/type/build/profile/fixed통과. 실제960/1400 여백9.461979·Native6/재열기2/MIDI2/PNGfit동일/PDF2 raster동일및직접검토. 기보/model/baseline변경없음. 전체710은이번수정전이며720consumer후새broadgate예정. 상세719-current-flag-ink/handoff.md.


### 720 높은/낮은 flag·덧줄 consumer와 전체719 예정

960/1400×E6/down·C3/up 네조건의실제flag/덧줄/현재cue clip·pan·복귀,Native12/재열기4/MIDI4/fit동일PNG8/PDF4통과. E6오른쪽덧줄최단1.297974px로잉크는안에있지만일률8px여백승인으로과장하지않는다. 제품·baseline추가변경없음. 대표화면/PDF검토. 이제고정719의새전체gate를실행하며기존710전체와구분한다. 상세720-current-ledger-flag/handoff.md.


## 전체719 검증 확정

536.74초/exit0. Vitest325files/3454tests,외부opt-in1skip,Node-native5통과. source2882/build/install잠금유지,live차이는작업문서뿐이다. 현재flag 화면잘림수정과새회귀3개포함,baseline변경없음.708 standalone strict8px 실패는별도보존. 전체프로세스종료/goalactive. 다음721 augmentation dot 실제부모/잉크 조사. 상세719-current-flag-ink/full-719-addendum.md.


### 721 점음표 실제 부모/잉크

triple-dotted eighth의세glyph는실제vf-notehead안에있어기존reader로960/1400 fixed200clip통과(960여백9.052002px). Native6/재열기2/MIDI2/fit동일PNG4/PDF2와대표화면검토. 새제품/baseline변경없음,전체719유지. 다음722 ordinarycursor없는pendingtuplet의별도focus/가로pan검증. 상세721-current-dot-ink/handoff.md.


### 722 pending preview 명시 복귀

ordinarycursor0인실제1/3·2/3의fixed200/가로pan/다음placeholder4480·8960명시노출을960/1400에서검증했다. preview잔여쉼표와undo의2/3복원을QA가놓친실패를보존하고기존저장차단/native0·Escape후원본/redo재열기를확인. Native12/재열기2/MIDI4,제품/baseline변경없음. 다음723 자동입력직후노출은별도조사. 상세722-pending-preview-pan/handoff.md.


### 723 pending 입력 직후 actual ink

whole-rest fixture의C1/3·D2/3직후다음placeholder실제잉크가960/1400 fixed200clip안에있었다. 명시버튼전/후를분리했으며제품결함미재현. 722 controls 재통과를새성과로더하지않는다. 제품/baseline변경없고전체719유지. 다음724 마디끝1박rest의preview확장조건. 상세723-pending-input-follow/handoff.md.


### 724 마디끝 pending preview 진행

960 fixed200의첫C뒤다음placeholder961.131958–980.891958/clip960의실제red. 단위2red/3controls후첫수정은mock통과/실제실패를보존했다. actual SVG쉼표→preview교체때canvas focus로돌아오는trace를확인하고그완전주소/tick소유권대조를1red/7controls로추가했다. 현재green-c검증중,719전체는이번수정미포함이다. 상세724-tail-rest-preview/focus-redraw-diagnostic.md.


### 724 마디끝 pending viewport 수정 확정

sourceSVG쉼표→preview→stableCanvas소유권을완전주소/tick으로검사하고pendingnote/rest다음anchor를한프레임노출한다. 2red/3controls와추가1red/7controls·actual첫수정실패를보존했다. 최종common93/navigation173/properties31/tuplets103/type/build/profile/fixed,실제960/1400×note/rest4경로Native/undo/draft차단/재열기/MIDI통과. baseline/기보/model변경없고이번새PDF파일검증은없다. 이제724-green-c source2883의전체gate예정,기존719전체는이번수정미포함. 상세724-tail-rest-preview/handoff.md.


## 전체724 검증 확정

543.82초/exit0. Vitest326files/3462tests,외부opt-in1skip,Node-native5통과. 고정source2883/build/install잠금유지/live차이는세작업문서. pendingnote/rest 화면노출과주소·focus guard/새App8회귀포함. baseline변경없고708 strict8px독립실패는별도유지. 전체프로세스정상종료/goalactive. 다음725 짧은창pending PDF feedback 조사. 상세724-tail-rest-preview/full-724-addendum.md.


### 725 짧은창 pending PDF 후 소유권

960/1400 content608/fixed200의owner/manualpan/newViewfocus6경로,Native12/MIDI6/PDF12 A4한쪽·전체raster동일통과. 실제파일과대표화면검토. Footer전후높이는같아동적높이승인으로과장하지않는다. 제품/baseline변경없고전체724유지. 다음726 View trigger 상단ring관찰의QA programmatic조작/실제nativekeyboard원인분리. 상세725-pending-copy-feedback/handoff.md.


### 726 native menubar ring과QA adapter 분리

F6/Tab→trustedwheel→ShiftTab/Left/Down/Escape native경로는960/1400 outline top50.59375로정상. 같은조건의기존QA nearest-scroll/focus/click만top-3.90625를만들었다. 제품수정하지않고실제keyboard와adapter artifact를분리했다. 원본/선택/Native/MIDI보존,전체724유지/708다른strictgutter관찰보존. 다음727 QA전용native pointer adapter. 상세726-menubar-focus-ring/handoff.md.


### 727 native pointer QA adapter

legacy4protocol실패/child변경driver1실패·Studio준비스크롤2실패를보존했다. 최종QA전용helper는center/hit/disabled/unique검사와trustedwheel intent+pointer3단계를보내며독립5사례·실제Studio20button클릭통과. Native4/MIDI2/source·선택/history0보존,제품/공통API/baseline변경없음. 전체724유지,다음728 GeometryInput nativeblur→Save 소비처. 상세727-native-pointer-adapter/handoff.md.


### 728 숫자 속성의 native blur → 메뉴 저장

960/1400 × 자동→0·0→자동·무효 높이의 6경로가 통과했다. 유효 변경은 command/undo 각 1회, 무효 blur는 기존 값 복원/command 0회이며 Native26·재열기6·MIDI6을 확인했다. 960 오류 표시와 focus ring을 실제 캡처로 추가 검토했다. Cmd+A 초안 준비 실패 b/c는 별도 보존하며 원인 미판정이다. QA helper의 선택적 input selector와 독립 protocol6을 확인했다. 제품/공통 API/baseline 변경 없이 전체724 결과 유지,708 strict gutter 실패는 별도 유지. 다음729는 숫자 필드 선택 단축키의 최소 대조군. 상세728-geometry-pointer-save/handoff.md.


### 729 합성 Cmd+A 원인 분리

Studio 없는 독립 Electron text/number와 메뉴 role 대조에서도 합성 Meta+A는 선택을 만들지 않았다. char/Control 대조도 동일하며 편집 API selectAll만 교체됐다. 제품 결함으로 단정하지 않고 물리 단축키 미검증을 유지한다. uppercase QA assertion 실패와 8+16개 관찰을 보존했다. 제품/baseline 변경 없이 전체724 결과 유지. 다음730 준비 wheel 없는 툴팁 hover/클릭/키보드 전환. 상세729-native-select-all/handoff.md.


### 730 준비 wheel 없는 툴팁 전환

960/1400의 실제 hover→인접 hover→click→Escape/Space→파일 메뉴에서 단일 tooltip과 aria-describedby, 메뉴/Escape 우선권, focus를 확인했다. 준비 wheel/DOM focus/click 없이 조작했고 Native2/source/history0도 보존됐다. 결함 미재현 coverage이며 제품/baseline 변경 없음. 다음731 pending tuplet의 창 폭 변경과 viewport 소유권. 상세730-tooltip-native-transition/handoff.md.


### 731 pending 입력의 창 크기 추적 수정

1400→960에서 다음 preview 잉크 right1398.891958/clip960의 실제 red와 window/surface2개 실패를 고정했다. 기존 일반 입력의 resize·focus·수동 검사 정책을 pending preview에도 연결했다. manual-return의 추가1red/13controls 뒤 명시적 악보 복귀의 추적 재개도 보완했다. 최종 common93/navigation179/properties31/tuplets103/type/build/profile/fixed와 실제 owner/manual-pan/manual-return/new-focus4경로,Native8/MIDI4/source/history0가 통과했다. 다음 잉크 right958.891958은 화면 안이지만8px gutter 승인으로 과장하지 않는다. 제품 변경은 App viewport 처리와 새 회귀6개이며 baseline/엔진/기보 치수는 보존한다. 최신 전체731-green-d를 실행하고 기존 전체724와 구분한다. 상세731-pending-resize/handoff.md와resume-following-addendum.md.


## 전체731 확정

543.99초/exit0: Vitest327files/3468tests, 외부opt-in1skip, Node-native5 통과. source2884/build/install 잠금 유지/live 차이 작업 문서3개. pending resize 및 명시적 복귀 재개·새 회귀6개를 포함한다. 실제4경로/Native8/MIDI4와 profile/fixed도 통과했으며 baseline 변경 없음. 708 strict gutter 실패는 별도 유지한다. 자체 전체 실행 종료/목표 active. 다음732 짧은 창 높이. 상세731-pending-resize/full-731-addendum.md.


### 732 짧은 창의 pending1/3·2/3

960/1400 × 두 입력 상태에서 content768→568 후 실제 다음 잉크가 sticky footer 위에 보였다. Native12·재열기4·MIDI4/source/history0를 보존했고960 2/3 캡처를 직접 검토했다. 제품/baseline 변경 없는 coverage이며 전체731 결과 유지. 다음733 공개 도구의 pending 취소·undo 복원 진입/저장 경로를 기존 coverage와 비교한다. 상세732-pending-short-window/handoff.md.


### 733 복원된 pending 입력의 N 취소

960/1400 실제 공개 N pointer에서 preview 제거/input-off, 새 undo 없음/redo 유지, 차단 Native0·성공 Native10/재열기2/MIDI2를 확인했다. 724의 Escape 취소와 다른 진입 coverage이며 제품 결함 미재현이다. 제품/baseline 변경 없이 전체731 유지. 다음734 input reveal 잉크 소유권 audit. 상세733-pending-native-cancel/handoff.md.


### 734 세로 focus gutter의 subpixel 수정

최신731에서708의 strict8px10실패를 재현했고 scrollBy(-0.1171875)/실제0의 원인을 확인했다. window 세로 이동2줄을 바깥 방향으로 반올림한다. 새top/bottom2red·기존16controls 뒤 common93/navigation183/properties31/type/build/profile/fixed, 실제 동일원본708의60단계 strictPASS·최소8.8828125·PNG4 bytes동일·Native12/재열기4가 통과했다. pending resize/short-height8경로 Native20/MIDI8도 재통과했다. baseline/기보/모델 변경 없고 기존708실패는 보존한다. 전체734 gate를 실행하며 전체731과 구분한다. 상세734-viewport-outward-rounding/handoff.md.


## 전체734 확정

545.59초/exit0: Vitest328files/3472tests, 외부opt-in1skip, Node-native5. source2885/build/install 잠금 유지/live 작업 문서3개만 차이. 세로 반올림2줄과 새 회귀4개 포함. 동일708 strict8px60단계·PNG4 bytes동일과 pending/short-height 회귀가 통과했다. baseline 변경 없음, 과거708 실패는 보존한다. 자체 전체 실행 종료/목표 active. 다음735 도크 내부 스크롤. 상세734-viewport-outward-rounding/full-734-addendum.md.


### 735 도크 내부 스크롤의12조건

960/1400×207/280/360×fine/coarse200의48 Tab단계가 내부ring/strict8px post-review를 통과했다(최소11.7890625). Native36/재열기12/source/history0·저장 폭 보존, 대표2화면 검토. 빠른wheel 및 proof밖 pointer준비 실패를 보존하고 실제 새gesture/keyboardSave/coldrendereropen을 구분했다. 제품 결함 미재현 coverage로전체734유지,baseline변경없음. 다음736 큰글자에서실제수동상단복귀→pointer메뉴. 상세735-dock-scroll-gutter/handoff.md.


### 736 큰 글자에서 실제 상단 복귀와 pointer 메뉴

960/207/coarse200·1400/360/fine200의root546.5/474→0 수동wheel복귀 뒤 공개Header16clicks가 trusted3단계로통과했다. Native6/재열기2/source/view/history0·저장전후 span/event선택을보존했다.735프로그램준비실패와실제메뉴접근을구분하며제품장애미재현coverage다. 전체734/baseline유지,다음737큰글자긴메뉴keyboard/scrollport. 상세736-native-header-return/handoff.md.


### 737 긴 메뉴의 키보드 focus ring 수정

실제4조건108단계중8개의상/하4px잘림을재현하고Studiocommand:focus-visible의token scroll-margin한규칙으로보완했다. 동일108단계/최소8px·Native8/source/선택/재생정지,포인터회귀16clicks·Native6도통과했다. red/green같은행이미지검토,common93/navigation183/properties31/type/build/profile/fixed PASS·baseline유지. 전체734는이CSS전이며738후넓은gate예정. 상세737-large-menu-keyboard/handoff.md.


### 738 열린 메뉴·설정창 크기 변경

공통Popover가fine→coarse변경후화면밖으로넘는실제4실패를재현했다. 기존position에open-lifetime ResizeObserver를연결해수정했고publicAPI/명령/기보/Native는보존한다. 실제960/1400두소비처4경로focus·draft2·폭280/windowresize0/Native4,기존메뉴108단계와header16clicks/Native6재열기2가통과했다. common97/nav183/props31/앱·공통type/build/profile/fixed PASS. 복제본catalog자료누락과기존testDOM타입오류를분리해자료/타입만보완했으며실패로그는보존했다. 기준이미지변경없음. 전체734는이번수정전이며739Select조사후넓은gate를진행한다. 목표active·미커밋,물리IME/OSdialog/SR/청취/외부앱은별도미검증. 상세738-popover-live-resize/handoff.md.


### 739 Select live 크기 변경

738의실제입력보표/PNG해상도4경로에서fine→coarse후trigger와목록위치가분리됐다. 기존position을open ResizeObserver로연결해수정했다. 실제4경로의좌우연결·겹침없음·viewport·active/selected/focus/windowresize0·Native4보존과738실제4경로회귀PASS. 단위3red→common100/nav183/props31/앱·공통type/build/profile/fixed PASS,공개API해시동일. baseline변경없음. 최신전체734는이번수정전이며740긴목록활성항목조사후전체gate를실행한다. 목표active/미커밋,물리IME/OSdialog/SR/청취/외부앱미검증.


### 740 긴 Select의 현재 항목

17파트목록에서fine→coarse후active17이listbottom593아래779에남는실제960/1400두실패를재현했다. resizecallback에만현재aria-activedescendant의nearest노출을추가해수정했다. ordinaryscroll정책·selected1/active17/focus/native는보존한다. 최종실제두경로와600ms안정후수동wheel502→382/root0,Native4가통과했다. d/e휠실패는드라이버부호반대로DOM+120을보낸QA오류이며증거보존. common101/nav183/props31/앱·공통type/build/profile/fixed와739/738/737/736실제회귀PASS,baseline/API변경없음.737–740포함전체gate를다음실행한다. 목표active/미커밋,물리IME/touch/OSdialog/SR/청취/외부앱미검증.


### 전체740 확정

740-green-c의test:all은542.96초/exit0,Vitest330files/3480tests/외부opt-in1skip와Node-native5 PASS다. source2888/build/install안정,live차이는작업문서3개뿐이다.737–740의메뉴focus·공통Popover/Select크기변경·긴목록active보완을포함한다. baseline변경없음/목표active·미커밋. 다음741열린메뉴의live글자크기변경focus노출조사. 물리IME/touch/OSdialog/SR/청취/외부앱별도미검증.


### 741 열린 메뉴의 글자 성장

기존200%fine/coarse동일geometry반복을피하고이미열린메뉴100→200글자성장을조사했다. 같은마지막focus가72px잘리는실제두실패/단위1red를재현했다. 공통menuPopover resize때만현재containedfocus nearest노출을재사용해수정했다. 실제960/1400ring외곽8px·focus/native4보존,manualscroll80→0/End복귀80,common103/nav183/props31/앱·공통type/build/profile/fixed와738/740/737실제회귀PASS. baseline/API/기보/Native변경없음. 전체740은이번보완전. 다음742창높이변경의menu/dialog현재focus·draft조사,목표active/미커밋·물리IME/OSdialog/SR/청취/외부앱미검증.


### 742 popup short-window coverage

741동일제품의960/1400×menu/draft/lowerbutton6경로에서1000→500창높이변경후focusring·현재owner·draft2/폭280과Native4/source/선택보존을확인했다. 실제하단버튼캡처직접검토,제품/baseline변경없음. 하단dialogfocus의배경root가482→822/163→683으로움직였으므로scroll보존PASS로과장하지않는다. 다음743은호출원인분리와실제결함판정,목표active/미커밋.


### 743 native popover scroll 소유권

742에서발견한배경움직임은Studio.window.scrollBy반복호출이었다. nativeopenpopover는자체경계까지만reveal하고배경dock/footerclip을적용하지않도록수정했다. 실제960/1400×6경로root고정·focusring8px이상·draft2/폭280/source/selection/Native4보존,menu/Select/manual/header회귀PASS. 단위2red→3PASS,common103/nav186/props31/앱·공통type/build/profile/fixed PASS. 단위outline shorthand의2px지표오류도명시적width4검사로분리했고assertion은줄이지않았다. baseline/API/기보변경없음. 최신전체740은이번수정전,새전체gate예정. 목표active/미커밋.


### 744 native modal short window

새악보nativeDialog의200%제목입력창이1000→500창높이전환에서267.5625px아래로숨는실제두실패를재현했다. 현재dialog소유focus만resize때nearest로보이고draft/IMEfocus/close를변경하지않는공통보완을추가했다. 첫수정후실제ring4.0625px잘림도토큰scroll-margin으로수정했고최종ringgap7.9375/root0/draft/취소File복귀/Native4를확인했다(8로반올림보고하지않음). 공통105/nav186/props31/type/build/profile/fixed와wizard10·실제popup/menu/Select/header회귀PASS,publicAST66동일/baseline변경없음. 최신전체740은이수정전,745겹친modal/Select소유권뒤전체gate실행예정. 목표active/미커밋,물리IME/OSdialog/touch/SR/청취/외부앱미검증.


### 745 modal/Select 겹친 소유권

744동일제품의960/1400×200%에서새악보조표Select를nativeTab/End로열고창을1000→500으로줄였다. focus/active/selected/draft/root·popup/행노출과첫EscapeSelect만닫기/두번째wizard취소File복귀/sourceNative4를보존했다. 새제품결함없음/QAcoverage이며baseline·제품변경없다. 이제741/743/744를포함한744-green-e전체gate를실행한다. 목표active/미커밋,물리IME/OSdialog/touch/SR/청취/외부앱미검증.


### 전체744 확정

744-green-e test:all543.34초/exit0,Vitest332files/3487tests·외부opt-in1skip/Node-native5 PASS. source2890/build/install안정,live차이는작업문서3개다.741메뉴live글자focus·743popover배경scroll·744nativeModal입력/ring보완과추가7회귀를포함한다. publicAST66동일/baseline변경없음/목표active·미커밋. 자체전체종료후746늦은Save와새modal/Select,747clampedmodal live밀도후보조사를이어간다. 물리IME/OSdialog/touch/SR/청취/외부앱은별도미검증.


### 746 늦은 Save와 새 modal/Select

744동일제품960/1400×성공/취소/고의IPC실패6경로에서현재wizard제목초안·조표active/selected/focus/root를보존했다. 성공2건만캡처원본문서를기록했고취소/실패4건은파일bytes유지. 첫/두번째Escape소유권/File복귀/Native원본·선택보존,완료쓰기14건/보류시도6개다. 고의IPC실패를실제OS디스크오류로보고하지않는다. 새제품결함없음/QAcoverage이며제품·baseline·새build·전체반복없음. 최신전체744유지,목표active/미커밋·물리검증범위유지.


### 747 clamped modal의 현재 field 관찰

외곽560×436/window크기가같은데100→200글자성장으로현재field50→74가267.5625px숨는실제2red/단위2red를수정했다. 현재소유field만observe하고focus변경시oldfieldunobserve,다른toplayer/owner guard와draft/명령을보존한다. 실제text2+density2controls/native8/currentring7.9375/root0·취소File복귀,common107/nav186/props31/type/wizard10/build/profile/fixed와744/745/746/743실제회귀PASS. publicAPI66/CSS/기보/baseline동일. 전체744는이보완전,목표active/미커밋·물리검증범위유지.


### 748 마디 context menu keyboard ring

실제native오른쪽pointer로연960/1400×600창/200%마디메뉴34단계중6단계가3.8671875px잘렸다. 서비스소유:focus-visible scroll-margin에현재spacing/focus토큰을추가해34단계최소8.1328125로수정했다. Escapecanvas/선택/source/Native4보존·red/greenEnd직접검토,별도review17단계는중복합산하지않는다. 기존Appcontext2filtered/common107/nav186/props31/type/build/profile/fixed·global/747실제회귀PASS. 명령/API/기보/baseline변경없음. 전체744는747/748전,목표active/미커밋·물리범위유지.


### 749 실제 창 최소 범위 정정

production BrowserWindow는minWidth960/minHeight640이다. 앞선500/600px ownedQA는최소높이아래강건성증거이며그것만으로지원되는최소창의결함이라고하지않는다. 기존실패/이미지는보존한다.744/747은원래fixture로640재검증,748/749는UI상한80자이내의일반파트명‘피아노 반주 파트’를사용하는640실제경로를추가한다. 제품window한계/native/glyph/기존assertion은바꾸지않는다. 각slice의viewport-scope-addendum과749 supported runs로범위를판정한다.


### 749 supported640 재확인

product와같은minWidth960/minHeight640을선언한별도NativeWindow에서744창축소와747고정높이글자성장결함을원래source로red재현/수정후green확인했다.748은UI상한80자보다짧은9자파트명‘피아노 반주 파트’에서같은640 Native red/green을확인했다.749의열린마디메뉴live글자성장은이640/정상파트명에서도미해결red다. 원래500/600관찰은추가강건성기록으로구분하며삭제하지않는다. 실제지원범위제품수정판정은이supported-runs/fixtures/원본hash에근거한다.창한계/기보/Native/기존assertion을변경하지않았다.


### 749 supported640 마디 메뉴 live focus

production최소높이640 범위를정정하고744/747원본fixture 및748정상9자파트명의640red/green을추가확인했다.500/600기록은강건성으로분리한다. 현재같은focusedcommand의live글자성장640red2를place후한frame/owner identity·connectedguard의nearest로수정했다. supported두폭ringgap8.1328125/history0/선택/Native·static34단계·744/747supported회귀PASS,old600도별도robustnessgreen. unit1red+2controls→3PASS/common107/nav189/props31/type/build/profile/fixed/context2filtered PASS. baseline/API/기보/창한계변경없음. 현재source2891전체gate시작예정,latest744는이전소스. 목표active/미커밋·물리범위유지.


### 750 프로젝트 저장 후속 단계 회귀

동일749 제품에서960/1400×recent/clear 네 경로가 통과했다. 실제Native쓰기24회 중4회는파일이쓴뒤의도적부가IPC실패,20회는성공workflow다. 실패뒤dirty/선택/history1·한undo원복/redoID·Native/view/partLayouts·원본fixture해시를보존한다. retry는같은경로/같은bytes로성공하며clean이된다. 한국어오류/공통기술정보확장·재생비실행을확인했고960dark이미지를직접검토했다. 기존details선택자/ShiftZ입력도구실패2건과원본스크립트를보존했다. 실제OSdialog나디스크고장증거가아니다. 제품/공통API/기보/baseline변경없음,전체749PASS를재사용한다. 다음751은최소640창의마디메뉴실행후포커스/정확한history다.


### 751 live 메뉴 실행과 history

751은동일749제품의회귀coverage다. productionmin960×640/정상9자파트명에서960/1400×실제Enter(char포함)/trustedpointer 네경로가통과했다. 마디메뉴가열린뒤전체chrome100→200live성장,현재첫명령ring/centerHit후실행하여한번의insert/history1·menu해제/canvasfocus·두파트각새마디1개·이전ID보존을확인했다. 정확한한undo/redo와새ID재사용·최종원복score/view/partLayouts,Native쓰기20회를확인했다.960dark메뉴이미지직접검토.새제품결함/기보/API/baseline변경없으며전체749PASS를재사용한다. 다음752는별도nativeDialog안명령검색의내부scroll과live현재결과focus다.


### 752 명령 검색의 실제 focus ring

752는실제명령검색결과inner scrollport의focusring잘림을수정했다. supported960/1400×640각5단계총10red(좌우/첫top -4,끝bottom -3.5)를보존했다.서비스results한규칙에기존sm+focuswidth+offsetpadding을추가해같은10단계모두최소8여백/centerHit/현재명령/Native·history0·Escape Tools복귀를통과했다.960darkred/green큰글자이미지직접검토.공통API/명령/기보/font/출력/baseline은그대로다.관련3files9tests와Appsearch/focus필터검사·type/build/profile/fixedPASS.이미지보충재실행은새coverage로세지않는다.최신전체7493492tests는이CSS한규칙전이며새전체실행으로허위보고하지않는다. 다음753실제검색undo/redo후754복구오류focus를조사한다.


### 753 검색 실행과 실제 undo/redo

753은同一752제품에서960/1400×검색inputEnter/실제결과buttonEnter네경로다. 실제AltUp한음편집뒤한국어검색어insertText로실행취소/다시실행을각한번수행하고history1→0→1·dirty·선택주소·Native16쓰기의정확한score/view/partLayouts와ID보존을확인했다.실제char이벤트/최종prevented도기록했다.물리IME검증은아니다.새결함/제품/baseline변경없으며기존출력geometry증거를재사용한다.다음754백업복구실패후실제키보드focus소유권을조사한다.


### 754 백업 복구의 대기·실패 focus

754는복구중disabled된원래button에서BODY로잃는실제focus를보완했다.앱private소유권만추가해대기중공개닫기버튼으로이동하고,실패/취소뒤같은요청이여전히keyboardowner인때만원래복구버튼을되돌린다.새pointer/key/focus·창닫기/재열기를덮어쓰지않는다. 공통IconButton이event를전달한다고잘못쓴green-d와nullable타입오류green-e,잘못된단위matcherred-b를원래로그와보존했다.수정전actual2red와correctedunit2red/3controls→최종5PASS;관련4files15tests/type/build/profile/fixedPASS.실제960/1400×none/Tab/reopen6경로에서대기close/실패retry/새close유지/새창focus유지·read1/이전score·Native12쓰기를검증했다.960dark실패뒤ring이미지직접검토.자체IPC거절이며실제backupstore손상/OSdialog검증은아니다.명령/기보/schema/공통API/baseline변경없음.전체749는752/754전이며현재전체PASS로칭하지않는다.다음755는긴목록/큰글자/coarse에서낮은항목실패→실제파일read성공retry와focus여백을본다.


### 755 긴 목록의 실제 복구 retry

755는동일754제품의긴목록성공retry회귀coverage다.17개정상entry의최하단복구를supported960/1400×640/글자200/coarseCDP에서실제Tab/Enter로실행했다.실패대기close·원래lastretry버튼은모든clip안ring/centerHit를유지했고원본score/선택/history0/dirtyclean을보존했다.그다음같은owned-17을자체파일에서정상read하여새문서·history0·새저장경로Native6쓰기와실제재열기score/view/partLayouts/원본fixture해시보존을확인했다.960darklastretry이미지직접검토.2IPC거절/2자체파일read성공이며실제OSdialog/물리touch/productionbackupstore검증을뜻하지않는다.새제품/baseline변경없음.이제752/754변경을포함한고정source2892의전체754-green-f gate를실행한다.


### 756 실제 취소와 늦은 정상read

756은同一754제품의회귀coverage다.960/1400×closeEnter/Space네경로에서복구를trustedpointer로시작해자동closefocus를실제키로취소했다.새로연목록의현재복구button을둔채다른제목/C5의늦은정상파일read를반환해도현재D5문서/history1/clean/선택/원래Native경로가그대로다.추가read없이Native16쓰기의한undo/redo가정확했다.실제파일을읽는자체IPC이며OSdialog/productionbackupstore검증은아니다.새제품/baseline/빌드변경없음,전체7543497tests/Node5를재사용한다.다음757은한마디에서disabledremove를건너뛰는실제메뉴/포인터경계다.


### 757 비활성 메뉴항목의 pointer focus

757은마지막한마디의비활성remove를클릭한뒤기존enabledmenuitemfocus가사라지고Escape가canvas로복귀하지않는두actualred를수정했다.앱menu의pointerdowncapture에서disabledbutton기본blur만막는다.단위disabled1red/기존4controls→5PASS,Appcontext2필터·type/build/profile/fixedPASS.실제960/1400×640/글자200에서최종retainednativeEvent defaultPrevented=true·기존2번볼타focus유지·Escapecanvasreturn·마지막마디/history1/정확한한undo/Native8쓰기를확인했다.활성명령의실제keyboard/pointer751회귀4경로도통과했다.960darkdisabled이미지직접검토.기보/schema/공통API/baseline변경없음.최신전체7543497tests는이번5줄/2추가test전이다.좁은pointer보완으로관련검사·실제검증을수행했으며새전체PASS로허위표기하지않는다.다음758은이pointer기본취소가emulatedtouch의메뉴스크롤을막지않는지확인한다.


### 758 CDP touch pan

758은 동일757 제품의 CDP touch pan 회귀 coverage다. 짧은 Piano 이름은 최대 scroll41.5/gesture20.75로 준비조건에서 중단했고 제품 실패로 세지 않았다. 공개 UI80자 이내33자 파트명만 바꾼 임시 fixture에서 두 폭/640/글자200/coarse/CDP 실제 touch를 검증했다. 757이 disabled pointerdown을 취소해도 trusted touch/pointercancel과 실제 menu scroll32회가 발생했고 scroll125.5→41.5(960)/47.5(1400), background root는732.5/545.5로 유지됐다. Escape canvas 복귀/Native8쓰기/한undo/원본 score를 보존했다. 960dark touch후 이미지를 직접 검토했다. 실기기/물리touch 검증이 아니며 제품·baseline 변경 없음. 다음759는 경계에서의 스크롤 전파를 별도 감사한다.


### 759 context menu boundary

759는 긴 마디메뉴의 맨 위에서 native wheel(-120)이 배경 악보를120px 움직이던 두 실제 red를 수정했다. 서비스 menu에 세로 overscroll containment 한 속성만 추가했다. 같은960/1400×640/coarse/글자200에서 메뉴 내부 경계의 root 이동은0이고, 메뉴를 닫은 일반 화면의 trusted outside wheel은 기존대로120px 이동한다. Native8쓰기·한undo·원본score/선택/geometry를 보존했다. 관련5+App2필터/type/build/profile/fixed, 현재757disabled2·758touch2·751활성command4 회귀가 통과했다. global wheel 취소·공통API·가로스크롤 정책·기보/font/baseline 변경 없음. 최신전체7543497tests는757/759 전이다. 다음760은 별개인 공개 Popover의 메뉴 경계와 dialog 대조군을 실제로 감사하며, 미재현 상태에서 공통CSS를 변경하지 않는다.


### 760 shared Popover boundary

760은 공개 Popover의 scroll boundary를 보완했다. 최초 File2 red와 같은 원인의 도크 dialog2 관찰을 분리한 뒤 red-b에서4실패 및4정상 outside control을 확인했다. 공유 CSS의 세로 containment 한 속성으로 File/Dock4경로 모두 배경 이동0이 됐고, 실제 MetadataActions2 smoke도 root0/focus/열기닫기/Native를 유지했다. 열린 팝업 밖의 일반 화면은6경로 모두120px 정상 스크롤한다. 도크 미확정 초안2와 폭280/선택·Native12쓰기를 보존했다. 공통107/nav191/props31·앱/공통 type·build/profile/fixed PASS. API66개의 선언/기본값/재export와 index/basic 소스는 동일하며 CSS y경계만 의도적으로 바뀌었다. 원래 계약은 contract-initial로 보존했고 같은 실제 원인이 확인된 두 소비처로 현재 계약을 좁혀 갱신했다. 다른 웹 Popover의 세로 경계에도 영향이 있으며 모든 앱 GUI를 검증한 것은 아니다. 기보/font/token/공통API/baseline/버전 변경 없음. 최신전체754는757/759/760 전이며 새 전체 gate가 남아 있다. 다음761은 별개 native HTMLDialog에서 같은 경계 문제가 실제로 있는지 확인한다.


### 761 native Dialog boundary

761은 native HTMLDialog 세 소비처의 wheel 경계를 보완했다. wizard/search/backups×두 폭의6실제 red는 modal 끝에서 배경0→120이었고, 같은 검사에서 정상 내부 scroll40 및 닫은 뒤 일반 scroll120 대조군은 통과했다. 공유 Dialog CSS에 세로 containment 한 속성을 추가한 뒤6경로 모두 배경0 유지, current focus/draft/선택·Native12쓰기·restore0을 보존했다. 공통107/nav191/props31·앱/공통 type·build/profile/fixed 및 Popup6·긴 백업 retry2 회귀도 통과했다. API66개의 선언/기본값/재export와 index/basic 소스는 동일하다. 이미지 보충 review-f는 같은6경로의 추가 테마/viewport 확인이며 신규 coverage로 세지 않는다. 실제960dark/1400light, CSS viewport높이608(Window640), coarse를 단언했고 960dark wizard 이미지를 직접 검토했다. normal dialog40·closed root120은 모두 그대로다. 공통 웹 Dialog와 sheet의 세로 경계에 영향이 있으나 실제 mobile/sheet GUI·OS파일dialog·물리IME/touch/SR은 미검증이다. glyph/font/token/schema/API/baseline/버전 변경 없음/미커밋/목표active. 최신전체754는757–761 전이며 이제 현재 고정소스2892의 전체761 gate를 실행한다.
