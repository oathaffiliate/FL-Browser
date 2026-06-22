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
    row.onclick = () => {
        const open = children.classList.toggle("open");
        twisty.textContent = open ? "▾" : "▸";
        if (open && !loaded) {
            loaded = true;
            fillChildren(children, fullPath, depth + 1);
        }
    };

    node.appendChild(row);
    node.appendChild(children);
    return node;
}

// scroll the tree so a row reaches the top, over `duration` ms (controls speed)
function scrollRowToTop(row, duration) {
    const start  = treeEl.scrollTop;
    const target = start + (row.getBoundingClientRect().top - treeEl.getBoundingClientRect().top);
    const dist   = target - start;
    const t0     = performance.now();

    function step(now) {
        let t = Math.min(1, (now - t0) / duration);
        // easeInOutQuad — smooth start and finish
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        treeEl.scrollTop = start + dist * t;
        if ((now - t0) < duration) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
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

    // "return to top" at the very end of this folder's sound list.
    // only seen once you've scrolled through this folder; jumps back to its header.
    if (files.length) {
        const toTop = document.createElement("div");
        toTop.className = "toTop";
        toTop.textContent = "↑ return to top";
        toTop.onclick = (e) => {
            e.stopPropagation();
            const folderRow = container.previousElementSibling;  // this folder's header row
            if (folderRow) scrollRowToTop(folderRow, 450);       // 450ms — lower = faster
        };
        container.appendChild(toTop);
    }
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

    row.appendChild(star);
    row.appendChild(name);

    row.onclick = () => preview(fullPath, label, row);

    // double-click drops the sound onto the timeline at the playhead
    row.addEventListener("dblclick", () => dropAtPlayhead(fullPath, label));

    return row;
}

/* ---------- preview + waveform ---------- */
function fileUrl(p) {
    return encodeURI("file:///" + p.replace(/\\/g, "/"));
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

// read the file, decode it, and per slice compute loudness (height) + bass/mid/high color
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

            let low = 0, mid = 0, high = 0;
            for (let bin = 1; bin < FFT_SIZE >> 1; bin++) {
                const freq = bin * rate / FFT_SIZE;
                const mag = Math.sqrt(re[bin] * re[bin] + im[bin] * im[bin]);
                if (freq < 250)        low  += mag;   // bass  -> red
                else if (freq < 2500)  mid  += mag;   // mids  -> green
                else                   high += mag;   // highs -> blue
            }
            const total = low + mid + high || 1;
            out[c] = {
                peak: peak,
                r: low  / total,
                g: mid  / total,
                b: high / total
            };
        }
        peaks = out;
        drawWave(progress());
    }).catch(() => { /* unsupported format — just show the label */ });
}

function progress() {
    return audio.duration ? audio.currentTime / audio.duration : 0;
}

// draw the bars (taller = louder) plus the playhead line
function drawWave(p) {
    // keep the canvas pixel-size matched to its on-screen size
    const w = waveEl.clientWidth, h = waveEl.clientHeight;
    if (waveEl.width !== w)  waveEl.width = w;
    if (waveEl.height !== h) waveEl.height = h;

    waveCtx.clearRect(0, 0, w, h);
    const mid = h / 2;

    if (peaks) {
        const cols = peaks.length;
        const bw = w / cols;
        for (let c = 0; c < cols; c++) {
            const s = peaks[c];
            // boost the colors so they read clearly; lift floor so quiet bins aren't black
            let r = 40 + s.r * 320;
            let g = 40 + s.g * 320;
            let b = 40 + s.b * 320;
            r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
            const played = (c / cols) <= p;
            const a = played ? 1 : 0.4;          // dim the part not played yet
            waveCtx.fillStyle = "rgba(" + (r|0) + "," + (g|0) + "," + (b|0) + "," + a + ")";
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

// click the waveform to jump the playhead there
waveEl.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = waveEl.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    drawWave(progress());
});

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

/* ---------- render whole tree ---------- */
function render() {
    treeEl.innerHTML = "";
    if (!roots.length) {
        const e = document.createElement("div");
        e.className = "empty";
        e.innerHTML = "No folders yet.<br>Click <b>+</b> to start.<br>Double click to put into timeline.";
        treeEl.appendChild(e);
        return;
    }
    for (const r of roots) {
        treeEl.appendChild(makeFolderNode(r, path.basename(r) || r, true));
    }

    // hint sits at the end of the list, scrolls with it, seen at the bottom
    const hint = document.createElement("div");
    hint.id = "footer";
    hint.innerHTML = "Double-click a sound to put it on the timeline" +
                     "<div class='tagline'>#takeyours</div>";
    treeEl.appendChild(hint);
}

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
        document.body.style.background = "rgb(" + (c.red|0) + "," + (c.green|0) + "," + (c.blue|0) + ")";
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
