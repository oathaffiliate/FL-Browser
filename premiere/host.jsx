/*
 * host.jsx — runs INSIDE Premiere (ExtendScript), not in the panel.
 * The panel calls flbDrop(path) to import a sound and drop it at the playhead.
 * Returns "OK" or "ERR:<reason>".
 */

function flbDrop(rawPath) {
    function norm(s) { return String(s).replace(/\\/g, "/").toLowerCase(); }
    var target = norm(rawPath);

    // find an already-imported project item that matches this file
    function find(root) {
        for (var i = 0; i < root.children.numItems; i++) {
            var c = root.children[i];
            if (c.type == 2) {                       // a bin -> search inside it
                var f = find(c);
                if (f) return f;
            } else {
                try { if (norm(c.getMediaPath()) === target) return c; } catch (e) {}
            }
        }
        return null;
    }

    // first audio track that has nothing under the playhead, else null
    function freeTrack(seq, t) {
        for (var j = 0; j < seq.audioTracks.numTracks; j++) {
            var tr = seq.audioTracks[j], busy = false;
            for (var k = 0; k < tr.clips.numItems; k++) {
                var cl = tr.clips[k];
                if (cl.start.seconds <= t + 0.0005 && cl.end.seconds > t + 0.0005) { busy = true; break; }
            }
            if (!busy) return tr;
        }
        return null;
    }

    try {
        var proj = app.project;
        if (!proj) return "ERR:no project";
        var seq = proj.activeSequence;
        if (!seq) return "ERR:open a sequence first";

        // import the file if it isn't in the project yet
        var item = find(proj.rootItem);
        if (!item) {
            proj.importFiles([rawPath], true, proj.rootItem, false);
            item = find(proj.rootItem);
        }
        if (!item) return "ERR:import failed";

        var t = seq.getPlayerPosition();
        var track = freeTrack(seq, t.seconds);

        // every existing audio track is busy here -> try to add a fresh one below
        if (!track) {
            try {
                app.enableQE();
                var qs = qe.project.getActiveSequence();
                try { qs.addTracks(0, 0, 1, seq.audioTracks.numTracks); }
                catch (e1) { qs.addTracks(0, 0, 1, 1); }
            } catch (e2) {}
            track = freeTrack(seq, t.seconds);
        }
        if (!track) return "ERR:all audio tracks busy here";

        track.overwriteClip(item, t.seconds);
        return "OK";
    } catch (e) {
        return "ERR:" + e.toString();
    }
}
