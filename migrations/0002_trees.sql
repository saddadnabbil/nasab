-- Per-user family trees. Composite key so each account can keep a local sample id.
create table if not exists trees (
  id          text not null,
  user_id     text not null,
  name        text not null,
  description text not null default '',
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists trees_user_updated_idx on trees (user_id, updated_at desc);
