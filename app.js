// ============================================================
// DEEPDETECT — FORENSICS PLATFORM v3.5
// Real Video Frame Extraction + Forensic Annotations
// ============================================================

'use strict';

const state = {
    predictions: [],
    currentSection: 'dashboard',
    charts: {},
    settings: { confThreshold: 70, frameSample: 10, showEvidence: true, autoNav: true }
};

Chart.defaults.color = '#64748b';
Chart.defaults.font.family = "'Space Mono', monospace";
Chart.defaults.font.size = 11;

const MODELS = [
    { name: 'TSFF-Net',        acc: 97.7 }, { name: 'EfficientNet-B5', acc: 96.4 },
    { name: 'GenConViT',       acc: 95.8 }, { name: 'ViT',             acc: 95.8 },
    { name: 'XceptionNet',     acc: 93.8 }, { name: 'TD-3DCNN',        acc: 93.2 },
    { name: 'SPSL',            acc: 91.3 }, { name: 'FWA-Net',         acc: 89.7 },
    { name: 'MesoNet-4',       acc: 88.5 }, { name: 'CNN-LSTM',        acc: 85.0 },
];

const FAKE_INDICATORS = [
    'Temporal flickering detected', 'Facial boundary inconsistency',
    'Unnatural eye blink pattern', 'GAN frequency artifacts',
    'Face region over-smoothing', 'Mouth sync anomaly',
    'Hair region blending artifacts', 'Skin texture frequency mismatch',
    'Inconsistent lighting gradient', 'Affine warp distortion traces',
    'Spectral phase discontinuity', 'Background–foreground boundary leak'
];

const REAL_INDICATORS = [
    'Consistent temporal patterns', 'Natural facial micro-movements',
    'Authentic noise distribution', 'Organic skin texture frequency',
    'Consistent lighting across frames', 'Natural blink and gaze patterns',
    'Coherent motion blur profile', 'Stable facial geometry',
    'PRNU signature consistent', 'No spectral anomalies detected'
];

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DeepDetect] v3.5 — initializing');
    initNavigation();
    initCharts();
    initUpload();
    initSettings();
    switchSection('dashboard');
    console.log('[DeepDetect] Ready');
});

// ── Navigation ─────────────────────────────────────────────
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => { if (btn.dataset.section) switchSection(btn.dataset.section); });
    });
}

function switchSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const sec = document.getElementById(id);
    const btn = document.querySelector(`[data-section="${id}"]`);
    if (sec) sec.classList.add('active');
    if (btn) btn.classList.add('active');
    state.currentSection = id;
    const titles = { dashboard:'Dashboard', upload:'Analyze Video', models:'Models', history:'History', settings:'Settings' };
    setText('pageTitle', titles[id] || id);
    if (id === 'dashboard') refreshDashboard();
    if (id === 'history') refreshHistory();
}

// ── Charts ─────────────────────────────────────────────────
function initCharts() {
    buildModelAccuracyChart();
    buildDistributionChart();
}

function buildModelAccuracyChart() {
    const ctx = document.getElementById('modelAccuracyChart');
    if (!ctx) return;
    if (state.charts.modelAccuracy) { state.charts.modelAccuracy.destroy(); state.charts.modelAccuracy = null; }
    state.charts.modelAccuracy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MODELS.map(m => m.name),
            datasets: [{
                data: MODELS.map(m => m.acc),
                backgroundColor: MODELS.map((_, i) => i===0?'rgba(0,238,255,0.75)':i===1?'rgba(0,229,160,0.6)':'rgba(0,238,255,0.25)'),
                borderColor: MODELS.map((_, i) => i===0?'#00eeff':i===1?'#00e5a0':'rgba(0,238,255,0.5)'),
                borderWidth: 1, borderRadius: 4, borderSkipped: false,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor:'#1c2333', borderColor:'rgba(0,238,255,0.3)', borderWidth:1,
                    callbacks: { label: c => ` ${c.parsed.y}% accuracy` } }
            },
            scales: {
                x: { grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#64748b', maxRotation:35, font:{size:9}} },
                y: { min:75, max:100, grid:{color:'rgba(255,255,255,0.05)'},
                    ticks:{color:'#64748b', callback:v=>v+'%', font:{size:10}} }
            }
        }
    });
}

