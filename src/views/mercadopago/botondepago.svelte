<script>
    import { onMount } from "svelte";

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
</style>
