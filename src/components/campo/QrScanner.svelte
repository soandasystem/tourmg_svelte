<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';

    export let continuous = false;  // true = sigue escaneando tras cada lectura
    export let label = 'Escanear QR';

    const dispatch = createEventDispatcher();

    let scannerEl;
    let html5QrCode;
    let scanning = false;
    let errorMsg = '';
    let lastResult = '';

    onMount(async () => {
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            html5QrCode = new Html5Qrcode('qr-reader-campo');
        } catch (e) {
            errorMsg = 'No se pudo cargar el escáner QR';
        }
    });

    onDestroy(() => {
        stopScan();
    });

    async function startScan() {
        if (!html5QrCode) return;
        errorMsg = '';
        scanning = true;

        try {
            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    if (!continuous) {
                        stopScan();
                    }
                    lastResult = decodedText;
                    dispatch('scan', { value: decodedText });
                },
                (errorMessage) => {
                    // errores de frame ignorados silenciosamente
                }
            );
        } catch (err) {
            errorMsg = 'No se pudo acceder a la cámara. Verifica los permisos.';
            scanning = false;
        }
    }

    async function stopScan() {
        if (html5QrCode && scanning) {
            try {
                await html5QrCode.stop();
            } catch (_) {}
            scanning = false;
        }
    }
</script>

<div class="qr-scanner-wrapper">
    <div id="qr-reader-campo" class="qr-reader {scanning ? 'active' : ''}"></div>

    {#if errorMsg}
        <div class="qr-error">⚠️ {errorMsg}</div>
    {/if}

    {#if lastResult && !scanning}
        <div class="qr-result">
            <span class="qr-result-icon">✅</span>
            <span class="qr-result-text">Leído: <strong>{lastResult}</strong></span>
        </div>
    {/if}

    <div class="qr-controls">
        {#if !scanning}
            <button class="btn-scan start" on:click={startScan}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
                    <rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3M21 21h-2M16 21v-2M11 3v5H6M11 8H6M8 11H3M16 11h5v5M11 13v3h3v5M11 21v-2"/>
                </svg>
                {label}
            </button>
        {:else}
            <button class="btn-scan stop" on:click={stopScan}>
                ⏹ Detener
            </button>
        {/if}
    </div>
</div>

<style>
    .qr-scanner-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        width: 100%;
    }
    .qr-reader {
        width: 100%;
        max-width: 340px;
        border-radius: 16px;
        overflow: hidden;
        border: 2px solid rgba(110, 231, 247, 0.3);
        background: #0f172a;
        min-height: 60px;
        transition: border-color 0.3s;
    }
    .qr-reader.active {
        border-color: #6ee7f7;
        box-shadow: 0 0 20px rgba(110, 231, 247, 0.2);
    }
    .qr-error {
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.3);
        color: #fca5a5;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 0.875rem;
        text-align: center;
        width: 100%;
        max-width: 340px;
    }
    .qr-result {
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.3);
        color: #86efac;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        max-width: 340px;
        word-break: break-all;
    }
    .btn-scan {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 28px;
        border: none;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .btn-scan.start {
        background: linear-gradient(135deg, #6ee7f7, #3b82f6);
        color: #0f172a;
    }
    .btn-scan.start:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(110,231,247,0.35);
    }
    .btn-scan.stop {
        background: rgba(239,68,68,0.15);
        border: 1px solid rgba(239,68,68,0.4);
        color: #fca5a5;
    }
    .btn-scan:active { transform: scale(0.97); }
</style>
