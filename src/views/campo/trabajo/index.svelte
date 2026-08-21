<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { authStore } from '../../../stores/auth';
    import { campoStore, campoActions } from '../../../stores/campoStore';
    import api from '../../../lib/apis';
    import dayjs from 'dayjs';
    import Swal from 'sweetalert2';

    export let id; // parámetro de ruta

    $: user = $authStore.user;
    $: trabajo = $campoStore.trabajoActual;

    let actividades = [];
    let loading = true;

    onMount(async () => {
        if (!trabajo) {
            // Intentar cargar desde backend si no está en store
            const schema = user?.schema ?? 'global';
            const res = await api.getData('campo/trabajos', '', '', id, schema);
            if (res.status === 'success') campoActions.setTrabajo(res.data);
        }
        await cargarActividades();
    });

    async function cargarActividades() {
        loading = true;
        const schema = user?.schema ?? 'global';
        const res = await api.getData(`campo/trabajos/${id}/actividades`, '', '', '', schema);
        if (res.status === 'success') {
            actividades = res.data ?? [];
        } else {
            actividades = [];
        }
        loading = false;
    }

    async function nuevaActividad() {
        const { value: nombre } = await Swal.fire({
            title: 'Nueva Actividad',
            input: 'text',
            inputPlaceholder: 'Nombre de la actividad',
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3b82f6',
            inputValidator: v => !v ? 'Ingresa un nombre' : null
        });
        if (!nombre) return;

        const schema = user?.schema ?? 'global';
        const payload = { nombre, trabajo_id: id };
        const res = await api.setData('campo/actividades', payload, '', '', schema);

        let nueva;
        if (res.status === 'success') {
            nueva = res.data;
        } else {
            // Modo local si no hay backend
            nueva = { id: Date.now(), nombre, trabajo_id: id, estado: 'pendiente', inicio: null, fin: null, fotos: [] };
        }
        actividades = [...actividades, nueva];
    }

    function abrirActividad(a) {
        campoActions.setActividad(a);
        navigate(`/campo/actividad/${a.id}`);
    }

    function estadoActividad(a) {
        if (a.fin) return { label: 'Finalizada', cls: 'badge-closed', icon: '✅' };
        if (a.inicio) return { label: 'En curso', cls: 'badge-active', icon: '🟢' };
        return { label: 'Pendiente', cls: 'badge-pending', icon: '⏳' };
    }

    function duracion(a) {
        if (!a.inicio || !a.fin) return null;
        const mins = dayjs(a.fin).diff(dayjs(a.inicio), 'minute');
        return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60}min`;
    }
</script>

<div class="campo-view">
    <!-- Cabecera del trabajo -->
    <div class="trabajo-header">
        <button class="back-btn" on:click={() => navigate('/campo')}>← Trabajos</button>
        <div class="trabajo-meta">
            <h1 class="trabajo-nombre">{trabajo?.nombre ?? `Trabajo #${id}`}</h1>
            {#if trabajo?.fecha}
                <span class="trabajo-fecha">📅 {dayjs(trabajo.fecha).format('DD/MM/YYYY')}</span>
            {/if}
        </div>
    </div>

    <!-- Accesos rápidos -->
    <div class="quick-actions">
        <button class="quick-btn" on:click={() => navigate('/campo/asistencia/lista')}>
            <span class="qa-icon">✅</span><span class="qa-label">Asistencia</span>
        </button>
        <button class="quick-btn" on:click={() => navigate('/campo/ficha')}>
            <span class="qa-icon">🏥</span><span class="qa-label">Ficha Médica</span>
        </button>
        <button class="quick-btn" on:click={() => navigate('/campo/identificacion')}>
            <span class="qa-icon">🪪</span><span class="qa-label">Identificar</span>
        </button>
    </div>

    <!-- Actividades -->
    <div class="section-sub-header">
        <h2 class="sub-title">Actividades</h2>
        <button class="btn-add" on:click={nuevaActividad}>+ Agregar</button>
    </div>

    {#if loading}
        <div class="loading-state">
            <div class="spinner"></div>
            <span>Cargando...</span>
        </div>
    {:else if actividades.length === 0}
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>Sin actividades. Agrega la primera.</p>
            <button class="btn-add-empty" on:click={nuevaActividad}>+ Agregar actividad</button>
        </div>
    {:else}
        <div class="actividades-list">
            {#each actividades as a}
                {@const estado = estadoActividad(a)}
                {@const dur = duracion(a)}
                <button class="actividad-card" on:click={() => abrirActividad(a)}>
                    <div class="actividad-left">
                        <span class="actividad-icon">{estado.icon}</span>
                    </div>
                    <div class="actividad-info">
                        <span class="actividad-nombre">{a.nombre}</span>
                        <div class="actividad-meta">
                            <span class="badge {estado.cls}">{estado.label}</span>
                            {#if dur}<span class="duracion">⏱ {dur}</span>{/if}
                            {#if a.fotos?.length}<span class="foto-count">📷 {a.fotos.length}</span>{/if}
                        </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            {/each}
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
    }
    .trabajo-header {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 24px;
    }
    .back-btn {
        align-self: flex-start;
        background: rgba(255,255,255,0.07);
        border: none;
        color: #94a3b8;
        padding: 7px 14px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        transition: background 0.2s;
    }
    .back-btn:hover { background: rgba(255,255,255,0.12); }
    .trabajo-meta { display: flex; flex-direction: column; gap: 4px; }
    .trabajo-nombre { margin: 0; font-size: 1.4rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.02em; }
    .trabajo-fecha { color: #64748b; font-size: 0.85rem; }

    .quick-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 28px;
    }
    .quick-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 14px 8px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.18s;
        color: inherit;
    }
    .quick-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(110,231,247,0.2); }
    .quick-btn:active { transform: scale(0.97); }
    .qa-icon { font-size: 1.5rem; }
    .qa-label { font-size: 0.72rem; font-weight: 600; color: #94a3b8; text-align: center; font-family: inherit; }

    .section-sub-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }
    .sub-title { margin: 0; font-size: 1rem; font-weight: 700; color: #f1f5f9; }
    .btn-add {
        background: rgba(110,231,247,0.1);
        border: 1px solid rgba(110,231,247,0.25);
        color: #6ee7f7;
        padding: 7px 14px;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
    }
    .btn-add:hover { background: rgba(110,231,247,0.18); }

    .loading-state {
        display: flex; align-items: center; gap: 12px;
        padding: 40px 20px; color: #64748b;
        justify-content: center;
    }
    .spinner {
        width: 24px; height: 24px;
        border: 2px solid rgba(110,231,247,0.2);
        border-top-color: #6ee7f7;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
        text-align: center;
        padding: 40px 20px;
        display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .empty-icon { font-size: 2.5rem; }
    .empty-state p { margin: 0; color: #64748b; font-size: 0.875rem; }
    .btn-add-empty {
        padding: 10px 20px;
        background: rgba(110,231,247,0.08);
        border: 1px dashed rgba(110,231,247,0.3);
        color: #6ee7f7;
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
    }

    .actividades-list { display: flex; flex-direction: column; gap: 8px; }
    .actividad-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.18s;
        text-align: left;
        width: 100%;
        color: inherit;
    }
    .actividad-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(110,231,247,0.2); }
    .actividad-card:active { transform: scale(0.99); }
    .actividad-left { font-size: 1.4rem; flex-shrink: 0; }
    .actividad-info { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .actividad-nombre { font-size: 0.9rem; font-weight: 600; color: #f1f5f9; }
    .actividad-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .badge {
        padding: 2px 8px; border-radius: 20px;
        font-size: 0.7rem; font-weight: 600;
    }
    .badge-active  { background: rgba(34,197,94,0.15); color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
    .badge-pending { background: rgba(234,179,8,0.15);  color: #fde68a; border: 1px solid rgba(234,179,8,0.3); }
    .badge-closed  { background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }
    .duracion, .foto-count { font-size: 0.72rem; color: #64748b; }
    .chevron { color: #475569; flex-shrink: 0; }

    @media (min-width: 1200px) {
        .campo-view { background: transparent; color: #1e293b; }
        .trabajo-nombre, .sub-title { color: #1e293b; }
        .actividad-card { background: #f8fafc; border-color: #e2e8f0; }
        .actividad-card:hover { background: #f1f5f9; border-color: #3b82f6; }
        .actividad-nombre { color: #1e293b; }
        .quick-btn { background: #f8fafc; border-color: #e2e8f0; }
        .quick-btn:hover { background: #f1f5f9; }
        .back-btn { background: #f1f5f9; color: #475569; }
    }
</style>
