# Something for Ely

A little journal: letters, songs, memories, reasons, and a list of things to do together.
Plain HTML, CSS and JavaScript. No build step.

## Run it
The flowers are SVG images, so open it through a tiny server rather than double-clicking:

```bash
cd A-Letter-To-Ely
python3 -m http.server 5173
# open http://localhost:5173
```

## Editing your content
Everything is edited on the page itself. Nothing needs code.

| Section  | Add                | Edit                          | Delete                   |
|----------|--------------------|-------------------------------|--------------------------|
| Letters  | Write a Letter     | open a letter, then Edit      | open a letter, then Delete |
| Music    | Dedicate a Song    | Edit under the song           | Remove under the song    |
| Memories | Add Memory (choose a photo, add a caption and a note for the back) | Edit under the photo | Delete under the photo |
| Reasons  | Add a Reason       | Edit on the card              | Delete on the card       |
| Our List | Add to the List    | Edit on the card (tick to finish) | Delete on the card   |

Every delete asks first. The Quotes section has been removed.

**Memories:** tap a photo (or press its Flip button) to turn it over and read the note on the back. Photos are shrunk in the browser before saving so a few dozen fit in Local Storage; if it ever fills up you'll be told, and deleting an older memory frees the room.

**"Something for Ely"** in the top bar closes the journal and returns to the notebook cover.

**Important:** changes are saved in the browser you make them in (Local Storage).
To share the finished version with Ely, put the seed text into the component files
(`components/letters.js`, `music.js`, `memories.js`, `lists.js`) or send her from the
same browser/device.

## Files
```
index.html            cover, sections, modals
style.css             palette + layout
script.js             unlock, navigation, scroll spy
components/
  animations.js       flower field, burst, petals, modals, delete confirm
  letters.js  music.js  memories.js  lists.js
assets/flowers        peony, tulip and petal SVGs
```

## Tweaks
- Fonts load from Google Fonts and are set in the four `--font-*` variables at the top of `style.css`: Quicksand (text), Dancing Script (handwriting), Pacifico ("Something for Ely" and the Open button), Playfair Display (headings) and Nunito (nav tabs). The link in `index.html` must list any font you swap in.
- Cover lettering: `.notebook__title` in `style.css`. Notebook colours: `.notebook__page`.
- Flower count and size: `bloom()` in `components/animations.js`.
- Palette: the variables at the top of `style.css`.
- `prefers-reduced-motion` turns off the sway, the burst and the falling petals.
