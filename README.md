# 중랑문화재단 축제 안내 서비스

- 주소: http://festival.jnfac.or.kr/ — 재단 공인 IP 222.109.109.29 → (전산 포트포워딩) → 사내 서버 10.0.0.249:8081 (nginx, /var/www/festival)
- 서버 반영: `docs/`를 묶어 올린 뒤 `deploy/server-festival-setup.sh` 실행 (안전관리메뉴얼 /yongma/safety/ 는 보존)
- GitHub Pages(https://kdu100.github.io/jnfac-festival/)는 음성 안내만 있는 예비 사본
- 2026 중랑 용마폭포축제 시각장애인·지적장애인 음성 안내(QR): http://festival.jnfac.or.kr/yongma/
- 안전관리메뉴얼(직원용, 연락처 포함·검색 제외): http://festival.jnfac.or.kr/yongma/safety/ — 이 저장소에는 올리지 않음

## 고치는 법
1. 안내 문구: `guides.json`, 음성: `audio/` (같은 파일 이름으로 교체)
2. `node build.mjs --domain` → `docs/` 다시 만들기
3. 커밋·푸시하면 1~2분 뒤 사이트에 반영

로컬 미리보기: `node serve.mjs` → http://localhost:3200
QR 인쇄물: `qr/` 폴더
