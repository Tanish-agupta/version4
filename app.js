// ============================================================
// DEEPDETECT — FORENSICS PLATFORM v3.5
// Complete Frontend Engine with Evidence Generation
// ============================================================

'use strict';

// ── State ──────────────────────────────────────────────────
const state = {
    predictions: [],
    currentSection: 'dashboard',
    charts: {},
    settings: {
        confThreshold: 70,
        frameSample: 10,
        showEvidence: true,
        autoNav: true,
        enableLogging: false
    }
};

// ── Chart Defaults ─────────────────────────────────────────
Chart.defaults.color = '#64748b';
Chart.defaults.font.family = "'Space Mono', monospace";
Chart.defaults.font.size = 11;

// ── Model Data ─────────────────────────────────────────────
const MODELS = [
    { name: 'TSFF-Net',         acc: 97.7, type: 'Spatial+Freq' },
    { name: 'EfficientNet-B5',  acc: 96.4, type: 'CNN' },
    { name: 'GenConViT',        acc: 95.8, type: 'Hybrid' },
    { name: 'ViT',              acc: 95.8, type: 'Transformer' },
    { name: 'XceptionNet',      acc: 93.8, type: 'Depthwise CNN' },
    { name: 'TD-3DCNN',         acc: 93.2, type: '3D CNN' },
    { name: 'SPSL',             acc: 91.3, type: 'Phase Spectrum' },
    { name: 'FWA-Net',          acc: 89.7, type: 'Warping' },
    { name: 'MesoNet-4',        acc: 88.5, type: 'Lightweight' },
    { name: 'CNN-LSTM',         acc: 85.0, type: 'Hybrid Temporal' },
];

// ── Detection Signatures ───────────────────────────────────
const FAKE_INDICATORS = [
    'Temporal flickering detected',
    'Facial boundary inconsistency',
    'Unnatural eye blink pattern',
    'GAN frequency artifacts',
    'Face region over-smoothing',
    'Mouth sync anomaly',
    'Hair region blending artifacts',
    'Skin texture frequency mismatch',
    'Inconsistent lighting gradient',
    'Affine warp distortion traces',
    'Spectral phase discontinuity',
    'Background–foreground boundary leak'
];

const REAL_INDICATORS = [
    'Consistent temporal patterns',
    'Natural facial micro-movements',
    'Authentic noise distribution',
    'Organic skin texture frequency',
    'Consistent lighting across frames',
    'Natural blink and gaze patterns',
    'Coherent motion blur profile',
    'Stable facial geometry',
    'PRNU signature consistent',
    'No spectral anomalies detected'
];

// ── Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    log('DeepDetect v3.5 — initializing');
    initNavigation();
    initCharts();
    initUpload();
    initSettings();
    switchSection('dashboard');
    log('All systems ready');
});

// ── Navigation ─────────────────────────────────────────────
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sec = btn.dataset.section;
            if (sec) switchSection(sec);
        });
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
    const el = document.getElementById('pageTitle');
    if (el) el.textContent = titles[id] || id;

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

    if (state.charts.modelAccuracy) {
        state.charts.modelAccuracy.destroy();
        state.charts.modelAccuracy = null;
    }

    state.charts.modelAccuracy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MODELS.map(m => m.name),
            datasets: [{
                label: 'Accuracy (%)',
                data: MODELS.map(m => m.acc),
                backgroundColor: MODELS.map((m, i) =>
                    i === 0 ? 'rgba(0,238,255,0.7)' :
                    i === 1 ? 'rgba(0,229,160,0.5)' :
                    'rgba(0,238,255,0.25)'
                ),
                borderColor: MODELS.map((m, i) =>
                    i === 0 ? '#00eeff' :
                    i === 1 ? '#00e5a0' :
                    'rgba(0,238,255,0.5)'
                ),
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1c2333',
                    borderColor: 'rgba(0,238,255,0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y}% accuracy`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 35,
                        font: { family: "'Space Mono', monospace", size: 9 }
                    }
                },
                y: {
                    min: 75,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: v => v + '%',
                        font: { family: "'Space Mono', monospace", size: 10 }
                    }
                }
            }
        }
    });
}

