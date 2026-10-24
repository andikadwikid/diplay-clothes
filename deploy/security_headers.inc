# Included by every location that serves the static app. (nginx does not merge
# add_header between levels, so each location includes this explicitly.)
# No third-party origins are used. 'unsafe-inline' for styles is needed for the
# style="" attributes React sets (custom properties on the rack).
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "same-origin" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" always;
