CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  admin         INTEGER NOT NULL DEFAULT 0,
  -- Rises by one with every push, so devices can ask for what's new
  revision      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

-- Sign-in tokens, one per device. Only a hash of each token is kept.
CREATE TABLE tokens (
  hash         TEXT    PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  device       TEXT,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

-- Everything a user's devices sync: videos, albums, episodes, events and
-- preferences, stored as the app's own JSON. Devices do the merging.
CREATE TABLE records (
  user_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind     TEXT    NOT NULL,
  id       TEXT    NOT NULL,
  data     TEXT    NOT NULL,
  revision INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, id)
);

CREATE INDEX records_by_revision ON records (user_id, revision);