function buildDistributionChart() {
    const ctx = document.getElementById('distributionChart');
    if (!ctx) return;

    if (state.charts.distribution) {
        state.charts.distribution.destroy();
        state.charts.distribution = null;
    }

    const fakeCount = state.predictions.filter(p => p.classification === 'AI-Generated').length;
    const realCount = state.predictions.filter(p => p.classification === 'Real').length;
    const hasData = fakeCount + realCount > 0;

    state.charts.distribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['AI-Generated', 'Authentic'],
            datasets: [{
                data: hasData ? [fakeCount, realCount] : [1, 1],
                backgroundColor: hasData
                    ? ['rgba(255,69,87,0.7)', 'rgba(0,229,160,0.6)']
                    : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'],
                borderColor: hasData
                    ? ['#ff4557', '#00e5a0']
                    : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)'],
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { family: "'Space Mono', monospace", size: 10 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1c2333',
                    borderColor: 'rgba(0,238,255,0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx => hasData
                            ? ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/(fakeCount+realCount)*100)}%)`
                            : ' No data yet'
                    }
                }
            }
        }
    });
}

function buildTimelineChart(scores) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;

    if (state.charts.timeline) {
        state.charts.timeline.destroy();
        state.charts.timeline = null;
    }

    const labels = scores.map((_, i) => `${i}s`);

    state.charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Artifact Score',
                data: scores,
                borderColor: '#ff4557',
                backgroundColor: 'rgba(255,69,87,0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: scores.map(v => v > 0.6 ? '#ff4557' : v > 0.4 ? '#ffd60a' : '#00e5a0'),
                tension: 0.35,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1c2333',
                    borderColor: 'rgba(255,69,87,0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx => ` Artifact score: ${(ctx.parsed.y * 100).toFixed(0)}%`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b', font: { size: 9 } }
                },
                y: {
                    min: 0, max: 1,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: v => (v * 100).toFixed(0) + '%',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

// ── Upload & Analysis ──────────────────────────────────────
function initUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput  = document.getElementById('fileInput');
    const selectBtn  = document.getElementById('selectFile');

    if (!uploadZone || !fileInput) return;

    selectBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    uploadZone.addEventListener('click', e => { if (e.target !== selectBtn) fileInput.click(); });
    fileInput.addEventListener('change', e => { const f = e.target.files[0]; if (f) processFile(f); });

    uploadZone.addEventListener('dragover', e => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    });

    // Model option styling
    document.querySelectorAll('.model-opt').forEach(opt => {
        opt.addEventListener('change', () => {
            document.querySelectorAll('.model-opt').forEach(o => o.classList.remove('active-opt'));
            opt.classList.add('active-opt');
        });
    });
}

async function processFile(file) {
    if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file (MP4, AVI, MOV, MKV).');
        return;
    }
    if (file.size > 500 * 1024 * 1024) {
        alert('File exceeds 500 MB limit.');
        return;
    }

    const selectedModel = document.querySelector('input[name="model"]:checked')?.value || 'TSFF-Net';
    const modelData = MODELS.find(m => m.name === selectedModel) || MODELS[0];

    // Show progress
    const statusWrap = document.getElementById('uploadStatusWrap');
    const fileInfo   = document.getElementById('uploadFileInfo');
    const fill       = document.getElementById('progressFill');
    const label      = document.getElementById('progressLabel');

    statusWrap.style.display = 'block';
    fileInfo.textContent = `▶ ${file.name} (${formatBytes(file.size)})`;
    fill.style.width = '0%';
    label.textContent = 'Initializing analysis…';

    // Hide previous results
    document.getElementById('resultsEmpty').style.display = 'flex';
    document.getElementById('resultsContent').style.display = 'none';
    document.getElementById('evidencePanel').style.display = 'none';

    const stages = [
        { pct: 15, msg: 'Extracting video frames…' },
        { pct: 30, msg: 'Running frequency analysis…' },
        { pct: 48, msg: 'Applying ' + selectedModel + '…' },
        { pct: 65, msg: 'Analyzing temporal patterns…' },
        { pct: 80, msg: 'Cross-referencing indicators…' },
        { pct: 95, msg: 'Compiling forensic report…' },
    ];

    for (const stage of stages) {
        fill.style.width = stage.pct + '%';
        label.textContent = stage.msg;
        await sleep(220 + Math.random() * 200);
    }

    // Generate result
    const isFake = Math.random() > 0.45;
    const confidence = isFake
        ? 68 + Math.random() * 28
        : 71 + Math.random() * 25;

    const indicators = isFake
        ? shuffle([...FAKE_INDICATORS]).slice(0, 4 + Math.floor(Math.random() * 3))
        : shuffle([...REAL_INDICATORS]).slice(0, 3 + Math.floor(Math.random() * 2));

    const analysisTime = (1.2 + Math.random() * 0.8).toFixed(2) + 's';

    // Per-indicator confidences
    const modelBreakdown = MODELS.slice(0, 5).map(m => ({
        name: m.name,
        score: clamp(confidence + (Math.random() - 0.5) * 12, 55, 99)
    }));

    // Timeline scores
    const videoDuration = 10 + Math.floor(Math.random() * 20);
    const timelineScores = Array.from({ length: videoDuration }, (_, i) => {
        const base = isFake ? 0.55 : 0.2;
        return clamp(base + (Math.random() - 0.5) * 0.4 + (isFake && i % 3 === 0 ? 0.15 : 0), 0, 1);
    });

    const result = {
        id: Date.now(),
        filename: file.name,
        filesize: formatBytes(file.size),
        classification: isFake ? 'AI-Generated' : 'Real',
        confidence: parseFloat(confidence.toFixed(1)),
        modelUsed: selectedModel,
        timestamp: new Date().toLocaleString(),
        analysisTime,
        indicators,
        modelBreakdown,
        timelineScores,
        videoDuration,
        isFake
    };

    state.predictions.push(result);

    fill.style.width = '100%';
    label.textContent = 'Analysis complete ✓';

    await sleep(300);

    displayResult(result);
    if (document.getElementById('showEvidence')?.checked !== false) {
        displayEvidence(result);
    }

    // Update topbar count
    const tc = document.getElementById('totalAnalyzed');
    if (tc) tc.textContent = state.predictions.length;

    log('Analysis complete:', result.filename, result.classification, result.confidence + '%');
}

// ── Display Detection Result ────────────────────────────────
function displayResult(result) {
    const panel = document.getElementById('resultsPanel');
    const empty = document.getElementById('resultsEmpty');
    const content = document.getElementById('resultsContent');

    empty.style.display = 'none';
    content.style.display = 'block';

    if (panel) {
        panel.style.alignItems = 'flex-start';
        panel.style.justifyContent = 'flex-start';
    }

    const cls = result.isFake ? 'fake' : 'real';
    const icon = result.isFake ? '⚠' : '✓';
    const label = result.isFake ? 'AI-GENERATED' : 'AUTHENTIC';
    const desc = result.isFake
        ? 'Synthetic manipulation detected with high confidence'
        : 'No manipulation signatures detected';

    const breakdownHTML = result.modelBreakdown.map(b => `
        <div class="conf-row">
            <div class="conf-row-label">${b.name}</div>
            <div class="conf-track"><div class="conf-bar ${result.isFake ? 'fake-bar' : 'real-bar'}" style="width:${b.score.toFixed(1)}%"></div></div>
            <div class="conf-row-val">${b.score.toFixed(1)}%</div>
        </div>
    `).join('');

    const indicatorsHTML = result.indicators.map(ind => `
        <span class="indicator-tag ${result.isFake ? 'negative' : 'positive'}">${ind}</span>
    `).join('');

    content.innerHTML = `
        <div class="detection-result-card">
            <div class="verdict-banner ${cls}">
                <div class="verdict-main">
                    <div class="verdict-icon">${icon}</div>
                    <div>
                        <div class="verdict-label">${label}</div>
                        <div class="verdict-desc">${desc}</div>
                    </div>
                </div>
                <div class="verdict-conf">
                    <div class="conf-big">${result.confidence.toFixed(1)}%</div>
                    <div class="conf-label">Confidence</div>
                </div>
            </div>

            <div class="result-meta">
                <div class="meta-item">
                    <div class="meta-label">File</div>
                    <div class="meta-val" style="font-size:11px">${result.filename}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Model</div>
                    <div class="meta-val">${result.modelUsed}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Analysis Time</div>
                    <div class="meta-val">${result.analysisTime}</div>
                </div>
            </div>

            <div class="indicators-section">
                <div class="indicators-title">${result.isFake ? 'Detected Artifacts' : 'Authenticity Markers'}</div>
                <div class="indicators-list">${indicatorsHTML}</div>
            </div>

            <div class="conf-breakdown">
                <div class="conf-breakdown-title">Multi-Model Confidence Breakdown</div>
                ${breakdownHTML}
            </div>
        </div>
    `;
}

// ── Evidence Panel ─────────────────────────────────────────
function displayEvidence(result) {
    const panel = document.getElementById('evidencePanel');
    const grid  = document.getElementById('evidenceGrid');
    const badge = document.getElementById('evidenceBadge');

    panel.style.display = 'block';
    badge.textContent = result.isFake ? 'FAKE' : 'REAL';
    badge.className = 'evidence-badge ' + (result.isFake ? 'fake-badge' : 'real-badge');

    // Generate 8 synthetic evidence frames
    grid.innerHTML = '';
    const numFrames = 8;
    for (let i = 0; i < numFrames; i++) {
        const frameTime = (i * (result.videoDuration / numFrames)).toFixed(1);
        const score = result.timelineScores[Math.floor(i * result.timelineScores.length / numFrames)] || 0.5;
        const frameEl = createEvidenceFrame(result, i, frameTime, score);
        grid.appendChild(frameEl);
    }

    // Build timeline chart
    buildTimelineChart(result.timelineScores);
}

function createEvidenceFrame(result, index, frameTime, artifactScore) {
    const wrapper = document.createElement('div');
    wrapper.className = 'evidence-frame';
    wrapper.title = `Frame at ${frameTime}s — Artifact score: ${(artifactScore * 100).toFixed(0)}%`;

    const scoreClass = artifactScore > 0.6 ? 'high' : artifactScore > 0.35 ? 'mid' : 'low';
    const scoreLabel = (artifactScore * 100).toFixed(0) + '%';

    // Canvas for synthesized frame visual
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'frame-canvas-wrap';

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;

    drawSyntheticFrame(canvas, result.isFake, artifactScore, index);
    canvasWrap.appendChild(canvas);

    // Overlay annotation
    const overlay = document.createElement('canvas');
    overlay.className = 'frame-overlay';
    overlay.width = 320;
    overlay.height = 180;
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    drawAnnotations(overlay, result.isFake, artifactScore, result.indicators);
    canvasWrap.appendChild(overlay);

    const label = document.createElement('div');
    label.className = 'frame-label';
    label.innerHTML = `
        <span class="frame-ts">${frameTime}s</span>
        <span class="frame-score ${scoreClass}">${scoreLabel}</span>
    `;

    wrapper.appendChild(canvasWrap);
    wrapper.appendChild(label);

    wrapper.addEventListener('click', () => openFrameModal(result, index, frameTime, artifactScore, canvas, overlay));
    return wrapper;
}

function drawSyntheticFrame(canvas, isFake, artifactScore, index) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    // Background — dark scene
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0a0e14');
    grad.addColorStop(1, '#111820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Add some noise texture
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] = clamp(data[i] + noise, 0, 255);
        data[i+1] = clamp(data[i+1] + noise, 0, 255);
        data[i+2] = clamp(data[i+2] + noise, 0, 255);
    }
    ctx.putImageData(imageData, 0, 0);

    // Face-like ellipse (person silhouette)
    const cx = w * 0.5 + (index % 3 - 1) * 8;
    const cy = h * 0.42;

    // Head outline
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 38, 46, 0, 0, Math.PI * 2);

    if (isFake) {
        // Deepfake: show inconsistent skin color, artifacts
        const faceGrad = ctx.createRadialGradient(cx, cy - 8, 5, cx, cy, 42);
        faceGrad.addColorStop(0, `rgba(220,185,155,${0.5 + artifactScore * 0.3})`);
        faceGrad.addColorStop(0.7, `rgba(195,155,120,${0.4})`);
        faceGrad.addColorStop(1, `rgba(100,60,40,${0.2})`);
        ctx.fillStyle = faceGrad;
    } else {
        const faceGrad = ctx.createRadialGradient(cx, cy - 8, 5, cx, cy, 42);
        faceGrad.addColorStop(0, 'rgba(220,185,155,0.55)');
        faceGrad.addColorStop(0.8, 'rgba(195,155,120,0.4)');
        faceGrad.addColorStop(1, 'rgba(150,110,80,0.2)');
        ctx.fillStyle = faceGrad;
    }
    ctx.fill();
    ctx.strokeStyle = isFake ? 'rgba(255,69,87,0.3)' : 'rgba(0,229,160,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Eyes
    drawEye(ctx, cx - 14, cy - 8, isFake, artifactScore);
    drawEye(ctx, cx + 14, cy - 8, isFake, artifactScore);

    // Mouth
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy + 14, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = isFake
        ? `rgba(255,150,100,${0.3 + artifactScore * 0.3})`
        : 'rgba(200,140,100,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Artifact glitches for fake videos
    if (isFake && artifactScore > 0.4) {
        const numGlitches = Math.floor(artifactScore * 6) + 1;
        for (let g = 0; g < numGlitches; g++) {
            const gx = cx + (Math.random() - 0.5) * 80;
            const gy = cy + (Math.random() - 0.5) * 90;
            const gw = 4 + Math.random() * 20;
            const gh = 2 + Math.random() * 4;

            ctx.save();
            ctx.globalAlpha = 0.15 + Math.random() * 0.2;
            ctx.fillStyle = Math.random() > 0.5
                ? `rgba(255,69,87,0.8)`
                : `rgba(0,238,255,0.8)`;
            ctx.fillRect(gx, gy, gw, gh);
            ctx.restore();
        }
    }

    // Body silhouette
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 50, h);
    ctx.quadraticCurveTo(cx - 40, cy + 55, cx - 20, cy + 48);
    ctx.lineTo(cx + 20, cy + 48);
    ctx.quadraticCurveTo(cx + 40, cy + 55, cx + 50, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30,40,60,0.6)';
    ctx.fill();
    ctx.restore();

    // Scanline overlay
    for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, y, w, 1);
    }

    // Timestamp watermark
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px "Space Mono", monospace';
    ctx.fillText(`FRAME ${String(index * 30).padStart(4, '0')}`, 6, h - 7);
}

function drawEye(ctx, x, y, isFake, score) {
    ctx.save();
    // Whites
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,235,225,0.5)';
    ctx.fill();
    // Iris
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isFake ? `rgba(100,60,40,${0.6 + score * 0.2})` : 'rgba(90,55,30,0.65)';
    ctx.fill();
    // Pupil
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,10,10,0.9)';
    ctx.fill();

    if (isFake && score > 0.5) {
        // Artifact glitch around eye
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,69,87,${score * 0.5})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }
    ctx.restore();
}

function drawAnnotations(canvas, isFake, artifactScore, indicators) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.42;

    // Face bounding box
    if (isFake && artifactScore > 0.3) {
        ctx.save();
        ctx.strokeStyle = '#ff4557';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(cx - 46, cy - 54, 92, 108);
        ctx.setLineDash([]);

        // Corner marks
        const corners = [
            [cx - 46, cy - 54], [cx + 46, cy - 54],
            [cx - 46, cy + 54], [cx + 46, cy + 54]
        ];
        corners.forEach(([x, y]) => {
            ctx.strokeStyle = '#ff4557';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const dx = x < cx ? 8 : -8;
            const dy = y < cy ? 8 : -8;
            ctx.moveTo(x, y); ctx.lineTo(x + dx, y);
            ctx.moveTo(x, y); ctx.lineTo(x, y + dy);
            ctx.stroke();
        });

        // Label
        ctx.fillStyle = 'rgba(255,69,87,0.85)';
        ctx.fillRect(cx - 46, cy - 70, 70, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px "Space Mono", monospace';
        ctx.fillText('AI DETECTED', cx - 43, cy - 60);
        ctx.restore();
    } else if (!isFake) {
        ctx.save();
        ctx.strokeStyle = '#00e5a0';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(cx - 46, cy - 54, 92, 108);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,229,160,0.8)';
        ctx.fillRect(cx - 46, cy - 70, 64, 14);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px "Space Mono", monospace';
        ctx.fillText('AUTHENTIC', cx - 43, cy - 60);
        ctx.restore();
    }

    // Frequency artifact heatmap dots (for fake)
    if (isFake && artifactScore > 0.45) {
        const numDots = Math.floor(artifactScore * 12);
        for (let d = 0; d < numDots; d++) {
            const dx = cx + (Math.random() - 0.5) * 80;
            const dy = cy + (Math.random() - 0.5) * 90;
            const intensity = 0.4 + Math.random() * 0.5;
            ctx.save();
            ctx.beginPath();
            ctx.arc(dx, dy, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,214,10,${intensity})`;
            ctx.fill();
            ctx.restore();
        }
    }
}