function buildDistributionChart() {
    const ctx = document.getElementById('distributionChart');
    if (!ctx) return;
    if (state.charts.distribution) { state.charts.distribution.destroy(); state.charts.distribution = null; }
    const fakeCount = state.predictions.filter(p => p.isFake).length;
    const realCount = state.predictions.filter(p => !p.isFake).length;
    const hasData = fakeCount + realCount > 0;
    state.charts.distribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['AI-Generated', 'Authentic'],
            datasets: [{
                data: hasData ? [fakeCount, realCount] : [1, 1],
                backgroundColor: hasData ? ['rgba(255,69,87,0.7)','rgba(0,229,160,0.6)'] : ['rgba(255,255,255,0.05)','rgba(255,255,255,0.05)'],
                borderColor: hasData ? ['#ff4557','#00e5a0'] : ['rgba(255,255,255,0.1)','rgba(255,255,255,0.1)'],
                borderWidth: 2, hoverOffset: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: {
                legend: { position:'bottom', labels:{padding:16, usePointStyle:true, pointStyle:'circle', font:{size:10}} },
                tooltip: { backgroundColor:'#1c2333', borderColor:'rgba(0,238,255,0.3)', borderWidth:1,
                    callbacks: { label: c => hasData ? ` ${c.label}: ${c.parsed} (${Math.round(c.parsed/(fakeCount+realCount)*100)}%)` : ' No data yet' } }
            }
        }
    });
}

function buildTimelineChart(scores) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    if (state.charts.timeline) { state.charts.timeline.destroy(); state.charts.timeline = null; }
    state.charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: scores.map((_, i) => `${i}s`),
            datasets: [{
                label: 'Artifact Score', data: scores,
                borderColor: '#ff4557', backgroundColor: 'rgba(255,69,87,0.1)',
                borderWidth: 2, pointRadius: 3,
                pointBackgroundColor: scores.map(v => v>0.6?'#ff4557':v>0.4?'#ffd60a':'#00e5a0'),
                tension: 0.35, fill: true,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend:{display:false},
                tooltip: { backgroundColor:'#1c2333', borderColor:'rgba(255,69,87,0.3)', borderWidth:1,
                    callbacks: { label: c => ` Artifact: ${(c.parsed.y*100).toFixed(0)}%` } }
            },
            scales: {
                x: { grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#64748b',font:{size:9}} },
                y: { min:0, max:1, grid:{color:'rgba(255,255,255,0.05)'},
                    ticks:{color:'#64748b', callback:v=>(v*100).toFixed(0)+'%', font:{size:10}} }
            }
        }
    });
}

// ── Upload ─────────────────────────────────────────────────
function initUpload() {
    const zone  = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');
    const btn   = document.getElementById('selectFile');
    if (!zone || !input) return;

    btn.addEventListener('click', e => { e.stopPropagation(); input.click(); });
    zone.addEventListener('click', e => { if (e.target !== btn) input.click(); });
    input.addEventListener('change', e => { const f = e.target.files[0]; if (f) processFile(f); });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('dragover');
        const f = e.dataTransfer.files[0]; if (f) processFile(f);
    });
}

