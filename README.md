<p align="center"><img src="./assets/banner.png" alt="Book Writer" width="100%"></p>

A notes app built for writing books. Organise books into chapters and scenes, write in a distraction-free editor, keep character and location notes, and plan the story in an outline view.

## Features

- Books → chapters → scenes, drag to reorder (mouse or touch)
- Focus mode with word counts, session and daily goals, and a 7-day history
- Searchable character and location notes
- Plan view with synopsis, chapter summaries and scene status cards
- Autosave, JSON backup/import, manuscript export as .md or .txt
- Light, dark or system theme and keyboard shortcuts

## Running it

Plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8812
```

## Limitations

- Data is stored in this browser only; use JSON backup to move it
- Plain-text editor (no rich formatting)
