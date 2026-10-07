#!/usr/bin/env bash
# HTTPS 인증서 발급(Let's Encrypt, 80번 포트 확인 방식) + 443 서버 설정 — sudo bash server-https.sh <도메인>
#   festival.jnfac.or.kr → /var/www/festival (정적)
#   in.jnfac.or.kr       → 제규정 사이트(127.0.0.1:3100), /admin·/pages 는 사내망만
# http→https 자동 전환은 외부 443 포트포워딩이 확인된 뒤 server-https-redirect.sh 로 따로 켠다.
set -euo pipefail
DOMAIN="${1:?도메인}"
EMAIL="kdu100@jnfac.or.kr"
WEBROOT=/var/www/letsencrypt
export DEBIAN_FRONTEND=noninteractive

command -v certbot >/dev/null || apt-get install -y certbot >/tmp/certbot-apt.log 2>&1
mkdir -p "$WEBROOT/.well-known/acme-challenge"

# 1) 80번에서 인증 확인 파일을 줄 수 있게 (모든 사이트 공통 조각)
cat > /etc/nginx/snippets/acme.conf <<EOF
location ^~ /.well-known/acme-challenge/ {
    root $WEBROOT;
    default_type text/plain;
    allow all;
}
EOF
for f in /etc/nginx/sites-available/festival /etc/nginx/sites-available/jnfac-regulations; do
  grep -q 'snippets/acme.conf' "$f" || sed -i '0,/^    server_tokens off;/s||    server_tokens off;\n    include snippets/acme.conf;|' "$f"
done
nginx -t && systemctl reload nginx

# 2) 인증서 발급 (이미 있으면 갱신만)
certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --non-interactive --keep-until-expiring

# 3) 443 서버 블록
CERT=/etc/letsencrypt/live/$DOMAIN
if [ "$DOMAIN" = "festival.jnfac.or.kr" ]; then
  BODY='    root /var/www/festival;
    index index.html;
    charset utf-8;
    location / { try_files $uri $uri/ =404; add_header Cache-Control "no-cache" always; }
    location ~* \.mp3$ { add_header Cache-Control "public, max-age=3600" always; }
    location /yongma/safety/ { add_header X-Robots-Tag "noindex, nofollow, noarchive" always; add_header Cache-Control "no-cache" always; try_files $uri $uri/ =404; }'
else
  BODY='    client_max_body_size 60m;
    location ^~ /pages/ { if ($jnreg_internal = 0) { return 403; } alias /var/www/jnfac-pages/; charset utf-8; autoindex off; add_header X-Robots-Tag "noindex" always; }
    location ^~ /admin {
        if ($jnreg_internal = 0) { return 403; }
        proxy_pass http://127.0.0.1:3100; proxy_http_version 1.1;
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
    location / {
        proxy_pass http://127.0.0.1:3100; proxy_http_version 1.1;
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        add_header X-Robots-Tag "noindex, nofollow" always;
    }'
fi
cat > /etc/nginx/sites-available/ssl-$DOMAIN <<EOF
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name $DOMAIN;
    server_tokens off;
    ssl_certificate $CERT/fullchain.pem;
    ssl_certificate_key $CERT/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    add_header X-Content-Type-Options nosniff always;
$BODY
}
EOF
ln -sf /etc/nginx/sites-available/ssl-$DOMAIN /etc/nginx/sites-enabled/ssl-$DOMAIN

# 443 에서 모르는 이름은 끊기 (자체 서명 없이 첫 인증서로 거절)
if [ ! -f /etc/nginx/sites-available/00-default-deny-ssl ]; then
  cat > /etc/nginx/sites-available/00-default-deny-ssl <<EOF
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    ssl_reject_handshake on;
}
EOF
  ln -sf /etc/nginx/sites-available/00-default-deny-ssl /etc/nginx/sites-enabled/00-default-deny-ssl
fi

nginx -t && systemctl reload nginx
ufw allow 443/tcp >/dev/null
# 자동 갱신 후 nginx 다시 읽기
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

echo "--- 확인 (서버 안)"
curl -s -o /dev/null -w "https $DOMAIN  %{http_code}\n" --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/"
openssl x509 -in "$CERT/fullchain.pem" -noout -subject -enddate
systemctl list-timers certbot.timer --no-pager | head -3
echo HTTPS_DONE
