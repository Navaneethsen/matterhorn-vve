<!-- @author nsen <navaneethsen@gmail.com> -->
# Content beheren / Managing content

Alles op de site komt uit deze map. **Bewerk een bestand, commit & push via git — klaar.**
Everything on the site comes from this folder. **Edit a file, commit & push via git — done.**

## Mappen / Folders

```
content/
  nl/            ← Nederlandse teksten (1 bestand per pagina)
  en/            ← English texts (same file names)
  gallery/       ← foto's (jpg/png) / photos
  newsletters/   ← nieuwsbrief-PDF's / newsletter PDFs
```

`nl/` en `en/` bevatten dezelfde bestanden; bewerk altijd beide talen. / `nl/` and `en/` contain the same files; always edit both languages.

| Bestand / file | Pagina / page |
|---|---|
| `home.md` | Home — titel, welkomsttekst, gebouwfeiten |
| `rules.md` | Huisregels / House rules |
| `announcements.md` | Mededelingen op de homepagina |
| `events.md` | Agenda |
| `gallery.md` | Galerij (lijst van foto's + onderschriften) |
| `board.md` | Bestuur & contact |
| `newsletters.md` | Nieuwsbrieven |

## Spelregels / Conventions

Elk bestand legt zijn eigen formaat bovenaan uit in een `<!-- commentaar -->`. Kort samengevat / Each file explains its format in a `<!-- comment -->` at the top. In short:

- **Koppen met `[id]`** (zoals `## [board] Het bestuur`): wijzig alleen de zichtbare tekst, laat de `[id]` staan. / Headings with `[id]`: change only the visible text, keep the `[id]`.
- **Mededelingen & agenda:** één item per `## kop`, formaat `## JJJJ-MM-DD | Label | Titel`. Een 📌 in de kop zet een mededeling bovenaan. Geen datum bekend? Schrijf tekst, bijv. `Datum volgt`.
- **Lijstregels met `|`** (bestuur, foto's, nieuwsbrieven, gebouwfeiten): één regel per item, velden gescheiden door `|`.

## Foto's toevoegen / Adding photos

1. Zet het bestand in `content/gallery/` (bijv. `entree.jpg`).
2. Voeg in `nl/gallery.md` én `en/gallery.md` één regel toe: `- entree.jpg | De entree`.

**Foto homepagina / home page photo:** sla een foto op als `assets/images/matterhorn.jpg` — de homepagina gebruikt hem automatisch (anders toont hij de illustratie).

## Nieuwsbrief toevoegen / Adding a newsletter

1. Zet de PDF in `content/newsletters/` (bijv. `2026-06.pdf`).
2. Voeg in `nl/newsletters.md` én `en/newsletters.md` één regel toe onder de `## [items]` kop:
   `- 2026-06-01 | Nieuwsbrief juni 2026 | newsletters/2026-06.pdf`
