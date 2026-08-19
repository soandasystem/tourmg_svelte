<script>
    import { onMount, onDestroy } from "svelte";
    import { DataTable } from "simple-datatables";
    import "simple-datatables/dist/style.css";
    import api from "../../lib/apis.js";
    import { secureStorage } from "../../lib/secureStore";
    import { tenantStore } from "../../stores/tenant";
    import dayjs from "dayjs";
    import Swal from "sweetalert2";
    import {
        formatRut,
        formatCurrency,
        formatDate,
        hasPermissionPrograms,
    } from "../../lib/utils";

    // Props
    export let title = "Informe de Pagos";

    $: idcl = $tenantStore;
    const userData = secureStorage.getItem("_us_") || {};
    const schemaName = userData.schema || "";
    const author = userData.username || "";
    const CompanyId = String(userData.company || "");
    const rol = userData.rol_id || 0;

    // UI state
    let sales = [];
    let schools = [];
    let selectedVenta = "";
    let coursesList = [];
    let rawPayments = [];
    let loading = false;

    // Modal state
    let showDetailModal = false;
    let selectedPassengerDetail = null;
    let passengerPayments = [];
    let loadingModal = false;

    // Permisos
    $: canExport = hasPermissionPrograms(rol, "listpay", "VIEW") || true;

    // Mapeo de escuelas para lookup rápido
    $: schoolsMap = schools.reduce((acc, sch) => {
        acc[sch.id] = sch.nombre || sch.name || "";
        return acc;
    }, {});

    function getSchoolName(sale) {
        if (!sale) return "";
        if (sale.establecimiento_nombre) return sale.establecimiento_nombre;
        if (sale.establecimiento?.nombre) return sale.establecimiento.nombre;
        if (schoolsMap[sale.establecimiento_id])
            return schoolsMap[sale.establecimiento_id];
        return "";
    }

    // Datos filtrados y consolidados
    $: processedData = buildProcessedList(
        coursesList,
        rawPayments,
        sales,
        selectedVenta,
    );

    function buildProcessedList(courses, payments, allSales, filterSaleId) {
        let filteredCourses = courses;
        if (filterSaleId) {
            filteredCourses = courses.filter(
                (c) => String(c.sale_id) === String(filterSaleId),
            );
        }

        const paymentsByPassenger = {};
        (payments || []).forEach((p) => {
            const pid = p.passenger_id || p.curso_id || (p.curso && p.curso.id);
            if (pid) {
                if (!paymentsByPassenger[pid]) {
                    paymentsByPassenger[pid] = [];
                }
                paymentsByPassenger[pid].push(p);
            }
        });

        const salesMap = {};
        (allSales || []).forEach((s) => {
            salesMap[s.id] = s;
        });

        return (filteredCourses || []).map((c) => {
            const sale = salesMap[c.sale_id] || {};
            const pList = paymentsByPassenger[c.id] || [];

            const validPayments = pList.filter(
                (p) =>
                    p.transaction_type !== "reverse" && p.status !== "ANULADO",
            );

            const pagado = validPayments.reduce(
                (sum, p) => sum + parseFloat(p.amount || 0),
                0,
            );

            const apagar = parseFloat(
                c.apagar ?? (c.vpagar ? c.vpagar - (c.descto || 0) : 0),
            );
            const saldo = apagar - pagado;

            let lastPayment = null;
            if (validPayments.length > 0) {
                const sorted = [...validPayments].sort((a, b) => {
                    const dateA = new Date(
                        a.payment_date || a.created_at || 0,
                    ).getTime();
                    const dateB = new Date(
                        b.payment_date || b.created_at || 0,
                    ).getTime();
                    return dateB - dateA || b.id - a.id;
                });
                lastPayment = sorted[0];
            }

            const schoolName = getSchoolName(sale) || c.colegio || "";
            const cursoNombre = (
                sale.curso
                    ? `${sale.curso} - ${sale.idcurso || ""}`
                    : c.curso || ""
            ).trim();

            return {
                id: c.id,
                passenger_id: c.id,
                sale_id: c.sale_id,
                colegio: schoolName,
                curso: cursoNombre,
                rut_apoderado: c.rutapod || c.rutapoderado || "",
                nombre_apoderado: c.nombreapod || c.nombreapoderado || "",
                nombre_alumno: c.nombrealumno || "",
                rut_alumno: c.rutalumno || "",
                apagar: apagar,
                pagado: pagado,
                saldo: saldo,
                last_payment_num: lastPayment
                    ? lastPayment.voucher || lastPayment.id || ""
                    : "",
                last_payment_date:
                    lastPayment && lastPayment.payment_date
                        ? lastPayment.payment_date
                        : "",
                last_payment_amount: lastPayment
                    ? parseFloat(lastPayment.amount || 0)
                    : 0,
                all_payments: pList,
            };
        });
    }

    // Datatable format compatible con el resto del proyecto
    $: dtData = processedData.map((row) => {
        const btnIngresos = `
            <div class="action-buttons-mini justify-content-center">
                <button class="btn-mini-custom info" onclick="document.dispatchEvent(new CustomEvent('view-payment-detail', {detail: {passenger_id: ${row.passenger_id}, sale_id: ${row.sale_id}, id: ${row.id}}}))" title="Ver Ingresos">
                    <i class="fa fa-eye"></i>
                </button>
            </div>
        `;

        const formattedApagar = formatCurrency(row.apagar);
        const formattedPagado = `<span class="badge bg-success-soft text-success">${formatCurrency(row.pagado)}</span>`;
        const formattedSaldo =
            row.saldo > 0
                ? `<span class="badge bg-danger-soft text-danger">${formatCurrency(row.saldo)}</span>`
                : `<span class="badge bg-success-soft text-success">${formatCurrency(0)}</span>`;
        const formattedUltMonto =
            row.last_payment_amount > 0
                ? formatCurrency(row.last_payment_amount)
                : "-";
        const formattedUltFecha = row.last_payment_date
            ? dayjs(row.last_payment_date).format("DD/MM/YYYY")
            : "-";

        return [
            btnIngresos,
            row.colegio || "-",
            row.curso || "-",
            formatRut(row.rut_apoderado) || "-",
            row.nombre_apoderado || "-",
            row.nombre_alumno || "-",
            formattedApagar,
            formattedPagado,
            formattedSaldo,
            String(row.last_payment_num || "-"),
            formattedUltFecha,
            formattedUltMonto,
            String(row.sale_id || "-"),
            formatRut(row.rut_alumno) || "-",
            row.passenger_id,
        ];
    });

    let dataTableInstance = null;

    function initDataTable(node, dataConfig) {
        if (dataTableInstance) dataTableInstance.destroy();
        dataTableInstance = new DataTable(node, {
            searchable: true,
            sortable: true,
            perPage: 10,
            labels: {
                placeholder: "Buscar pagos...",
                perPage: "por página",
                noRows: "No se encontraron registros de pagos",
                info: "Mostrando {start} a {end} de {rows} registros",
                noResults: "No se encontraron registros",
            },
            columns: [{ select: [12, 13, 14], hidden: true }],
            data: {
                headings: [
                    "Ingresos",
                    "Colegio",
                    "Curso",
                    "Rut Apoderado",
                    "Nombre Apoderado",
                    "Nombre Alumno",
                    "Apagar",
                    "Pagado",
                    "Saldo",
                    "Nro Utl. pago",
                    "Fec Utl. pago",
                    "Monto Utl. pago",
                    "Nro Vta",
                    "rut al",
                    "pasajero",
                ],
                data: dataConfig,
            },
        });

        if (dataTableInstance.wrapperDOM) {
            dataTableInstance.wrapperDOM.style.fontSize = "13px";
        }

        return {
            destroy() {
                if (dataTableInstance) {
                    dataTableInstance.destroy();
                    dataTableInstance = null;
                }
            },
        };
    }

    // ──── API Calls ────
    async function loadSales() {
        try {
            const [salesRes, schoolsRes] = await Promise.all([
                api.getData(
                    "sale/informe",
                    "",
                    "company_id=" + CompanyId,
                    "",
                    schemaName,
                ),
                api.getData(
                    "school",
                    "",
                    "company_id=" + CompanyId,
                    "",
                    schemaName,
                ),
            ]);

            if (salesRes.status === "success") {
                sales = Array.isArray(salesRes.data) ? salesRes.data : [];
            }
            if (schoolsRes.status === "success") {
                schools = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
            }
        } catch (e) {
            console.error("Error cargando ventas/colegios", e);
        }
    }

    async function loadData() {
        loading = true;
        try {
            const [coursesRes, paymentsRes] = await Promise.all([
                api.getData(
                    "curso",
                    "",
                    "company_id=" + CompanyId,
                    "",
                    schemaName,
                ),
                api.getData(
                    "payment",
                    "",
                    "company_id=" + CompanyId,
                    "",
                    schemaName,
                ),
            ]);

            if (coursesRes.status === "success") {
                coursesList = Array.isArray(coursesRes.data)
                    ? coursesRes.data
                    : [];
            } else {
                coursesList = [];
            }

            if (paymentsRes.status === "success") {
                rawPayments = Array.isArray(paymentsRes.data)
                    ? paymentsRes.data
                    : [];
            } else {
                rawPayments = [];
            }
        } catch (e) {
            console.error("Error cargando lista de pagos:", e);
            Swal.fire(
                "Error",
                "Ocurrió un error al cargar la información de pagos.",
                "error",
            );
        } finally {
            loading = false;
        }
    }

    // Modal de Detalle de Pagos: Carga usando passenger_id, company_id, sale_id y filtra por State === "Pagado"
    async function handleViewDetail(event) {
        const detail = event.detail || {};
        const passengerId = detail.passenger_id || detail.id;
        const saleId = detail.sale_id;

        const pass = processedData.find(
            (p) =>
                String(p.passenger_id) === String(passengerId) ||
                String(p.id) === String(passengerId),
        );

        if (!pass) return;

        selectedPassengerDetail = pass;
        showDetailModal = true;
        loadingModal = true;
        passengerPayments = [];

        try {
            let queryParts = [
                `passenger_id=${passengerId}`,
                `company_id=${CompanyId}`,
            ];
            if (saleId || pass.sale_id) {
                queryParts.push(`sale_id=${saleId || pass.sale_id}`);
            }

            const res = await api.getData(
                "payment",
                "",
                queryParts.join("&"),
                "",
                schemaName,
            );
            console.log("res", res);
            let allRows = [];
            if (res.status === "success" && Array.isArray(res.data)) {
                allRows = res.data;
            } else if (pass.all_payments && Array.isArray(pass.all_payments)) {
                allRows = pass.all_payments;
            }

            // Filtrar únicamente los registros que tengan State / Status "Pagado"
            passengerPayments = allRows.filter((p) => {
                const stateVal = (p.state || p.status || "")
                    .toString()
                    .trim()
                    .toLowerCase();
                return (
                    stateVal === "pagado" ||
                    p.state === "Pagado" ||
                    p.status === "Pagado"
                );
            });
        } catch (e) {
            console.error("Error al obtener detalle de pagos del pasajero:", e);
            passengerPayments = (pass.all_payments || []).filter((p) => {
                const stateVal = (p.state || p.status || "")
                    .toString()
                    .trim()
                    .toLowerCase();
                return (
                    stateVal === "pagado" ||
                    p.state === "Pagado" ||
                    p.status === "Pagado"
                );
            });
        } finally {
            loadingModal = false;
        }
    }

    function closeDetailModal() {
        showDetailModal = false;
        selectedPassengerDetail = null;
        passengerPayments = [];
    }

    function exportToExcel() {
        if (processedData.length === 0) {
            Swal.fire("Atención", "No hay datos para exportar.", "info");
            return;
        }

        const headers = [
            "Colegio",
            "Curso",
            "Rut Apoderado",
            "Nombre Apoderado",
            "Nombre Alumno",
            "A Pagar",
            "Pagado",
            "Saldo",
            "Nro Utl. Pago",
            "Fec Utl. Pago",
            "Monto Utl. Pago",
            "Nro Vta",
            "Rut Alumno",
        ];

        const rows = processedData.map((row) => [
            `"${(row.colegio || "").replace(/"/g, '""')}"`,
            `"${(row.curso || "").replace(/"/g, '""')}"`,
            `"${row.rut_apoderado || ""}"`,
            `"${(row.nombre_apoderado || "").replace(/"/g, '""')}"`,
            `"${(row.nombre_alumno || "").replace(/"/g, '""')}"`,
            row.apagar || 0,
            row.pagado || 0,
            row.saldo || 0,
            `"${row.last_payment_num || ""}"`,
            `"${row.last_payment_date ? dayjs(row.last_payment_date).format("YYYY-MM-DD") : ""}"`,
            row.last_payment_amount || 0,
            `"${row.sale_id || ""}"`,
            `"${row.rut_alumno || ""}"`,
        ]);

        const csvContent =
            "\uFEFF" +
            [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\r\n");
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            `informe_pagos_${selectedVenta ? "venta_" + selectedVenta + "_" : ""}${dayjs().format("YYYYMMDD_HHmmss")}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    onMount(async () => {
        await loadSales();
        await loadData();
        document.addEventListener("view-payment-detail", handleViewDetail);
    });

    onDestroy(() => {
        document.removeEventListener("view-payment-detail", handleViewDetail);
    });
</script>

<div class="page-wrapper">
    <div class="card main-card shadow-sm border-0 mb-4">
        <!-- Header -->
        <div class="card-header-flex p-4">
            <div class="title-group">
                <div class="title-with-icon">
                    <i class="fa fa-credit-card icon-main text-primary"></i>
                    <h2 class="m-0">{title}</h2>
                </div>
                <p class="subtitle mt-1 mb-0">
                    Administra y visualiza el informe consolidado de pagos de
                    pasajeros.
                </p>
            </div>
            {#if canExport}
                <button
                    type="button"
                    class="btn-new"
                    id="export-report"
                    on:click={exportToExcel}
                    disabled={loading || processedData.length === 0}
                    style="background-color: #1cc88a; border-color: #17a673;"
                >
                    <i class="fa fa-file-excel-o"></i> Exportar Informe
                </button>
            {/if}
        </div>

        <!-- Filtros inline -->
        <div class="card-body p-4 pt-0">
            <div class="section-title mb-3">Filtro de Ventas</div>
            <div class="row g-2 align-items-end mb-4">
                <div class="col-md-5 col-sm-6 col-xs-12">
                    <div class="form-group-custom">
                        <label for="ventas">Ventas</label>
                        <select
                            id="ventas"
                            name="ventas"
                            class="form-select-custom"
                            bind:value={selectedVenta}
                        >
                            <option value="">Todas</option>
                            {#each sales as sale}
                                <option value={sale.id}>
                                    {getSchoolName(sale)} - {sale.curso} - {sale.idcurso}
                                </option>
                            {/each}
                        </select>
                    </div>
                </div>
            </div>
            <hr class="my-3" style="border-top: 1px solid #e3e6f0; opacity: 0.8;" />
        </div>

        <!-- Grilla Datatable idéntica al resto del proyecto -->
        <div class="table-container p-3 pt-0 overflow-auto">
            {#key dtData}
                <table
                    use:initDataTable={dtData}
                    class="table table-hover w-100"
                ></table>
            {/key}
        </div>
    </div>
</div>

<!-- Modal Detalle de Pagos -->
{#if showDetailModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop fade show" on:click={closeDetailModal}></div>
    <div
        class="modal fade show d-block"
        id="modal-compact-view"
        tabindex="-1"
        role="dialog"
    >
        <div
            class="modal-dialog modal-lg modal-dialog-centered"
            role="document"
        >
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-primary text-white border-0">
                    <h5
                        class="modal-title m-0 fw-bold d-flex align-items-center gap-2"
                    >
                        <i class="fa fa-list-alt"></i> Detalle de Pagos
                    </h5>
                    <button
                        type="button"
                        class="btn-close-custom"
                        on:click={closeDetailModal}
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>

                <div class="modal-body p-4">
                    {#if selectedPassengerDetail}
                        <div class="passenger-summary-box mb-4 p-3 rounded">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <p class="mb-1">
                                        <strong>Alumno:</strong>
                                        {selectedPassengerDetail.nombre_alumno}
                                    </p>
                                    <p class="mb-1">
                                        <strong>Apoderado:</strong>
                                        {selectedPassengerDetail.nombre_apoderado}
                                    </p>
                                    <p class="mb-0">
                                        <strong>Colegio:</strong>
                                        {selectedPassengerDetail.colegio}
                                    </p>
                                    <p class="mb-0">
                                        <strong>Curso:</strong>
                                        {selectedPassengerDetail.curso}
                                    </p>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <p class="mb-1">
                                        <strong>Total a Pagar:</strong>
                                        {formatCurrency(
                                            selectedPassengerDetail.apagar,
                                        )}
                                    </p>
                                    <p class="mb-1 text-success">
                                        <strong>Total Pagado:</strong>
                                        {formatCurrency(
                                            selectedPassengerDetail.pagado,
                                        )}
                                    </p>
                                    <p class="mb-0 text-danger">
                                        <strong>Saldo Pendiente:</strong>
                                        {formatCurrency(
                                            selectedPassengerDetail.saldo,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="section-title mb-3">Ingresos</div>

                        {#if loadingModal}
                            <div class="text-center py-4">
                                <div
                                    class="spinner-border spinner-border-sm text-primary"
                                    role="status"
                                ></div>
                                <p class="text-muted mt-2 small">
                                    Cargando pagos...
                                </p>
                            </div>
                        {:else if passengerPayments.length === 0}
                            <div
                                class="alert alert-info text-center py-3 mb-0"
                                role="alert"
                            >
                                No se registran ingresos con estado <strong
                                    >Pagado</strong
                                > para este pasajero.
                            </div>
                        {:else}
                            <div class="table-responsive">
                                <table
                                    class="table table-sm table-hover align-middle mb-0"
                                >
                                    <thead class="table-light">
                                        <tr>
                                            <th>#</th>
                                            <th>Fecha</th>
                                            <th>Nro Comp</th>
                                            <th>Forma de Pago</th>
                                            <th>Monto</th>
                                            <th>Estado</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each passengerPayments as pay, idx}
                                            <tr>
                                                <td>{idx + 1}</td>
                                                <td
                                                    >{pay.payment_date
                                                        ? dayjs(
                                                              pay.payment_date,
                                                          ).format("DD/MM/YYYY")
                                                        : pay.created_at
                                                          ? dayjs(
                                                                pay.created_at,
                                                            ).format(
                                                                "DD/MM/YYYY",
                                                            )
                                                          : "-"}</td
                                                >
                                                <td>
                                                    #{pay.identifier}
                                                </td>
                                                <td
                                                    >{pay.payment_method ||
                                                        pay.forma_pago ||
                                                        "Efectivo / Transferencia"}</td
                                                >
                                                <td
                                                    class="fw-bold text-success"
                                                >
                                                    {formatCurrency(pay.amount)}
                                                </td>
                                                <td>
                                                    <span
                                                        class="badge bg-success-soft text-success"
                                                    >
                                                        <i
                                                            class="fa fa-check me-1"
                                                        ></i>
                                                        {pay.state ||
                                                            pay.status ||
                                                            "Pagado"}
                                                    </span>
                                                </td>
                                                <td class="text-muted small"
                                                    >{pay.notes ||
                                                        pay.description ||
                                                        "-"}</td
                                                >
                                            </tr>
                                        {/each}
                                    </tbody>
                                    <tfoot class="table-light">
                                        <tr>
                                            <td
                                                colspan="5"
                                                class="text-end fw-bold"
                                                >Total Ingresos:</td
                                            >
                                            <td class="fw-bold text-success">
                                                {formatCurrency(
                                                    passengerPayments.reduce(
                                                        (sum, p) =>
                                                            sum +
                                                            parseFloat(
                                                                p.amount || 0,
                                                            ),
                                                        0,
                                                    ),
                                                )}
                                            </td>
                                            <td colspan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        {/if}
                    {/if}
                </div>

                <div
                    class="modal-footer border-0 justify-content-end p-3 bg-light"
                >
                    <button
                        type="button"
                        class="btn-cancel-modal"
                        on:click={closeDetailModal}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .page-wrapper {
        padding: 24px;
        background-color: #f8f9fc;
        min-height: calc(100vh - 70px);
    }
    .main-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
    }
    .card-header-flex {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: white;
    }
    .title-with-icon {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    .icon-main {
        font-size: 28px;
    }
    .title-with-icon h2 {
        font-size: 22px;
        font-weight: 700;
        color: #2d3748;
    }
    .subtitle {
        color: #718096;
        font-size: 14px;
    }

    .section-title {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #4e73df;
        letter-spacing: 0.5px;
        border-left: 3px solid #4e73df;
        padding-left: 10px;
        display: flex;
        align-items: center;
        margin-bottom: 15px !important;
    }

    .form-group-custom {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .form-group-custom label {
        font-weight: 600;
        font-size: 0.8rem;
        color: #4a5568;
    }
    .form-select-custom {
        border: 1px solid #d1d3e2;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 0.85rem;
        transition:
            border-color 0.2s,
            box-shadow 0.2s;
        width: 100%;
        height: 38px;
        background-color: #fff;
    }
    .form-select-custom:focus {
        border-color: #bac8f3;
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(78, 115, 223, 0.25);
    }

    .btn-new {
        background-color: #4e73df;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-new:hover {
        background-color: #2e59d9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(78, 115, 223, 0.2);
    }

    /* Table Styles (idénticos a course.svelte, users.svelte, voucher.svelte) */
    :global(.dataTable-wrapper) {
        font-family: inherit;
    }
    :global(.dataTable-table thead th) {
        border-bottom: 2px solid #edf2f7 !important;
        background: #f8f9fc !important;
        padding: 15px !important;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    :global(.dataTable-table tbody td) {
        padding: 12px 15px !important;
        font-size: 13px;
        vertical-align: middle;
    }
    :global(.action-buttons-mini) {
        display: flex;
        gap: 8px;
    }
    :global(.btn-mini-custom) {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e3e6f0;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        color: #4e73df;
    }
    :global(.btn-mini-custom:hover) {
        background: #f8f9fc;
        transform: translateY(-1px);
    }
    :global(.btn-mini-custom.info) {
        color: #36b9cc;
    }
    :global(.btn-mini-custom.info:hover) {
        background: #36b9cc;
        color: white;
        border-color: #36b9cc;
    }

    /* Badges */
    :global(.badge) {
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 11px;
        display: inline-flex;
        align-items: center;
    }
    :global(.bg-success-soft) {
        background-color: rgba(28, 200, 138, 0.15) !important;
        color: #1cc88a !important;
    }
    :global(.bg-danger-soft) {
        background-color: rgba(231, 74, 59, 0.15) !important;
        color: #e74a3b !important;
    }

    /* Modal Styles */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1040;
    }
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1050;
        overflow-x: hidden;
        overflow-y: auto;
        outline: 0;
    }
    .modal-dialog {
        margin: 1.75rem auto;
    }
    .modal-content {
        border-radius: 12px;
        overflow: hidden;
    }
    .btn-close-custom {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.5rem;
        line-height: 1;
        opacity: 0.8;
        cursor: pointer;
        padding: 0;
    }
    .btn-close-custom:hover {
        opacity: 1;
    }
    .btn-cancel-modal {
        background: #6c757d;
        color: white;
        border: 1px solid #6c757d;
        padding: 8px 20px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-cancel-modal:hover {
        background: #5a6268;
    }
    .passenger-summary-box {
        background-color: #f8f9fc;
        border: 1px solid #e3e6f0;
        font-size: 0.85rem;
    }
</style>
