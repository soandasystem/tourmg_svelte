<script>
    import { navigate } from 'svelte-routing';
    import { authStore } from '../../../stores/auth';
    import { campoActions } from '../../../stores/campoStore';
    import api from '../../../lib/apis';
    import Swal from 'sweetalert2';

    $: user = $authStore.user;

    let form = {
        nombre: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        grupo_id: '',
    };

    let grupos = [];
    let loading = false;
    let loadingGrupos = true;

    // Cargar grupos disponibles
    import { onMount } from 'svelte';
    onMount(async () => {
        const schema = user?.schema ?? 'global';
        const res = await api.getData('campo/grupos', '', '', '', schema);
        if (res.status === 'success') grupos = res.data ?? [];
        loadingGrupos = false;
    });

    async function guardar() {
        if (!form.nombre.trim()) {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El nombre del trabajo es obligatorio', confirmButtonColor: '#3b82f6' });
            return;
        }

        loading = true;
        const schema = user?.schema ?? 'global';
        const res = await api.setData('campo/trabajos', form, '', '', schema);

        if (res.status === 'success') {
            const nuevo = res.data;
            campoActions.setTrabajo(nuevo);
            Swal.fire({ icon: 'success', title: '¡Trabajo creado!', timer: 1500, showConfirmButton: false });
            setTimeout(() => navigate(`/campo/trabajo/${nuevo?.id ?? 'nuevo'}`), 1600);
        } else {
            // Si no hay backend aún, navegar igual con datos locales
            const localTrabajo = { id: Date.now(), ...form, estado: 'pendiente' };
            campoActions.setTrabajo(localTrabajo);
            navigate(`/campo/trabajo/${localTrabajo.id}`);
        }
        loading = false;
    }
</script>

<div class="campo-view">
    <div class="form-header">
        <button class="back-btn" on:click={() => navigate('/campo')}>← Volver</button>
        <h1 class="form-title">Nuevo Trabajo</h1>
    </div>

    <form class="campo-form" on:submit|preventDefault={guardar}>
        <div class="form-group">
            <label for="nombre">Nombre del trabajo *</label>
            <input
                id="nombre"
                type="text"
                bind:value={form.nombre}
                placeholder="Ej: Excursión Cajón del Maipo"
                class="campo-input"
                required
            />
        </div>

        <div class="form-group">
            <label for="fecha">Fecha</label>
            <input
                id="fecha"
                type="date"
                bind:value={form.fecha}
                class="campo-input"
            />
        </div>

        <div class="form-group">
            <label for="grupo">Grupo de alumnos</label>
            {#if loadingGrupos}
                <div class="select-loading">Cargando grupos...</div>
            {:else}
                <select id="grupo" bind:value={form.grupo_id} class="campo-input">
                    <option value="">— Sin grupo asignado —</option>
                    {#each grupos as g}
                        <option value={g.id}>{g.nombre}</option>
                    {/each}
                </select>
            {/if}
        </div>

        <div class="form-group">
            <label for="desc">Descripción (opcional)</label>
            <textarea
                id="desc"
                bind:value={form.descripcion}
                rows="3"
                placeholder="Notas o descripción del trabajo..."
                class="campo-input campo-textarea"
            ></textarea>
        </div>

        <button type="submit" class="btn-guardar" disabled={loading}>
            {#if loading}
                <div class="spinner-sm"></div> Guardando...
            {:else}
                ✅ Crear Trabajo
            {/if}
        </button>
    </form>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .campo-view {
        padding: 16px;
        font-family: 'Inter', system-ui, sans-serif;
        background: #0f172a;
        min-height: 100%;
        color: #e2e8f0;
    }
    .form-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 28px;
    }
    .back-btn {
        background: rgba(255,255,255,0.07);
        border: none;
        color: #94a3b8;
        padding: 8px 14px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 0.875rem;
        font-family: inherit;
        transition: background 0.2s;
    }
    .back-btn:hover { background: rgba(255,255,255,0.12); }
    .form-title {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 700;
        color: #f1f5f9;
    }
    .campo-form {
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-width: 520px;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .form-group label {
        font-size: 0.82rem;
        font-weight: 600;
        color: #94a3b8;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }
    .campo-input {
        padding: 12px 14px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: #f1f5f9;
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        width: 100%;
        box-sizing: border-box;
    }
    .campo-input:focus {
        border-color: #6ee7f7;
        box-shadow: 0 0 0 3px rgba(110,231,247,0.1);
    }
    .campo-input option { background: #1e293b; }
    .campo-textarea { resize: vertical; min-height: 80px; }
    .select-loading {
        padding: 12px 14px;
        color: #64748b;
        font-size: 0.875rem;
        border: 1px dashed rgba(255,255,255,0.1);
        border-radius: 10px;
    }
    .btn-guardar {
        margin-top: 8px;
        padding: 14px;
        background: linear-gradient(135deg, #6ee7f7, #3b82f6);
        border: none;
        border-radius: 12px;
        color: #0f172a;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: inherit;
    }
    .btn-guardar:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(110,231,247,0.3); }
    .btn-guardar:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner-sm {
        width: 16px; height: 16px;
        border: 2px solid rgba(15,23,42,0.3);
        border-top-color: #0f172a;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (min-width: 1200px) {
        .campo-view { background: transparent; color: #1e293b; }
        .form-title { color: #1e293b; }
        .campo-input {
            background: #f8fafc;
            border-color: #e2e8f0;
            color: #1e293b;
        }
        .campo-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .back-btn { background: #f1f5f9; color: #475569; }
        .form-group label { color: #64748b; }
    }
</style>
