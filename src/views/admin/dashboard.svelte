<script>
    import { onMount } from "svelte";
    import dayjs from "dayjs";
    import { secureStorage } from "../../lib/secureStore";
    import { formatCurrency } from "../../lib/utils";
    import api from "../../lib/apis.js";

    // Datos de sesión
    const userData = secureStorage.getItem("_us_") || {};
    const schemaName = userData.schema || "global";
    const currentCompanyId = userData.company || 0;

    // Selector de Años (Año actual y 4 años atrás -> 5 años)
    const currentYear = dayjs().year();
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
    let selectedYear = currentYear;

    // Estados de carga y datos
    let loading = true;
    let sales = [];
    let quotes = [];
    let sellers = [];
    let programs = [];

    // Carga de datos según el año seleccionado
    const fetchDashboardData = async () => {
        loading = true;
        try {
            const startDate = `${selectedYear}-01-01`;
            const endDate = `${selectedYear}-12-31`;
            const filterParams = `start_date=${startDate}&end_date=${endDate}`;

            const [salesRes, quotesRes, usersRes, programsRes] = await Promise.all([
                api.getData("sale/informe", "", filterParams, "", schemaName),
                api.getData("quotes", "", filterParams, "", schemaName),
                api.getData("users", "", "active=1&company_id=" + currentCompanyId, "", schemaName),
                api.getData("programs", "", "active=1&company_id=" + currentCompanyId, "", schemaName),
            ]);

            if (salesRes.status === "success" && Array.isArray(salesRes.data)) {
                sales = salesRes.data;
            } else {
                sales = [];
            }

            if (quotesRes.status === "success" && Array.isArray(quotesRes.data)) {
                quotes = quotesRes.data;
            } else {
                quotes = [];
            }

            if (usersRes.status === "success" && Array.isArray(usersRes.data)) {
                sellers = usersRes.data;
            } else {
                sellers = [];
            }

            if (programsRes.status === "success" && Array.isArray(programsRes.data)) {
                programs = programsRes.data;
            } else {
                programs = [];
            }
        } catch (error) {
            console.error("Error al cargar datos del dashboard:", error);
        } finally {
            loading = false;
        }
    };

    onMount(() => {
        fetchDashboardData();
    });

    const handleYearChange = (event) => {
        selectedYear = Number(event.target.value);
        fetchDashboardData();
    };

    // --- RECTIFICACIONES Y CÁLCULOS REACTIVOS ---

    // Ventas por Tipo (GE: Giras de Estudio, VG: Salidas / Viajes Grupales)
    $: salesGE = sales.filter((s) => (s.type_sale || "").toUpperCase() === "GE");
    $: salesVG = sales.filter((s) => (s.type_sale || "").toUpperCase() !== "GE");

    $: totalMontoGE = salesGE.reduce((sum, s) => sum + Number(s.vprograma || s.subtotal || 0), 0);
    $: totalMontoVG = salesVG.reduce((sum, s) => sum + Number(s.vprograma || s.subtotal || 0), 0);
    $: totalMontoVentas = totalMontoGE + totalMontoVG;

    $: countGE = salesGE.length;
    $: countVG = salesVG.length;
    $: totalVentasCount = sales.length;

    $: pctGE = totalVentasCount > 0 ? Math.round((countGE / totalVentasCount) * 100) : 0;
    $: pctVG = totalVentasCount > 0 ? Math.round((countVG / totalVentasCount) * 100) : 0;

    // Cotizaciones
    $: quotesGE = quotes.filter((q) => (q.type_sale || "").toUpperCase() === "GE");
    $: quotesVG = quotes.filter((q) => (q.type_sale || "").toUpperCase() !== "GE");
    $: totalQuotesCount = quotes.length;
    $: quotesAprobadas = quotes.filter((q) => q.sale_id > 0 || q.estado === "V" || q.estado === "Aprobada").length;
    $: conversionRate = totalQuotesCount > 0 ? Math.round((quotesAprobadas / totalQuotesCount) * 100) : 0;

    // Ventas por Vendedor
    $: salesBySeller = (() => {
        const map = {};
        sales.forEach((s) => {
            const sellerId = s.seller_id || s.vendedor || 0;
            const sellerName = s.seller_name || s.vendedor_nombre || s.author || "Sin Vendedor";
            const monto = Number(s.vprograma || s.subtotal || 0);

            if (!map[sellerId]) {
                map[sellerId] = {
                    id: sellerId,
                    name: sellerName,
                    count: 0,
                    total: 0,
                };
            }
            map[sellerId].count += 1;
            map[sellerId].total += monto;
        });

        const list = Object.values(map).sort((a, b) => b.total - a.total);
        const maxTotal = list.length > 0 ? list[0].total : 1;
        return list.map((item) => ({
            ...item,
            percent: Math.round((item.total / (totalMontoVentas || 1)) * 100),
            barPercent: Math.round((item.total / maxTotal) * 100),
        }));
    })();

    // Top 5 Programas más vendidos
    $: top5Programs = (() => {
        const map = {};
        sales.forEach((s) => {
            const progId = s.programa_id || s.programa || 0;
            const progName = s.program_name || s.nombre_programa || "Programa Desconocido";
            const monto = Number(s.vprograma || s.subtotal || 0);

            if (!map[progId]) {
                map[progId] = {
                    id: progId,
                    name: progName,
                    count: 0,
                    total: 0,
                };
            }
            map[progId].count += 1;
            map[progId].total += monto;
        });

        const list = Object.values(map).sort((a, b) => b.count - a.count || b.total - a.total);
        const maxCount = list.length > 0 ? list[0].count : 1;

        return list.slice(0, 5).map((item, index) => ({
            ...item,
            rank: index + 1,
            percent: Math.round((item.count / (totalVentasCount || 1)) * 100),
            barPercent: Math.round((item.count / maxCount) * 100),
        }));
    })();

    // Evolución Mensual (Ene - Dic) para el año seleccionado
    $: monthlyData = (() => {
        const months = [
            "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
        ];
        const data = months.map((name) => ({ name, ge: 0, vg: 0, total: 0 }));

        sales.forEach((s) => {
            const dateStr = s.fecha || s.fechasalida || s.created_at;
            if (dateStr) {
                const monthIdx = dayjs(dateStr).month(); // 0 a 11
                if (monthIdx >= 0 && monthIdx < 12) {
                    const monto = Number(s.vprograma || s.subtotal || 0);
                    const isGE = (s.type_sale || "").toUpperCase() === "GE";
                    if (isGE) {
                        data[monthIdx].ge += monto;
                    } else {
                        data[monthIdx].vg += monto;
                    }
                    data[monthIdx].total += monto;
                }
            }
        });

        const maxMonthly = Math.max(...data.map((d) => d.total), 1);
        return data.map((d) => ({
            ...d,
            geHeight: Math.round((d.ge / maxMonthly) * 100),
            vgHeight: Math.round((d.vg / maxMonthly) * 100),
            barPercent: Math.round((d.total / maxMonthly) * 100),
        }));
    })();
