const fs   = require("fs");
const path = require("path");

const AUDIO_EXT = [".wav", ".mp3", ".flac", ".aif", ".aiff", ".ogg", ".m4a"];

const treeEl    = document.getElementById("tree");
const previewEl = document.getElementById("preview");
const audio     = document.getElementById("audio");
const waveEl    = document.getElementById("wave");
const waveCtx   = waveEl.getContext("2d");
const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();

let roots = loadRoots();   // array of folder paths the user added
let playingRow = null;
let peaks = null;          // cached waveform shape for the current sound
let rafId = null;          // animation handle for the playhead

/* ---------- saving the folder list ---------- */
function loadRoots() {
    try { return JSON.parse(localStorage.getItem("flbrowser.roots") || "[]"); }
    catch (e) { return []; }
}
function saveRoots() {
    localStorage.setItem("flbrowser.roots", JSON.stringify(roots));
}

/* ---------- saving favorites ---------- */
let favs = loadFavs();   // Set of favorited file paths
function loadFavs() {
    try { return new Set(JSON.parse(localStorage.getItem("flbrowser.favs") || "[]")); }
    catch (e) { return new Set(); }
}
function saveFavs() {
    localStorage.setItem("flbrowser.favs", JSON.stringify([...favs]));
}

/* ---------- remembering which folders were open + scroll spot ---------- */
let openSet = loadOpen();   // Set of folder paths that were expanded
function loadOpen() {
    try { return new Set(JSON.parse(localStorage.getItem("flbrowser.open") || "[]")); }
    catch (e) { return new Set(); }
}
function saveOpen() {
    localStorage.setItem("flbrowser.open", JSON.stringify([...openSet]));
}

/* ---------- reading a folder ---------- */
// returns { folders: [names], files: [names] }, sorted, audio files only
function readFolder(dir) {
    let folders = [], files = [];
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { return { folders, files, error: true }; }

    for (const ent of entries) {
        if (ent.isDirectory()) {
            folders.push(ent.name);
        } else if (AUDIO_EXT.includes(path.extname(ent.name).toLowerCase())) {
            files.push(ent.name);
        }
    }
    folders.sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.localeCompare(b));
    return { folders, files };
}

/* ---------- building tree rows ---------- */
// makes one folder node (collapsed). isRoot adds the remove button.
function makeFolderNode(fullPath, label, isRoot, depth) {
    depth = depth || 0;
    const node = document.createElement("div");
    node.className = "node folder-node" + (isRoot ? " root" : "");

    const row = document.createElement("div");
    row.className = "row";
    row.style.paddingLeft = (6 + depth * 14) + "px";   // folders step right with depth

    const twisty = document.createElement("span");
    twisty.className = "twisty";
    twisty.textContent = "▸";

    const name = document.createElement("span");
    name.className = "name folder";
    name.textContent = label;

    row.appendChild(twisty);
    row.appendChild(name);

    if (isRoot) {
        const rm = document.createElement("span");
        rm.className = "remove";
        rm.textContent = "✕";
        rm.title = "Remove this folder";
        rm.onclick = (e) => {
            e.stopPropagation();
            roots = roots.filter(r => r !== fullPath);
            saveRoots();
            render();
        };
        row.appendChild(rm);
    }

    const children = document.createElement("div");
    children.className = "children";

    let loaded = false;
    function openFolder() {
        children.classList.add("open");
        twisty.textContent = "▾";
        if (!loaded) { loaded = true; fillChildren(children, fullPath, depth + 1); }
    }
    function closeFolder() {
        children.classList.remove("open");
        twisty.textContent = "▸";
    }
    row.onclick = () => {
        if (children.classList.contains("open")) { closeFolder(); openSet.delete(fullPath); }
        else                                     { openFolder();  openSet.add(fullPath);   }
        saveOpen();
        if (node.parentNode) updateDivider(node.parentNode);   // line shows only when a subfolder is open
    };

    // restore: if this folder was open last session, expand it now (cascades to its subfolders)
    if (openSet.has(fullPath)) openFolder();

    node.appendChild(row);
    node.appendChild(children);
    return node;
}

// the divider shows only while at least one direct sub-folder is expanded
function updateDivider(container) {
    const div = container.querySelector(":scope > .divider");
    if (!div) return;
    let anyOpen = false;
    for (const node of container.children) {
        if (node.classList && node.classList.contains("folder-node")) {
            const ch = node.querySelector(":scope > .children");
            if (ch && ch.classList.contains("open")) { anyOpen = true; break; }
        }
    }
    div.style.display = anyOpen ? "block" : "none";
}

