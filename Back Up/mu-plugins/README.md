# Stu Chords Archive (CPT + Archive Template)

This package gives you a native WordPress **Songs** post type with a clean archive at **/chords/** — with A–Z filtering, search, and dropdown filters for **Artist** and **Key** (plus an optional **Difficulty** taxonomy).

## What’s inside

```
stu-chords-archive-v1.0.0/
├─ mu-plugins/
│  └─ stu-songs.php        # Registers CPT + taxonomies + rewrites + A–Z filter
├─ theme/
│  └─ archive-song.php     # Archive template for /chords/ grid + toolbar
└─ README.md               # This file
```

## Install (2–3 minutes)

1. **Unzip this package on your computer.**  
2. **Upload the files to your WordPress site** via SFTP or cPanel → File Manager:
   - Copy **`mu-plugins/stu-songs.php`** to **`/wp-content/mu-plugins/`**.  
     - If the `mu-plugins` folder doesn’t exist, create it. (MU-plugins auto‑load. No activation step.)
   - Copy **`theme/archive-song.php`** into your **active theme or child theme** folder, e.g.:  
     `/wp-content/themes/your-child-theme/archive-song.php`

3. **Flush permalinks:** WP Admin → **Settings → Permalinks → Save** (no changes needed).  
   This registers the new archive and pretty URLs.

## You now have

- `/chords/` — main index (grid + search + A–Z bar + Artist/Key dropdowns)  
- `/chords/letter/a/` — A–Z filtered view  
- `/chords/key/c/` — Taxonomy archives by Key  
- `/chords/artist/abba/` — Taxonomy archives by Artist

## Adding content

- Go to **Songs → Add New**.  
- Put your chord sheet (ChordPress, etc.) in the editor as usual.  
- Assign **Artist** and **Key** terms.  
- (Optional) set a Featured Image for the grid card.

## Notes

- This is 100% native WP (CPT + taxonomies + archive template).  
- If you later want counts, sticky filters, or styling to match ukulelecheats.com more closely, you can extend `archive-song.php` or ask your friendly Slayer to tweak it.
