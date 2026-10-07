#!/usr/bin/env bash
# festival.jnfac.or.kr 을 사내 서버(10.0.0.249)에서 운영 — sudo bash server-festival-setup.sh
#   외부(인터넷) → 재단 공인 IP 222.109.109.29 → (전산 포트포워딩) → 10.0.0.249:8081
#   8081 은 축제 사이트 전용 포트. 제규정 사이트(80)는 외부에서 닿지 않게 사내망만 허용한다.
# 업로드: /tmp/festival-site.tgz (docs/ 내용), 선택: /tmp/festival-safety.html (안전관리메뉴얼)
set -euo pipefail
WEB=/var/www/festival
mkdir -p "$WEB"
if [ -f /tmp/festival-site.tgz ]; then
  # 새 내용을 펼친 뒤 바꿔치기 (안전관리메뉴얼 폴더는 보존)
  TMP=$(mktemp -d)
  tar -xzf /tmp/festival-site.tgz -C "$TMP"
  if [ -d "$WEB/yongma/safety" ]; then mkdir -p "$TMP/yongma"; cp -a "$WEB/yongma/safety" "$TMP/yongma/"; fi
  rm -rf "$WEB.old"; mv "$WEB" "$WEB.old"; mv "$TMP" "$WEB"; rm -rf "$WEB.old"
  rm -f /tmp/festival-site.tgz
fi
if [ -f /tmp/festival-safety.html ]; then
  mkdir -p "$WEB/yongma/safety"
  install -m 644 /tmp/festival-safety.html "$WEB/yongma/safety/index.html"
  rm -f /tmp/festival-safety.html
fi
find "$WEB" -type d -exec chmod 755 {} +
find "$WEB" -type f -exec chmod 644 {} +

# nginx: 축제 사이트 (외부 공개용 8081 + 사내에서 도메인으로 들어오는 80)
cat > /etc/nginx/sites-available/festival <<'EOF'
server {
    listen 8081;
    listen [::]:8081;
    listen 80;
    listen [::]:80;
    server_name festival.jnfac.or.kr _;
    root /var/www/festival;
    index index.html;
    charset utf-8;
    server_tokens off;
    client_max_body_size 1m;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache" always;
    }
    # 음성 파일: 구간 요청(재생 위치 이동) 지원, 짧게 캐시
    location ~* \.mp3$ {
        add_header Cache-Control "public, max-age=3600" always;
        add_header X-Content-Type-Options nosniff always;
    }
    # 안전관리메뉴얼: 연락처가 있어 검색 엔진 등록 금지
    location /yongma/safety/ {
        add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
        add_header Cache-Control "no-cache" always;
        try_files $uri $uri/ =404;
    }
}
EOF
# 80 포트에서는 festival 도메인으로 들어올 때만 이 블록 (기본 서버는 계속 제규정 사이트)
sed -i 's/    server_name festival.jnfac.or.kr _;/    server_name festival.jnfac.or.kr;/' /etc/nginx/sites-available/festival
# 8081 은 이 사이트뿐이라 도메인 없이(IP로) 들어와도 축제 사이트가 나온다
ln -sf /etc/nginx/sites-available/festival /etc/nginx/sites-enabled/festival

# 제규정 사이트(기본 서버, 80): 사내망만 허용 — 외부 포트포워딩이 잘못 걸려도 노출되지 않게
REG=/etc/nginx/sites-available/jnfac-regulations
if ! grep -q 'allow 10.0.0.0/8;' "$REG"; then
  sed -i 's|^    server_tokens off;|    server_tokens off;\n\n    # 사내망 전용 (인터넷에서 오는 요청 차단)\n    allow 127.0.0.1;\n    allow ::1;\n    allow 10.0.0.0/8;\n    allow 172.16.0.0/12;\n    allow 192.168.0.0/16;\n    deny all;|' "$REG"
fi
nginx -t
systemctl reload nginx

# 방화벽: 8081 은 어디서나 (인터넷 공개용)
ufw allow 8081/tcp >/dev/null
echo "--- 확인"
curl -s -o /dev/null -w "8081 /yongma/          %{http_code}\n" http://127.0.0.1:8081/yongma/
curl -s -o /dev/null -w "8081 /yongma/safety/   %{http_code}\n" http://127.0.0.1:8081/yongma/safety/
curl -s -o /dev/null -w "80 Host:festival       %{http_code}\n" -H 'Host: festival.jnfac.or.kr' http://127.0.0.1/yongma/stage/
curl -s -o /dev/null -w "80 제규정(기본)         %{http_code}\n" http://127.0.0.1/
echo FESTIVAL_DONE
