// 음성 안내 사이트 만들기: guides.json → docs/yongma/ (+ docs/index.html 축제 서비스 첫 화면)
//   node build.mjs            → GitHub 기본 주소용 (도메인 연결 전)
//   node build.mjs --domain   → festival.jnfac.or.kr 연결 (DNS CNAME 등록 후)
// 공개: GitHub Pages(main 브랜치 /docs) → https://festival.jnfac.or.kr/yongma/<안내>/
// 안내 문구를 고치면 guides.json만 고치고 다시 실행한다. 음성 파일은 audio/ 에 같은 이름으로 교체.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(ROOT, 'docs');
const OUT = path.join(SITE, 'yongma');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'guides.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ver = Date.now().toString(36); // 캐시 갱신용

fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const f of ['style.css', 'player.js']) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(OUT, 'assets', f));
for (const g of data.guides) fs.copyFileSync(path.join(ROOT, 'audio', g.audio), path.join(OUT, 'audio', g.audio));
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
// 도메인 연결은 DNS 등록 후에 (먼저 CNAME 파일을 넣으면 github.io 주소가 아직 없는 도메인으로 넘어가 버린다)
const cname = path.join(SITE, 'CNAME');
if (process.argv.includes('--domain')) fs.writeFileSync(cname, 'festival.jnfac.or.kr\n');
else if (fs.existsSync(cname)) fs.rmSync(cname);

const head = (title, css) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${css}?v=${ver}">
</head>
<body>`;

// 안내별 페이지 (QR이 가리키는 곳): /yongma/<id>/
for (const g of data.guides) {
  const dir = path.join(OUT, g.id);
  fs.mkdirSync(dir, { recursive: true });
  const others = data.guides.filter((x) => x.id !== g.id);
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    `${head(`${g.title} - ${data.site.title}`, '../assets/style.css')}
<main>
  <p class="kicker">${esc(data.site.title)}</p>
  <h1>${esc(g.title)}</h1>
  <p class="where">${esc(g.where)}</p>

  <button id="play" class="big" type="button" aria-label="음성 안내 듣기. 화면을 누르면 안내가 재생됩니다.">
    <span class="icon" aria-hidden="true">▶</span>
    <span class="label" style="white-space:pre-line">화면을 누르면
안내가 시작됩니다</span>
    <span class="sub">화면 아무 곳이나 눌러 주세요</span>
  </button>
  <p id="time" class="time" aria-hidden="true">0:00</p>
  <div class="controls">
    <button id="restart" type="button">처음부터</button>
    <button id="back" type="button">10초 뒤로</button>
    <button id="speed" type="button">보통 빠르기</button>
  </div>
  <div id="live" class="sr-only" aria-live="polite"></div>

  <details>
    <summary>안내 내용 글로 보기</summary>
    <div class="script">
${g.text.map((t) => `      <p>${esc(t)}</p>`).join('\n')}
    </div>
  </details>

  <nav class="nav" aria-label="다른 안내">
${others.map((o) => `    <a href="../${o.id}/">${esc(o.title)} 듣기</a>`).join('\n')}
    <a href="../">전체 안내 목록</a>
  </nav>
  <p class="help">${esc(data.site.help)}</p>
  <p class="foot">${esc(data.site.org)} · ${esc(data.site.date)}</p>
</main>
<audio id="audio" src="../audio/${g.audio}" preload="auto"></audio>
<script src="../assets/player.js?v=${ver}"></script>
</body>
</html>
`,
  );
}

// 용마폭포축제 안내 목록: /yongma/
fs.writeFileSync(
  path.join(OUT, 'index.html'),
  `${head(data.site.title, 'assets/style.css')}
<main>
  <p class="kicker">${esc(data.site.org)} · ${esc(data.site.date)}</p>
  <h1>${esc(data.site.title)}</h1>
  <p>듣고 싶은 안내를 누르면 음성으로 들려 드립니다.</p>
  <ul class="list">
${data.guides.map((g) => `    <li><a href="${g.id}/">${esc(g.title)}<span>${esc(g.where)}</span></a></li>`).join('\n')}
  </ul>
  <p class="help">${esc(data.site.help)}</p>
</main>
</body>
</html>
`,
);

// 축제 서비스 첫 화면: /
fs.writeFileSync(
  path.join(SITE, 'index.html'),
  `${head('중랑문화재단 축제 안내', 'yongma/assets/style.css')}
<main>
  <p class="kicker">${esc(data.site.org)}</p>
  <h1>축제 안내 서비스</h1>
  <ul class="list">
    <li><a href="yongma/">${esc(data.site.title)}<span>${esc(data.site.date)} · 용마폭포공원</span></a></li>
  </ul>
</main>
</body>
</html>
`,
);
console.log(`만듦: docs/ (용마폭포축제 안내 ${data.guides.length}개)${process.argv.includes('--domain') ? ' + 도메인 festival.jnfac.or.kr' : ''}`);