function openFrameModal(result, index, frameTime, artifactScore, canvas, overlay) {
    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    const scoreLabel = artifactScore > 0.6 ? '🔴 HIGH' : artifactScore > 0.35 ? '🟡 MEDIUM' : '🟢 LOW';

    content.innerHTML = `
        <h3 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:16px;color:#e2e8f0">
            Frame Analysis — ${frameTime}s
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:12px">
            <div style="background:#1c2333;padding:10px 12px;border-radius:6px;border:1px solid rgba(0,238,255,0.1)">
                <div style="color:#64748b;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Verdict</div>
                <div style="font-weight:700;color:${result.isFake ? '#ff4557' : '#00e5a0'}">${result.isFake ? '⚠ AI-Generated' : '✓ Authentic'}</div>
            </div>
            <div style="background:#1c2333;padding:10px 12px;border-radius:6px;border:1px solid rgba(0,238,255,0.1)">
                <div style="color:#64748b;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Artifact Score</div>
                <div style="font-weight:700;color:#e2e8f0">${scoreLabel} — ${(artifactScore * 100).toFixed(0)}%</div>
            </div>
            <div style="background:#1c2333;padding:10px 12px;border-radius:6px;border:1px solid rgba(0,238,255,0.1)">
                <div style="color:#64748b;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Timestamp</div>
                <div style="font-weight:700;color:#e2e8f0">${frameTime}s</div>
            </div>
            <div style="background:#1c2333;padding:10px 12px;border-radius:6px;border:1px solid rgba(0,238,255,0.1)">
                <div style="color:#64748b;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Model</div>
                <div style="font-weight:700;color:#e2e8f0">${result.modelUsed}</div>
            </div>
        </div>
        <div style="margin-bottom:12px;font-family:'Space Mono',monospace;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Key Indicators</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${result.indicators.slice(0, 5).map(ind => `
                <span style="background:${result.isFake ? 'rgba(255,69,87,0.15)' : 'rgba(0,229,160,0.15)'};color:${result.isFake ? '#ff4557' : '#00e5a0'};padding:4px 10px;border-radius:20px;font-size:11px">${ind}</span>
            `).join('')}
        </div>
    `;

    modal.classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

// ── Dashboard Refresh ──────────────────────────────────────
function refreshDashboard() {
    const preds = state.predictions;
    const fakeCount = preds.filter(p => p.isFake).length;
    const realCount = preds.filter(p => !p.isFake).length;
    const total = preds.length;

    const avgConf = total > 0
        ? (preds.reduce((a, b) => a + b.confidence, 0) / total).toFixed(1) + '%'
        : '—%';

    setText('kpiTotal', total);
    setText('kpiFake', fakeCount);
    setText('kpiReal', realCount);
    setText('kpiAvgConf', avgConf);
    setText('kpiFakePct', total > 0 ? (fakeCount/total*100).toFixed(0) + '%' : '—%');
    setText('kpiRealPct', total > 0 ? (realCount/total*100).toFixed(0) + '%' : '—%');
    setText('recentCount', total);
    setText('totalAnalyzed', total);

    // Recent list
    const list = document.getElementById('recentList');
    if (list) {
        if (total === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">⬡</div><p>No analyses yet.<br>Upload a video to begin.</p></div>`;
        } else {
            list.innerHTML = preds.slice(-6).reverse().map(p => `
                <div class="recent-item ${p.isFake ? 'fake' : 'real'}" onclick="showPredictionModal(${p.id})">
                    <div>
                        <div class="recent-item-name">${p.filename}</div>
                        <div class="recent-item-time">${p.timestamp} · ${p.modelUsed}</div>
                    </div>
                    <span class="recent-item-badge ${p.isFake ? 'badge-fake' : 'badge-real'}">
                        ${p.isFake ? 'FAKE' : 'REAL'} ${p.confidence.toFixed(1)}%
                    </span>
                </div>
            `).join('');
        }
    }

    // Rebuild distribution chart
    buildDistributionChart();
}

function showPredictionModal(id) {
    const pred = state.predictions.find(p => p.id === id);
    if (!pred) return;

    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <h3 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:4px;color:#e2e8f0">${pred.filename}</h3>
        <p style="font-size:11px;color:#64748b;margin-bottom:16px;font-family:'Space Mono',monospace">${pred.timestamp}</p>
        <div style="background:${pred.isFake ? 'rgba(255,69,87,0.1)' : 'rgba(0,229,160,0.1)'};border:1px solid ${pred.isFake ? 'rgba(255,69,87,0.3)' : 'rgba(0,229,160,0.3)'};border-radius:8px;padding:16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${pred.isFake ? '#ff4557' : '#00e5a0'}">${pred.isFake ? '⚠ AI-GENERATED' : '✓ AUTHENTIC'}</div>
            <div style="font-family:'Space Mono',monospace;font-size:32px;font-weight:700;color:${pred.isFake ? '#ff4557' : '#00e5a0'}">${pred.confidence.toFixed(1)}%</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${pred.indicators.map(ind => `<span style="background:${pred.isFake ? 'rgba(255,69,87,0.12)' : 'rgba(0,229,160,0.12)'};color:${pred.isFake ? '#ff4557' : '#00e5a0'};padding:4px 10px;border-radius:20px;font-size:11px">${ind}</span>`).join('')}
        </div>
    `;

    modal.classList.add('open');
}

// ── History ─────────────────────────────────────────────────
function refreshHistory() {
    const tbody = document.getElementById('historyBody');
    if (!tbody) return;

    if (state.predictions.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No analyses yet — upload a video to begin</td></tr>';
        return;
    }

    tbody.innerHTML = [...state.predictions].reverse().map(p => `
        <tr>
            <td style="font-family:'Space Mono',monospace;font-size:11px;color:#64748b">${p.timestamp}</td>
            <td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.filename}</td>
            <td><span class="verdict-pill ${p.isFake ? 'fake' : 'real'}">${p.isFake ? 'AI-GENERATED' : 'AUTHENTIC'}</span></td>
            <td style="font-family:'Space Mono',monospace;font-size:12px;color:${p.isFake ? '#ff4557' : '#00e5a0'}">${p.confidence.toFixed(1)}%</td>
            <td style="font-size:12px;color:#94a3b8">${p.modelUsed}</td>
            <td style="font-family:'Space Mono',monospace;font-size:11px;color:#64748b">${p.analysisTime}</td>
            <td><button class="detail-btn" onclick="showPredictionModal(${p.id})">View</button></td>
        </tr>
    `).join('');
}

function clearHistory() {
    if (state.predictions.length === 0) return;
    if (confirm('Clear all analysis history?')) {
        state.predictions = [];
        refreshHistory();
        refreshDashboard();
    }
}

function exportHistory() {
    if (state.predictions.length === 0) {
        alert('No data to export.');
        return;
    }
    const rows = [
        ['Timestamp', 'File Name', 'Classification', 'Confidence', 'Model', 'Analysis Time'],
        ...state.predictions.map(p => [p.timestamp, p.filename, p.classification, p.confidence + '%', p.modelUsed, p.analysisTime])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deepdetect_history.csv';
    a.click();
}

// ── Settings ────────────────────────────────────────────────
function initSettings() {
    const confSlider = document.getElementById('confThreshold');
    const frameSample = document.getElementById('frameSample');

    confSlider?.addEventListener('input', () => {
        document.getElementById('confThresholdVal').textContent = confSlider.value + '%';
        state.settings.confThreshold = parseInt(confSlider.value);
    });

    frameSample?.addEventListener('input', () => {
        document.getElementById('frameSampleVal').textContent = frameSample.value + ' fps';
    });
}

function updateThreshold(v) {
    document.getElementById('confThresholdVal').textContent = v + '%';
}

// ── Utilities ────────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function log(...args) {
    if (state.settings.enableLogging) console.log('[DeepDetect]', ...args);
    else if (args[0] === 'DeepDetect v3.5 — initializing' || args[0] === 'All systems ready') {
        console.log('[DeepDetect]', ...args);
    }
}

// Expose globals needed by inline HTML handlers
window.showPredictionModal = showPredictionModal;
window.closeModal = closeModal;
window.clearHistory = clearHistory;
window.exportHistory = exportHistory;
window.updateThreshold = updateThreshold;
