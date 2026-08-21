<script>
    import { navigate } from 'svelte-routing';
    export let activePath = '';

    const navItems = [
        { path: '/campo', icon: '🗺️', label: 'Trabajos' },
        { path: '/campo/asistencia/lista', icon: '✅', label: 'Asistencia' },
        { path: '/campo/ficha', icon: '🏥', label: 'Ficha' },
        { path: '/campo/identificacion', icon: '🪪', label: 'Identificar' },
    ];

    function isActive(path) {
        return activePath.startsWith(path) && (path !== '/campo' || activePath === '/campo' || activePath.startsWith('/campo/trabajo'));
    }
</script>

<nav class="bottom-nav">
    {#each navItems as item}
        <button
            class="nav-item {isActive(item.path) ? 'active' : ''}"
            on:click={() => navigate(item.path)}
        >
            <span class="nav-icon">{item.icon}</span>
            <span class="nav-label">{item.label}</span>
        </button>
    {/each}
</nav>

<style>
    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 64px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: space-around;
        border-top: 1px solid rgba(255,255,255,0.08);
        z-index: 1000;
        padding-bottom: env(safe-area-inset-bottom);
    }

    .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px 4px;
        border-radius: 12px;
        transition: all 0.2s ease;
        color: rgba(255,255,255,0.45);
        margin: 4px;
    }

    .nav-item.active {
        color: #6ee7f7;
        background: rgba(110, 231, 247, 0.1);
    }

    .nav-item:active {
        transform: scale(0.93);
    }

    .nav-icon {
        font-size: 1.4rem;
        line-height: 1;
    }

    .nav-label {
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        font-family: 'Inter', system-ui, sans-serif;
    }
</style>
