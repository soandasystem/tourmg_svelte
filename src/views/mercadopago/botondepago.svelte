<script>
    import { onMount } from "svelte";
    import { navigate } from "svelte-routing";

    let public_key = "";
    let preference = "";
    let isLoaded = false;

    function initMercadoPago() {
        if (!public_key || !preference || isLoaded) return;

        if (typeof MercadoPago === "undefined") {
            setTimeout(initMercadoPago, 150);
            return;
        }

        try {
            const mp = new MercadoPago(public_key, {
                locale: "es-CL",
            });

            mp.checkout({
                preference: {
                    id: preference,
                },
                render: {
                    container: ".cho-container",
                    label: "Pagar",
                },
            });

            isLoaded = true;
        } catch (error) {
            console.error("Error inicializando MercadoPago:", error);
        }
    }

    function handleBack() {
        navigate("/payment/paymentsales");
    }

    onMount(() => {
        const params = new URLSearchParams(window.location.search);

        public_key = params.get("PublicKey") || "";
        preference = params.get("Preference") || "";

        initMercadoPago();
    });
</script>

<svelte:head>
    <script src="https://sdk.mercadopago.com/js/v2"></script>
</svelte:head>

<div class="payment-container">
    <div class="payment-message">
        <strong>Para continuar con el pago</strong>
        <span>presione el botón <b>Pagar</b></span>
    </div>
    <div class="cho-container"></div>
    <button type="button" class="btn-back" on:click={handleBack}>
        <i class="fa fa-chevron-left me-1"></i> Volver
    </button>
</div>

<style>
    .payment-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 20px 0;
    }
    .payment-message {
        text-align: center;
        margin-bottom: 15px;
        color: #444;
        font-size: 15px;
    }
    .payment-message strong {
        display: block;
        font-size: 17px;
        margin-bottom: 5px;
    }
    .payment-message span {
        display: block;
        color: #666;
    }
    .cho-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 10px 0;
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
        margin-top: 15px;
    }
    .btn-back:hover {
        background: #f1f5f9;
        color: #1e293b;
        border-color: #cbd5e1;
        transform: translateX(-2px);
    }
</style>
