<script>
    import { link } from "svelte-routing";
    import { tenantStore } from "../stores/tenant";
    import { authStore } from "../stores/auth";
    import { hasPermission } from "../lib/utils";
    import { secureStorage } from "../lib/secureStore";

    const userData = secureStorage.getItem("_us_");
    const rol = userData.rol_id;

    export let activePath = "";

    $: idcl = $tenantStore;
    $: baseUrl = `/admin`;
    $: user = $authStore.user;

    // Estado para controlar la apertura de los submenús y visibilidad del sidebar
    let isSidebarOpen = true;
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
    // Función toggle para el sidebar
    const toggleSidebar = () => {
        isSidebarOpen = !isSidebarOpen;
    };

    const toggleConfig = () => toggleSubmenu("config");
    const toggleIntegraciones = () => toggleSubmenu("integraciones");
    const toggleGDS = () => toggleSubmenu("gds");
    const toggleVentas = () => toggleSubmenu("ventas");
    const togglePagos = () => toggleSubmenu("pagos");
</script>

<!-- <div class="sidebar-menu"> -->
<div class="sidebar-menu {isSidebarOpen ? '' : 'closed'}">
    <div class="sidebar-menu-header">
        <div class="brand-text">MENÚ PRINCIPAL</div>
        <button
            class="hamburger-btn"
            on:click={toggleSidebar}
            aria-label="Toggle menu"
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
                    class="has-sub {menuIntegracionesOpen
                        ? 'active opened'
                        : ''}"
                >
                    <a href="#!" on:click|preventDefault={toggleIntegraciones}>
                        <i class="fa fa-fw fa-code-merge"></i>
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
                        <i class="fa fa-fw fa-ticket-alt"></i>
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
                        <i class="fa fa-fw fa-money-check"></i>
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
        </ul>
    </div>
    {#if !isSidebarOpen}
        <button
            class="hamburger-btn floating"
            on:click={toggleSidebar}
            aria-label="Open menu"
        >
            <i class="fa fa-bars"></i>
        </button>
    {/if}
</div>

<style>
    .sidebar-menu.closed {
        width: 0;
        overflow: hidden;
    }
    .hamburger-btn {
        background: none;
        border: none;
        color: #fff;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
    }
    .hamburger-btn.floating {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 200;
    }

    .sidebar-menu-header {
        height: 70px;
        display: flex;
        align-items: center;
        padding: 0 25px;
        background-color: #242627;
        margin-bottom: 10px;
    }

    .brand-text {
        color: #fff;
        font-weight: 700;
        font-size: 0.8rem;
        letter-spacing: 1px;
        opacity: 0.8;
    }

    .sidebar-menu-inner {
        flex: 1;
    }

    .menu-divider {
        padding: 15px 25px 10px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #555;
        letter-spacing: 1px;
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
        color: #aaabae;
        text-decoration: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 0.85rem;
        border-left: 3px solid transparent;
    }

    .main-menu li a i {
        width: 20px;
        margin-right: 12px;
        font-size: 1rem;
        text-align: center;
        transition: transform 0.2s ease;
    }

    .main-menu li.active > a,
    .main-menu li a:hover {
        background-color: rgba(255, 255, 255, 0.05);
        color: #fff;
    }

    .main-menu li.active > a {
        background-color: #313334;
        border-left-color: #4e73df;
    }

    .main-menu li.active > a i {
        color: #4e73df;
    }

    /* Submenús */
    .sub-menu {
        list-style: none;
        padding: 5px 0;
        background-color: #242627;
    }

    .sub-menu li a {
        padding-left: 57px;
        font-size: 0.8rem;
        border-left: none;
    }

    .sub-menu li a:hover {
        background-color: rgba(255, 255, 255, 0.03);
    }

    .sub-menu li.active a {
        color: #fff;
        font-weight: 600;
    }

    .chevron {
        font-size: 10px !important;
        margin-left: auto;
        color: #aaabae;
        opacity: 0.5;
        transition: transform 0.3s ease;
    }

    li.opened > a .chevron {
        opacity: 1;
        transform: rotate(90deg);
        color: #fff;
    }

    /* Custom scrollbar para el sidebar */
    .sidebar-menu::-webkit-scrollbar {
        width: 4px;
    }
    .sidebar-menu::-webkit-scrollbar-track {
        background: #2c2e2f;
    }
    .sidebar-menu::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }
    .sidebar-menu::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
</style>