// fills a folder's children: subfolders (nested) + sound files
function fillChildren(container, dir, depth) {
    depth = depth || 0;
    const { folders, files, error } = readFolder(dir);

    if (error) {
        const e = document.createElement("div");
        e.className = "row";
        e.style.color = "#a55";
        e.textContent = "(can't open)";
        container.appendChild(e);
        return;
    }
    for (const f of folders) {
        container.appendChild(makeFolderNode(path.join(dir, f), f, false, depth));
    }
    // divider between the sub-folders and this folder's own loose sounds
    // (only added if both exist; only shown while a sub-folder is expanded)
    if (folders.length && files.length) {
        const div = document.createElement("div");
        div.className = "divider";
        div.style.display = "none";
        container.appendChild(div);
    }
    for (const f of files) {
        container.appendChild(makeFileRow(path.join(dir, f), f));
    }
    if (!folders.length && !files.length) {
        const e = document.createElement("div");
        e.className = "row";
        e.style.color = "#666";
        e.textContent = "(empty)";
        container.appendChild(e);
    }

    updateDivider(container);   // set initial visibility (handles restored-open folders)
}

// one sound file row
function makeFileRow(fullPath, label) {
    const row = document.createElement("div");
    row.className = "row";

    // favorite star in the left spacer; click toggles, never triggers preview
    const star = document.createElement("span");
    const faved = favs.has(fullPath);
    star.className = "fav" + (faved ? " on" : "");
    star.textContent = faved ? "★" : "☆";
    star.title = "Favorite";
    star.onclick = (e) => {
        e.stopPropagation();
        if (favs.has(fullPath)) {
            favs.delete(fullPath);
            star.classList.remove("on");
            star.textContent = "☆";
        } else {
            favs.add(fullPath);
            star.classList.add("on");
            star.textContent = "★";
        }
        saveFavs();
    };

    const name = document.createElement("span");
    name.className = "name file";
    name.textContent = label;

    // "+" appears on hover; click drops the sound on the timeline (never misfires like dbl-click)
    const add = document.createElement("span");
    add.className = "addRow";
    add.textContent = "＋";
    add.title = "Add to timeline at the playhead";
    add.onclick = (e) => { e.stopPropagation(); dropAtPlayhead(fullPath, label); };

    row.appendChild(star);
    row.appendChild(name);
    row.appendChild(add);

    row.onclick = () => preview(fullPath, label, row);

    // right-click: our own menu (also kills Premiere's default "view source" menu)
    row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
            { label: "Show in Explorer", action: () => revealInExplorer(fullPath) },
            { label: "Delete (Recycle Bin)", danger: true, action: () => recycle(fullPath, row) }
        ]);
    });

    return row;
}

/* ---------- preview + waveform ---------- */
function fileUrl(p) {
    // encodeURI misses # ? and % — a sound named "track#1.wav" would silently fail to load
    return encodeURI("file:///" + p.replace(/\\/g, "/"))
        .replace(/#/g, "%23").replace(/\?/g, "%3F");
}

let currentLabel = "";

function preview(fullPath, label, row) {
    if (playingRow) playingRow.classList.remove("playing");
    playingRow = row;
    row.classList.add("playing");
    currentLabel = label;

    // reveal the waveform area on first (and every) click
    document.getElementById("previewWrap").classList.add("shown");

    // start audio immediately (no waiting on the waveform)
    clearTimeout(sixTimer);          // cancel any pending "stop after 6s" from a tap
    audio.src = fileUrl(fullPath);
    audio.currentTime = 0;
    audio.play().catch(() => {});
    previewEl.textContent = "▶ " + label;

    // build the waveform from the file's raw numbers, then animate the playhead
    peaks = null;
    drawWave(0);
    buildWaveform(fullPath);
}

// in-place radix-2 FFT (splits a slice of sound into its frequencies)
const FFT_SIZE = 512;
const hann = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1));

function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr;
                     const ti = im[i]; im[i] = im[j]; im[j] = ti; }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let cr = 1, ci = 0;
            for (let k = 0; k < len >> 1; k++) {
                const a = i + k, b = a + (len >> 1);
                const vr = re[b] * cr - im[b] * ci;
                const vi = re[b] * ci + im[b] * cr;
                re[b] = re[a] - vr; im[b] = im[a] - vi;
                re[a] += vr;        im[a] += vi;
                const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
            }
        }
    }
}

