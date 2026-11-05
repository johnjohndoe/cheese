# Cheese 🧀

A mobile-friendly, searchable list of our cheeses. It's a static website with no build step and no dependencies.

## Features

- Alphabetical list with sticky letter headings and an A–Z quick-jump bar
- Full-text search (name, dairy, info text, milk type and treatment), ignoring accents and case
- Filters for milk type, milk treatment and edible rind, with live counts
- Light / dark / system theme, using Material Design 3 colors checked against WCAG contrast

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Styles (Material 3 color tokens, light & dark) |
| `app.js` | Loads the data, search, filters, rendering |
| `cheese.json` | **The data – edit this file to change the cheese list** |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is |

## Editing the data

`cheese.json` is a list of entries like this:

```json
{
  "dairy": "Backensholzer Hof",
  "name": "Deichkäse 12 Monate",
  "info": "Geschmack nussig, würzig und kräftig",
  "milk_type": "Kuh",
  "milk_treatment": "Rohmilch",
  "edible_rind": true
}
```

| Key | Values |
|---|---|
| `dairy` | Name of the dairy, or `null` |
| `name` | Cheese name (required) |
| `info` | Text from the shop label, or `null` |
| `milk_type` | Free text containing `Kuh`, `Schaf`, `Ziege` and/or `Büffel`, e.g. `"50% Kuh, 50% Ziege"` |
| `milk_treatment` | `"Rohmilch"`, `"Thermisiert"`, `"Pasteurisiert"` or `null` |
| `edible_rind` | `true`, `false` or `null` (unknown) |

The order in the file doesn't matter; the site sorts by name automatically.
Before committing, you can check that the file is still valid JSON:

```sh
python3 -m json.tool cheese.json > /dev/null && echo OK
```

## Running locally

Browsers block loading `cheese.json` from a page opened with a double-click (`file://`), so serve the folder instead:

```sh
python3 -m http.server
```

Then open <http://localhost:8000>.

## Publishing on GitHub Pages

1. Create an empty repository on GitHub and push this folder:
   ```sh
   git remote add origin git@github.com:<user>/<repo>.git
   git push -u origin main
   ```
2. On GitHub go to **Settings → Pages**, and under **Build and deployment** choose
   **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
3. After a minute the site is live at `https://<user>.github.io/<repo>/`.

Every later push to `main` updates the site automatically.

## License

Copyright (C) 2026 The Cheese contributors

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU Affero General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
[GNU Affero General Public License](LICENSE) for more details.
