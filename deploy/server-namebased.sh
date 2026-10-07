#!/usr/bin/env bash
# 80 포트를 도메인 이름으로 나눠 쓰기 (외부 80 → 10.0.0.249:80 포트포워딩 대비) — sudo bash server-namebased.sh
#   festival.jnfac.or.kr → 축제 사이트 (인터넷 공개)
#   10.0.0.249 / localhost → 제규정 사이트 (사내망 주소에서만)
#   그 밖의 이름·IP로 들어온 요청 → 응답 없이 끊음(444)
set -euo pipefail
REG=/etc/nginx/sites-available/jnfac-regulations
cp -p "$REG" "$REG.bak-$(date +%Y%m%d%H%M%S)"

# 1) 제규정 사이트: 기본 서버에서 빼고 사내 주소 이름에만 응답
sed -i 's/^    listen 80 default_server;/    listen 80;/; s/^    listen \[::\]:80 default_server;/    listen [::]:80;/' "$REG"
sed -i 's/^    server_name _;/    server_name 10.0.0.249 localhost 127.0.0.1;/' "$REG"

# 2) 모르는 이름은 끊는 기본 서버
cat > /etc/nginx/sites-available/00-default-deny <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    server_tokens off;
    return 444;
}
EOF
ln -sf /etc/nginx/sites-available/00-default-deny /etc/nginx/sites-enabled/00-default-deny

nginx -t
systemctl reload nginx
echo "--- 확인 (서버 안에서)"
curl -s -o /dev/null -w "Host 10.0.0.249 (제규정)        %{http_code}\n" -H 'Host: 10.0.0.249' http://127.0.0.1/
curl -s -o /dev/null -w "Host festival (축제)            %{http_code}\n" -H 'Host: festival.jnfac.or.kr' http://127.0.0.1/yongma/
curl -s -o /dev/null -w "Host 222.109.109.29 (공인IP)    %{http_code}\n" -H 'Host: 222.109.109.29' http://127.0.0.1/ || true
curl -s -o /dev/null -w "Host 아무거나                   %{http_code}\n" -H 'Host: example.com' http://127.0.0.1/ || true
curl -s -o /dev/null -w "8081 (예비)                     %{http_code}\n" http://127.0.0.1:8081/yongma/
echo NAMEBASED_DONE