// read the file, decode it, and per slice compute loudness (height) + average pitch (color)
function buildWaveform(fullPath) {
    let buf;
    try { buf = fs.readFileSync(fullPath); }
    catch (e) { return; }
    const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    audioCtx.decodeAudioData(arr).then((audioBuffer) => {
        const data = audioBuffer.getChannelData(0);
        const rate = audioBuffer.sampleRate;
        const cols = waveEl.width || 250;
        const step = Math.floor(data.length / cols) || 1;
        const out = new Array(cols);

        const re = new Float32Array(FFT_SIZE), im = new Float32Array(FFT_SIZE);

        for (let c = 0; c < cols; c++) {
            const start = c * step;

            // loudness for this slice (bar height)
            let peak = 0;
            for (let i = 0; i < step; i++) {
                const v = Math.abs(data[start + i] || 0);
                if (v > peak) peak = v;
            }

            // frequency content for this slice (bar color)
            for (let i = 0; i < FFT_SIZE; i++) {
                re[i] = (data[start + i] || 0) * hann[i];
                im[i] = 0;
            }
            fft(re, im);

            // spectral centroid = energy-weighted average frequency of this slice.
            // we map that single pitch onto the color gradient (see freqToColor).
            let magSum = 0, freqSum = 0;
            for (let bin = 1; bin < FFT_SIZE >> 1; bin++) {
                const freq = bin * rate / FFT_SIZE;
                const mag = Math.sqrt(re[bin] * re[bin] + im[bin] * im[bin]);
                magSum  += mag;
                freqSum += mag * freq;
            }
            out[c] = { peak: peak, freq: magSum ? freqSum / magSum : 0 };
        }
        peaks = out;
        drawWave(progress());
    }).catch(() => { /* unsupported format — just show the label */ });
}

function progress() {
    return audio.duration ? audio.currentTime / audio.duration : 0;
}

// how punchy the colors are. 1 = exactly the stops below, higher = more saturated
// (1.6 ≈ vivid, 2+ ≈ neon). turn this up/down to taste.
const SATURATION = 2.2;

// frequency -> color, along the gradient from the waveform editor:
// bass = deep red-violet at the bottom, rising through cream up to teal/blue for highs.
// each stop is [position 0..1, [r,g,b]]. tweak these to restyle the whole waveform.
const COLOR_STOPS = [
    [0.00, [133, 26,  64]],    // ~20 Hz   bass     vibrant red velvet
    [0.26, [204, 103, 101]],   //          low-mid  red velvet (where bass actually lands)
    [0.38, [218, 147, 145]],   //          mid      pale pink
    [0.58, [238, 231, 205]],   //          mid      cream
    [0.78, [112, 188, 165]],   //          high     teal-green
    [1.00, [106, 100, 141]]    // ~16 kHz  highs    slate blue-violet
];
function freqToColor(freq) {
    // pitch is perceived logarithmically, so spread the gradient on a log scale
    const lo = Math.log2(20), hi = Math.log2(16000);
    let t = (Math.log2(Math.max(20, freq)) - lo) / (hi - lo);
    t = Math.max(0, Math.min(1, t));
    // find the two stops t falls between and blend them
    for (let i = 1; i < COLOR_STOPS.length; i++) {
        if (t <= COLOR_STOPS[i][0]) {
            const a = COLOR_STOPS[i - 1], b = COLOR_STOPS[i];
            const f = (t - a[0]) / (b[0] - a[0]);
            const r = a[1][0] + (b[1][0] - a[1][0]) * f;
            const g = a[1][1] + (b[1][1] - a[1][1]) * f;
            const bl = a[1][2] + (b[1][2] - a[1][2]) * f;
            return saturate(r, g, bl);
        }
    }
    const last = COLOR_STOPS[COLOR_STOPS.length - 1][1];
    return saturate(last[0], last[1], last[2]);
}

// push a color away from its own gray (brightness) by SATURATION, then clamp to 0..255
function saturate(r, g, b) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;   // perceived brightness
    return [
        Math.max(0, Math.min(255, gray + (r - gray) * SATURATION)) | 0,
        Math.max(0, Math.min(255, gray + (g - gray) * SATURATION)) | 0,
        Math.max(0, Math.min(255, gray + (b - gray) * SATURATION)) | 0
    ];
}

// waveform shape: height grows with width. lower RATIO = taller strip.
const WAVE_RATIO = 5;
const WAVE_MIN = 70, WAVE_MAX = 260;

