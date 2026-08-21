<script>
    import { onMount, onDestroy } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { authStore } from '../../../stores/auth';
    import { campoStore, campoActions } from '../../../stores/campoStore';
    import FotoCaptura from '../../../components/campo/FotoCaptura.svelte';
    import api from '../../../lib/apis';
    import dayjs from 'dayjs';
    import Swal from 'sweetalert2';

    export let id;

    $: user = $authStore.user;
    $: actividad = $campoStore.actividadActual;

    let inicio = actividad?.inicio ? new Date(actividad.inicio) : null;
    let fin = actividad?.fin ? new Date(actividad.fin) : null;
    let fotos = actividad?.fotos ?? [];
    let fotoUploading = false;
    let timerInterval;
    let elapsed = '';

    $: enCurso = inicio && !fin;
    $: finalizada = !!fin;

    onMount(() => {
        if (enCurso) startTimer();
    });
    onDestroy(() => clearInterval(timerInterval));

    function startTimer() {
        timerInterval = setInterval(updateElapsed, 1000);
        updateElapsed();
    }

    function updateElapsed() {
        if (!inicio) return;
        const now = new Date();
        const diff = Math.floor((now - inicio) / 1000);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        elapsed = [h,m,s].map(n => String(n).padStart(2,'0')).join(':');
    }

    async function iniciar() {
        inicio = new Date();
        fin = null;
        elapsed = '00:00:00';
        startTimer();

        const schema = user?.schema ?? 'global';
        await api.updateData('campo/actividades', { inicio: inicio.toISOString() }, '', id, schema);
        campoActions.setActividad({ ...actividad, inicio: inicio.toISOString(), fin: null });

        Swal.fire({ icon: 'success', title: '¡Actividad iniciada!', timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    }

    async function finalizar() {
        const confirm = await Swal.fire({
            title: '¿Finalizar actividad?',
            text: `Duración: ${elapsed}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, finalizar',
            cancelButtonText: 'Continuar',
            confirmButtonColor: '#22c55e',
        });
        if (!confirm.isConfirmed) return;

        fin = new Date();
        clearInterval(timerInterval);
        updateElapsed();

        const schema = user?.schema ?? 'global';
        await api.updateData('campo/actividades', { fin: fin.toISOString() }, '', id, schema);
        campoActions.setActividad({ ...actividad, fin: fin.toISOString() });

        Swal.fire({ icon: 'success', title: '¡Actividad finalizada!', text: `Duración total: ${elapsed}`, confirmButtonColor: '#22c55e' });
    }

    async function onFoto({ detail }) {
        const { blob } = detail;
        fotoUploading = true;

        const schema = user?.schema ?? 'global';
        const formData = new FormData();
        formData.append('foto', blob, `foto_${Date.now()}.jpg`);
        formData.append('actividad_id', id);

        const res = await api.setData('campo/fotos', formData, '', '', schema);

        if (res.status === 'success') {
            fotos = [...fotos, res.data];
        } else {
            // Modo local: guardar preview blob URL
            const url = URL.createObjectURL(blob);
            fotos = [...fotos, { id: Date.now(), url, local: true }];
        }
        fotoUploading = false;
    }
</script>

<div class="campo-view">
    <!-- Header -->
    <div class="act-header">
        <button class="back-btn" on:click={() => history.back()}>←</button>
        <div class="act-title-wrap">
            <h1 class="act-title">{actividad?.nombre ?? `Actividad #${id}`}</h1>
            <span class="act-sub">
                {#if finalizada}✅ Finalizada
                {:else if enCurso}🟢 En curso
                {:else}⏳ Pendiente{/if}
            </span>
        </div>
    </div>

    <!-- Cronómetro -->
    {#if enCurso || finalizada}
        <div class="cronometro-box {finalizada ? 'done' : 'running'}">
            <div class="crono-label">{finalizada ? 'Duración total' : 'Tiempo transcurrido'}</div>
            <div class="crono-tiempo">{elapsed || '00:00:00'}</div>
            {#if inicio}
                <div class="crono-meta">
                    Inicio: {dayjs(inicio).format('HH:mm:ss')}
                    {#if fin} — Fin: {dayjs(fin).format('HH:mm:ss')}{/if}
                </div>
            {/if}
        </div>
    {/if}

    <!-- Botones de control -->
    <div class="control-btns">
        {#if !inicio}
            <button class="btn-main btn-iniciar" on:click={iniciar}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                INICIAR ACTIVIDAD
            </button>
        {:else if enCurso}
            <button class="btn-main btn-finalizar" on:click={finalizar}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                FINALIZAR ACTIVIDAD
            </button>
        {:else}
            <div class="resumen-box">
                <span class="resumen-icon">🏁</span>
                <span class="resumen-txt">Actividad completada · {elapsed}</span>
            </div>
        {/if}
    </div>

    <!-- Sección de fotos -->
    {#if inicio}
        <div class="fotos-section">
            <div class="fotos-header">
                <h2 class="fotos-title">📷 Fotos de la actividad</h2>
                <span class="fotos-count">{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</span>
            </div>

            <!-- Captura de foto -->
            {#if !finalizada}
                <FotoCaptura uploading={fotoUploading} on:foto={onFoto} />
            {/if}

            <!-- Grid de fotos tomadas -->
            {#if fotos.length > 0}
                <div class="fotos-grid">
                    {#each fotos as f}
                        <div class="foto-thumb">
                            <img src={f.url} alt="Foto actividad" />
                            {#if f.local}<div class="local-badge">Local</div>{/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    .campo-view {
        padding: 16px;
        font-family: 'Inter', system-ui, sans-serif;
        background: #0f172a;
        min-height: 100%;
        color: #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    /* Header */
    .act-header {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .back-btn {
        background: rgba(255,255,255,0.07);
        border: none;
        color: #94a3b8;
        width: 36px; height: 36px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 1rem;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s;
    }
    .back-btn:hover { background: rgba(255,255,255,0.12); }
    .act-title-wrap { display: flex; flex-direction: column; gap: 3px; }
    .act-title { margin: 0; font-size: 1.2rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.02em; }
    .act-sub { font-size: 0.8rem; color: #64748b; }

    /* Cronómetro */
    .cronometro-box {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 24px;
        text-align: center;
        transition: all 0.3s;
    }
    .cronometro-box.running {
        border-color: rgba(34,197,94,0.4);
        background: rgba(34,197,94,0.05);
        box-shadow: 0 0 30px rgba(34,197,94,0.08);
    }
    .cronometro-box.done {
        border-color: rgba(110,231,247,0.3);
        background: rgba(110,231,247,0.04);
    }
    .crono-label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    .crono-tiempo { font-size: 3rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; line-height: 1; }
    .crono-meta { margin-top: 8px; font-size: 0.78rem; color: #64748b; }

    /* Botones principales */
    .control-btns { display: flex; justify-content: center; }
    .btn-main {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 18px 36px;
        border: none;
        border-radius: 16px;
        font-size: 1rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s;
        letter-spacing: 0.04em;
        font-family: 'Inter', system-ui, sans-serif;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        width: 100%;
        max-width: 380px;
        justify-content: center;
    }
    .btn-iniciar {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
    }
    .btn-iniciar:hover { transform: translateY(-2px); box-shadow: 0 12px 35px rgba(34,197,94,0.4); }
    .btn-finalizar {
        background: linear-gradient(135deg, #f97316, #dc2626);
        color: white;
    }
    .btn-finalizar:hover { transform: translateY(-2px); box-shadow: 0 12px 35px rgba(239,68,68,0.4); }
    .btn-main:active { transform: scale(0.98); }

    .resumen-box {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(34,197,94,0.08);
        border: 1px solid rgba(34,197,94,0.25);
        border-radius: 14px;
        padding: 16px 24px;
        width: 100%;
        max-width: 380px;
        justify-content: center;
    }
    .resumen-icon { font-size: 1.5rem; }
    .resumen-txt { font-size: 0.95rem; font-weight: 600; color: #86efac; }

    /* Fotos */
    .fotos-section { display: flex; flex-direction: column; gap: 14px; }
    .fotos-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .fotos-title { margin: 0; font-size: 0.95rem; font-weight: 700; color: #f1f5f9; }
    .fotos-count { font-size: 0.8rem; color: #64748b; }
    .fotos-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }
    .foto-thumb {
        position: relative;
        aspect-ratio: 1;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.08);
    }
    .foto-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .local-badge {
        position: absolute;
        bottom: 4px; right: 4px;
        background: rgba(234,179,8,0.85);
        color: #0f172a;
        font-size: 0.6rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
    }

    @media (min-width: 1200px) {
        .campo-view { background: transparent; color: #1e293b; }
        .act-title { color: #1e293b; }
        .cronometro-box { background: #f8fafc; border-color: #e2e8f0; }
        .cronometro-box.running { background: rgba(34,197,94,0.04); border-color: rgba(34,197,94,0.4); }
        .crono-tiempo { color: #0f172a; }
        .back-btn { background: #f1f5f9; color: #475569; }
    }
</style>