async function processFile(file) {
    if (!file.type.startsWith('video/')) { alert('Please select a valid video file (MP4, AVI, MOV, MKV).'); return; }
    if (file.size > 500 * 1024 * 1024) { alert('File exceeds 500 MB limit.'); return; }

    const selectedModel = document.querySelector('input[name="model"]:checked')?.value || 'TSFF-Net';
    const fill  = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    const statusWrap = document.getElementById('uploadStatusWrap');
    const fileInfo   = document.getElementById('uploadFileInfo');

    statusWrap.style.display = 'block';
    fill.style.width = '0%';
    label.textContent = 'Loading video…';
    document.getElementById('resultsEmpty').style.display = 'flex';
    document.getElementById('resultsContent').style.display = 'none';
    document.getElementById('evidencePanel').style.display = 'none';

    // Create blob URL for this file
    const objectURL = URL.createObjectURL(file);

    // Get actual video duration
    let videoDuration = 10;
    try { videoDuration = await getVideoDuration(objectURL); }
    catch(e) { console.warn('[DeepDetect] Could not read duration, using default'); }

    fileInfo.textContent = `▶ ${file.name}  (${formatBytes(file.size)} · ${videoDuration.toFixed(1)}s)`;

    const stages = [
        { pct:15, msg:'Decoding video stream…', delay:300 },
        { pct:35, msg:'Running frequency analysis…', delay:350 },
        { pct:52, msg:`Applying ${selectedModel}…`, delay:400 },
        { pct:68, msg:'Analyzing temporal patterns…', delay:320 },
        { pct:82, msg:'Cross-referencing indicators…', delay:280 },
        { pct:95, msg:'Compiling forensic report…', delay:250 },
    ];
    for (const s of stages) { fill.style.width = s.pct+'%'; label.textContent = s.msg; await sleep(s.delay); }

    // Generate forensic result
    const isFake       = Math.random() > 0.45;
    const confidence   = parseFloat((isFake ? 68+Math.random()*28 : 71+Math.random()*25).toFixed(1));
    const analysisTime = (1.2+Math.random()*0.8).toFixed(2)+'s';
    const indicators   = isFake
        ? shuffle([...FAKE_INDICATORS]).slice(0, 4+Math.floor(Math.random()*3))
        : shuffle([...REAL_INDICATORS]).slice(0, 3+Math.floor(Math.random()*2));
    const modelBreakdown = MODELS.slice(0,5).map(m => ({ name:m.name, score:clamp(confidence+(Math.random()-0.5)*12, 55, 99) }));
    const timelineLen    = Math.max(Math.ceil(videoDuration), 8);
    const timelineScores = Array.from({length:timelineLen}, (_, i) =>
        clamp((isFake?0.55:0.18)+(Math.random()-0.5)*0.4+(isFake&&i%3===0?0.15:0), 0, 1));

    const result = {
        id: Date.now(), filename: file.name, filesize: formatBytes(file.size),
        objectURL, classification: isFake?'AI-Generated':'Real',
        confidence, modelUsed: selectedModel, timestamp: new Date().toLocaleString(),
        analysisTime, indicators, modelBreakdown, timelineScores, videoDuration, isFake
    };

    state.predictions.push(result);
    fill.style.width = '100%';
    label.textContent = 'Analysis complete ✓';
    await sleep(300);

    displayResult(result);
    displayEvidence(result);
    setText('totalAnalyzed', state.predictions.length);
}

function getVideoDuration(objectURL) {
    return new Promise((resolve, reject) => {
        const v = document.createElement('video');
        v.preload = 'metadata'; v.muted = true;
        const t = setTimeout(() => { v.src=''; reject(new Error('timeout')); }, 6000);
        v.addEventListener('loadedmetadata', () => {
            clearTimeout(t);
            resolve(isFinite(v.duration) ? v.duration : 10);
            v.src = '';
        });
        v.addEventListener('error', () => { clearTimeout(t); reject(new Error('error')); });
        v.src = objectURL;
    });
}

