<script>
    import { onMount } from "svelte";
    import html2pdf from "html2pdf.js";
    import { formatCurrency } from "../../lib/utils.js";

    export let flowData = null;
    export let onClose = () => {};

    let pdfRef;

    const generarPDF = () => {
        if (!pdfRef) return;
        const filenameOrder = flowData?.commerceOrder || flowData?.flowOrder || "flow";
        html2pdf()
            .set({
                margin: [10, 10, 10, 10],
                filename: `Comprobante_Pago_${filenameOrder}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            })
            .from(pdfRef)
            .save();
    };

    function displayAmount(val) {
        if (val === null || val === undefined) return "$0";
        if (typeof val === "number") return formatCurrency(val);
        if (typeof val === "string" && !isNaN(Number(val))) {
            return formatCurrency(Number(val));
        }
        return val;
    }
</script>

<div class="pdf-viewer-overlay">
    <div class="pdf-viewer-card">
        {#if flowData}
            <div class="pdf-actions-header">
                <div class="info">
                    <h3>Vista Previa: Comprobante de Pago</h3>
                    <p>N° Comprobante: {flowData?.commerceOrder || 'N/A'}</p>
                </div>
                <div class="buttons">
                    <button class="btn-download-pdf" on:click={generarPDF}>
                        <i class="fa fa-file-pdf-o"></i>
                        <span>Descargar PDF</span>
                    </button>
                    <button class="btn-close-pdf" on:click={onClose}>
                        <i class="fa fa-times"></i>
                        <span>Cerrar</span>
                    </button>
                </div>
            </div>

            <div class="pdf-preview-wrapper">
                <div bind:this={pdfRef} class="pdf-page">
                    <!-- ENCABEZADO Y TÍTULO -->
                    <div class="pdf-header">
                        <h1 class="pdf-title">CONFIRMACIÓN DE PAGO</h1>
                        <p class="pdf-greeting">¡Hola!</p>
                        <p class="pdf-subtitle">
                            Tu pago a través de nuestro sitio web fue exitoso.
                        </p>
                    </div>

                    <div class="pdf-divider"></div>

                    <!-- DETALLES ENCABEZADO -->
                    <div class="panel-heading">
                        Este es el detalle:
                    </div>

                    <!-- INFORMACIÓN DE LA TRANSACCIÓN -->
                    <table class="pdf-info-table">
                        <tbody>
                            <tr>
                                <td class="label">Número de Comprobante:</td>
                                <td class="value">{flowData?.commerceOrder || '-'}</td>
                            </tr>
                            {#if flowData?.optional?.alumno}
                                <tr>
                                    <td class="label">Rut:</td>
                                    <td class="value">{flowData.optional.alumno}</td>
                                </tr>
                            {/if}
                            <tr>
                                <td class="label">Fecha de pago:</td>
                                <td class="value">{flowData?.requestDate || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">Hora de pago:</td>
                                <td class="value">{flowData?.requestDate || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">Transacción Nro:</td>
                                <td class="value">{flowData?.flowOrder || '-'}</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- MONTO PAGADO -->
                    <div class="panel-monto">
                        <span class="monto-label">Monto pagado:</span>
                        <span class="monto-val">{displayAmount(flowData?.amount)}</span>
                    </div>

                    <!-- MEDIO DE PAGO -->
                    <div class="panel-medios">
                        <span class="medios-label">Medio de pago:</span>
                        <span class="medios-val">{flowData?.paymentData?.media || flowData?.media || '-'}</span>
                    </div>

                    <!-- FOOTER AVISO -->
                    <div class="pdf-footer-note">
                        <p>Gracias por realizar su transacción con nosotros.</p>
                        <p class="small-text">Este documento sirve como comprobante de pago oficial.</p>
                    </div>
                </div>
            </div>
        {:else}
            <div class="pdf-status-container">
                <i class="fa fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <p>No hay información disponible para generar el comprobante.</p>
                <button class="btn-close-pdf" on:click={onClose}>Cerrar</button>
            </div>
        {/if}
    </div>
</div>

<style>
    .pdf-viewer-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
    }

    .pdf-viewer-card {
        background: white;
        width: 100%;
        max-width: 850px;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
    }

    .pdf-status-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        min-height: 300px;
    }

    .pdf-actions-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
        padding: 15px 25px;
        border-bottom: 1px solid #e2e8f0;
    }

    .pdf-actions-header h3 {
        margin: 0;
        font-size: 16px;
        color: #1e293b;
        font-weight: 700;
    }

    .pdf-actions-header p {
        margin: 2px 0 0 0;
        font-size: 13px;
        color: #64748b;
    }

    .pdf-actions-header .buttons {
        display: flex;
        gap: 10px;
    }

    .btn-download-pdf {
        background: #4d078c;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s ease;
    }

    .btn-download-pdf:hover {
        background: #6a0e9c;
    }

    .btn-close-pdf {
        background: #f1f5f9;
        color: #475569;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .btn-close-pdf:hover {
        background: #e2e8f0;
    }

    .pdf-preview-wrapper {
        background: #94a3b8;
        padding: 30px;
        display: flex;
        justify-content: center;
        overflow-y: auto;
        max-height: 80vh;
    }

    .pdf-page {
        width: 210mm;
        min-height: 250mm;
        padding: 20mm;
        background: white;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        font-family: "Helvetica", "Arial", sans-serif;
        color: #48267f;
        box-sizing: border-box;
    }

    .pdf-header {
        text-align: center;
        margin-bottom: 20px;
    }

    .pdf-title {
        font-size: 26px;
        color: #48267f;
        font-weight: 800;
        margin: 0 0 10px 0;
    }

    .pdf-greeting {
        font-size: 18px;
        color: #48267f;
        margin: 5px 0;
    }

    .pdf-subtitle {
        font-size: 16px;
        color: #48267f;
        margin: 0;
    }

    .pdf-divider {
        height: 2px;
        background: #4d078c;
        margin: 20px 0;
    }

    .panel-heading {
        font-size: 18px;
        color: white;
        background-color: #4d078c;
        text-align: center;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-weight: 700;
    }

    .pdf-info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }

    .pdf-info-table td {
        padding: 10px 15px;
        font-size: 15px;
    }

    .pdf-info-table td.label {
        font-weight: 700;
        color: #48267f;
        width: 50%;
        text-align: right;
    }

    .pdf-info-table td.value {
        font-weight: 600;
        color: #1e293b;
        text-align: left;
    }

    .panel-monto {
        background-color: #ff0080;
        color: white;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 15px;
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 700;
    }

    .panel-medios {
        background-color: #ededed;
        color: #4d078c;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 25px;
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 700;
    }

    .pdf-footer-note {
        margin-top: 40px;
        text-align: center;
        border-top: 1px solid #e2e8f0;
        padding-top: 20px;
        color: #64748b;
    }

    .pdf-footer-note p {
        margin: 4px 0;
        font-size: 13px;
    }

    .pdf-footer-note .small-text {
        font-size: 11px;
        color: #94a3b8;
    }
</style>
