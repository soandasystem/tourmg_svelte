<script>
    import { onMount } from 'svelte';
    import { navigate } from 'svelte-routing';
    import { authStore } from '../../stores/auth';
    import { campoStore, campoActions } from '../../stores/campoStore';
    import api from '../../lib/apis';
    import dayjs from 'dayjs';

    let trabajos = [];
    let loading = true;
    let error = '';

    $: user = $authStore.user;

    onMount(async () => {
        await cargarTrabajos();
    });

    async function cargarTrabajos() {
        loading = true;
        error = '';
        try {
            const schema = user?.schema ?? 'global';
            const res = await api.getData('campo/trabajos', '', '', '', schema);
            if (res.status === 'success') {
                trabajos = res.data ?? [];
            } else {
                // Si el endpoint no existe aún, mostramos lista vacía
                trabajos = [];
            }
        } catch (e) {
            trabajos = [];
        } finally {
            loading = false;
        }
    }

    function abrirTrabajo(t) {
        campoActions.setTrabajo(t);
        navigate(`/campo/trabajo/${t.id}`);
    }

    function estadoBadge(estado) {
        const map = {
            activo: { label: 'Activo', cls: 'badge-active' },
            pendiente: { label: 'Pendiente', cls: 'badge-pending' },
            cerrado: { label: 'Cerrado', cls: 'badge-closed' },
        };
        return map[estado] ?? { label: estado, cls: 'badge-pending' };
    }
</script>

<div class="campo-view">
    <!-- Header de sección -->
    <div class="section-header">
        <div class="section-title-wrap">
            <h1 class="section-title">🗺️ Mis Trabajos</h1>
            <p class="section-sub">Salidas y excursiones asignadas</p>
        </div>
        <button class="btn-nuevo" on:click={() => navigate('/campo/trabajo/nueva')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo
        </button>
    </div>

    {#if loading}
        <div class="loading-state">
            <div class="spinner"></div>
            <span>Cargando trabajos...</span>
        </div>
    {:else if trabajos.length === 0}
        <div class="empty-state">
            <div class="empty-icon">🗺️</div>
            <h3>Sin trabajos asignados</h3>
            <p>Crea un nuevo trabajo para comenzar</p>
            <button class="btn-nuevo-empty" on:click={() => navigate('/campo/trabajo/nueva')}>
                + Crear primer trabajo
            </button>
        </div>
    {:else}
        <div class="trabajos-list">
            {#each trabajos as t}
                {@const badge = estadoBadge(t.estado)}
                <button class="trabajo-card" on:click={() => abrirTrabajo(t)}>
                    <div class="trabajo-icon">🎯</div>
                    <div class="trabajo-info">
                        <span class="trabajo-nombre">{t.nombre}</span>
                        <span class="trabajo-fecha">
                            📅 {t.fecha ? dayjs(t.fecha).format('DD/MM/YYYY') : '—'}
                        </span>
                        {#if t.grupo}<span class="trabajo-grupo">👥 {t.grupo}</span>{/if}
                    </div>
                    <div class="trabajo-right">
                        <span class="badge {badge.cls}">{badge.label}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </div>
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    .campo-view {
        padding: 16px;
        min-height: 100%;
        font-family: 'Inter', system-ui, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
    }

    .section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 24px;
        gap: 12px;
    }
    .section-title {
        margin: 0 0 4px;
        font-size: 1.5rem;
        font-weight: 800;
        color: #f1f5f9;
        letter-spacing: -0.03em;
    }
    .section-sub {
        margin: 0;
        color: #64748b;
        font-size: 0.85rem;
    }

    .btn-nuevo {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        background: linear-gradient(135deg, #6ee7f7, #3b82f6);
        color: #0f172a;
        border: none;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
        font-family: 'Inter', system-ui, sans-serif;
        flex-shrink: 0;
    }
    .btn-nuevo:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(110,231,247,0.35); }
    .btn-nuevo:active { transform: scale(0.97); }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 60px 20px;
        color: #64748b;
    }
    .spinner {
        width: 36px; height: 36px;
        border: 3px solid rgba(110,231,247,0.2);
        border-top-color: #6ee7f7;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
        text-align: center;
        padding: 60px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    .empty-icon { font-size: 3.5rem; }
    .empty-state h3 { margin: 0; color: #f1f5f9; font-size: 1.1rem; }
    .empty-state p { margin: 0; color: #64748b; font-size: 0.875rem; }
    .btn-nuevo-empty {
        margin-top: 8px;
        padding: 12px 24px;
        background: rgba(110,231,247,0.1);
        border: 1px solid rgba(110,231,247,0.3);
        color: #6ee7f7;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .btn-nuevo-empty:hover { background: rgba(110,231,247,0.18); }

    .trabajos-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .trabajo-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        width: 100%;
        color: inherit;
    }
    .trabajo-card:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(110,231,247,0.2);
        transform: translateY(-1px);
    }
    .trabajo-card:active { transform: scale(0.99); }
    .trabajo-icon { font-size: 1.6rem; flex-shrink: 0; }
    .trabajo-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }
    .trabajo-nombre {
        font-size: 0.95rem;
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .trabajo-fecha, .trabajo-grupo {
        font-size: 0.78rem;
        color: #64748b;
    }
    .trabajo-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        color: #475569;
    }
    .badge {
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.72rem;
        font-weight: 600;
        white-space: nowrap;
    }
    .badge-active  { background: rgba(34,197,94,0.15);  color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
    .badge-pending { background: rgba(234,179,8,0.15);  color: #fde68a; border: 1px solid rgba(234,179,8,0.3); }
    .badge-closed  { background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }

    /* Ajuste para desktop (fondo blanco del MainLayout) */
    @media (min-width: 1200px) {
        .campo-view {
            background: transparent;
            color: #1e293b;
        }
        .section-title { color: #1e293b; }
        .section-sub { color: #64748b; }
        .trabajo-nombre { color: #1e293b; }
        .trabajo-card {
            background: #f8fafc;
            border-color: #e2e8f0;
        }
        .trabajo-card:hover { background: #f1f5f9; border-color: #3b82f6; }
        .btn-nuevo-empty { color: #3b82f6; border-color: #3b82f6; background: rgba(59,130,246,0.06); }
    }
</style>
