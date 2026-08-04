<script>
    export let identificador = "";
    export let fecha = "";
    export let mpagar = 0;
    export let valorcuota = 0;
    export let nrocuotas = 0;
    export let fechainicial = "";

    let isLoading = false;
    let errorMessage = "";

    const userData = secureStorage.getItem("_us_") || {};
    const schemaName = userData.schema || "";
    const author = userData.username || "";
    const currentCompanyId = userData.company || 0;
    const saleId = userData.sale || 0;
    const passengersId = userData.id || 0;
    const userrut = userData.userrut || "";

    async function handleSubmit(event) {
        event.preventDefault();
        isLoading = true;
        errorMessage = "";

        try {
            // Reemplaza esta URL con la ruta correcta hacia tu backend en Go
            const response = await fetch("/api/v3.5/flow/inicioPagoFlow", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mpagar: mpagar,
                    valorcuota: valorcuota,
                    nrocuotas: nrocuotas,
                    fechainicial: fechainicial,
                    identificador: identificador,
                    company_id: currentCompanyId,
                    sale_id: saleId,
                    curso_id: passengersId,
                    user_rut: userrut,
                }),
            });

            if (!response.ok) {
                throw new Error("Error al iniciar el pago con Flow");
            }

            const data = await response.json();

            // Asumimos que el backend en Go devuelve la URL de redirección
            // Ejemplo: { "url": "https://www.flow.cl/api/payment/create?token=..." }
            if (data.url) {
                window.location.href = data.url;
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

    // Formatear el número a pesos chilenos ($)
    function formatCurrency(value) {
        return new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
            minimumFractionDigits: 0,
        }).format(value);
    }
</script>

<div class="col-md-6" style="margin-left:30%">
    <div>
        <h4><i class="fa fa-table"></i> Continuar con Pago Flow</h4>
    </div>
    <br />

    {#if errorMessage}
        <div class="alert alert-danger" role="alert">
            {errorMessage}
        </div>
    {/if}

    <div>
        <form
            name="form_continuapagoflw"
            id="form_continuapagoflw"
            on:submit={handleSubmit}
        >
            <div class="form-group row mb-3">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label
                    class="col-form-label col-form-label-sm col-sm-4 text-start"
                    ><strong>Nro Ingreso</strong></label
                >
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label
                    class="col-form-label col-form-label-sm col-sm-6 text-start"
                    >{identificador}</label
                >
            </div>

            <div class="form-group row mb-3">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label
                    class="col-form-label col-form-label-sm col-sm-4 text-start"
                    ><strong>Fecha Pago</strong></label
                >
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label
                    class="col-form-label col-form-label-sm col-sm-6 text-start"
                    >{fecha}</label
                >
            </div>

            <div class="form-group row mb-3">
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label
                    class="col-form-label col-form-label-sm col-sm-4 text-start"
                    ><strong>Monto a Pagar</strong></label
                >
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <label
                    class="col-form-label col-form-label-sm col-sm-6 text-start"
                    id="mpagar">{formatCurrency(mpagar)}</label
                >
            </div>

            <!-- Botón adaptado a Bootstrap 5, pero mantiene las clases similares al original -->
            <button
                type="submit"
                class="btn btn-primary btn-sm mt-2"
                disabled={isLoading}
            >
                {#if isLoading}
                    <span
                        class="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                    ></span> Procesando...
                {:else}
                    Continuar Pago
                {/if}
            </button>
        </form>
    </div>
</div>
<br />
<div class="clearfix"></div>
