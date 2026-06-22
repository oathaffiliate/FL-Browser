# FL Browser

A fast sample browser for music producers, and editors, point it at your sound folders, click to
preview with a live waveform, and click sounds into your timeline. ( just a filenavigator fr)

---

## Install — Premiere Pro panel

**Easy install (no extra tools):**

1. Download **`FL-Browser-Installer.zip`** from
   [Releases](https://github.com/oathaffiliate/FL-Browser/releases).
2. Unzip it (right-click → Extract All).
3. Make sure Premiere is closed, then double-click **`Install FL Browser.bat`**.
   - If Windows shows "Windows protected your PC", click **More info → Run anyway**
     (this happens for smaller installers, to get rid of this its a $200 annual fee, i aint bready like that).
4. Open Premiere → **Window → Extensions → FL Browser**.

To remove it later: double-click **`Uninstall FL Browser.bat`** from the same folder. 

---

### Using it
- Click **+** to add a folder of sounds. Folders nest; click a folder to expand.
- Click a sound to preview it (waveform shows loudness + frequency ranges through color).
- Double-click a sound to drop it on the timeline at the playhead.
- **★** a sound to favorite it.

---

## Versions

| Platform | Status | What it is |
|----------|--------|------------|
| **Premiere Pro** (`premiere/`) | Done | A panel inside Premiere |
| **Desktop** (`desktop/`) | In progress | The og app. |
| **DaVinci Resolve** | Planned | Same idea, for Resolve, (when i have the specs 2 run it) |


---



## Build from source (Premiere)

The panel is plain HTML/CSS/JS (an Adobe CEP extension). To run the unsigned source
during development, copy `premiere/` into
`%APPDATA%\Adobe\CEP\extensions\com.oath.flbrowser\` and enable PlayerDebugMode.

---

Built by **ōth**. #takeyours 