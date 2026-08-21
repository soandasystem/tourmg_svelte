<script>
    import { onMount } from 'svelte';
    import { navigate, useLocation } from 'svelte-routing';
    import { authStore } from '../../stores/auth';
    import { deviceStore } from '../../lib/deviceDetect';
    import BottomNav from './BottomNav.svelte';
    import Sidebar from '../Sidebar.svelte';
    import Header from '../Header.svelte';

    const location = useLocation();

    // Protección de ruta: redirigir al login si no está autenticado
    onMount(() => {
        if (!$authStore.isAuthenticated) {
            navigate('/login', { replace: true });
        }
    });

    $: device = $deviceStore;
    $: currentPath = $location.pathname;

    // Usuario autenticado
    $: user = $authStore.user;
</script>

{#if $authStore.isAuthenticated}
    {#if device === 'desktop'}
        <!-- Layout Desktop: sidebar clásico -->
        <div class="campo-desktop">
            <Sidebar activePath={currentPath} />
            <div class="campo-main">
                <Header />
                <main class="campo-content">
                    <div class="container-fluid py-3">
                        <div class="campo-card shadow-sm">
                            <slot />
                        </div>
                    </div>
                </main>
            </div>
        </div>

    {:else if device === 'tablet'}
        <!-- Layout Tablet: header compacto, sin sidebar permanente -->
        <div class="campo-tablet">
            <header class="tablet-header">
                <div class="tablet-header-content">
                    <button class="back-btn" on:click={() => history.back()}>←</button>
                    <span class="app-logo">🗺️ Campo</span>
                    <div class="header-user">
                        <span class="user-avatar">{user?.nombre?.[0] ?? '?'}</span>
                    </div>
                </div>
            </header>
            <main class="tablet-content">
                <slot />
            </main>
            <BottomNav activePath={currentPath} />
        </div>

    {:else}
        <!-- Layout Móvil: fullscreen PWA con bottom nav -->
        <div class="campo-mobile">
            <header class="mobile-header">
                <button class="back-btn-mobile" on:click={() => history.back()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                <span class="app-title-mobile">🗺️ Campo</span>
                <div class="mobile-user-avatar">{user?.nombre?.[0] ?? '?'}</div>
            </header>
            <main class="mobile-content">
                <slot />
            </main>
            <BottomNav activePath={currentPath} />
        </div>
    {/if}
{/if}

<style>
    /* ─── DESKTOP ─── */
    .campo-desktop {
        display: flex;
        min-height: 100vh;
        width: 100%;
        background-color: #f8f9fc;
    }
    .campo-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        overflow-x: hidden;
    }
    .campo-content {
        flex: 1;
        padding: 0 10px;
    }
    .campo-card {
        background: #fff;
        border-radius: 12px;
        border: 1px solid #e3e6f0;
        padding: 24px;
        min-height: calc(100vh - 200px);
    }

    /* ─── TABLET ─── */
    .campo-tablet {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: #f0f4f8;
    }
    .tablet-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
        padding: 0 16px;
        height: 56px;
        display: flex;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    }
    .tablet-header-content {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 12px;
    }
    .app-logo {
        flex: 1;
        color: #e2e8f0;
        font-size: 1.1rem;
        font-weight: 700;
        font-family: 'Inter', system-ui, sans-serif;
        letter-spacing: -0.02em;
    }
    .tablet-content {
        flex: 1;
        padding: 16px;
        padding-bottom: 80px;
        overflow-y: auto;
    }
    .header-user {
        display: flex;
        align-items: center;
    }
    .user-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6ee7f7, #3b82f6);
        color: #0f172a;
        font-weight: 700;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* ─── MÓVIL ─── */
    .campo-mobile {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        min-height: 100dvh;
        background: #0f172a;
    }
    .mobile-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        height: 56px;
        display: flex;
        align-items: center;
        padding: 0 12px;
        gap: 10px;
        position: sticky;
        top: 0;
        z-index: 100;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        padding-top: env(safe-area-inset-top);
    }
    .app-title-mobile {
        flex: 1;
        text-align: center;
        color: #e2e8f0;
        font-size: 1rem;
        font-weight: 700;
        font-family: 'Inter', system-ui, sans-serif;
    }
    .mobile-content {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 80px;
    }
    .back-btn, .back-btn-mobile {
        background: rgba(255,255,255,0.08);
        border: none;
        color: #e2e8f0;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        transition: background 0.2s;
        flex-shrink: 0;
    }
    .back-btn:hover, .back-btn-mobile:hover {
        background: rgba(255,255,255,0.15);
    }
    .mobile-user-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6ee7f7, #3b82f6);
        color: #0f172a;
        font-weight: 700;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
</style>
