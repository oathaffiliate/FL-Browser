# FL Browser

A fast sample browser for music producers, and editors, point it at your sound folders, click to
preview with a live waveform, and click sounds into your timeline. ( just a filenavigator fr)

---

## Versions

| Platform | Status | What it is |
|----------|--------|------------|
| **Premiere Pro** (`premiere/`) | Done | A panel inside Premiere |
| **Desktop** (`desktop/`) | In progress | The og app. |
| **DaVinci Resolve** | Planned | Same idea, for Resolve, (when i have the specs 2 run it) |

---

## Install — Premiere Pro panel

You need the panel as a signed `.zxp` (grab it from
[Releases](https://github.com/oathaffiliate/FL-Browser/releases)), then:

1. Download a free installer: **[ZXP Installer](https://aescripts.com/learn/zxp-installer/)**
   (or Anastasiy's ZXP Installer).
2. Drag **`com.oath.flbrowser.zxp`** onto it.
3. Restart Premiere Pro.
4. Open it: **Window → Extensions → FL Browser**.

### Using it
- Click **+** to add a folder of sounds. Folders nest; click a folder to expand.
- Click a sound to preview it (waveform shows loudness + frequency ranges through color).
- Double-click a sound to drop it on the timeline at the playhead.
- **★** a sound to favorite it.

---

## Build from source (Premiere)

The panel is plain HTML/CSS/JS (an Adobe CEP extension). To run the unsigned source
during development, copy `premiere/` into
`%APPDATA%\Adobe\CEP\extensions\com.oath.flbrowser\` and enable PlayerDebugMode.

---

Built by **ōth**. #takeyours 