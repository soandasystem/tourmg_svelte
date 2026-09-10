<svelte:head>
    <title>Estado de Pago</title>
</svelte:head>

<script>
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { navigate } from "svelte-routing";
    import { secureStorage } from "../../lib/secureStore";
    import { formatCurrency } from "../../lib/utils";

    export let message = "";
    export let payment = "";
    export let transaction_amount = "";
    export let external_reference = "";

    const userData = secureStorage.getItem("_us_") || {};
    const position = userData.position || "General";

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (!message) {
            message = urlParams.get("message") || "¡Pago realizado con éxito!";
        }
        if (!payment) {
            payment =
                urlParams.get("payment") ||
                urlParams.get("payment_id") ||
                urlParams.get("collection_id") ||
                "";
        }
        if (!transaction_amount) {
            transaction_amount =
                urlParams.get("transaction_amount") ||
                urlParams.get("amount") ||
                userData.mpagar ||
                "";
        }
        if (!external_reference) {
            external_reference =
                urlParams.get("external_reference") ||
                urlParams.get("preference_id") ||
                "";
        }
    });

    function handleContinue() {
        if (position === "General") {
            navigate("/opening");
        } else {
            navigate("/payment");
        }
    }
</script>

<div class="page-wrapper" in:fade={{ duration: 300 }}>
    <div class="card main-card shadow-sm border-0">
        <div class="card-header-status text-center p-4">
            <div class="icon-circle mb-3">
                <i class="fa fa-check text-success"></i>
            </div>
            <h1 class="header-title text-dark fw-bold m-0">
                {message || "Estado de Pago"}
            </h1>
            <p class="text-muted mt-1 mb-0">Comprobante de transacción Mercado Pago</p>
        </div>

        <div class="card-body p-4 pt-2">
            <div class="payment-detail-card p-4 rounded-4 mb-4">
                {#if payment}
                    <div class="detail-row py-3 border-bottom d-flex justify-content-between align-items-center">
                        <span class="text-muted fw-medium">ID de pago</span>
                        <span class="detail-value fw-bold text-dark">{payment}</span>
                    </div>
                {/if}

                {#if transaction_amount}
                    <div class="detail-row py-3 border-bottom d-flex justify-content-between align-items-center">
                        <span class="text-muted fw-medium">Monto</span>
                        <span class="price-total fw-bold text-success">
                            {isNaN(Number(transaction_amount)) ? transaction_amount : formatCurrency(Number(transaction_amount))}
                        </span>
                    </div>
                {/if}

                {#if external_reference}
                    <div class="detail-row py-3 d-flex justify-content-between align-items-center">
                        <span class="text-muted fw-medium">Referencia</span>
                        <span class="detail-value fw-bold text-dark">{external_reference}</span>
                    </div>
                {/if}
            </div>

            <div class="text-center">
                <button type="button" class="btn-continue w-100 py-3" on:click={handleContinue}>
                    <i class="fa fa-arrow-right me-2"></i> Continuar
                </button>
            </div>
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
        max-width: 540px;
        width: 100%;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05) !important;
        overflow: hidden;
    }

    .icon-circle {
        width: 64px;
        height: 64px;
        background-color: #ecfdf5;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
    }

    .header-title {
        font-size: 1.4rem;
        line-height: 1.3;
    }

    .payment-detail-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
    }

    .detail-value {
        font-size: 1rem;
        color: #1e293b;
        word-break: break-all;
    }

    .price-total {
        font-size: 1.3rem;
        color: #059669 !important;
    }

    .btn-continue {
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

    .btn-continue:hover {
        background: #2e59d9;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(78, 115, 223, 0.25);
    }
</style>
