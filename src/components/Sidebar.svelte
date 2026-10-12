<script>
    import { link } from "svelte-routing";
    import { tenantStore } from "../stores/tenant";
    import { authStore } from "../stores/auth";
    import { hasPermission } from "../lib/utils";
    import { secureStorage } from "../lib/secureStore";
    import { isSidebarOpen, toggleSidebar } from "../stores/sidebarStore";

    $: userData = $authStore.user || secureStorage.getItem("_us_") || {};
    $: rol = userData?.rol_id;

    export let activePath = "";

    $: idcl = $tenantStore;
    $: baseUrl = `/admin`;
    $: user = $authStore.user;

    // Estado para controlar la apertura de los submenús
    let openSubmenu = ""; // values: 'config', 'integraciones', 'gds', 'ventas', 'pagos'

    // Abrir automáticamente el submenú correspondiente si estamos en alguna de sus rutas
    $: {
        openSubmenu = "";
        if (
            [
                `${baseUrl}/company`,
                `${baseUrl}/programs`,
                `${baseUrl}/roles`,
                `${baseUrl}/school`,
                `${baseUrl}/users`,
            ].some((p) => activePath.startsWith(p))
        ) {
            openSubmenu = "config";
        } else if (
            [`${baseUrl}/gatewaysconfig`, `${baseUrl}/gateways`].some((p) =>
                activePath.startsWith(p),
            )
        ) {
            openSubmenu = "integraciones";
        } else if (
            [`${baseUrl}/gdsair`, `${baseUrl}/gdshotel`].some((p) =>
                activePath.startsWith(p),
            )
        ) {
            openSubmenu = "gds";
        } else if (
            [
                `${baseUrl}/quotes`,
                `${baseUrl}/sales`,
                `${baseUrl}/course`,
                `${baseUrl}/voucher`,
                `${baseUrl}/salesreport`,
            ].some((p) => activePath.startsWith(p))
        ) {
            openSubmenu = "ventas";
        } else if (
            [`${baseUrl}/entry`, `${baseUrl}/listpay`].some((p) =>
                activePath.startsWith(p),
            )
        ) {
            openSubmenu = "pagos";
        }
    }

    // Función toggle para submenús: asegura que sólo uno esté abierto a la vez
    const toggleSubmenu = (name) => {
        openSubmenu = openSubmenu === name ? "" : name;
    };

    const toggleConfig = () => toggleSubmenu("config");
    const toggleIntegraciones = () => toggleSubmenu("integraciones");
    const toggleGDS = () => toggleSubmenu("gds");
    const toggleVentas = () => toggleSubmenu("ventas");
    const togglePagos = () => toggleSubmenu("pagos");
</script>

