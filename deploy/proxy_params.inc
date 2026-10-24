proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_read_timeout 60s;
# A replica that is down or being replaced should not cost the client a failed request:
# fail fast on connect and try the next replica.
proxy_connect_timeout 3s;
proxy_next_upstream error timeout;
proxy_next_upstream_tries 3;