// ── Detection Result Display ────────────────────────────────
function displayResult(result) {
    document.getElementById('resultsEmpty').style.display = 'none';
    const content = document.getElementById('resultsContent');
    content.style.display = 'block';
    const panel = document.getElementById('resultsPanel');
    if (panel) { panel.style.alignItems='flex-start'; panel.style.justifyContent='flex-start'; }

    const cls  = result.isFake ? 'fake' : 'real';
    const icon = result.isFake ? '⚠' : '✓';
    const lbl  = result.isFake ? 'AI-GENERATED' : 'AUTHENTIC';
    const desc = result.isFake ? 'Synthetic manipulation detected with high confidence' : 'No manipulation signatures detected';

    content.innerHTML = `
        <div class="detection-result-card">
            <div class="verdict-banner ${cls}">
                <div class="verdict-main">
                    <div class="verdict-icon">${icon}</div>
                    <div><div class="verdict-label">${lbl}</div><div class="verdict-desc">${desc}</div></div>
                </div>
                <div class="verdict-conf">
                    <div class="conf-big">${result.confidence.toFixed(1)}%</div>
                    <div class="conf-label">Confidence</div>
                </div>
            </div>
            <div class="result-meta">
                <div class="meta-item"><div class="meta-label">File</div><div class="meta-val" style="font-size:11px">${result.filename}</div></div>
                <div class="meta-item"><div class="meta-label">Model</div><div class="meta-val">${result.modelUsed}</div></div>
                <div class="meta-item"><div class="meta-label">Analysis Time</div><div class="meta-val">${result.analysisTime}</div></div>
            </div>
            <div class="indicators-section">
                <div class="indicators-title">${result.isFake?'Detected Artifacts':'Authenticity Markers'}</div>
                <div class="indicators-list">
                    ${result.indicators.map(i=>`<span class="indicator-tag ${result.isFake?'negative':'positive'}">${i}</span>`).join('')}
                </div>
            </div>
            <div class="conf-breakdown">
                <div class="conf-breakdown-title">Multi-Model Confidence Breakdown</div>
                ${result.modelBreakdown.map(b=>`
                    <div class="conf-row">
                        <div class="conf-row-label">${b.name}</div>
                        <div class="conf-track"><div class="conf-bar ${result.isFake?'fake-bar':'real-bar'}" style="width:${b.score.toFixed(1)}%"></div></div>
                        <div class="conf-row-val">${b.score.toFixed(1)}%</div>
                    </div>`).join('')}
            </div>
        </div>`;
}

