<script>
    export let alumno = {};
    export let variant = 'compact'; // 'compact' | 'full'
    export let checked = false;
    export let showCheckbox = false;

    const dispatch = createEventDispatcher ? createEventDispatcher() : null;
    import { createEventDispatcher } from 'svelte';
    const d = createEventDispatcher();

    function formatRut(rut) {
        if (!rut) return '—';
        // Formato: 12.345.678-9
        const clean = rut.replace(/\D/g, '');
        if (clean.length < 2) return rut;
        const dv = clean.slice(-1);
        const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${body}-${dv}`;
    }

    function getInitials(nombre) {
        if (!nombre) return '?';
        return nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    }

    function toggle() {
        d('toggle', { id: alumno.id, checked: !checked });
    }
</script>

{#if variant === 'compact'}
    <div class="alumno-compact {checked ? 'present' : ''}" on:click={showCheckbox ? toggle : null} role={showCheckbox ? 'button' : 'article'}>
        <div class="avatar-compact"
            style="background: hsl({(alumno.id * 47 + 120) % 360}, 55%, 38%)">
            {getInitials(alumno.nombre)}
        </div>
        <div class="info-compact">
            <span class="nombre-compact">{alumno.nombre ?? '—'}</span>
            <span class="rut-compact">{formatRut(alumno.rut)}</span>
        </div>
        {#if showCheckbox}
            <div class="checkbox-campo {checked ? 'checked' : ''}">
                {#if checked}✓{/if}
            </div>
        {/if}
    </div>
{:else}
    <!-- Variant full: tarjeta expandida -->
    <div class="alumno-full">
        <div class="avatar-full" style="background: hsl({(alumno.id * 47 + 120) % 360}, 55%, 30%)">
            {#if alumno.foto_url}
                <img src={alumno.foto_url} alt={alumno.nombre} class="avatar-img" />
            {:else}
                <span class="avatar-initials">{getInitials(alumno.nombre)}</span>
            {/if}
        </div>
        <div class="info-full">
            <h3 class="nombre-full">{alumno.nombre ?? '—'}</h3>
            <p class="rut-full">RUT: {formatRut(alumno.rut)}</p>
            {#if alumno.grupo}<p class="grupo-full">Grupo: <strong>{alumno.grupo}</strong></p>{/if}
            {#if alumno.edad}<p class="dato-full">Edad: {alumno.edad} años</p>{/if}
            {#if alumno.apoderado_nombre}
                <div class="contacto-box">
                    <span class="contacto-label">📞 Apoderado</span>
                    <span class="contacto-nombre">{alumno.apoderado_nombre}</span>
                    {#if alumno.apoderado_fono}
                        <a href="tel:{alumno.apoderado_fono}" class="btn-llamar">
                            {alumno.apoderado_fono}
                        </a>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    /* ─── COMPACT ─── */
    .alumno-compact {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        cursor: default;
        transition: all 0.15s ease;
        user-select: none;
    }
    .alumno-compact[role="button"] { cursor: pointer; }
    .alumno-compact[role="button"]:active { transform: scale(0.99); }
    .alumno-compact.present {
        background: rgba(34,197,94,0.08);
        border-color: rgba(34,197,94,0.25);
    }
    .avatar-compact {
        width: 40px; height: 40px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 0.85rem;
        flex-shrink: 0;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .info-compact {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }
    .nombre-compact {
        color: #e2e8f0;
        font-size: 0.9rem;
        font-weight: 600;
        font-family: 'Inter', system-ui, sans-serif;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .rut-compact {
        color: #64748b;
        font-size: 0.78rem;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .checkbox-campo {
        width: 26px; height: 26px;
        border-radius: 8px;
        border: 2px solid rgba(255,255,255,0.15);
        display: flex; align-items: center; justify-content: center;
        color: #22c55e;
        font-weight: 700;
        font-size: 0.9rem;
        transition: all 0.2s;
        flex-shrink: 0;
    }
    .checkbox-campo.checked {
        background: rgba(34,197,94,0.2);
        border-color: #22c55e;
    }

    /* ─── FULL ─── */
    .alumno-full {
        display: flex;
        gap: 20px;
        padding: 20px;
        background: rgba(255,255,255,0.04);
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        align-items: flex-start;
    }
    .avatar-full {
        width: 72px; height: 72px;
        border-radius: 50%;
        flex-shrink: 0;
        overflow: hidden;
        display: flex; align-items: center; justify-content: center;
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initials {
        color: #fff;
        font-size: 1.5rem;
        font-weight: 700;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .info-full { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .nombre-full {
        margin: 0;
        color: #f1f5f9;
        font-size: 1.15rem;
        font-weight: 700;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .rut-full, .grupo-full, .dato-full {
        margin: 0;
        color: #94a3b8;
        font-size: 0.875rem;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .rut-full strong, .grupo-full strong { color: #cbd5e1; }
    .contacto-box {
        margin-top: 8px;
        padding: 10px 12px;
        background: rgba(59,130,246,0.1);
        border-radius: 10px;
        border: 1px solid rgba(59,130,246,0.2);
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .contacto-label { color: #60a5fa; font-size: 0.78rem; font-weight: 600; font-family: 'Inter', system-ui, sans-serif; }
    .contacto-nombre { color: #e2e8f0; font-size: 0.875rem; font-family: 'Inter', system-ui, sans-serif; }
    .btn-llamar {
        color: #6ee7f7;
        font-size: 0.9rem;
        font-weight: 600;
        text-decoration: none;
        font-family: 'Inter', system-ui, sans-serif;
    }
</style>
