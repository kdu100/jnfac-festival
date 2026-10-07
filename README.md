# 중랑문화재단 축제 안내 서비스

- 주소: https://festival.jnfac.or.kr/ (GitHub Pages, `main` 브랜치 `/docs`)
- 2026 중랑 용마폭포축제 시각장애인·지적장애인 음성 안내(QR): https://festival.jnfac.or.kr/yongma/

## 고치는 법
1. 안내 문구: `guides.json`, 음성: `audio/` (같은 파일 이름으로 교체)
2. `node build.mjs --domain` → `docs/` 다시 만들기
3. 커밋·푸시하면 1~2분 뒤 사이트에 반영

로컬 미리보기: `node serve.mjs` → http://localhost:3200
QR 인쇄물: `qr/` 폴더
