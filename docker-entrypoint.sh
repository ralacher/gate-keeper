#!/bin/sh
# Substitute only our env vars, leaving nginx variables ($host, $uri, etc.) intact
envsubst '$HA_BASE_URL $GO2RTC_URL' < /etc/nginx/default.conf.template > /etc/nginx/http.d/default.conf

# Start the push notification server in the background
cd /push-server && node server.js &

# Start nginx in the foreground
exec nginx -g 'daemon off;'