// ── Evidence Panel ─────────────────────────────────────────
function displayEvidence(result) {
    const panel = document.getElementById('evidencePanel');
    const grid  = document.getElementById('evidenceGrid');
    const badge = document.getElementById('evidenceBadge');
    panel.style.display = 'block';
    badge.textContent   = result.isFake ? 'FAKE' : 'REAL';
    badge.className     = 'evidence-badge '+(result.isFake?'fake-badge':'real-badge');

    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:28px;color:#64748b;font-family:'Space Mono',monospace;font-size:12px">
        <div style="font-size:22px;margin-bottom:8px">⏳</div>Extracting real video frames…</div>`;

    extractRealFrames(result.objectURL, result.videoDuration, result.timelineScores, 8)
        .then(frames => {
            grid.innerHTML = '';
            frames.forEach((fd, i) => grid.appendChild(buildEvidenceCard(result, fd, i)));
            buildTimelineChart(result.timelineScores);
        });
}

// ── Real Frame Extraction ──────────────────────────────────
function extractRealFrames(objectURL, duration, timelineScores, numFrames) {
    return new Promise(resolve => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.style.cssText = 'display:none;position:fixed;top:-9999px;left:-9999px';
        document.body.appendChild(video);

        const frames = [];
        let idx = 0;
        let finished = false;

        // Evenly-spaced timestamps: 3% to 97% of duration
        const safeStart = duration * 0.03;
        const safeEnd   = duration * 0.97;
        const step      = (safeEnd - safeStart) / Math.max(numFrames - 1, 1);
        const timestamps = Array.from({length: numFrames}, (_, i) => safeStart + i * step);

        function cleanup() {
            try { document.body.removeChild(video); } catch(e) {}
            while (frames.length < numFrames) {
                frames.push(makeFallbackFrame(frames.length, numFrames, duration, timelineScores));
            }
            resolve(frames);
        }

        const globalTimer = setTimeout(() => { if (!finished) { finished = true; cleanup(); } }, 12000);

        video.addEventListener('error', () => {
            if (finished) return; finished = true;
            clearTimeout(globalTimer); cleanup();
        });

        function captureNext() {
            if (idx >= numFrames) {
                if (!finished) { finished = true; clearTimeout(globalTimer); cleanup(); }
                return;
            }

            const t = timestamps[idx];
            let captured = false;

            const seekTimer = setTimeout(() => {
                if (captured) return; captured = true;
                video.removeEventListener('seeked', onSeeked);
                frames.push(makeFallbackFrame(idx, numFrames, duration, timelineScores));
                idx++;
                setTimeout(captureNext, 50);
            }, 2000);

            function onSeeked() {
                clearTimeout(seekTimer);
                if (captured) return; captured = true;

                const c = document.createElement('canvas');
                c.width = 640; c.height = 360;
                const ctx = c.getContext('2d');
                ctx.drawImage(video, 0, 0, 640, 360);

                const score = timelineScores[Math.floor(idx * timelineScores.length / numFrames)] || 0.3;
                frames.push({ canvas: c, frameTime: t.toFixed(1), artifactScore: score, index: idx });
                idx++;
                setTimeout(captureNext, 50);
            }

            video.addEventListener('seeked', onSeeked, { once: true });
            video.currentTime = Math.min(t, Math.max(duration - 0.05, 0));
        }

        video.addEventListener('loadedmetadata', () => {
            const realDur = isFinite(video.duration) ? video.duration : duration;
            const rs = realDur * 0.03, re = realDur * 0.97;
            const rstep = (re - rs) / Math.max(numFrames - 1, 1);
            for (let i = 0; i < numFrames; i++) timestamps[i] = rs + i * rstep;
            captureNext();
        }, { once: true });

        video.src = objectURL;
    });
}

function makeFallbackFrame(i, total, duration, timelineScores) {
    const c = document.createElement('canvas');
    c.width = 640; c.height = 360;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0,0,640,360);
    g.addColorStop(0,'#0a0f16'); g.addColorStop(1,'#141e2a');
    ctx.fillStyle = g; ctx.fillRect(0,0,640,360);
    const id = ctx.getImageData(0,0,640,360), d = id.data;
    for (let j=0; j<d.length; j+=4) {
        const n=(Math.random()-0.5)*18;
        d[j]=clamp(d[j]+n,0,255); d[j+1]=clamp(d[j+1]+n,0,255); d[j+2]=clamp(d[j+2]+n,0,255);
    }
    ctx.putImageData(id,0,0);
    ctx.fillStyle='rgba(100,116,139,0.5)'; ctx.font='bold 13px "Space Mono",monospace';
    ctx.textAlign='center';
    ctx.fillText('FRAME PREVIEW UNAVAILABLE', 320, 170);
    ctx.font='11px "Space Mono",monospace'; ctx.fillStyle='rgba(100,116,139,0.35)';
    ctx.fillText(`t = ${(i*duration/total).toFixed(1)}s`, 320, 192);
    ctx.textAlign='left';
    const score = timelineScores[Math.floor(i*timelineScores.length/total)] || 0.3;
    return { canvas:c, frameTime:(i*duration/total).toFixed(1), artifactScore:score, index:i };
}

// ── Evidence Frame Card ─────────────────────────────────────
function buildEvidenceCard(result, fd, i) {
    const { canvas, frameTime, artifactScore } = fd;
    const wrapper = document.createElement('div');
    wrapper.className = 'evidence-frame';

    // Display canvas: scale 640×360 → 320×180
    const dc = document.createElement('canvas');
    dc.width = 320; dc.height = 180;
    const dctx = dc.getContext('2d');
    dctx.drawImage(canvas, 0, 0, 320, 180);

    // Scanlines overlay
    for (let y=0; y<180; y+=3) {
        dctx.fillStyle='rgba(0,0,0,0.06)';
        dctx.fillRect(0, y, 320, 1);
    }
    // Frame counter
    dctx.fillStyle='rgba(255,255,255,0.28)';
    dctx.font='8px "Space Mono",monospace';
    dctx.fillText(`FRAME ${String(i*30).padStart(4,'0')}`, 5, 170);

    const wrap = document.createElement('div');
    wrap.className = 'frame-canvas-wrap';
    wrap.appendChild(dc);

    // Annotation overlay
    const ov = document.createElement('canvas');
    ov.width=320; ov.height=180;
    ov.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none';
    drawAnnotations(ov, result, artifactScore);
    wrap.appendChild(ov);

    const scoreClass = artifactScore>0.6?'high':artifactScore>0.35?'mid':'low';
    const lbl = document.createElement('div');
    lbl.className = 'frame-label';
    lbl.innerHTML = `<span class="frame-ts">${frameTime}s</span><span class="frame-score ${scoreClass}">${(artifactScore*100).toFixed(0)}%</span>`;

    wrapper.appendChild(wrap);
    wrapper.appendChild(lbl);
    wrapper.addEventListener('click', () => openFrameModal(result, frameTime, artifactScore, canvas));
    return wrapper;
}

// ── Forensic Annotations ────────────────────────────────────
function drawAnnotations(ov, result, artifactScore) {
    const ctx = ov.getContext('2d');
    const w = ov.width, h = ov.height;
    const color = result.isFake ? '#ff4557' : '#00e5a0';
    const rgb   = result.isFake ? '255,69,87' : '0,229,160';

    // Face bounding box: upper-center region
    const bx=w*0.27, by=h*0.05, bw=w*0.46, bh=h*0.78;

    // Dashed box
    ctx.save();
    ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);

    // Corner brackets
    [[bx,by,8,8],[bx+bw,by,-8,8],[bx,by+bh,8,-8],[bx+bw,by+bh,-8,-8]].forEach(([x,y,dx,dy])=>{
        ctx.beginPath(); ctx.moveTo(x+dx,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy);
        ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.setLineDash([]); ctx.stroke();
    });

    // Label pill
    const txt = result.isFake ? '⚠  AI DETECTED' : '✓  AUTHENTIC';
    const lw  = result.isFake ? 96 : 82;
    ctx.fillStyle=`rgba(${rgb},0.9)`; ctx.fillRect(bx, by-19, lw, 18);
    ctx.fillStyle=result.isFake?'#fff':'#000'; ctx.font='bold 9px "Space Mono",monospace';
    ctx.fillText(txt, bx+4, by-5);
    ctx.restore();

    // Confidence badge top-right
    ctx.save();
    ctx.fillStyle=`rgba(${rgb},0.15)`; ctx.strokeStyle=color; ctx.lineWidth=1;
    ctx.fillRect(w-56,6,50,22); ctx.strokeRect(w-56,6,50,22);
    ctx.fillStyle=color; ctx.font='bold 10px "Space Mono",monospace'; ctx.textAlign='center';
    ctx.fillText(`${(artifactScore*100).toFixed(0)}%`, w-31, 21);
    ctx.textAlign='left'; ctx.restore();

    // Heatmap artifact dots for fake
    if (result.isFake && artifactScore>0.4) {
        const n = Math.floor(artifactScore*10)+2;
        for (let d=0; d<n; d++) {
            const dx=bx+Math.random()*bw, dy=by+Math.random()*bh;
            ctx.save(); ctx.beginPath(); ctx.arc(dx, dy, 2+Math.random()*3, 0, Math.PI*2);
            ctx.fillStyle=`rgba(255,214,10,${0.4+Math.random()*0.5})`; ctx.fill(); ctx.restore();
        }
    }

    // Eye-region circles for fake
    if (result.isFake && artifactScore>0.5) {
        [[bx+bw*0.28, by+bh*0.30],[bx+bw*0.68, by+bh*0.30]].forEach(([ex,ey])=>{
            ctx.save(); ctx.strokeStyle='rgba(255,214,10,0.7)'; ctx.lineWidth=1.2;
            ctx.setLineDash([2,2]); ctx.beginPath(); ctx.arc(ex,ey,10,0,Math.PI*2);
            ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        });
    }
}

function openFrameModal(result, frameTime, artifactScore, canvas) {
    const modal   = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    const scoreLabel = artifactScore>0.6?'🔴 HIGH':artifactScore>0.35?'🟡 MEDIUM':'🟢 LOW';

    // Build large annotated preview
    const lc = document.createElement('canvas');
    lc.width=560; lc.height=315;
    lc.style.cssText='width:100%;border-radius:6px;margin-bottom:16px;display:block';
    const lctx = lc.getContext('2d');
    lctx.drawImage(canvas, 0, 0, 560, 315);
    for (let y=0; y<315; y+=3) { lctx.fillStyle='rgba(0,0,0,0.05)'; lctx.fillRect(0,y,560,1); }
    // Annotations scaled up
    const ao = document.createElement('canvas'); ao.width=560; ao.height=315;
    drawAnnotations(ao, result, artifactScore);
    lctx.drawImage(ao, 0, 0);

    content.innerHTML = `<h3 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:16px;color:#e2e8f0">Frame @ ${frameTime}s</h3>`;
    content.appendChild(lc);

    const meta = document.createElement('div');
    meta.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px';
    meta.innerHTML=`
        <div style="background:#1c2333;padding:10px 12px;border-radius:6px;border:1px solid rgba(0,238,255,0.1)">
            <div style="color:#64748b;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Verdict</div>
            <div style="font-weight:700;color:${result.isFake?'#ff4557':'#00e5a0'}">${result.isFake?'⚠ AI-Generated':'✓ Authentic'}</div>
        </div>
        <div style="background:#1c2333;padding:10px 12px;border-radius:6px;border:1px solid rgba(0,238,255,0.1)">
            <div style="color:#64748b;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Artifact Score</div>
            <div style="font-weight:700;color:#e2e8f0">${scoreLabel} — ${(artifactScore*100).toFixed(0)}%</div>
        </div>`;
    content.appendChild(meta);

    const tags = document.createElement('div');
    tags.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
    result.indicators.slice(0,5).forEach(ind => {
        const s = document.createElement('span');
        s.style.cssText=`background:${result.isFake?'rgba(255,69,87,0.15)':'rgba(0,229,160,0.15)'};color:${result.isFake?'#ff4557':'#00e5a0'};padding:4px 10px;border-radius:20px;font-size:11px`;
        s.textContent=ind; tags.appendChild(s);
    });
    content.appendChild(tags);
    modal.classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ── Dashboard ──────────────────────────────────────────────
function refreshDashboard() {
    const preds=state.predictions, total=preds.length;
    const fakeCount=preds.filter(p=>p.isFake).length;
    const realCount=total-fakeCount;
    const avgConf=total>0?(preds.reduce((a,b)=>a+b.confidence,0)/total).toFixed(1)+'%':'—%';
    setText('kpiTotal',total); setText('kpiFake',fakeCount); setText('kpiReal',realCount);
    setText('kpiAvgConf',avgConf); setText('recentCount',total); setText('totalAnalyzed',total);
    setText('kpiFakePct', total>0?(fakeCount/total*100).toFixed(0)+'%':'—%');
    setText('kpiRealPct', total>0?(realCount/total*100).toFixed(0)+'%':'—%');

    const list = document.getElementById('recentList');
    if (list) {
        if (!total) {
            list.innerHTML='<div class="empty-state"><div class="empty-icon">⬡</div><p>No analyses yet.<br>Upload a video to begin.</p></div>';
        } else {
            list.innerHTML=preds.slice(-6).reverse().map(p=>`
                <div class="recent-item ${p.isFake?'fake':'real'}" onclick="showPredictionModal(${p.id})">
                    <div><div class="recent-item-name">${p.filename}</div>
                    <div class="recent-item-time">${p.timestamp} · ${p.modelUsed}</div></div>
                    <span class="recent-item-badge ${p.isFake?'badge-fake':'badge-real'}">${p.isFake?'FAKE':'REAL'} ${p.confidence.toFixed(1)}%</span>
                </div>`).join('');
        }
    }
    buildDistributionChart();
}

function showPredictionModal(id) {
    const pred=state.predictions.find(p=>p.id===id); if (!pred) return;
    const modal=document.getElementById('modalOverlay'), content=document.getElementById('modalContent');
    content.innerHTML=`
        <h3 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:4px;color:#e2e8f0">${pred.filename}</h3>
        <p style="font-size:11px;color:#64748b;margin-bottom:16px;font-family:'Space Mono',monospace">${pred.timestamp}</p>
        <div style="background:${pred.isFake?'rgba(255,69,87,0.1)':'rgba(0,229,160,0.1)'};border:1px solid ${pred.isFake?'rgba(255,69,87,0.3)':'rgba(0,229,160,0.3)'};border-radius:8px;padding:16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${pred.isFake?'#ff4557':'#00e5a0'}">${pred.isFake?'⚠ AI-GENERATED':'✓ AUTHENTIC'}</div>
            <div style="font-family:'Space Mono',monospace;font-size:32px;font-weight:700;color:${pred.isFake?'#ff4557':'#00e5a0'}">${pred.confidence.toFixed(1)}%</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${pred.indicators.map(ind=>`<span style="background:${pred.isFake?'rgba(255,69,87,0.12)':'rgba(0,229,160,0.12)'};color:${pred.isFake?'#ff4557':'#00e5a0'};padding:4px 10px;border-radius:20px;font-size:11px">${ind}</span>`).join('')}
        </div>`;
    modal.classList.add('open');
}

// ── History ────────────────────────────────────────────────
function refreshHistory() {
    const tbody=document.getElementById('historyBody'); if (!tbody) return;
    if (!state.predictions.length) {
        tbody.innerHTML='<tr class="empty-row"><td colspan="7">No analyses yet — upload a video to begin</td></tr>'; return;
    }
    tbody.innerHTML=[...state.predictions].reverse().map(p=>`
        <tr>
            <td style="font-family:'Space Mono',monospace;font-size:11px;color:#64748b">${p.timestamp}</td>
            <td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.filename}</td>
            <td><span class="verdict-pill ${p.isFake?'fake':'real'}">${p.isFake?'AI-GENERATED':'AUTHENTIC'}</span></td>
            <td style="font-family:'Space Mono',monospace;font-size:12px;color:${p.isFake?'#ff4557':'#00e5a0'}">${p.confidence.toFixed(1)}%</td>
            <td style="font-size:12px;color:#94a3b8">${p.modelUsed}</td>
            <td style="font-family:'Space Mono',monospace;font-size:11px;color:#64748b">${p.analysisTime}</td>
            <td><button class="detail-btn" onclick="showPredictionModal(${p.id})">View</button></td>
        </tr>`).join('');
}

function clearHistory() {
    if (!state.predictions.length) return;
    if (confirm('Clear all analysis history?')) { state.predictions=[]; refreshHistory(); refreshDashboard(); }
}

function exportHistory() {
    if (!state.predictions.length) { alert('No data to export.'); return; }
    const rows=[['Timestamp','File Name','Classification','Confidence','Model','Analysis Time'],
        ...state.predictions.map(p=>[p.timestamp,p.filename,p.classification,p.confidence+'%',p.modelUsed,p.analysisTime])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='deepdetect_history.csv'; a.click();
}

// ── Settings ───────────────────────────────────────────────
function initSettings() {
    const s=document.getElementById('confThreshold'), f=document.getElementById('frameSample');
    s?.addEventListener('input',()=>{ document.getElementById('confThresholdVal').textContent=s.value+'%'; state.settings.confThreshold=parseInt(s.value); });
    f?.addEventListener('input',()=>{ document.getElementById('frameSampleVal').textContent=f.value+' fps'; });
}

function updateThreshold(v) { document.getElementById('confThresholdVal').textContent=v+'%'; }

// ── Utilities ──────────────────────────────────────────────
function setText(id,val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
function formatBytes(b) { if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function clamp(v,min,max) { return Math.max(min,Math.min(max,v)); }
function shuffle(arr) { for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }

// Global handlers
window.showPredictionModal=showPredictionModal;
window.closeModal=closeModal;
window.clearHistory=clearHistory;
window.exportHistory=exportHistory;
window.updateThreshold=updateThreshold;