{#if !$isSidebarOpen}
    <button
        class="hamburger-btn floating"
        on:click={toggleSidebar}
        title="Abrir menú"
        aria-label="Abrir menú"
    >
        <i class="fa fa-bars"></i>
    </button>
{/if}

<div class="sidebar-menu {$isSidebarOpen ? '' : 'closed'}">
    <div class="sidebar-menu-header">
        <div class="brand-text">MENÚ PRINCIPAL</div>
        <button
            class="hamburger-btn"
            on:click={toggleSidebar}
            title="Cerrar menú"
            aria-label="Cerrar menú"
        >
            <i class="fa fa-bars"></i>
        </button>
    </div>
    <div class="sidebar-menu-inner">
        <ul id="main-menu" class="main-menu">
            <!-- Home -->
            <li
                class={activePath === `${baseUrl}/index` ||
                activePath === `${baseUrl}/`
                    ? "active"
                    : ""}
            >
                <a href="{baseUrl}/index" use:link>
                    <i class="fa fa-home"></i>
                    <span class="title">Home</span>
                </a>
            </li>

            <!-- Estadísticas (Dashboard) -->
            {#if hasPermission(rol, "dashboard")}
                <li
                    class={activePath === `${baseUrl}/dashboard`
                        ? "active"
                        : ""}
                >
                    <a href="{baseUrl}/dashboard" use:link>
                        <i class="fa fa-bar-chart"></i>
                        <span class="title">Estadísticas</span>
                    </a>
                </li>
            {/if}

            <li class="menu-divider">Módulos</li>

            <!-- Configuración Base -->
            {#if hasPermission(rol, "company") || hasPermission(rol, "programas") || hasPermission(rol, "roles") || hasPermission(rol, "school") || hasPermission(rol, "users")}
                <li
                    class="has-sub {openSubmenu === 'config'
                        ? 'active opened'
                        : ''}"
                >
                    <a href="#!" on:click|preventDefault={toggleConfig}>
                        <i class="fa fa-fw fa-bars"></i>
                        <span class="title">Configuración Base</span>
                        <i class="fa fa-chevron-right chevron"></i>
                    </a>
                    {#if openSubmenu === "config"}
                        <ul class="sub-menu">
                            {#if hasPermission(rol, "company")}
                                <li
                                    class={activePath.includes("/company")
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/company" use:link>
                                        <span class="title">Empresa</span>
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "programas")}
                                <li
                                    class={activePath === `${baseUrl}/programs`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/programs" use:link>
                                        <span class="title">Programas</span>
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "roles")}
                                <li
                                    class={activePath === `${baseUrl}/roles`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/roles" use:link>
                                        <span class="title">Roles</span>
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "school")}
                                <li
                                    class={activePath === `${baseUrl}/school`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/school" use:link>
                                        <span class="title">Colegios</span>
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "users")}
                                <li
                                    class={activePath === `${baseUrl}/users`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/users" use:link>
                                        <span class="title">Usuarios</span>
                                    </a>
                                </li>
                            {/if}
                        </ul>
                    {/if}
                </li>
            {/if}

            <!-- Integraciones -->
            {#if hasPermission(rol, "gateways") || hasPermission(rol, "gatewaysconfig")}
                <li
                    class="has-sub {openSubmenu === 'integraciones'
                        ? 'active opened'
                        : ''}"
                >
                    <a href="#!" on:click|preventDefault={toggleIntegraciones}>
                        <i class="fa fa-fw fa-object-group"></i>
                        <span class="title">Integraciones</span>
                        <i class="fa fa-chevron-right chevron"></i>
                    </a>
                    {#if openSubmenu === "integraciones"}
                        <ul class="sub-menu">
                            {#if hasPermission(rol, "gatewaysconfig")}
                                <li
                                    class={activePath ===
                                    `${baseUrl}/gatewaysconfig`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/gatewaysconfig" use:link>
                                        <span class="title"
                                            >Configuracion Pasarelas</span
                                        >
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "gateways")}
                                <li
                                    class={activePath === `${baseUrl}/gateways`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/gateways" use:link>
                                        <span class="title"
                                            >Pasarelas de Pago</span
                                        >
                                    </a>
                                </li>
                            {/if}
                        </ul>
                    {/if}
                </li>
            {/if}

            <!-- GDS Amadeus -->
            {#if hasPermission(rol, "gdsair") || hasPermission(rol, "gdshotel")}
                <li
                    class="has-sub {openSubmenu === 'gds'
                        ? 'active opened'
                        : ''}"
                >
                    <a href="#!" on:click|preventDefault={toggleGDS}>
                        <i class="fa fa-fw fa-plane"></i>
                        <span class="title">GDS Amadeus</span>
                        <i class="fa fa-chevron-right chevron"></i>
                    </a>
                    {#if openSubmenu === "gds"}
                        <ul class="sub-menu">
                            {#if hasPermission(rol, "gdsair")}
                                <li
                                    class={activePath === `${baseUrl}/gdsair`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/gdsair" use:link>
                                        <span class="title">Ticket Aereo</span>
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "gdshotel")}
                                <li
                                    class={activePath === `${baseUrl}/gdshotel`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/gdshotel" use:link>
                                        <span class="title">Hoteles</span>
                                    </a>
                                </li>
                            {/if}
                        </ul>
                    {/if}
                </li>
            {/if}

            <!-- Ventas -->
            {#if hasPermission(rol, "sales") || hasPermission(rol, "course") || hasPermission(rol, "salesreport") || hasPermission(rol, "quotes") || hasPermission(rol, "voucher")}
                <li
                    class="has-sub {openSubmenu === 'ventas'
                        ? 'active opened'
                        : ''}"
                >
                    <a href="#!" on:click|preventDefault={toggleVentas}>
                        <i class="fa fa-fw fa-ticket"></i>
                        <span class="title">Ventas</span>
                        <i class="fa fa-chevron-right chevron"></i>
                    </a>
                    {#if openSubmenu === "ventas"}
                        <ul class="sub-menu">
                            {#if hasPermission(rol, "quotes")}
                                <li
                                    class={activePath === `${baseUrl}/quotes`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/quotes" use:link>
                                        <span class="title"
                                            >Cotizacion Programas</span
                                        >
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "sales")}
                                <li
                                    class={activePath === `${baseUrl}/sales`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/sales" use:link>
                                        <span class="title"
                                            >Venta Programas</span
                                        >
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "course")}
                                <li
                                    class={activePath === `${baseUrl}/course`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/course" use:link>
                                        <span class="title">Pasajeros</span>
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "voucher")}
                                <li
                                    class={activePath === `${baseUrl}/voucher`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/voucher" use:link>
                                        <span class="title"
                                            >Ingreso Voucher</span
                                        >
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "salesreport")}
                                <li
                                    class={activePath ===
                                    `${baseUrl}/salesreport`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/salesreport" use:link>
                                        <span class="title"
                                            >Comisiones Vendedor</span
                                        >
                                    </a>
                                </li>
                            {/if}
                        </ul>
                    {/if}
                </li>
            {/if}

            <!-- Pagos -->
            {#if hasPermission(rol, "entry") || hasPermission(rol, "listpay")}
                <li
                    class="has-sub {openSubmenu === 'pagos'
                        ? 'active opened'
                        : ''}"
                >
                    <a href="#!" on:click|preventDefault={togglePagos}>
                        <i class="fa fa-fw fa-credit-card"></i>
                        <span class="title">Pagos</span>
                        <i class="fa fa-chevron-right chevron"></i>
                    </a>
                    {#if openSubmenu === "pagos"}
                        <ul class="sub-menu">
                            {#if hasPermission(rol, "entry")}
                                <li
                                    class={activePath === `${baseUrl}/entry`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/entry" use:link>
                                        <span class="title">Ingreso</span>
                                    </a>
                                </li>
                            {/if}
                            {#if hasPermission(rol, "listpay")}
                                <li
                                    class={activePath === `${baseUrl}/listpay`
                                        ? "active"
                                        : ""}
                                >
                                    <a href="{baseUrl}/listpay" use:link>
                                        <span class="title"
                                            >Listado de Pagos</span
                                        >
                                    </a>
                                </li>
                            {/if}
                        </ul>
                    {/if}
                </li>
            {/if}

            <!-- Módulo Campo 
            <li class={activePath.startsWith("/campo") ? "active" : ""}>
                <a href="/campo" use:link>
                    <i class="fa fa-compass"></i>
                    <span class="title">Campo</span>
                </a>
            </li>
        -->
        </ul>
    </div>
</div>

<style>
    /* Contenedor principal del Sidebar */
    .sidebar-menu {
        width: 260px;
        min-width: 260px;
        background-color: #0c0d12;
        color: #ffffff;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        transition:
            width 0.3s ease,
            min-width 0.3s ease;
        position: relative;
        z-index: 100;
        box-shadow: 3px 0 16px rgba(0, 0, 0, 0.45);
        user-select: none;
    }

    .sidebar-menu.closed {
        width: 0;
        min-width: 0;
        overflow: hidden;
    }

    .hamburger-btn {
        background: none;
        border: none;
        color: #ffffff;
        font-size: 1.4rem;
        cursor: pointer;
        padding: 0.5rem;
        transition:
            color 0.2s ease,
            transform 0.2s ease;
    }
    .hamburger-btn:hover {
        color: #38bdf8;
        transform: scale(1.1);
    }
    .hamburger-btn.floating {
        position: fixed;
        top: 14px;
        left: 14px;
        z-index: 1050;
        background-color: #0c0d12;
        color: #ffffff;
        border: 1px solid #1e2533;
        border-radius: 8px;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        transition: all 0.2s ease;
    }
    .hamburger-btn.floating:hover {
        background-color: #161922;
        color: #38bdf8;
        border-color: #38bdf8;
        transform: scale(1.08);
    }

    /* Cabecera del Sidebar */
    .sidebar-menu-header {
        height: 70px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 25px;
        background-color: #06070a;
        border-bottom: 1px solid #1a1e28;
        margin-bottom: 8px;
    }

    .brand-text {
        color: #ffffff;
        font-weight: 700;
        font-size: 0.85rem;
        letter-spacing: 1.5px;
        text-transform: uppercase;
    }

    .sidebar-menu-inner {
        flex: 1;
        overflow-y: auto;
    }

    /* Divisores de sección */
    .menu-divider {
        padding: 18px 25px 8px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 1.5px;
    }

    /* Menú Principal */
    .main-menu {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .main-menu li {
        position: relative;
    }

    .main-menu li a {
        display: flex;
        align-items: center;
        padding: 12px 25px;
        color: #ffffff;
        text-decoration: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 0.88rem;
        font-weight: 500;
        border-left: 3px solid transparent;
    }

    .main-menu li a i {
        width: 20px;
        margin-right: 12px;
        font-size: 1rem;
        text-align: center;
        color: #cbd5e1;
        transition: all 0.2s ease;
    }

    /* Hover en opciones principales: azul vibrante y halo de fondo */
    .main-menu li a:hover {
        background-color: rgba(56, 189, 248, 0.12);
        color: #38bdf8 !important;
        border-left-color: #38bdf8;
    }

    .main-menu li a:hover i {
        color: #38bdf8 !important;
        transform: scale(1.15);
    }

    /* Opción activa principal */
    .main-menu li.active > a {
        background-color: rgba(56, 189, 248, 0.18);
        color: #38bdf8 !important;
        border-left-color: #38bdf8;
        font-weight: 600;
    }

    .main-menu li.active > a i {
        color: #38bdf8 !important;
    }

    /* Submenús */
    .sub-menu {
        list-style: none;
        padding: 6px 0;
        margin: 0;
        background-color: #06070a;
        border-top: 1px solid #141822;
        border-bottom: 1px solid #141822;
        box-shadow: inset 3px 0 0 rgba(56, 189, 248, 0.25);
    }

    .sub-menu li a {
        padding: 10px 25px 10px 52px;
        font-size: 0.82rem;
        color: #ffffff !important;
        font-weight: 400;
        border-left: 3px solid transparent;
        transition: all 0.2s ease;
    }

    /* Hover en submenú */
    .sub-menu li a:hover {
        background-color: rgba(56, 189, 248, 0.15);
        color: #38bdf8 !important;
        border-left-color: #38bdf8;
        padding-left: 56px;
    }

    /* Submenú activo */
    .sub-menu li.active a {
        background-color: rgba(56, 189, 248, 0.2);
        color: #38bdf8 !important;
        border-left-color: #38bdf8;
        font-weight: 600;
    }

    /* Icono Chevron / flecha */
    .chevron {
        font-size: 11px !important;
        margin-left: auto;
        color: #94a3b8;
        transition:
            transform 0.3s ease,
            color 0.2s ease;
    }

    .main-menu li a:hover .chevron {
        color: #38bdf8;
    }

    li.opened > a .chevron {
        color: #38bdf8;
        transform: rotate(90deg);
    }

    /* Custom scrollbar para el sidebar */
    .sidebar-menu::-webkit-scrollbar,
    .sidebar-menu-inner::-webkit-scrollbar {
        width: 5px;
    }
    .sidebar-menu::-webkit-scrollbar-track,
    .sidebar-menu-inner::-webkit-scrollbar-track {
        background: #06070a;
    }
    .sidebar-menu::-webkit-scrollbar-thumb,
    .sidebar-menu-inner::-webkit-scrollbar-thumb {
        background: #1e293b;
        border-radius: 4px;
    }
    .sidebar-menu::-webkit-scrollbar-thumb:hover,
    .sidebar-menu-inner::-webkit-scrollbar-thumb:hover {
        background: #38bdf8;
    }
</style>
