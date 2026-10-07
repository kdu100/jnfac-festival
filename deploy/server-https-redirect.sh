#!/usr/bin/env bash
# 외부 443 포트포워딩이 확인된 뒤에만 실행 — http 로 들어오면 https 로 자동 전환
#   sudo bash server-https-redirect.sh festival.jnfac.or.kr
# (QR코드는 http 주소라 그대로 두어도 https 로 넘어간다)
set -euo pipefail
DOMAIN="${1:?도메인}"
F=/etc/nginx/sites-available/http-redirect-$DOMAIN
cat > "$F" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    server_tokens off;
    include snippets/acme.conf;
    location / { return 301 https://\$host\$request_uri; }
}
EOF
# 기존 80 블록에서 이 도메인 이름을 빼고 전환 블록으로
if [ "$DOMAIN" = "festival.jnfac.or.kr" ]; then
  sed -i 's/^    server_name festival.jnfac.or.kr;/    server_name festival-http-disabled.invalid;/' /etc/nginx/sites-available/festival
else
  sed -i "s/ in.jnfac.or.kr;/;/" /etc/nginx/sites-available/jnfac-regulations
fi
ln -sf "$F" /etc/nginx/sites-enabled/http-redirect-$DOMAIN
nginx -t && systemctl reload nginx
curl -s -o /dev/null -w "http → %{http_code} %{redirect_url}\n" -H "Host: $DOMAIN" http://127.0.0.1/
echo REDIRECT_DONE
