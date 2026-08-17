<script>
    import { onMount } from "svelte";
    import api from "../../lib/apis.js";
    import { secureStorage } from "../../lib/secureStore";
    import ComprobantePdf from "../generate_pdf/comprobante_pdf.svelte";

    const userData = secureStorage.getItem("_us_") || {};
    const token = userData.flowt || "F91853D876573BD763C08ABF3F647687AA7AAB8Y";
    const position = userData.position || "General";

    const fetchData = async () => {
        const payload = {
            token: token,
        };
        console.log("token flow", token);
        const result = await api.setData(
            "consulta-token",
            JSON.stringify(payload),
            "",
            "",
            "global",
        );
        if (result.status !== "success") {
            throw new Error(
                result.message || "Error al iniciar el pago con Flow",
            );
        }
        const data = result.data;

        console.log("DATA:", data);

        if (data?.items?.length > 0) {
            flowData = data.items[0];
        }
    };
    let flowData = null;
    let showPdfModal = false;

    function handleDownload() {
        if (flowData) {
            showPdfModal = true;
        }
    }

    onMount(() => {
        fetchData();
    });
</script>

<div class="panel text-center">
    {#if flowData}
        <div class="panel-body">
            <!-- Título de la confirmación -->
            <table
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                align="center"
            >
                <tbody>
                    <tr>
                        <td class="panel-title">CONFIRMACIÓN DE PAGO</td>
                    </tr>
                    <tr>
                        <td class="panel-body">¡Hola!</td>
                    </tr>
                    <tr>
                        <td class="panel-body"
                            >Tu pago a través de nuestro sitio web fue
                            exitoso.</td
                        >
                    </tr>
                </tbody>
            </table>

            <!-- Detalles del pago -->
            <table
                width="100%"
                cellspacing="0"
                cellpadding="8"
                border="0"
                align="center"
            >
                <tbody>
                    <tr>
                        <td class="panel-heading">Este es el detalle:</td>
                    </tr>
                </tbody>
            </table>

            <!-- Información de la transacción -->
            <table
                width="100%"
                cellspacing="0"
                cellpadding="8"
                border="0"
                align="center"
            >
                <tbody>
                    <tr>
                        <td class="panel-info"
                            >Número de Comprobante:&nbsp;</td
                        >
                        <td class="panel-info">{flowData.commerceOrder}</td>
                    </tr>
                    <tr>
                        <td class="panel-info">Rut:&nbsp;</td>
                        <td class="panel-info"
                            >{flowData.optional?.alumno || ''}</td
                        >
                    </tr>
                    <tr>
                        <td class="panel-info">Fecha de pago:&nbsp;</td>
                        <td class="panel-info">{flowData.requestDate}</td>
                    </tr>
                    <tr>
                        <td class="panel-info">Hora de pago:&nbsp;</td>
                        <td class="panel-info">{flowData.requestDate}</td>
                    </tr>
                    <tr>
                        <td class="panel-info">Transacción Nro:&nbsp;</td>
                        <td class="panel-info">{flowData.flowOrder}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Monto Pagado -->
            <table
                class="panel-monto"
                cellspacing="0"
                cellpadding="8"
                border="0"
                align="center"
            >
                <tbody>
                    <tr>
                        <td>Monto pagado:&nbsp;</td>
                        <td>{flowData.amount}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Medio de Pago -->
            <table
                class="panel-medios"
                cellspacing="0"
                cellpadding="8"
                border="0"
                align="center"
            >
                <tbody>
                    <tr>
                        <td>Medio de pago:&nbsp;</td>
                        <td>{flowData.paymentData?.media || ''}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Botón de continuar y descargar -->
            <div class="btn-container">
                {#if position === "General"}
                    <a href="/opening" class="btnn">Continuar</a>
                {:else}
                    <a href="/payment" class="btnn">Continuar</a>
                {/if}
                <button
                    type="button"
                    on:click={handleDownload}
                    class="btnn"
                    style="border:none; cursor:pointer;">Descargar</button
                >
            </div>
        </div>
    {:else}
        <div class="panel-body">
            <p>Cargando información del pago...</p>
        </div>
    {/if}
</div>

{#if showPdfModal}
    <ComprobantePdf
        {flowData}
        onClose={() => (showPdfModal = false)}
    />
{/if}

<style>
    /* Estilo general del panel */
    .panel {
        margin: 0 auto;
        float: none;
        max-width: 90%;
        width: 40rem;
        margin-top: 30px;
        padding: 20px;
        border-radius: 10px;
        background-color: #fff;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
    }

    /* Títulos del panel */
    .panel-title {
        font-size: 28px;
        color: #48267f;
        font-weight: bold;
        line-height: 1.2;
    }

    /* Estilo del texto del cuerpo del panel */
    .panel-body {
        font-size: 18px;
        color: #48267f;
        line-height: 1.5;
        font-weight: normal;
        padding: 15px 0;
    }

    /* Estilo para el encabezado de detalles */
    .panel-heading {
        font-size: 18px;
        color: white;
        background-color: #4d078c;
        text-align: center;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
    }

    /* Tabla de información */
    .panel-info {
        font-size: 16px;
        color: #48267f;
        line-height: 1.6;
        font-weight: bold;
    }

    /* Botones */
    .btn-container {
        text-align: center;
        padding: 20px;
        margin-top: 30px;
    }

    .btnn {
        background-color: #4d078c;
        color: white;
        padding: 15px 30px;
        font-size: 18px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: bold;
        transition: background-color 0.3s ease;
        display: inline-block;
        margin: 0 5px;
    }

    .btnn:hover {
        background-color: #6a0e9c;
        color: white;
    }

    /* Estilo para las tablas de monto y medio de pago */
    .panel-monto,
    .panel-medios {
        border-radius: 10px;
        margin-bottom: 15px;
        width: 100%;
    }

    .panel-monto td,
    .panel-medios td {
        font-size: 16px;
        padding: 12px;
        text-align: center;
    }

    /* Estilo para el fondo del monto pagado */
    .panel-monto {
        background-color: #ff0080;
        color: white;
    }

    /* Estilo para el fondo del medio de pago */
    .panel-medios {
        background-color: #ededed;
        color: #4d078c;
    }

    /* Ajustes para pantallas pequeñas */
    @media (max-width: 600px) {
        .panel {
            width: 100%;
            padding: 15px;
        }

        .btnn {
            width: 100%;
            padding: 15px;
            margin-bottom: 10px;
        }
    }
</style>
