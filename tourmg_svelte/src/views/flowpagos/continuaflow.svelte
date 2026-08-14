<script>
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { navigate } from "svelte-routing";
    import { secureStorage } from "../../lib/secureStore";
    import api from "../../lib/apis.js";
    import { formatCurrency, formatDate, uniqid } from "../../lib/utils";

    let hoy = new Date();
    let fecha = hoy.toISOString().split("T")[0];
    let valorcuota = 0;
    let nrocuotas = 0;
    let fechainicial = "";
    let identificador = uniqid();

    let isLoading = false;
    let errorMessage = "";

    const userData = secureStorage.getItem("_us_") || {};
    const schemaName = userData.schema || "";
    const author = userData.username || "";
    const currentCompanyId = userData.company || 0;
    const saleId = userData.sale || 0;
    const passengersId = userData.id || 0;
    const userrut = userData.userrut || "";
    const mpagar = userData.mpagar || 0;

    async function handleSubmit(event) {
        event.preventDefault();
        isLoading = true;
        errorMessage = "";
        const urlReturn = window.location.origin;
        try {
            const payload = {
                mpagar: mpagar,
                valorcuota: valorcuota,
                nrocuotas: nrocuotas,
                fechainicial: fechainicial,
                identificador: identificador,
                company_id: currentCompanyId,
                sale_id: saleId,
                curso_id: Number(passengersId),
                user_rut: userrut,
                urlreturn: urlReturn + "/flowpagos/returnFlow",
                urlconfirmation:
                    "https://tourmg-go.onrender.com/api/v3.5/token",
            };
            const result = await api.setData(
                "iniciopagoflow",
                JSON.stringify(payload),
                "",
                "",
                schemaName,
            );
            console.log("identificador:", identificador);
            console.log("payload:", payload);
            console.log("JSON:", JSON.stringify(payload));
            if (result.status !== "success") {
                throw new Error(
                    result.message || "Error al iniciar el pago con Flow",
                );
            }
            //obtengo el token para guardalo  en secure y usarlo despues
            const params = new URLSearchParams(window.location.search);
            const token = params.get("token");
            const ud = secureStorage.getItem("_us_") || {};
            ud.flowt = token;
            secureStorage.setItem("_us_", ud);
            // Asumimos que el backend devuelve la URL de redirección
            // Ejemplo: { "url": "https://www.flow.cl/api/payment/create?token=..." }

            const data = result.data;
            if (data && data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                errorMessage =
                    "No se recibió la URL de redirección desde el servidor";
            }
        } catch (error) {
            console.error("Error:", error);
            errorMessage = error.message;
        } finally {
            isLoading = false;
        }
    }
    function handleBack() {
        navigate(`/payment/paymentsales`);
    }
</script>

<div class="page-wrapper" in:fade={{ duration: 300 }}>
    <div class="card main-card shadow-sm border-0">
        <!-- Header -->
        <div
            class="card-header-flex p-4 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-3"
        >
            <div class="d-flex align-items-center gap-3">
                <i class="fa fa-credit-card text-primary fa-lg"></i>
                <h3 class="m-0 text-dark fw-bold header-title">
                    Continuar con Pago Flow
                </h3>
            </div>
            <button type="button" class="btn-back" on:click={handleBack}>
                <i class="fa fa-chevron-left me-1"></i> Volver
            </button>
        </div>

        <!-- Body -->
        <div class="card-body p-4">
            {#if errorMessage}
                <div class="alert-error mb-4">
                    <i class="fa fa-exclamation-circle me-2"></i>
                    {errorMessage}
                </div>
            {/if}

            <div class="payment-detail-card p-4 rounded-4 mb-4">
                <h5 class="fw-bold mb-3 text-dark">
                    <i class="fa fa-money text-success me-2"></i>
                    Detalle del Pago
                </h5>

                <div
                    class="detail-row py-3 border-bottom d-flex justify-content-between align-items-center"
                >
                    <span class="text-muted fw-medium">Nro. Ingreso</span>
                    <span class="price-value fw-bold text-dark"
                        >{identificador}</span
                    >
                </div>

                <div
                    class="detail-row py-3 border-bottom d-flex justify-content-between align-items-center"
                >
                    <span class="text-muted fw-medium">Fecha Pago</span>
                    <span class="price-value fw-bold text-dark">{fecha}</span>
                </div>

                <div
                    class="detail-row py-3 d-flex justify-content-between align-items-center"
                >
                    <span class="text-dark fw-bold">Monto a Pagar</span>
                    <span class="price-total fw-bold text-primary"
                        >{formatCurrency(mpagar)}</span
                    >
                </div>
            </div>

            <!-- Formulario para iniciar el pago -->
            <form
                name="form_continuapagoflw"
                id="form_continuapagoflw"
                on:submit|preventDefault={handleSubmit}
            >
                <input type="hidden" name="mpagar" value={mpagar} />
                <input type="hidden" name="valorcuota" value={valorcuota} />
                <input type="hidden" name="nrocuotas" value={nrocuotas} />
                <input type="hidden" name="fechainicial" value={fechainicial} />

                <button
                    type="submit"
                    class="btn-save w-100 py-3"
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <span
                            class="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                        ></span>
                        Procesando...
                    {:else}
                        <i class="fa fa-play me-1"></i> Continuar Pago
                    {/if}
                </button>
            </form>
        </div>
    </div>
</div>

<style>
    .page-wrapper {
        padding: 40px 20px;
        background-color: #f8fafc;
        min-height: 100vh;
        display: flex;
        align-items: flex-start;
        justify-content: center;
    }

    .main-card {
        max-width: 640px;
        width: 100%;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05) !important;
        overflow: hidden;
    }

    .card-header-flex {
        background-color: #ffffff;
        border-bottom: 1px solid #e2e8f0;
    }

    .header-title {
        font-size: 1.4rem;
    }

    .payment-detail-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
    }

    .price-value {
        font-size: 1.05rem;
        color: #1e293b;
    }

    .price-total {
        font-size: 1.5rem;
        color: #4e73df !important;
        letter-spacing: -0.5px;
    }

    .alert-error {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
        border-left: 5px solid #ef4444;
        border-radius: 12px;
        padding: 12px 16px;
        font-weight: 600;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
    }

    .btn-save {
        background: #4e73df;
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1rem;
        padding: 12px 20px;
        transition: all 0.2s ease-in-out;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px rgba(78, 115, 223, 0.15);
    }

    .btn-save:hover:not(:disabled) {
        background: #2e59d9;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(78, 115, 223, 0.25);
    }

    .btn-save:disabled {
        background: #a0aec0;
        cursor: not-allowed;
    }

    .btn-save .spinner-border {
        margin-right: 8px;
    }

    .btn-back {
        background: #f8fafc;
        color: #475569;
        border: 1px solid #e2e8f0;
        padding: 10px 20px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s ease-in-out;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .btn-back:hover {
        background: #f1f5f9;
        color: #1e293b;
        border-color: #cbd5e1;
        transform: translateX(-2px);
    }

    /* Responsive */
    @media (max-width: 768px) {
        .page-wrapper {
            padding: 16px;
        }

        .price-total {
            font-size: 1.2rem;
        }
    }
</style>