// draw the bars (taller = louder) plus the playhead line
function drawWave(p) {
    // height tracks width so the waveform scales as the panel grows (both axes)
    const w = waveEl.clientWidth;
    waveEl.style.height = Math.max(WAVE_MIN, Math.min(WAVE_MAX, w / WAVE_RATIO)) + "px";
    const h = waveEl.clientHeight;
    if (waveEl.width !== w)  waveEl.width = w;
    if (waveEl.height !== h) waveEl.height = h;

    waveCtx.clearRect(0, 0, w, h);
    const mid = h / 2;

    if (peaks) {
        const cols = peaks.length;
        const bw = w / cols;
        for (let c = 0; c < cols; c++) {
            const s = peaks[c];
            const col = freqToColor(s.freq);     // map this slice's pitch onto the gradient
            const played = (c / cols) <= p;
            const a = played ? 1 : 0.4;          // dim the part not played yet
            waveCtx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + a + ")";
            const bh = Math.max(1, s.peak * (h * 0.9));
            waveCtx.fillRect(c * bw, mid - bh / 2, Math.max(1, bw - 0.5), bh);
        }
    }

    // playhead
    const x = p * w;
    waveCtx.fillStyle = "#fff";
    waveCtx.fillRect(x, 0, 1.5, h);
}

// animate the playhead while the sound plays
function tick() {
    drawWave(progress());
    if (!audio.paused && !audio.ended) {
        rafId = requestAnimationFrame(tick);
    }
}
audio.addEventListener("play",  () => { cancelAnimationFrame(rafId); tick(); });
audio.addEventListener("ended", () => {
    drawWave(1);
    if (playingRow) playingRow.classList.remove("playing");
});
// if a file won't load/decode, say so instead of failing silently (#10)
audio.addEventListener("error", () => {
    if (audio.src) previewEl.textContent = "⚠ can't play this file";
});

// waveform: hold to replay for as long as you hold; a quick tap plays 6 seconds
let sixTimer = null;
let pressT0  = 0;
let holding  = false;
const TAP_MS = 200;      // press shorter than this counts as a "tap"
const TAP_PLAY = 6000;   // a tap plays this many ms

function replayFromStart() {
    if (!audio.src) return;
    clearTimeout(sixTimer);
    audio.currentTime = 0;
    audio.play().catch(() => {});
}
waveEl.addEventListener("mousedown", () => {
    holding = true;
    pressT0 = performance.now();
    replayFromStart();
});
document.addEventListener("mouseup", () => {
    if (!holding) return;
    holding = false;
    const held = performance.now() - pressT0;
    if (held < TAP_MS) {
        // tap -> let it run 6 seconds total, then stop
        clearTimeout(sixTimer);
        sixTimer = setTimeout(() => audio.pause(), TAP_PLAY - held);
    } else {
        audio.pause();   // released after a hold -> stop now
    }
});

// keep the waveform sharp when the panel is resized (#1)
window.addEventListener("resize", () => drawWave(progress()));

/* ---------- drop sound onto the timeline ---------- */
// run a script inside Premiere itself; returns a promise with the host's reply
function evalES(script) {
    return new Promise((resolve) => {
        if (window.__adobe_cep__ && window.__adobe_cep__.evalScript) {
            window.__adobe_cep__.evalScript(script, resolve);
        } else {
            resolve("ERR:not running in Premiere");
        }
    });
}

// brief status message in the name area, then restore the playing label
let restoreTimer = null;
function flash(msg) {
    previewEl.textContent = msg;
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
        if (currentLabel) previewEl.textContent = "▶ " + currentLabel;
    }, 2200);
}

// call flbDrop() in host.jsx, which imports + drops the sound at the playhead
function dropAtPlayhead(fullPath, label) {
    flash("… adding " + label);
    evalES("flbDrop(" + JSON.stringify(fullPath) + ")").then((res) => {
        if (res === "OK")                            flash("✓ added " + label);
        else if (res && res.indexOf("ERR:") === 0)   flash("⚠ " + res.slice(4));
        else                                         flash("⚠ " + (res || "failed"));
    });
}

/* ---------- right-click menu (Show in Explorer / Delete) ---------- */
// kill Premiere's built-in right-click menu everywhere (no more "view source" text file)
document.addEventListener("contextmenu", (e) => e.preventDefault());

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
document.addEventListener("click", closeMenu);
document.addEventListener("scroll", closeMenu, true);

