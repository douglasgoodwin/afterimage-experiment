# tests.cairn.com — HTTP->HTTPS with ACME exceptions and proxy to :3011

# --- Port 80 ---
# Whitelist allowed web origins (add any others you need)
map $http_origin $cors_allow_origin {
    default                                 "";
    "~^https?://editor\.p5js\.org$"         $http_origin;
    "~^https?://preview\.p5js\.org$"        $http_origin;
    "~^https?://p5js\.org$"                 $http_origin;
    "~^https?://strudel\.cc$"               $http_origin;
    "~^https?://(.+\.)?strudel\.cc$"        $http_origin;  # Allows subdomains
    # Optional for local testing (uncomment if needed)
    # "~^http://localhost(:\d+)?$"          $http_origin;
    # "~^http://127\.0\.0\.1(:\d+)?$"       $http_origin;
}
server {
    if ($host = tests.cairn.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name tests.cairn.com;

    # Serve ACME challenges directly from webroot
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/ucla-sound-recorder;
        default_type "text/plain";
        try_files $uri =404;
    }

    # Everything else to HTTPS on the same host
    location / {
        return 301 https://$host$request_uri;
    }

    access_log /var/log/nginx/tests.cairn.com.access.log;
    error_log  /var/log/nginx/tests.cairn.com.error.log;


}

# --- Port 443 ---
server {
    listen 443 ssl http2;
    server_name tests.cairn.com;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "frame-ancestors 'self' https://*.p5js.org;" always;

    # Let’s Encrypt certs
    ssl_certificate     /etc/letsencrypt/live/tests.cairn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tests.cairn.com/privkey.pem;

    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers (enable HSTS only after confirming HTTPS works everywhere)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Upload limits/timeouts
    client_max_body_size 50M;

    # ACME path must bypass the app here as well
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/ucla-sound-recorder;
        default_type "text/plain";
        try_files $uri =404;
    }

    # --- Everything else (your existing app) --------------------------

    # App proxy
    location / {
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

	# Exact match for /results
    location = /results {
        alias /var/www/afterimage-experiment/data/results.json;
        default_type application/json;
        # Optional: allow browser access from other origins
        # add_header Access-Control-Allow-Origin *;
    }

    access_log /var/log/nginx/tests.cairn.com.ssl.access.log;
    error_log  /var/log/nginx/tests.cairn.com.ssl.error.log;

    ssl_certificate /etc/letsencrypt/live/tests.cairn.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/tests.cairn.com/privkey.pem; # managed by Certbot
}

