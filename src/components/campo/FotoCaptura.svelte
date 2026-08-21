<script>
    import { createEventDispatcher } from 'svelte';
    export let uploading = false;
    export let uploadedUrl = null;

    const dispatch = createEventDispatcher();

    let fileInput;
    let previewUrl = null;
    let compressing = false;

    function triggerCamera() {
        fileInput.click();
    }

    async function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        compressing = true;
        const compressed = await compressImage(file, 800, 0.75);
        previewUrl = URL.createObjectURL(compressed);
        compressing = false;

        dispatch('foto', { blob: compressed, preview: previewUrl });
        // Reset input para permitir tomar otra foto del mismo archivo
        event.target.value = '';
    }

    /**
     * Comprime la imagen usando canvas antes de subir.
     */
    async function compressImage(file, maxWidth = 800, quality = 0.75) {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const ratio = Math.min(maxWidth / img.width, 1);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
            };
            img.src = url;
        });
    }

    function removePhoto() {
        previewUrl = null;
        uploadedUrl = null;
        dispatch('remove');
    }
</script>

<div class="foto-captura">
    <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden-input"
        on:change={handleFile}
    />

    {#if previewUrl || uploadedUrl}
        <div class="foto-preview-wrapper">
            <img src={uploadedUrl || previewUrl} alt="Foto capturada" class="foto-preview" />
            <div class="foto-overlay">
                {#if uploading}
                    <div class="upload-indicator">
                        <div class="spinner-ring"></div>
                        <span>Subiendo...</span>
                    </div>
                {:else if uploadedUrl}
                    <div class="upload-ok">✅ Guardada</div>
                {/if}
            </div>
            <button class="btn-remove" on:click={removePhoto} title="Eliminar foto">✕</button>
        </div>
    {/if}

    <button
        class="btn-camara"
        on:click={triggerCamera}
        disabled={compressing || uploading}
    >
        {#if compressing}
            <div class="spinner-ring small"></div>
            Procesando...
        {:else}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
            </svg>
            {previewUrl ? 'Tomar otra foto' : '📷 Tomar Foto'}
        {/if}
    </button>
</div>

<style>
    .foto-captura {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        width: 100%;
    }
    .hidden-input { display: none; }

    .foto-preview-wrapper {
        position: relative;
        width: 100%;
        max-width: 320px;
        border-radius: 14px;
        overflow: hidden;
        border: 2px solid rgba(110, 231, 247, 0.25);
    }
    .foto-preview {
        width: 100%;
        display: block;
        object-fit: cover;
        max-height: 220px;
    }
    .foto-overlay {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 8px;
        background: linear-gradient(transparent, rgba(0,0,0,0.6));
        display: flex;
        justify-content: center;
    }
    .upload-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #e2e8f0;
        font-size: 0.8rem;
        font-weight: 600;
    }
    .upload-ok {
        color: #86efac;
        font-size: 0.85rem;
        font-weight: 700;
    }
    .btn-remove {
        position: absolute;
        top: 8px; right: 8px;
        width: 28px; height: 28px;
        border-radius: 50%;
        background: rgba(239,68,68,0.8);
        border: none;
        color: white;
        cursor: pointer;
        font-size: 0.75rem;
        display: flex; align-items: center; justify-content: center;
        line-height: 1;
    }

    .btn-camara {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 13px 28px;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border: 1px solid rgba(110, 231, 247, 0.3);
        color: #6ee7f7;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .btn-camara:hover:not(:disabled) {
        border-color: #6ee7f7;
        box-shadow: 0 0 18px rgba(110,231,247,0.2);
    }
    .btn-camara:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-camara:active { transform: scale(0.97); }

    .spinner-ring {
        width: 18px; height: 18px;
        border: 2px solid rgba(110,231,247,0.3);
        border-top-color: #6ee7f7;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
    }
    .spinner-ring.small { width: 14px; height: 14px; }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
