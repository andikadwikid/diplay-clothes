CREATE TABLE products (
    id          TEXT PRIMARY KEY,
    name        TEXT        NOT NULL,
    meta        TEXT        NOT NULL DEFAULT '',
    href        TEXT        NOT NULL DEFAULT '',
    badge_label TEXT        NOT NULL DEFAULT '',
    badge_tone  TEXT        NOT NULL DEFAULT 'dark' CHECK (badge_tone IN ('dark', 'light')),
    published   BOOLEAN     NOT NULL DEFAULT FALSE,
    position    INTEGER     NOT NULL DEFAULT 0,
    -- {"hanging": {key, contentType, width, height}, "front": {...}}
    images      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_order_idx ON products (position, created_at);

CREATE TABLE admin_users (
    id            BIGSERIAL PRIMARY KEY,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
