<svelte:head>
    <script src="https://sdk.mercadopago.com/js/v2"></script>
</svelte:head>

<script>
    import { onMount } from "svelte";

    export let public_key = "";
    export let preference = "";

    let isLoaded = false;

    function initMercadoPago() {
        if (!public_key || !preference || isLoaded) return;

        if (typeof MercadoPago === "undefined") {
            setTimeout(initMercadoPago, 150);
            return;
        }

        try {
            const mp = new MercadoPago(public_key, {
                locale: "es-CL"
            });

            mp.checkout({
                preference: {
                    id: preference
                },
                render: {
                    container: ".cho-container",
                    label: "Pagar"
                }
            });
            isLoaded = true;
        } catch (error) {
            console.error("Error inicializando MercadoPago:", error);
        }
    }

    onMount(() => {
        // Soporte tanto para props como para parámetros en la URL
        const params = new URLSearchParams(window.location.search);
        if (!public_key) public_key = params.get("public_key") || "";
        if (!preference) preference = params.get("preference") || params.get("preference_id") || "";

        if (typeof MercadoPago !== "undefined") {
            initMercadoPago();
        } else {
            const script = document.createElement("script");
            script.src = "https://sdk.mercadopago.com/js/v2";
            script.async = true;
            script.onload = () => initMercadoPago();
            document.head.appendChild(script);
        }
    });

    $: if (public_key && preference && !isLoaded) {
        initMercadoPago();
    }
</script>

<div class="cho-container"></div>

<style>
    .cho-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 10px 0;
    }
</style>