function showMenu(x, y, items) {
    closeMenu();
    menuEl = document.createElement("div");
    menuEl.className = "ctxMenu";
    for (const it of items) {
        const mi = document.createElement("div");
        mi.className = "ctxItem" + (it.danger ? " danger" : "");
        mi.textContent = it.label;
        mi.onclick = (ev) => { ev.stopPropagation(); closeMenu(); it.action(); };
        menuEl.appendChild(mi);
    }
    document.body.appendChild(menuEl);
    // keep it on-screen
    menuEl.style.left = Math.min(x, window.innerWidth  - menuEl.offsetWidth  - 4) + "px";
    menuEl.style.top  = Math.min(y, window.innerHeight - menuEl.offsetHeight - 4) + "px";
}

// open Windows Explorer with the file highlighted
function revealInExplorer(p) {
    try { require("child_process").exec('explorer /select,"' + p + '"'); } catch (e) {}
}

// send the file to the Recycle Bin (recoverable), after a confirm
function recycle(p, row) {
    if (!confirm("Move this file to the Recycle Bin?\n\n" + p)) return;
    const ps = "Add-Type -AssemblyName Microsoft.VisualBasic;" +
        "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('" +
        p.replace(/'/g, "''") + "','OnlyErrorDialogs','SendToRecycleBin')";
    try {
        require("child_process").execFile(
            "powershell",
            ["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps],
            (err) => {
                if (err) flash("⚠ couldn't delete");
                else if (row) row.remove();      // drop it from the list on success
            }
        );
    } catch (e) { flash("⚠ couldn't delete"); }
}

/* ---------- render whole tree ---------- */
function render() {
    treeEl.innerHTML = "";
    if (!roots.length) {
        const e = document.createElement("div");
        e.className = "empty";
        e.innerHTML = "No folders yet.<br>Click <b>+</b> to start.<br>Hover a sound and hit ＋ to drop it on the timeline.";
        treeEl.appendChild(e);
        return;
    }
    for (const r of roots) {
        treeEl.appendChild(makeFolderNode(r, path.basename(r) || r, true));
    }

    // hint sits at the end of the list, scrolls with it, seen at the bottom
    const hint = document.createElement("div");
    hint.id = "footer";
    hint.innerHTML = "Hover a sound and hit ＋ to drop it on the timeline" +
                     "<div class='tagline'>#takeyours</div>";
    treeEl.appendChild(hint);

    // jump back to where the tree was scrolled last session
    treeEl.scrollTop = +localStorage.getItem("flbrowser.scroll") || 0;
}

// remember the scroll spot (#8)
treeEl.addEventListener("scroll", () => {
    localStorage.setItem("flbrowser.scroll", treeEl.scrollTop);
});

/* ---------- add folder (native picker) ---------- */
document.getElementById("addBtn").onclick = () => {
    const res = window.cep.fs.showOpenDialogEx(false, true, "Select a sounds folder", "");
    const picked = res && res.data && res.data[0];
    if (!picked) return;
    if (!roots.includes(picked)) {
        roots.push(picked);
        saveRoots();
        render();
    }
};

/* ---------- about / socials popover ---------- */
const aboutEl = document.getElementById("about");
document.getElementById("infoBtn").onclick = () => aboutEl.classList.toggle("shown");
for (const a of document.querySelectorAll("#about .aLink")) {
    a.onclick = () => {
        const url = a.getAttribute("data-url");
        // CEP needs this to open links in the real browser, not inside the panel
        if (window.cep && window.cep.util) window.cep.util.openURLInDefaultBrowser(url);
    };
}

/* ---------- match Premiere's UI brightness ---------- */
function applyTheme() {
    try {
        const env = JSON.parse(window.__adobe_cep__.getHostEnvironment());
        const c = env.appSkinInfo.panelBackgroundColor.color;   // 0–255 each
        const bg = "rgb(" + (c.red|0) + "," + (c.green|0) + "," + (c.blue|0) + ")";
        document.body.style.background = bg;
        document.body.style.setProperty("--bg", bg);            // sticky header + footer match this
        const lum = (0.299 * c.red + 0.587 * c.green + 0.114 * c.blue) / 255;
        document.body.classList.toggle("light", lum > 0.5);     // bright theme -> dark text
    } catch (e) {}
}
applyTheme();
if (window.__adobe_cep__) {
    window.__adobe_cep__.addEventListener("com.adobe.csxs.events.ThemeColorChanged", applyTheme);
}

/* #takeyours — @oathsdomain on all plats */

render();
