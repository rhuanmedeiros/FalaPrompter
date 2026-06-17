/* ==========================================================================
   VOICEFLOW PROMPTER - LOGIC AND SPEECH ALIGNMENT (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    const state = {
        theme: 'dark',
        view: 'editor',         // 'editor' or 'prompter'
        isPlayActive: false,    // whether reading is active
        isVoiceMode: true,      // true = voice scroll, false = manual auto-scroll
        fontSize: 48,           // text font size in px
        fontFamily: "'Outfit', sans-serif",
        textColor: 'green',     // green, amber, cyan, white
        scrollSpeed: 5,         // manual scroll speed multiplier
        sensitivity: 30,        // match search window size
        language: 'pt-BR',      // speech recognition language
        
        // Text processing
        rawText: '',
        matchableWords: [],     // array of { index, clean, element }
        currentIndex: -1,       // index of active word
        lastSpeechTokens: [],
        lastSpeechSignature: '',
        
        // Web Speech API
        recognition: null,
        isRecRunning: false,
        restartRecOnEnd: true,
        
        // Scroll physics & animation loop
        targetScrollTop: 0,
        scrollPhysicsId: null,
        lastScrollTime: 0,
        
        // UI Auto-hide timer for controls HUD
        hudTimeoutId: null,

        // Camera + video recording (MediaRecorder)
        cameraStream: null,
        cameraReady: false,
        mediaRecorder: null,
        recordedChunks: [],
        recordedMimeType: '',
        isRecording: false,
        recStartTime: 0,
        recTimerId: null,
        recordedUrl: null
    };

    // --- DOM Elements ---
    const els = {
        app: document.getElementById('app'),
        
        // Views
        editorView: document.getElementById('editor-view'),
        prompterView: document.getElementById('prompter-view'),
        
        // Editor controls
        themeToggle: document.getElementById('btn-theme-toggle'),
        scriptInput: document.getElementById('script-input'),
        wordCount: document.getElementById('word-count'),
        selectLang: document.getElementById('select-lang'),
        rangeFontSize: document.getElementById('range-font-size'),
        valFontSize: document.getElementById('val-font-size'),
        colorDots: document.querySelectorAll('.color-dot'),
        selectFontFamily: document.getElementById('select-font-family'),
        rangeScrollSpeed: document.getElementById('range-scroll-speed'),
        valScrollSpeed: document.getElementById('val-scroll-speed'),
        rangeSensitivity: document.getElementById('range-sensitivity'),
        valSensitivity: document.getElementById('val-sensitivity'),
        btnStartPrompter: document.getElementById('btn-start-prompter'),
        
        // Prompter controls & UI
        btnExitPrompter: document.getElementById('btn-exit-prompter'),
        micStatusDot: document.getElementById('mic-status-dot'),
        micStatusText: document.getElementById('mic-status-text'),
        modeBadgeText: document.getElementById('mode-badge-text'),
        prompterScrollContainer: document.getElementById('prompter-scroll-container'),
        prompterTextContent: document.getElementById('prompter-text-content'),
        
        // HUD controls
        btnHudVoiceToggle: document.getElementById('btn-hud-voice-toggle'),
        btnHudPlay: document.getElementById('btn-hud-play'),
        btnHudTextDec: document.getElementById('btn-hud-text-dec'),
        btnHudTextInc: document.getElementById('btn-hud-text-inc'),
        btnHudSpeedDec: document.getElementById('btn-hud-speed-dec'),
        btnHudSpeedInc: document.getElementById('btn-hud-speed-inc'),
        btnHudReset: document.getElementById('btn-hud-reset'),
        hudPanel: document.querySelector('.prompter-controls-hud'),
        
        // Debug Toast
        debugToast: document.getElementById('speech-debug-toast'),
        debugText: document.getElementById('debug-transcript-text'),

        // Camera + recording
        cameraFeed: document.getElementById('camera-feed'),
        btnRecord: document.getElementById('btn-record'),
        recIndicator: document.getElementById('rec-indicator'),
        recTimer: document.getElementById('rec-timer'),
        recordingResult: document.getElementById('recording-result'),
        recordingPreview: document.getElementById('recording-preview'),
        recordingFormatNote: document.getElementById('recording-format-note'),
        btnDownload: document.getElementById('btn-download'),
        btnRerecord: document.getElementById('btn-rerecord')
    };

    // --- Default Script Text ---
    const DEFAULT_SCRIPT = `Olá! Seja bem-vindo ao VoiceFlow Prompter.

Esta é uma ferramenta de teleprompter inteligente desenvolvida para acompanhar o ritmo da sua fala. Conforme você lê as palavras deste roteiro, o aplicativo detecta o som da sua voz e realiza a rolagem de forma inteiramente automática.

Experimente ler este parágrafo em voz alta para testar a sensibilidade. Repare que você pode falar mais devagar... ou você pode ler mais rápido, e o texto sempre se ajustará para ficar centralizado na linha guia de leitura.

Se você errar alguma palavra ou fizer uma pausa, não se preocupe! O nosso algoritmo de janela deslizante inteligente é tolerante e aguardará você retomar a leitura a partir de qualquer frase próxima.

Você também pode ajustar o tamanho da fonte, a cor do texto e alternar para o modo de scroll manual clássico utilizando o painel de controle flutuante aqui embaixo.

Bom treino e ótimas gravações!`;

    // Initialize inputs
    els.scriptInput.value = DEFAULT_SCRIPT;
    updateWordCount();

    // --- Speech Recognition Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSpeechSupported = !!SpeechRecognition;

    if (isSpeechSupported) {
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = true;
        state.recognition.interimResults = true;
        state.recognition.lang = state.language;

        // Recognition Handlers
        state.recognition.onstart = () => {
            state.isRecRunning = true;
            updateMicStatus('green', 'Escutando...', true);
        };

        state.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                fallbackToManualScroll('Permissão negada: Auto-Scroll ativo');
                return;
                updateMicStatus('red', 'Permissão negada', false);
                state.restartRecOnEnd = false;
            } else if (event.error === 'no-speech') {
                // Just silent timeout, keep active
                updateMicStatus('amber', 'Silêncio detectado...', true);
            } else {
                updateMicStatus('red', `Erro: ${event.error}`, false);
            }
        };

        state.recognition.onend = () => {
            state.isRecRunning = false;
            if (state.isPlayActive && state.isVoiceMode && state.restartRecOnEnd) {
                // Auto-restart to keep teleprompter active
                try {
                    state.recognition.start();
                } catch (e) {
                    console.error('Failed to auto-restart recognition:', e);
                }
            } else if (!state.isPlayActive) {
                updateMicStatus('grey', 'Microfone pausado', false);
            }
        };

        state.recognition.onresult = (event) => {
            if (!state.isPlayActive || !state.isVoiceMode) return;

            // Only use the LATEST result (interim or final) — not accumulated history
            const lastResultIndex = event.results.length - 1;
            const latestResult = event.results[lastResultIndex];
            const latestTranscript = latestResult[0].transcript.trim();

            if (latestTranscript) {
                showDebugTranscript(latestTranscript);
                matchSpokenText(latestTranscript, latestResult.isFinal);
            }
        };
    } else {
        updateMicStatus('red', 'Reconhecimento não suportado neste navegador', false);
        state.isVoiceMode = false;
        updateModeUI();
    }

    // --- Helper Functions ---

    function updateWordCount() {
        const text = els.scriptInput.value.trim();
        const count = text ? text.split(/\s+/).length : 0;
        els.wordCount.textContent = `${count} ${count === 1 ? 'palavra' : 'palavras'}`;
    }

    function updateMicStatus(color, text, pulse) {
        els.micStatusDot.className = 'status-dot';
        if (color) els.micStatusDot.classList.add(color);
        if (pulse) els.micStatusDot.classList.add('pulse');
        els.micStatusText.textContent = text;
    }

    function fallbackToManualScroll(statusText = 'Auto-Scroll Manual ativo') {
        state.isVoiceMode = false;
        state.restartRecOnEnd = false;
        updateModeUI();
        updateMicStatus(null, statusText, false);
    }

    function showDebugTranscript(text) {
        els.debugText.textContent = text;
        els.debugToast.classList.add('active');
        
        // Hide after 4 seconds of silence
        clearTimeout(state.debugToastTimeout);
        state.debugToastTimeout = setTimeout(() => {
            els.debugToast.classList.remove('active');
        }, 4000);
    }

    // --- View Navigation & Text Initialization ---

    function startPrompter() {
        try {
            state.rawText = els.scriptInput.value.trim() || DEFAULT_SCRIPT;
        
        // Prepare Prompter DOM and matchableWords
        state.matchableWords = [];
        state.currentIndex = -1;
        state.lastSpeechTokens = [];
        state.lastSpeechSignature = '';
        els.prompterTextContent.innerHTML = '';

        const paragraphs = state.rawText.split(/\n+/);
        let wordGlobalIndex = 0;

        paragraphs.forEach((pText) => {
            const pElement = document.createElement('p');
            pElement.style.marginBottom = '1.2em';
            
            // Split keeping spaces so layout is perfect
            const rawTokens = pText.split(/([ \t\n]+)/);
            
            rawTokens.forEach((token) => {
                if (token.trim() === '') {
                    // Space or spacing chunk
                    pElement.appendChild(document.createTextNode(token));
                } else {
                    const span = document.createElement('span');
                    span.className = 'word';
                    span.dataset.index = wordGlobalIndex;
                    span.textContent = token;
                    pElement.appendChild(span);

                    // Clean word for voice matching.
                    const clean = normalizeToken(token);

                    state.matchableWords.push({
                        index: wordGlobalIndex,
                        original: token,
                        clean: clean,
                        element: span
                    });

                    wordGlobalIndex++;
                }
            });
            els.prompterTextContent.appendChild(pElement);
        });

        // Apply visual styling settings
        applyPrompterStyles();

        // Switch View
        state.view = 'prompter';
        els.editorView.classList.remove('active');
        els.prompterView.classList.add('active');

        // Reset scroll position
        state.targetScrollTop = 0;
        els.prompterScrollContainer.scrollTop = 0;

            // Open the camera/microphone (non-blocking — teleprompter still works without it)
            initCamera();

            // Auto trigger Play
            setPlayState(true);
            resetIdleTimer();
        } catch (error) {
            console.error('[VFP] Failed to start teleprompter:', error);
            updateMicStatus('red', 'Erro ao iniciar teleprompter', false);
            els.prompterView.classList.remove('active');
            els.editorView.classList.add('active');
            alert('Não foi possível iniciar o teleprompter. Recarregue a página e tente novamente.');
        }
    }

    function exitPrompter() {
        setPlayState(false);
        if (state.isRecording) {
            stopRecording();
        }
        hideRecordingResult();
        stopCamera();
        state.view = 'editor';
        els.prompterView.classList.remove('active');
        els.editorView.classList.add('active');
    }

    // --- Camera & Video Recording ---

    async function initCamera() {
        // Already have a live stream from a previous start.
        if (state.cameraStream) return;

        const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
        if (!hasMediaDevices) {
            handleCameraUnavailable('Câmera indisponível neste navegador — apenas teleprompter');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: true
            });
            state.cameraStream = stream;
            state.cameraReady = true;
            els.cameraFeed.srcObject = stream;
            // playsinline + muted let mobile browsers autoplay the preview.
            try { await els.cameraFeed.play(); } catch (e) { /* autoplay may resolve later */ }

            // Enable recording now that we have a stream.
            els.btnRecord.disabled = false;
            els.btnRecord.title = 'Gravar / Parar vídeo';
        } catch (error) {
            console.error('[VFP] getUserMedia failed:', error);
            let msg = 'Câmera/microfone indisponível — apenas teleprompter';
            if (error && error.name === 'NotAllowedError') {
                msg = 'Permissão de câmera negada — apenas teleprompter';
            } else if (error && error.name === 'NotFoundError') {
                msg = 'Nenhuma câmera encontrada — apenas teleprompter';
            }
            handleCameraUnavailable(msg);
        }
    }

    function handleCameraUnavailable(message) {
        state.cameraReady = false;
        els.btnRecord.disabled = true;
        els.btnRecord.title = message;
        updateMicStatus('amber', message, false);
    }

    function stopCamera() {
        if (state.cameraStream) {
            state.cameraStream.getTracks().forEach((track) => track.stop());
            state.cameraStream = null;
        }
        state.cameraReady = false;
        if (els.cameraFeed) els.cameraFeed.srcObject = null;
    }

    function pickMimeType() {
        // Prefer MP4 (Safari/iOS, broad editor support); fall back to WebM variants.
        const candidates = [
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
            return '';
        }
        for (const type of candidates) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    }

    function startRecording() {
        if (!state.cameraStream || typeof MediaRecorder === 'undefined') {
            alert('Gravação não disponível: câmera ou MediaRecorder não suportados neste navegador.');
            return;
        }

        // Fresh take — drop any previous recording artifacts.
        revokeRecordedUrl();
        state.recordedChunks = [];
        state.recordedMimeType = pickMimeType();

        try {
            const options = state.recordedMimeType ? { mimeType: state.recordedMimeType } : undefined;
            state.mediaRecorder = new MediaRecorder(state.cameraStream, options);
        } catch (error) {
            console.error('[VFP] Failed to create MediaRecorder:', error);
            alert('Não foi possível iniciar a gravação neste navegador.');
            return;
        }

        state.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                state.recordedChunks.push(event.data);
            }
        };

        state.mediaRecorder.onstop = () => {
            finalizeRecording();
        };

        state.mediaRecorder.onerror = (event) => {
            console.error('[VFP] MediaRecorder error:', event.error || event);
        };

        // Timeslice keeps chunks flowing (important on some mobile browsers).
        state.mediaRecorder.start(1000);
        state.isRecording = true;
        state.recStartTime = Date.now();

        // UI: button -> stop, show timer
        els.btnRecord.classList.add('recording');
        els.btnRecord.querySelector('.btn-record-label').textContent = 'Parar';
        els.recIndicator.hidden = false;
        updateRecTimer();
        state.recTimerId = setInterval(updateRecTimer, 500);
    }

    function stopRecording() {
        if (!state.isRecording || !state.mediaRecorder) return;
        try {
            if (state.mediaRecorder.state !== 'inactive') {
                state.mediaRecorder.stop();
            }
        } catch (error) {
            console.warn('[VFP] Failed to stop MediaRecorder:', error);
        }
        state.isRecording = false;
        clearInterval(state.recTimerId);
        state.recTimerId = null;

        // UI reset
        els.btnRecord.classList.remove('recording');
        els.btnRecord.querySelector('.btn-record-label').textContent = 'Gravar';
        els.recIndicator.hidden = true;
    }

    function updateRecTimer() {
        const elapsed = Math.floor((Date.now() - state.recStartTime) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        els.recTimer.textContent = `${mm}:${ss}`;
    }

    function finalizeRecording() {
        if (state.recordedChunks.length === 0) {
            console.warn('[VFP] No recorded data captured.');
            return;
        }
        const type = state.recordedMimeType || 'video/webm';
        const blob = new Blob(state.recordedChunks, { type });
        revokeRecordedUrl();
        state.recordedUrl = URL.createObjectURL(blob);

        // Pause teleprompter playback while reviewing the clip.
        setPlayState(false);

        els.recordingPreview.src = state.recordedUrl;
        els.recordingFormatNote.textContent = buildFormatNote(type);
        els.recordingResult.hidden = false;
    }

    function buildFormatNote(type) {
        const isWebm = type.includes('webm');
        if (isWebm) {
            return 'Formato .webm (ótimo no Chrome/Android). Alguns editores e o iPhone podem exigir conversão para .mp4.';
        }
        return 'Formato .mp4 (H.264) — boa compatibilidade com editores e dispositivos.';
    }

    function getRecordingExtension() {
        return (state.recordedMimeType || 'video/webm').includes('mp4') ? 'mp4' : 'webm';
    }

    function downloadRecording() {
        if (!state.recordedUrl) return;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        const a = document.createElement('a');
        a.href = state.recordedUrl;
        a.download = `voiceflow-${stamp}.${getRecordingExtension()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function hideRecordingResult() {
        els.recordingResult.hidden = true;
        els.recordingPreview.removeAttribute('src');
        els.recordingPreview.load();
        revokeRecordedUrl();
        state.recordedChunks = [];
    }

    function revokeRecordedUrl() {
        if (state.recordedUrl) {
            URL.revokeObjectURL(state.recordedUrl);
            state.recordedUrl = null;
        }
    }

    function applyPrompterStyles() {
        // Font Size
        els.prompterTextContent.style.fontSize = `${state.fontSize}px`;
        
        // Font Color Class
        els.prompterTextContent.className = `prompter-text-content color-${state.textColor} font-${getFontFamilyClass()}`;
    }

    function getFontFamilyClass() {
        if (state.fontFamily.includes('Georgia')) return 'georgia';
        if (state.fontFamily.includes('JetBrains')) return 'jetbrains';
        return 'outfit';
    }

    // --- Voice Alignment Engine ---

    function legacyMatchSpokenText(spokenText) {
        if (state.matchableWords.length === 0) return;

        // Clean and tokenize spoken words into a Set for O(1) lookup
        const spokenSet = new Set(
            spokenText.toLowerCase()
                .replace(/[^\w\dáéíóúâêîôûãõç\s]/gi, '')
                .split(/\s+/)
                .filter(t => t.length > 1) // ignore single-char artifacts
        );

        if (spokenSet.size === 0) return;

        // Simple approach: check ONLY the next 6 expected words in the script.
        // Find the FURTHEST one that appears in the spoken text.
        // This can NEVER jump more than 6 words — impossible to skip paragraphs.
        const LOOKAHEAD = 6;
        const searchStart = state.currentIndex + 1;
        const searchEnd = Math.min(state.matchableWords.length, searchStart + LOOKAHEAD);
        
        let furthestMatch = -1;

        for (let i = searchStart; i < searchEnd; i++) {
            const expectedWord = state.matchableWords[i].clean;
            if (expectedWord.length <= 1) {
                // Auto-advance past single-char words (a, é, o) if the next word matches
                if (furthestMatch === i - 1) {
                    furthestMatch = i; // drag along tiny words
                }
                continue;
            }
            if (spokenSet.has(expectedWord)) {
                furthestMatch = i;
            }
        }

        if (furthestMatch > state.currentIndex) {
            console.log(`[VFP] ✓ Matched → word #${furthestMatch} "${state.matchableWords[furthestMatch].original}" (jump +${furthestMatch - state.currentIndex})`);
            state.currentIndex = furthestMatch;
            updateReadingCursor();
        }
    }

    function normalizeForMatch(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeToken(text) {
        return normalizeForMatch(text).replace(/\s+/g, '');
    }

    function tokenizeForMatch(text) {
        const normalized = normalizeForMatch(text);
        return normalized ? normalized.split(' ').filter(Boolean) : [];
    }

    function startsWithTokens(tokens, prefix) {
        if (prefix.length > tokens.length) return false;
        return prefix.every((token, index) => token === tokens[index]);
    }

    function getFreshSpeechTokens(tokens, isFinal) {
        const signature = tokens.join(' ');
        if (!signature) return [];

        if (signature === state.lastSpeechSignature) {
            if (isFinal) {
                state.lastSpeechTokens = [];
                state.lastSpeechSignature = '';
            }
            return [];
        }

        let freshTokens = tokens;
        if (state.lastSpeechTokens.length > 0) {
            if (startsWithTokens(tokens, state.lastSpeechTokens)) {
                freshTokens = tokens.slice(state.lastSpeechTokens.length);
            } else if (startsWithTokens(state.lastSpeechTokens, tokens)) {
                freshTokens = [];
            } else {
                freshTokens = tokens;
            }
        }

        if (isFinal) {
            state.lastSpeechTokens = [];
            state.lastSpeechSignature = '';
        } else {
            state.lastSpeechTokens = tokens;
            state.lastSpeechSignature = signature;
        }

        return freshTokens;
    }

    function isAnchorWord(word) {
        return word && word.length > 1;
    }

    function getScriptAnchors(startIndex, endIndex) {
        const anchors = [];
        for (let i = startIndex; i < endIndex; i++) {
            const word = state.matchableWords[i].clean;
            if (isAnchorWord(word)) {
                anchors.push({ index: i, clean: word });
            }
        }
        return anchors;
    }

    function findNearestSingleWordMatch(token, searchStart, searchEnd) {
        const maxSingleWordLookahead = 3;
        const limitedEnd = Math.min(searchEnd, searchStart + maxSingleWordLookahead);

        for (let i = searchStart; i < limitedEnd; i++) {
            if (state.matchableWords[i].clean === token) {
                return i;
            }
        }

        return -1;
    }

    function findBestPhraseMatch(tokens, searchStart, searchEnd) {
        const spokenAnchors = tokens.filter(isAnchorWord);
        if (spokenAnchors.length < 2) return -1;

        const scriptAnchors = getScriptAnchors(searchStart, searchEnd);
        for (let scriptStart = 0; scriptStart < scriptAnchors.length; scriptStart++) {
            for (let tokenStart = 0; tokenStart < spokenAnchors.length; tokenStart++) {
                if (scriptAnchors[scriptStart].clean !== spokenAnchors[tokenStart]) continue;

                let tokenIndex = tokenStart;
                let scriptIndex = scriptStart;
                let matches = 0;
                let lastWordIndex = scriptAnchors[scriptStart].index;

                while (
                    tokenIndex < spokenAnchors.length &&
                    scriptIndex < scriptAnchors.length &&
                    scriptAnchors[scriptIndex].clean === spokenAnchors[tokenIndex]
                ) {
                    matches++;
                    lastWordIndex = scriptAnchors[scriptIndex].index;
                    tokenIndex++;
                    scriptIndex++;
                }

                const gapFromCursor = scriptAnchors[scriptStart].index - searchStart;
                const minMatches = gapFromCursor > 2 ? 4 : 2;
                if (matches < minMatches) continue;
                return lastWordIndex;
            }
        }

        return -1;
    }

    function matchSpokenText(spokenText, isFinal = false) {
        if (state.matchableWords.length === 0) return;

        const spokenTokens = tokenizeForMatch(spokenText).filter(isAnchorWord);
        if (spokenTokens.length === 0) return;

        const searchStart = state.currentIndex + 1;
        const searchEnd = Math.min(
            state.matchableWords.length,
            searchStart + Math.max(6, state.sensitivity)
        );

        let nextIndex = -1;
        if (spokenTokens.length === 1) {
            nextIndex = findNearestSingleWordMatch(spokenTokens[0], searchStart, searchEnd);
        } else {
            nextIndex = findBestPhraseMatch(spokenTokens, searchStart, searchEnd);
            if (nextIndex === -1) {
                nextIndex = findNearestSingleWordMatch(spokenTokens[0], searchStart, searchEnd);
            }
        }

        if (nextIndex > state.currentIndex) {
            const maxAdvancePerResult = 5;
            nextIndex = Math.min(nextIndex, state.currentIndex + maxAdvancePerResult);
            console.log(`[VFP] Matched -> word #${nextIndex} "${state.matchableWords[nextIndex].original}" (advance +${nextIndex - state.currentIndex})`);
            state.currentIndex = nextIndex;
            updateReadingCursor();
        }
    }

    function updateReadingCursor() {
        const words = state.matchableWords;
        const curIdx = state.currentIndex;

        // Update word visual classes
        for (let i = 0; i < words.length; i++) {
            const el = words[i].element;
            if (i < curIdx) {
                el.className = 'word read';
            } else if (i === curIdx) {
                el.className = 'word active';
            } else {
                el.className = 'word';
            }
        }

        // Calculate scroll target — the physics loop (LERP) will do the actual scrolling.
        if (curIdx >= 0 && curIdx < words.length) {
            const activeEl = words[curIdx].element;
            const container = els.prompterScrollContainer;
            const activeRect = activeEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const wordTopInContainer = container.scrollTop + (activeRect.top - containerRect.top);

            // Place active word at 30% from top of visible area
            const guidelineOffset = container.clientHeight * 0.30;
            const newTarget = wordTopInContainer - guidelineOffset;
            state.targetScrollTop = Math.max(0, newTarget);

            console.log(`[VFP] Scroll: wordTop=${wordTopInContainer}, target=${state.targetScrollTop.toFixed(0)}, current=${container.scrollTop.toFixed(0)}`);
        }
    }

    // --- Reading Controller & Scroll Physics ---

    function startScrollPhysicsLoop() {
        stopScrollPhysicsLoop();
        state.lastScrollTime = performance.now();
        
        function loop(timestamp) {
            if (!state.isPlayActive) return;
            
            const container = els.prompterScrollContainer;
            if (!container) return;
            
            if (state.isVoiceMode) {
                // Voice Mode: smooth LERP towards targetScrollTop
                const currentScroll = container.scrollTop;
                const diff = state.targetScrollTop - currentScroll;
                if (Math.abs(diff) > 0.5) {
                    // Move a smooth chunk of the remaining distance per frame.
                    // Higher factor = snappier catch-up so the active word stays
                    // glued to the reading guide during continuous reading.
                    container.scrollTop = currentScroll + diff * 0.35;
                } else if (diff !== 0) {
                    // Snap the final sub-pixel gap so the word settles exactly on the line.
                    container.scrollTop = state.targetScrollTop;
                }
            } else {
                // Manual Scroll Mode: constant speed
                const elapsed = timestamp - state.lastScrollTime;
                state.lastScrollTime = timestamp;
                
                const speedFactor = (state.scrollSpeed * 10) / 1000;
                container.scrollTop += elapsed * speedFactor;
                approximateCurrentWordFromScroll();
            }
            
            state.scrollPhysicsId = requestAnimationFrame(loop);
        }
        
        state.scrollPhysicsId = requestAnimationFrame(loop);
    }

    function stopScrollPhysicsLoop() {
        if (state.scrollPhysicsId) {
            cancelAnimationFrame(state.scrollPhysicsId);
            state.scrollPhysicsId = null;
        }
    }

    function setPlayState(play) {
        state.isPlayActive = play;

        if (play) {
            els.btnHudPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
            els.btnHudPlay.classList.add('active');

            // Start unified scroll physics loop
            startScrollPhysicsLoop();

            if (state.isVoiceMode && isSpeechSupported) {
                // Voice mode playback
                state.restartRecOnEnd = true;
                if (!state.isRecRunning) {
                    try {
                        state.recognition.start();
                    } catch (e) {
                        console.error('Failed to start speech recognition:', e);
                    }
                }
                updateMicStatus('green', 'Escutando...', true);
            } else {
                updateMicStatus(null, 'Auto-Scroll Manual ativo', false);
            }
        } else {
            els.btnHudPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
            els.btnHudPlay.classList.remove('active');
            state.lastSpeechTokens = [];
            state.lastSpeechSignature = '';

            // Stop unified scroll physics loop
            stopScrollPhysicsLoop();

            // Stop voice recognition
            if (isSpeechSupported && state.recognition) {
                state.restartRecOnEnd = false;
                try {
                    state.recognition.stop();
                } catch (error) {
                    console.warn('[VFP] Failed to stop speech recognition:', error);
                }
            }
            updateMicStatus('grey', 'Microfone pausado', false);
        }
    }

    function approximateCurrentWordFromScroll() {
        const container = els.prompterScrollContainer;
        const containerRect = container.getBoundingClientRect();
        
        // Guideline target Y coordinate in the viewport
        const triggerY = containerRect.top + (containerRect.height * 0.30);
        
        let targetWordIdx = -1;

        // Find the word currently intersecting the trigger guideline height
        for (let i = 0; i < state.matchableWords.length; i++) {
            const el = state.matchableWords[i].element;
            const rect = el.getBoundingClientRect();

            if (triggerY >= rect.top && triggerY <= rect.bottom) {
                targetWordIdx = i;
                break;
            }
        }

        if (targetWordIdx !== -1 && targetWordIdx !== state.currentIndex) {
            state.currentIndex = targetWordIdx;
            
            // Update word styling inline (without triggering smooth scroll to prevent scroll loops)
            const words = state.matchableWords;
            for (let i = 0; i < words.length; i++) {
                const el = words[i].element;
                if (i < targetWordIdx) {
                    el.className = 'word read';
                } else if (i === targetWordIdx) {
                    el.className = 'word active';
                } else {
                    el.className = 'word';
                }
            }
        }
    }

    function resetPrompter() {
        const wasPlaying = state.isPlayActive;
        setPlayState(false);
        
        state.currentIndex = -1;
        state.targetScrollTop = 0;
        state.lastSpeechTokens = [];
        state.lastSpeechSignature = '';
        els.prompterScrollContainer.scrollTop = 0;
        
        // Reset styles of all words
        state.matchableWords.forEach((word) => {
            word.element.className = 'word';
        });

        if (wasPlaying) {
            setTimeout(() => {
                setPlayState(true);
            }, 100);
        }
    }

    function updateModeUI() {
        if (state.isVoiceMode) {
            els.btnHudVoiceToggle.classList.add('active');
            els.btnHudVoiceToggle.querySelector('span').textContent = 'Modo Voz';
            els.btnHudVoiceToggle.querySelector('i').className = 'fa-solid fa-microphone';
            els.modeBadgeText.textContent = 'Modo Voz';
        } else {
            els.btnHudVoiceToggle.classList.remove('active');
            els.btnHudVoiceToggle.querySelector('span').textContent = 'Auto-Scroll';
            els.btnHudVoiceToggle.querySelector('i').className = 'fa-solid fa-arrows-up-down';
            els.modeBadgeText.textContent = 'Auto-Scroll';
        }
    }

    // --- HUD Auto-Hide Handling ---

    function resetIdleTimer() {
        if (state.view !== 'prompter') return;

        // Clear existing autohide classes
        els.hudPanel.classList.remove('autohide');

        clearTimeout(state.hudTimeoutId);
        
        // Hide panel after 3 seconds of mouse/touch inactivity, but only if teleprompter is playing
        if (state.isPlayActive) {
            state.hudTimeoutId = setTimeout(() => {
                if (state.isPlayActive) {
                    els.hudPanel.classList.add('autohide');
                }
            }, 3000);
        }
    }

    // Track user interaction to show HUD
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('touchstart', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);

    // --- Event Listeners: Theme ---
    els.themeToggle.addEventListener('click', () => {
        if (state.theme === 'dark') {
            state.theme = 'light';
            document.documentElement.setAttribute('data-theme', 'light');
            els.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            state.theme = 'dark';
            document.documentElement.removeAttribute('data-theme');
            els.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });

    // --- Event Listeners: Editor Controls ---
    els.scriptInput.addEventListener('input', updateWordCount);

    els.selectLang.addEventListener('change', (e) => {
        state.language = e.target.value;
        if (isSpeechSupported && state.recognition) {
            state.recognition.lang = state.language;
            if (state.isPlayActive && state.isVoiceMode) {
                // restart with new language
                setPlayState(false);
                setTimeout(() => setPlayState(true), 150);
            }
        }
    });

    els.rangeFontSize.addEventListener('input', (e) => {
        state.fontSize = parseInt(e.target.value);
        els.valFontSize.textContent = `${state.fontSize}px`;
    });

    els.selectFontFamily.addEventListener('change', (e) => {
        state.fontFamily = e.target.value;
    });

    els.rangeScrollSpeed.addEventListener('input', (e) => {
        state.scrollSpeed = parseInt(e.target.value);
        els.valScrollSpeed.textContent = state.scrollSpeed;
    });

    els.rangeSensitivity.addEventListener('input', (e) => {
        state.sensitivity = parseInt(e.target.value);
        els.valSensitivity.textContent = state.sensitivity;
    });

    els.colorDots.forEach((dot) => {
        dot.addEventListener('click', () => {
            els.colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            state.textColor = dot.dataset.color;
        });
    });

    els.btnStartPrompter.addEventListener('click', (event) => {
        event.preventDefault();
        startPrompter();
    });

    // --- Event Listeners: Prompter View & HUD controls ---
    els.btnExitPrompter.addEventListener('click', exitPrompter);

    els.btnHudVoiceToggle.addEventListener('click', () => {
        if (!isSpeechSupported) {
            alert('Reconhecimento de voz não é suportado pelo seu navegador.');
            return;
        }
        
        state.isVoiceMode = !state.isVoiceMode;
        updateModeUI();

        // Re-trigger playback states with new mode
        if (state.isPlayActive) {
            setPlayState(false);
            setTimeout(() => setPlayState(true), 100);
        } else {
            if (state.isVoiceMode) {
                updateMicStatus('grey', 'Modo Voz ativo', false);
            } else {
                updateMicStatus(null, 'Auto-Scroll Manual pronto', false);
            }
        }
    });

    els.btnHudPlay.addEventListener('click', () => {
        setPlayState(!state.isPlayActive);
    });

    // Font adjustments on HUD
    els.btnHudTextDec.addEventListener('click', () => {
        state.fontSize = Math.max(24, state.fontSize - 4);
        els.rangeFontSize.value = state.fontSize;
        els.valFontSize.textContent = `${state.fontSize}px`;
        applyPrompterStyles();
        updateReadingCursor();
    });

    els.btnHudTextInc.addEventListener('click', () => {
        state.fontSize = Math.min(96, state.fontSize + 4);
        els.rangeFontSize.value = state.fontSize;
        els.valFontSize.textContent = `${state.fontSize}px`;
        applyPrompterStyles();
        updateReadingCursor();
    });

    // Speed adjustments on HUD
    els.btnHudSpeedDec.addEventListener('click', () => {
        state.scrollSpeed = Math.max(1, state.scrollSpeed - 1);
        els.rangeScrollSpeed.value = state.scrollSpeed;
        els.valScrollSpeed.textContent = state.scrollSpeed;
    });

    els.btnHudSpeedInc.addEventListener('click', () => {
        state.scrollSpeed = Math.min(15, state.scrollSpeed + 1);
        els.rangeScrollSpeed.value = state.scrollSpeed;
        els.valScrollSpeed.textContent = state.scrollSpeed;
    });

    els.btnHudReset.addEventListener('click', resetPrompter);

    // --- Event Listeners: Recording ---
    els.btnRecord.addEventListener('click', () => {
        if (state.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    els.btnDownload.addEventListener('click', downloadRecording);

    els.btnRerecord.addEventListener('click', () => {
        hideRecordingResult();
        // Resume teleprompter so the user can record another take.
        setPlayState(true);
        resetIdleTimer();
    });

    // Stop propagation of clicks inside HUD to avoid resetIdleTimer hiding it instantly
    els.hudPanel.addEventListener('click', (e) => {
        e.stopPropagation();
        resetIdleTimer();
    });
});
