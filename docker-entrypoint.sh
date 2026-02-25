#!/bin/sh
# Substitute only our env vars, leaving nginx variables ($host, $uri, etc.) intact
envsubst '$HA_BASE_URL $GO2RTC_URL' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