</script>

<div class="dashboard-wrapper">
    <!-- Header principal con selector de año -->
    <div class="dashboard-header d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
            <h1 class="main-title mb-1">
                <i class="fa fa-dashboard me-2 text-primary"></i>Dashboard Estadísticas & Analítica
            </h1>
            <p class="subtitle text-muted mb-0">
                Resumen ejecutivo de ventas, giras de estudio (GE), salidas grupales (VG), cotizaciones y vendedores.
            </p>
        </div>
        
        <div class="year-selector-box d-flex align-items-center mt-3 mt-md-0">
            <label for="year-select" class="form-label mb-0 me-2 fw-bold text-secondary">
                <i class="fa fa-calendar me-1"></i> Año:
            </label>
            <select
                id="year-select"
                class="form-select form-select-custom shadow-sm fw-bold"
                value={selectedYear}
                on:change={handleYearChange}
                disabled={loading}
            >
                {#each availableYears as year}
                    <option value={year}>{year} {year === currentYear ? "(Actual)" : ""}</option>
                {/each}
            </select>
            {#if loading}
                <div class="spinner-border spinner-border-sm text-primary ms-2" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            {/if}
        </div>
    </div>

    {#if loading}
        <!-- Loading Skeleton / Overlay -->
        <div class="card p-5 text-center shadow-sm border-0 my-4">
            <div class="spinner-border text-primary mx-auto mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
            <h5 class="text-secondary fw-semibold">Cargando estadísticas del año {selectedYear}...</h5>
            <p class="text-muted small">Consultando ventas, cotizaciones y rendimiento general</p>
        </div>
    {:else}
        <!-- TARJETAS METRICAS KPI TOP -->
        <div class="row g-3 mb-4">
            <!-- KPI 1: Ventas Totales -->
            <div class="col-12 col-sm-6 col-xl-3">
                <div class="kpi-card card border-0 shadow-sm h-100">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div>
                            <span class="kpi-label text-muted text-uppercase fw-bold small">Total Facturado ({selectedYear})</span>
                            <h3 class="kpi-value text-dark fw-bold my-1">{formatCurrency(totalMontoVentas)}</h3>
                            <span class="badge bg-primary-soft text-primary fw-semibold">
                                <i class="fa fa-shopping-bag me-1"></i>{totalVentasCount} Contratos totales
                            </span>
                        </div>
                        <div class="kpi-icon-wrapper bg-primary text-white">
                            <i class="fa fa-dollar"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- KPI 2: Giras de Estudio (GE) -->
            <div class="col-12 col-sm-6 col-xl-3">
                <div class="kpi-card card border-0 shadow-sm h-100">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div>
                            <span class="kpi-label text-muted text-uppercase fw-bold small">Giras de Estudio (GE)</span>
                            <h3 class="kpi-value text-success fw-bold my-1">{formatCurrency(totalMontoGE)}</h3>
                            <span class="badge bg-success-soft text-success fw-semibold">
                                <i class="fa fa-graduation-cap me-1"></i>{countGE} Ventas ({pctGE}%)
                            </span>
                        </div>
                        <div class="kpi-icon-wrapper bg-success text-white">
                            <i class="fa fa-graduation-cap"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- KPI 3: Salidas / Viajes Grupales (VG) -->
            <div class="col-12 col-sm-6 col-xl-3">
                <div class="kpi-card card border-0 shadow-sm h-100">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div>
                            <span class="kpi-label text-muted text-uppercase fw-bold small">Salidas Grupales (VG)</span>
                            <h3 class="kpi-value text-info fw-bold my-1">{formatCurrency(totalMontoVG)}</h3>
                            <span class="badge bg-info-soft text-info fw-semibold">
                                <i class="fa fa-users me-1"></i>{countVG} Ventas ({pctVG}%)
                            </span>
                        </div>
                        <div class="kpi-icon-wrapper bg-info text-white">
                            <i class="fa fa-users"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- KPI 4: Cotizaciones & Conversión -->
            <div class="col-12 col-sm-6 col-xl-3">
                <div class="kpi-card card border-0 shadow-sm h-100">
                    <div class="card-body d-flex align-items-center justify-content-between">
                        <div>
                            <span class="kpi-label text-muted text-uppercase fw-bold small">Cotizaciones Emitidas</span>
                            <h3 class="kpi-value text-warning fw-bold my-1">{totalQuotesCount}</h3>
                            <span class="badge bg-warning-soft text-warning fw-semibold">
                                <i class="fa fa-line-chart me-1"></i>{conversionRate}% Conversión
                            </span>
                        </div>
                        <div class="kpi-icon-wrapper bg-warning text-white">
                            <i class="fa fa-file-text-o"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FILA 1: COMPARATIVA GE VS VG & COTIZACIONES -->
        <div class="row g-4 mb-4">
            <!-- Card: Comparativa GE vs VG -->
            <div class="col-12 col-lg-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 class="card-title fw-bold mb-0 text-dark">
                            <i class="fa fa-pie-chart text-primary me-2"></i>Ventas por Tipo: GE vs VG
                        </h5>
                        <span class="badge bg-light text-dark border">Año {selectedYear}</span>
                    </div>
                    <div class="card-body px-4 pb-4">
                        {#if totalVentasCount === 0}
                            <div class="text-center py-5 text-muted">
                                <i class="fa fa-folder-open-o fa-2x mb-2 d-block opacity-50"></i>
                                Sin ventas registradas en el año {selectedYear}.
                            </div>
                        {:else}
                            <!-- Multi-bar progress -->
                            <div class="progress-stacked mb-4" style="height: 26px; border-radius: 8px;">
                                <div
                                    class="progress-bar bg-success font-semibold"
                                    role="progressbar"
                                    style="width: {pctGE}%;"
                                    title="GE: {pctGE}%"
                                >
                                    {pctGE > 10 ? `GE (${pctGE}%)` : ""}
                                </div>
                                <div
                                    class="progress-bar bg-info font-semibold"
                                    role="progressbar"
                                    style="width: {pctVG}%;"
                                    title="VG: {pctVG}%"
                                >
                                    {pctVG > 10 ? `VG (${pctVG}%)` : ""}
                                </div>
                            </div>

                            <div class="row text-center g-3">
                                <!-- Bloque GE -->
                                <div class="col-6">
                                    <div class="p-3 rounded-3 bg-light border border-success border-opacity-25">
                                        <div class="d-flex align-items-center justify-content-center mb-1 text-success fw-bold">
                                            <i class="fa fa-graduation-cap me-2 fs-5"></i> Giras de Estudio (GE)
                                        </div>
                                        <h4 class="fw-bold text-dark my-1">{formatCurrency(totalMontoGE)}</h4>
                                        <div class="text-muted small">
                                            <strong>{countGE}</strong> contratos ({pctGE}% del total)
                                        </div>
                                        <div class="text-muted small mt-1">
                                            Ticket Prom: <strong>{formatCurrency(countGE > 0 ? totalMontoGE / countGE : 0)}</strong>
                                        </div>
                                    </div>
                                </div>

                                <!-- Bloque VG -->
                                <div class="col-6">
                                    <div class="p-3 rounded-3 bg-light border border-info border-opacity-25">
                                        <div class="d-flex align-items-center justify-content-center mb-1 text-info fw-bold">
                                            <i class="fa fa-users me-2 fs-5"></i> Salidas Grupales (VG)
                                        </div>
                                        <h4 class="fw-bold text-dark my-1">{formatCurrency(totalMontoVG)}</h4>
                                        <div class="text-muted small">
                                            <strong>{countVG}</strong> contratos ({pctVG}% del total)
                                        </div>
                                        <div class="text-muted small mt-1">
                                            Ticket Prom: <strong>{formatCurrency(countVG > 0 ? totalMontoVG / countVG : 0)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Card: Análisis de Cotizaciones -->
            <div class="col-12 col-lg-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 class="card-title fw-bold mb-0 text-dark">
                            <i class="fa fa-file-text-o text-warning me-2"></i>Resumen de Cotizaciones
                        </h5>
                        <span class="badge bg-warning-soft text-warning fw-bold">{totalQuotesCount} Emitidas</span>
                    </div>
                    <div class="card-body px-4 pb-4">
                        {#if totalQuotesCount === 0}
                            <div class="text-center py-5 text-muted">
                                <i class="fa fa-file-o fa-2x mb-2 d-block opacity-50"></i>
                                No hay cotizaciones registradas para {selectedYear}.
                            </div>
                        {:else}
                            <div class="row g-3 mb-3">
                                <div class="col-4 text-center">
                                    <div class="p-2 rounded bg-light">
                                        <span class="text-muted small d-block">Giras (GE)</span>
                                        <strong class="fs-5 text-dark">{quotesGE.length}</strong>
                                    </div>
                                </div>
                                <div class="col-4 text-center">
                                    <div class="p-2 rounded bg-light">
                                        <span class="text-muted small d-block">Grupales (VG)</span>
                                        <strong class="fs-5 text-dark">{quotesVG.length}</strong>
                                    </div>
                                </div>
                                <div class="col-4 text-center">
                                    <div class="p-2 rounded bg-light">
                                        <span class="text-muted small d-block">Convertidas</span>
                                        <strong class="fs-5 text-success">{quotesAprobadas}</strong>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-2 d-flex justify-content-between align-items-center small">
                                <span class="fw-semibold text-secondary">Tasa de Conversión a Venta</span>
                                <span class="fw-bold text-success fs-6">{conversionRate}%</span>
                            </div>
                            <div class="progress mb-3" style="height: 12px;">
                                <div
                                    class="progress-bar bg-success"
                                    role="progressbar"
                                    style="width: {conversionRate}%;"
                                ></div>
                            </div>
                            
                            <p class="text-muted small mb-0">
                                <i class="fa fa-info-circle me-1"></i>
                                Se han cerrado como venta exitosa <strong>{quotesAprobadas}</strong> de un total de <strong>{totalQuotesCount}</strong> cotizaciones solicitadas.
                            </p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- FILA 2: VENTAS POR VENDEDOR & TOP 5 PROGRAMAS -->
        <div class="row g-4 mb-4">
            <!-- Ventas por Vendedor -->
            <div class="col-12 col-lg-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 class="card-title fw-bold mb-0 text-dark">
                            <i class="fa fa-user-circle text-success me-2"></i>Ventas por Vendedor
                        </h5>
                        <span class="badge bg-light text-secondary border">{salesBySeller.length} Vendedores</span>
                    </div>
                    <div class="card-body px-4 pb-4">
                        {#if salesBySeller.length === 0}
                            <div class="text-center py-5 text-muted">
                                <i class="fa fa-users fa-2x mb-2 d-block opacity-50"></i>
                                Sin ventas de vendedores registradas en {selectedYear}.
                            </div>
                        {:else}
                            <div class="seller-list">
                                {#each salesBySeller as seller}
                                    <div class="seller-item mb-3">
                                        <div class="d-flex align-items-center justify-content-between mb-1">
                                            <div class="d-flex align-items-center">
                                                <div class="avatar-circle me-2 bg-primary-soft text-primary fw-bold">
                                                    {seller.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span class="fw-bold text-dark d-block">{seller.name}</span>
                                                    <span class="text-muted small">{seller.count} ventas ({seller.percent}% del total)</span>
                                                </div>
                                            </div>
                                            <div class="text-end">
                                                <strong class="text-success d-block">{formatCurrency(seller.total)}</strong>
                                            </div>
                                        </div>
                                        <div class="progress" style="height: 8px;">
                                            <div
                                                class="progress-bar bg-primary"
                                                role="progressbar"
                                                style="width: {seller.barPercent}%;"
                                            ></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Top 5 Programas Más Vendidos -->
            <div class="col-12 col-lg-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 class="card-title fw-bold mb-0 text-dark">
                            <i class="fa fa-trophy text-warning me-2"></i>Top 5 Programas Más Vendidos
                        </h5>
                        <span class="badge bg-warning-soft text-warning fw-bold">Año {selectedYear}</span>
                    </div>
                    <div class="card-body px-4 pb-4">
                        {#if top5Programs.length === 0}
                            <div class="text-center py-5 text-muted">
                                <i class="fa fa-compass fa-2x mb-2 d-block opacity-50"></i>
                                Sin registros de programas vendidos en {selectedYear}.
                            </div>
                        {:else}
                            <div class="programs-list">
                                {#each top5Programs as prog}
                                    <div class="program-item mb-3">
                                        <div class="d-flex align-items-center justify-content-between mb-1">
                                            <div class="d-flex align-items-center">
                                                <div class="rank-badge me-3 fw-bold rank-{prog.rank}">
                                                    #{prog.rank}
                                                </div>
                                                <div>
                                                    <span class="fw-bold text-dark d-block text-truncate" style="max-width: 250px;">
                                                        {prog.name}
                                                    </span>
                                                    <span class="text-muted small">{prog.count} contrataciones ({prog.percent}%)</span>
                                                </div>
                                            </div>
                                            <div class="text-end">
                                                <strong class="text-primary d-block">{formatCurrency(prog.total)}</strong>
                                            </div>
                                        </div>
                                        <div class="progress" style="height: 8px;">
                                            <div
                                                class="progress-bar bg-warning"
                                                role="progressbar"
                                                style="width: {prog.barPercent}%;"
                                            ></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- FILA 3: EVOLUCIÓN MENSUAL DE VENTAS -->
        <div class="row g-4 mb-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="card-title fw-bold mb-0 text-dark">
                                <i class="fa fa-line-chart text-info me-2"></i>Evolución Mensual de Ventas ({selectedYear})
                            </h5>
                            <span class="text-muted small">Distribución de facturación de Enero a Diciembre</span>
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <span class="small text-muted">
                                <i class="fa fa-square text-success me-1"></i> GE
                            </span>
                            <span class="small text-muted">
                                <i class="fa fa-square text-info me-1"></i> VG
                            </span>
                        </div>
                    </div>
                    <div class="card-body px-4 pb-4">
                        {#if totalMontoVentas === 0}
                            <div class="text-center py-5 text-muted">
                                <i class="fa fa-bar-chart fa-2x mb-2 d-block opacity-50"></i>
                                No hay montos facturados durante el año {selectedYear}.
                            </div>
                        {:else}
                            <div class="monthly-chart-container pt-3">
                                <div class="d-flex align-items-end justify-content-between gap-2" style="height: 220px;">
                                    {#each monthlyData as m}
                                        <div class="monthly-bar-column text-center flex-fill d-flex flex-column align-items-center justify-content-end h-100">
                                            <div class="bar-wrapper w-100 d-flex align-items-end justify-content-center px-1" style="height: 180px;">
                                                {#if m.total > 0}
                                                    <div
                                                        class="bar-combined w-100 rounded-top d-flex flex-column justify-content-end overflow-hidden shadow-sm"
                                                        style="height: {m.barPercent}%; min-height: 8px;"
                                                        title="{m.name}: {formatCurrency(m.total)} (GE: {formatCurrency(m.ge)} | VG: {formatCurrency(m.vg)})"
                                                    >
                                                        {#if m.ge > 0}
                                                            <div class="bg-success flex-grow-1" style="min-height: 4px;"></div>
                                                        {/if}
                                                        {#if m.vg > 0}
                                                            <div class="bg-info flex-grow-1" style="min-height: 4px;"></div>
                                                        {/if}
                                                    </div>
                                                {:else}
                                                    <div class="bar-empty w-100 rounded-top bg-light" style="height: 4px;"></div>
                                                {/if}
                                            </div>
                                            <span class="month-name mt-2 text-muted fw-semibold small">{m.name}</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .dashboard-wrapper {
        padding: 10px 5px;
    }

    .main-title {
        font-size: 26px;
        font-weight: 700;
        color: #303641;
        letter-spacing: -0.5px;
    }

    .subtitle {
        font-size: 14px;
    }

    .form-select-custom {
        min-width: 160px;
        border-color: #cbd5e1;
        border-radius: 8px;
        padding: 6px 12px;
    }

    /* KPI Cards */
    .kpi-card {
        border-radius: 12px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08) !important;
    }

    .kpi-label {
        font-size: 0.75rem;
        letter-spacing: 0.5px;
    }

    .kpi-value {
        font-size: 1.5rem;
        letter-spacing: -0.5px;
    }

    .kpi-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
    }

    /* Badges soft */
    .bg-primary-soft {
        background-color: rgba(13, 110, 253, 0.12);
    }
    .bg-success-soft {
        background-color: rgba(25, 135, 84, 0.12);
    }
    .bg-info-soft {
        background-color: rgba(13, 202, 240, 0.15);
    }
    .bg-warning-soft {
        background-color: rgba(255, 193, 7, 0.18);
    }

    /* Avatars y rankings */
    .avatar-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
    }

    .rank-badge {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        background-color: #f1f5f9;
        color: #475569;
    }

    .rank-1 {
        background-color: #fef3c7;
        color: #d97706;
    }

    .rank-2 {
        background-color: #e2e8f0;
        color: #475569;
    }

    .rank-3 {
        background-color: #ffedd5;
        color: #c2410c;
    }

    /* Gráficos */
    .monthly-chart-container {
        border-bottom: 1px solid #e2e8f0;
    }

    .bar-combined {
        transition: height 0.4s ease;
        cursor: pointer;
    }

    .bar-combined:hover {
        opacity: 0.85;
    }

    @media (max-width: 768px) {
        .main-title {
            font-size: 20px;
        }
        .kpi-value {
            font-size: 1.25rem;
        }
    }
</style>
