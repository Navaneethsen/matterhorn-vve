<!-- @author nsen <navaneethsen@gmail.com> -->
# VvE Matterhorn — Website

Static website for the residents of Matterhorn 2–48, Amstelveen.

## Structure

```
website/
├── index.html          # Home page
├── gallery.html        # Photo gallery
├── board.html          # Board members
├── events.html         # Events & meetings
├── newsletters.html    # Newsletters archive
├── rules.html          # Building rules
├── assets/             # CSS, JS, fonts
└── content/
    ├── en/             # English content (markdown)
    ├── nl/             # Dutch content (markdown)
    └── gallery/        # Photo files (JPG)
```

## Content

Pages are driven by markdown files in `content/nl/` and `content/en/`. Edit those files to update page text without touching HTML.

Gallery photos live in `content/gallery/` — add a JPG and reference it in `content/nl/gallery.md` and `content/en/gallery.md`.

## Languages

The site supports Dutch (default) and English. Language is toggled by the user in the navigation.
