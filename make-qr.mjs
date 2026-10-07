// QR코드 + 인쇄용 안내판 만들기 → qr/
//   node make-qr.mjs
// QR은 최종 주소(festival.jnfac.or.kr)로 만든다. 오류 복원 H(약 30%)라 일부가 가려지거나 접혀도 읽힌다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'qr');
// HTTPS 인증서는 외부 포트포워딩 후에 발급 가능 → 확실히 열리는 http 로 인코딩 (https 준비되면 서버가 자동 전환)
const BASE = 'http://festival.jnfac.or.kr/yongma/';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'guides.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const items = [...data.guides.map((g) => ({ id: g.id, title: g.title, where: g.where, url: `${BASE}${g.id}/` })), { id: 'all', title: '전체 음성 안내 목록', where: '모든 안내를 골라 들을 수 있어요', url: BASE }];
for (const it of items) {
  const opt = { errorCorrectionLevel: 'H', margin: 2, color: { dark: '#000000', light: '#ffffff' } };
  await QRCode.toFile(path.join(OUT, `${it.id}.png`), it.url, { ...opt, width: 1600 });
  fs.writeFileSync(path.join(OUT, `${it.id}.svg`), await QRCode.toString(it.url, { ...opt, type: 'svg' }));
  it.svg = fs.readFileSync(path.join(OUT, `${it.id}.svg`), 'utf8');
}

// A4 한 장에 안내 하나 (현수막 옆·안내판에 붙이는 용도)
const page = (it) => `
<section class="sheet">
  <p class="fest">2026 중랑 용마폭포축제</p>
  <h1>🔊 음성 안내</h1>
  <p class="how">휴대폰 카메라로 QR코드를 비추면<br>음성 안내가 나옵니다</p>
  <div class="qr">${it.svg}</div>
  <p class="title">${esc(it.title)}</p>
  <p class="where">${esc(it.where)}</p>
  <p class="url">${esc(it.url)}</p>
  <p class="help">도움이 필요하면 축제 직원에게 말씀해 주세요 · 중랑문화재단</p>
</section>`;
fs.writeFileSync(
  path.join(OUT, 'print.html'),
  `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>용마폭포축제 음성 안내 QR 인쇄물</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #000; }
.sheet { width: 210mm; height: 297mm; padding: 16mm 18mm; display: flex; flex-direction: column; align-items: center; text-align: center; page-break-after: always; border: 0; }
.fest { margin: 0; font-size: 18pt; font-weight: 700; }
h1 { margin: 4mm 0 2mm; font-size: 48pt; letter-spacing: -1px; }
.how { margin: 0 0 8mm; font-size: 22pt; font-weight: 700; line-height: 1.35; }
.qr { width: 135mm; height: 135mm; border: 3mm solid #000; padding: 3mm; border-radius: 6mm; }
.qr svg { width: 100%; height: 100%; display: block; }
.title { margin: 9mm 0 1mm; font-size: 30pt; font-weight: 800; line-height: 1.25; }
.where { margin: 0; font-size: 16pt; }
.url { margin: auto 0 2mm; font-size: 12pt; font-family: Consolas, monospace; }
.help { margin: 0; font-size: 12pt; }
</style></head><body>
${items.map(page).join('\n')}
</body></html>
`,
);
console.log(`QR ${items.length}개 → qr/ (png·svg·print.html)`);
for (const it of items) console.log(`  ${it.id.padEnd(10)} ${it.url}`);
