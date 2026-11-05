-- Desktop rewards (task 13.3). Coins buy fixed-price items: no random draws, no real money.

-- The wallpaper the student has chosen. Null means the default desktop.
alter table profiles add column wallpaper text;

-- One of each item, except streak freezes, which can be bought again once one is used.
create unique index inventory_one_each on inventory (profile_id, item) where item <> 'freeze';

-- Days a streak freeze protected. A row means the freeze was used on that missed day.
create table freeze_days (
  profile_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  primary key (profile_id, day)
);
