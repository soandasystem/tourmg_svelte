<script>
    import { onMount } from "svelte";
    import dayjs from "dayjs";
    import Swal from "sweetalert2";
    import api from "../../lib/apis.js";
    import { secureStorage } from "../../lib/secureStore";
    import SearchableSelect from "../../components/SearchableSelect.svelte";

    // Sesión
    const userData = secureStorage.getItem("_us_") || {};
    const schemaName = userData.schema || "global";

    // Estados para selects
    /** @type {any[]} */
    let countries = [];
    /** @type {any[]} */
    let originAirports = [];
    /** @type {any[]} */
    let destinationAirports = [];

    // Variables de formulario
    let originCountry = "CL";
    let destinationCountry = "";
    let originCode = "";
    let destinationCode = "";
    let startDate = dayjs().add(15, "day").format("YYYY-MM-DD");
    let cntOffers = "5";

    // Estados de UI
    let loadingCountries = false;
    let loadingOriginAirports = false;
    let loadingDestAirports = false;
    let searching = false;
    let searchAttempted = false;
    let offers = [];
    let selectedOffer = null;

    // Cargar países al inicio
    const fetchCountries = async () => {
        loadingCountries = true;
        try {
            // Intentar primero con "country", fallback a "countries"
            let res = await api.getData("country", "", "", "", "global");
            if (
                res.status !== "success" ||
                !Array.isArray(res.data) ||
                res.data.length === 0
            ) {
                res = await api.getData("countries", "", "", "", "global");
            }
            if (res.status === "success" && Array.isArray(res.data)) {
                countries = res.data;
                // Si viene 'CL' preseleccionado por defecto, cargar sus aeropuertos
                if (originCountry) {
                    await fetchAirportsByCountry(originCountry, "origin");
                }
            } else {
                countries = [];
            }
        } catch (error) {
            console.error("Error al cargar países:", error);
            countries = [];
        } finally {
            loadingCountries = false;
        }
    };

    // Cargar aeropuertos filtrados por código de país
    const fetchAirportsByCountry = async (countryCode, type = "origin") => {
        if (!countryCode) {
            if (type === "origin") {
                originAirports = [];
                originCode = "";
            } else {
                destinationAirports = [];
                destinationCode = "";
            }
            return;
        }

        if (type === "origin") loadingOriginAirports = true;
        else loadingDestAirports = true;

        try {
            // Consultar tabla airports filtrando por country
            let res = await api.getData(
                "airports",
                "",
                `country=${countryCode}`,
                "",
                "global",
            );
            if (res.status !== "success" || !Array.isArray(res.data)) {
                res = await api.getData(
                    "airport",
                    "",
                    `country=${countryCode}`,
                    "",
                    "global",
                );
            }

            const list =
                res.status === "success" && Array.isArray(res.data)
                    ? res.data
                    : [];

            if (type === "origin") {
                originAirports = list;
                // Preseleccionar SCL si existe
                const scl = originAirports.find(
                    (a) => (a.iata || "").toUpperCase() === "SCL",
                );
                if (scl) {
                    originCode = scl.iata || "SCL";
                } else if (originAirports.length > 0) {
                    originCode = originAirports[0].iata || "";
                } else {
                    originCode = "";
                }
            } else {
                destinationAirports = list;
                if (destinationAirports.length > 0) {
                    destinationCode = destinationAirports[0].iata || "";
                } else {
                    destinationCode = "";
                }
            }
        } catch (error) {
            console.error(
                `Error al cargar aeropuertos para ${countryCode}:`,
                error,
            );
        } finally {
            if (type === "origin") loadingOriginAirports = false;
            else loadingDestAirports = false;
        }
    };

    // Manejador cambio país origen
    function handleOriginCountryChange(e) {
        originCountry = e.target.value;
        fetchAirportsByCountry(originCountry, "origin");
    }

    // Manejador cambio país destino
    function handleDestCountryChange(e) {
        destinationCountry = e.target.value;
        fetchAirportsByCountry(destinationCountry, "destination");
    }

    // Mapeo reactivo de opciones para SearchableSelect
    $: countryOptions = countries.map((c) => ({
        value: c.code,
        label: c.country,
        sublabel: c.code,
    }));

    $: originAirportOptions = originAirports.map((a) => ({
        value: a.iata || a.icao || "",
        label: `${a.name}${a.iata || a.icao ? ` (${a.iata || a.icao})` : ""}`,
        sublabel: a.iata || a.icao || "",
    }));

    $: destinationAirportOptions = destinationAirports.map((a) => ({
        value: a.iata || a.icao || "",
        label: `${a.name}${a.iata || a.icao ? ` (${a.iata || a.icao})` : ""}`,
        sublabel: a.iata || a.icao || "",
    }));

    function onOriginCountrySelect(e) {
        originCountry = e.detail.value;
        fetchAirportsByCountry(originCountry, "origin");
    }

    function onDestCountrySelect(e) {
        destinationCountry = e.detail.value;
        fetchAirportsByCountry(destinationCountry, "destination");
    }

    function onOriginAirportSelect(e) {
        originCode = e.detail.value;
    }

    function onDestAirportSelect(e) {
        destinationCode = e.detail.value;
    }

    // Convertir nanosegundos de Duffel/GDS a horas y minutos legibles
    function formatDuration(ns) {
        if (!ns || isNaN(ns)) return "";
        const totalMinutes = Math.round(Number(ns) / (1000 * 1000 * 1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    }

    // Formatear fechas ISO de vuelo
    function formatFlightDateTime(isoStr) {
        if (!isoStr) return "";
        return dayjs(isoStr).format("DD/MM/YYYY HH:mm");
    }

    function formatFlightTime(isoStr) {
        if (!isoStr) return "";
        return dayjs(isoStr).format("HH:mm");
    }

    function formatFlightDate(isoStr) {
        if (!isoStr) return "";
        return dayjs(isoStr).format("ddd, DD MMM YYYY");
    }

    // Ejecutar búsqueda de vuelos en flightgds
    async function executeSearch() {
        if (!originCode) {
            Swal.fire({
                icon: "warning",
                title: "Campo requerido",
                text: "Por favor selecciona el Aeropuerto de Origen.",
                confirmButtonColor: "#4e73df",
            });
            return;
        }

        if (!destinationCode) {
            Swal.fire({
                icon: "warning",
                title: "Campo requerido",
                text: "Por favor selecciona el Aeropuerto de Destino.",
                confirmButtonColor: "#4e73df",
            });
            return;
        }

        if (!startDate) {
            Swal.fire({
                icon: "warning",
                title: "Campo requerido",
                text: "Por favor ingresa la Fecha Desde (salida).",
                confirmButtonColor: "#4e73df",
            });
            return;
        }

        // Calcular retorno a +7 días
        const returnDate = dayjs(startDate).add(7, "day").format("YYYY-MM-DD");

        // Construir JSON exacto solicitado
        const payload = {
            data: {
                slices: [
                    {
                        origin: originCode,
                        destination: destinationCode,
                        departure_date: startDate,
                    },
                    {
                        origin: destinationCode,
                        destination: originCode,
                        departure_date: returnDate,
                    },
                ],
                passengers: [
                    {
                        type: "adult",
                    },
                ],
            },
        };
        console.log(payload);

        searching = true;
        searchAttempted = true;
        offers = [];
        selectedOffer = null;

        try {
            const res = await api.setData(
                "flightgds",
                payload,
                "",
                "",
                schemaName,
            );

            let rawOffers = [];
            console.log("Respuesta Flight GDS:", res.data);
            if (res && res.status === "success" && res.data) {
                // Puede venir directamente como array o dentro de res.data.data
                if (Array.isArray(res.data)) {
                    rawOffers = res.data;
                } else if (res.data.data && Array.isArray(res.data.data)) {
                    rawOffers = res.data.data;
                }
            } else if (res && res.data && Array.isArray(res.data)) {
                rawOffers = res.data;
            }

            // Filtrar elementos vacíos o sin ID si viniera alguno
            const validOffers = rawOffers.filter(
                (o) => o && (o.ID || o.Price || o.Outbound),
            );

            // Aplicar límite según 'cnt_offers'
            const limit = parseInt(cntOffers) || 5;
            offers = validOffers.slice(0, limit);

            if (offers.length === 0) {
                Swal.fire({
                    icon: "info",
                    title: "Sin resultados",
                    text: `No se encontraron ofertas de vuelos entre ${originCode} y ${destinationCode} para las fechas seleccionadas.`,
                    confirmButtonColor: "#4e73df",
                });
            }
        } catch (error) {
            console.error("Error al buscar vuelos en flightgds:", error);
            Swal.fire({
                icon: "error",
                title: "Error en la búsqueda",
                text: "Ocurrió un error al consultar el servicio de vuelos GDS.",
                confirmButtonColor: "#4e73df",
            });
        } finally {
            searching = false;
        }
    }

    onMount(() => {
        fetchCountries();
    });
</script>

<div class="gdsair-container">
    <!-- Título y breadcrumb -->
    <div class="page-header mb-4">
        <h2 class="main-title mb-1">
            <i class="fa fa-plane text-primary me-2"></i>GDS - Búsqueda de
            Vuelos
        </h2>
        <p class="subtitle text-muted mb-0">
            Consulta y cotización de itinerarios aéreos en tiempo real mediante
            pasarela GDS / Duffel.
        </p>
    </div>

    <!-- Panel de Búsqueda -->
    <div class="card shadow-sm border-0 mb-4 search-card">
        <div class="card-header bg-white border-bottom py-3">
            <h5 class="card-title fw-bold mb-0 text-dark">
                <i class="fa fa-sliders text-secondary me-2"></i>Parámetros de
                Búsqueda Aérea
            </h5>
        </div>
        <div class="card-body p-4">
            <!-- Fila 1: Países con Búsqueda -->
            <div class="row">
                <div class="col-md-3">
                    <div class="form-group mb-3">
                        <label class="control-label fw-bold mb-1" for="origin"
                            >Ciudad Origen</label
                        >
                        <SearchableSelect
                            id="origin"
                            name="origin"
                            bind:value={originCountry}
                            items={countryOptions}
                            placeholder="Seleccionar país origen"
                            searchPlaceholder="Buscar país de origen..."
                            disabled={loadingCountries}
                            loading={loadingCountries}
                            loadingText="Cargando países..."
                            on:change={onOriginCountrySelect}
                        />
                    </div>
                </div>

                <div class="col-md-3 col-md-offset-3">
                    <div class="form-group mb-3">
                        <label
                            class="control-label fw-bold mb-1"
                            for="destination">Ciudad Destino</label
                        >
                        <SearchableSelect
                            id="destination"
                            name="destination"
                            bind:value={destinationCountry}
                            items={countryOptions}
                            placeholder="Seleccionar país destino"
                            searchPlaceholder="Buscar país de destino..."
                            disabled={loadingCountries}
                            loading={loadingCountries}
                            loadingText="Cargando países..."
                            on:change={onDestCountrySelect}
                        />
                    </div>
                </div>
            </div>

            <!-- Fila 2: Aeropuertos con Búsqueda -->
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group mb-3">
                        <label
                            class="control-label fw-bold mb-1"
                            for="origincode">Aeropuerto Origen</label
                        >
                        <SearchableSelect
                            id="origincode"
                            name="origincode"
                            bind:value={originCode}
                            items={originAirportOptions}
                            placeholder={originAirports.length === 0
                                ? "Selecciona país origen primero"
                                : "Seleccionar aeropuerto"}
                            searchPlaceholder="Buscar aeropuerto por nombre o código (ej: SCL)..."
                            disabled={loadingOriginAirports ||
                                originAirports.length === 0}
                            loading={loadingOriginAirports}
                            loadingText="Cargando aeropuertos..."
                            on:change={onOriginAirportSelect}
                        />
                    </div>
                </div>

                <div class="col-md-4 col-md-offset-2">
                    <div class="form-group mb-3">
                        <label
                            class="control-label fw-bold mb-1"
                            for="destinationcode">Aeropuerto Destino</label
                        >
                        <SearchableSelect
                            id="destinationcode"
                            name="destinationcode"
                            bind:value={destinationCode}
                            items={destinationAirportOptions}
                            placeholder={destinationAirports.length === 0
                                ? "Selecciona país destino primero"
                                : "Seleccionar aeropuerto"}
                            searchPlaceholder="Buscar aeropuerto por nombre o código (ej: MIA)..."
                            disabled={loadingDestAirports ||
                                destinationAirports.length === 0}
                            loading={loadingDestAirports}
                            loadingText="Cargando aeropuertos..."
                            on:change={onDestAirportSelect}
                        />
                    </div>
                </div>
            </div>

            <!-- Fila 3: Fechas y Ofertas -->
            <div class="row">
                <div class="col-md-4">
                    <span class="control-label fw-bold mb-1 d-block"
                        >Fecha Desde</span
                    >
                    <div class="col-md-6 no-padding w-100">
                        <div class="input-group mb-3">
                            <input
                                type="date"
                                name="start_date"
                                id="start_date"
                                class="form-control datepicker"
                                bind:value={startDate}
                            />
                            <span class="input-group-text bg-light">
                                <i class="fa fa-calendar text-muted"></i>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="col-md-4 col-md-offset-2">
                    <div class="form-group mb-3">
                        <label
                            class="control-label fw-bold mb-1"
                            for="cnt_offers">Cantidad de Ofertas</label
                        >
                        <select
                            class="form-control required box_select form-select"
                            name="cnt_offers"
                            id="cnt_offers"
                            bind:value={cntOffers}
                        >
                            <option value="">Seleccionar</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                    </div>
                </div>

                <div class="col-md-4 d-flex align-items-end">
                    <div class="col-md-6 no-padding w-100 mb-3">
                        <button
                            id="execute_search"
                            class="btn btn-primary w-100 fw-bold py-2 shadow-sm"
                            on:click={executeSearch}
                            disabled={searching}
                        >
                            {#if searching}
                                <span
                                    class="spinner-border spinner-border-sm me-2"
                                    role="status"
                                ></span>
                                Buscando...
                            {:else}
                                <i class="fa fa-search me-2"></i> Buscar Vuelos
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <hr class="my-4 text-muted opacity-25" />

    <!-- Div contenedor de Resultados requerido por el usuario -->
    <div class="col-md-12" id="result">
        {#if searching}
            <div class="card p-5 text-center shadow-sm border-0 my-3">
                <div
                    class="spinner-border text-primary mx-auto mb-3"
                    style="width: 3rem; height: 3rem;"
                    role="status"
                ></div>
                <h5 class="text-secondary fw-semibold">
                    Consultando disponibilidad en GDS ...
                </h5>
                <p class="text-muted small mb-0">
                    Buscando las mejores tarifas y combinaciones de vuelos
                </p>
            </div>
        {:else if searchAttempted && offers.length === 0}
            <div
                class="alert alert-warning text-center py-4 shadow-sm border-0"
            >
                <i class="fa fa-info-circle fa-2x mb-2 d-block"></i>
                <strong>No se encontraron ofertas de vuelos</strong> para la ruta
                seleccionada. Intenta con otras fechas o aeropuertos.
            </div>
        {:else if offers.length > 0}
            <div
                class="results-header d-flex justify-content-between align-items-center mb-3"
            >
                <h4 class="fw-bold text-dark mb-0">
                    <i class="fa fa-list-alt text-success me-2"></i>Ofertas
                    Disponibles ({offers.length})
                </h4>
                <span
                    class="badge bg-primary-soft text-primary fw-semibold px-3 py-2"
                >
                    Ruta: {originCode} ⇄ {destinationCode} (+7 días retorno)
                </span>
            </div>

            <!-- Listado de Ofertas de Vuelo -->
            <div class="flight-offers-list">
                {#each offers as offer, idx}
                    <div class="flight-card card border-0 shadow-sm mb-4">
                        <div
                            class="card-header bg-white py-3 px-4 d-flex flex-wrap justify-content-between align-items-center border-bottom"
                        >
                            <div class="d-flex align-items-center">
                                <span class="badge bg-secondary me-3 fw-bold"
                                    >Oferta #{idx + 1}</span
                                >
                                {#if offer.Provider}
                                    <span
                                        class="badge bg-info-soft text-info me-2 fw-semibold"
                                    >
                                        <i class="fa fa-cloud me-1"
                                        ></i>{offer.Provider}
                                    </span>
                                {/if}
                                <span class="text-muted small font-monospace"
                                    >ID: {offer.ID ||
                                        offer.ProviderOfferID}</span
                                >
                            </div>
                            <div class="price-box text-end mt-2 mt-sm-0">
                                <span class="small text-muted d-block"
                                    >Tarifa Total:</span
                                >
                                <span
                                    class="flight-price text-success fw-bold fs-4"
                                >
                                    ${Number(offer.Price || 0).toLocaleString(
                                        "es-CL",
                                        { minimumFractionDigits: 2 },
                                    )}
                                    {offer.Currency || "USD"}
                                </span>
                            </div>
                        </div>

                        <div class="card-body p-4">
                            <!-- TRAMO 1: IDA (Outbound) -->
                            {#if offer.Outbound}
                                <div
                                    class="slice-section mb-4 pb-3 border-bottom"
                                >
                                    <div
                                        class="slice-header d-flex align-items-center mb-3"
                                    >
                                        <span
                                            class="badge bg-primary text-white me-2 px-2 py-1"
                                        >
                                            <i class="fa fa-plane me-1"></i> IDA
                                        </span>
                                        <strong class="text-dark">
                                            {offer.Outbound.origin?.city ||
                                                offer.Outbound.origin?.code} ➔ {offer
                                                .Outbound.destination?.city ||
                                                offer.Outbound.destination
                                                    ?.code}
                                        </strong>
                                        {#if offer.Outbound.segments && offer.Outbound.segments.length > 0}
                                            <span class="text-muted small ms-3">
                                                <i class="fa fa-calendar me-1"
                                                ></i>
                                                {formatFlightDate(
                                                    offer.Outbound.segments[0]
                                                        .departure_time,
                                                )}
                                            </span>
                                        {/if}
                                    </div>

                                    {#if offer.Outbound.segments && Array.isArray(offer.Outbound.segments)}
                                        {#each offer.Outbound.segments as seg}
                                            <div
                                                class="segment-row row align-items-center g-3 py-2 bg-light rounded-3 px-2 mb-2"
                                            >
                                                <div
                                                    class="col-12 col-md-3 d-flex align-items-center"
                                                >
                                                    {#if seg.airline?.LogoURL}
                                                        <img
                                                            src={seg.airline
                                                                .LogoURL}
                                                            alt={seg.airline
                                                                .Name}
                                                            class="airline-logo me-2"
                                                            style="height: 28px; max-width: 50px; object-fit: contain;"
                                                        />
                                                    {/if}
                                                    <div>
                                                        <span
                                                            class="fw-bold d-block text-dark"
                                                            >{seg.airline
                                                                ?.Name ||
                                                                seg.airline
                                                                    ?.Code}</span
                                                        >
                                                        <span
                                                            class="text-muted small"
                                                            >Vuelo {seg.airline
                                                                ?.Code ||
                                                                ""}-{seg.flight_number}</span
                                                        >
                                                    </div>
                                                </div>

                                                <div
                                                    class="col-12 col-md-5 text-center"
                                                >
                                                    <div
                                                        class="d-flex align-items-center justify-content-center gap-3"
                                                    >
                                                        <div class="text-start">
                                                            <strong
                                                                class="fs-5 text-dark d-block"
                                                                >{formatFlightTime(
                                                                    seg.departure_time,
                                                                )}</strong
                                                            >
                                                            <span
                                                                class="badge bg-light text-dark border"
                                                                >{seg.origin
                                                                    ?.code}</span
                                                            >
                                                        </div>

                                                        <div
                                                            class="flight-line flex-grow-1 text-center position-relative px-2"
                                                        >
                                                            <span
                                                                class="duration-badge small text-muted d-block"
                                                            >
                                                                {formatDuration(
                                                                    seg.duration,
                                                                )}
                                                            </span>
                                                            <div
                                                                class="line-bar position-relative my-1"
                                                            >
                                                                <i
                                                                    class="fa fa-plane text-primary position-absolute"
                                                                    style="top: -7px; left: 45%;"
                                                                ></i>
                                                            </div>
                                                            <span
                                                                class="stops-text small text-success fw-semibold"
                                                                >Directo</span
                                                            >
                                                        </div>

                                                        <div class="text-end">
                                                            <strong
                                                                class="fs-5 text-dark d-block"
                                                                >{formatFlightTime(
                                                                    seg.arrival_time,
                                                                )}</strong
                                                            >
                                                            <span
                                                                class="badge bg-light text-dark border"
                                                                >{seg
                                                                    .destination
                                                                    ?.code}</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>

                                                <div
                                                    class="col-12 col-md-4 text-md-end text-muted small"
                                                >
                                                    {#if seg.baggage && Array.isArray(seg.baggage)}
                                                        <div
                                                            class="baggage-info"
                                                        >
                                                            {#each seg.baggage as bag}
                                                                <span
                                                                    class="badge bg-white text-secondary border me-1"
                                                                >
                                                                    <i
                                                                        class="fa fa-suitcase me-1 text-info"
                                                                    ></i>
                                                                    {bag.Quantity}
                                                                    {bag.Type ===
                                                                    "checked"
                                                                        ? "Bodega"
                                                                        : "Mano"}
                                                                </span>
                                                            {/each}
                                                        </div>
                                                    {/if}
                                                </div>
                                            </div>
                                        {/each}
                                    {/if}
                                </div>
                            {/if}

                            <!-- TRAMO 2: RETORNO (Return) -->
                            {#if offer.Return}
                                <div class="slice-section mb-3">
                                    <div
                                        class="slice-header d-flex align-items-center mb-3"
                                    >
                                        <span
                                            class="badge bg-success text-white me-2 px-2 py-1"
                                        >
                                            <i
                                                class="fa fa-plane fa-flip-horizontal me-1"
                                            ></i> REGRESO (+7d)
                                        </span>
                                        <strong class="text-dark">
                                            {offer.Return.origin?.city ||
                                                offer.Return.origin?.code} ➔ {offer
                                                .Return.destination?.city ||
                                                offer.Return.destination?.code}
                                        </strong>
                                        {#if offer.Return.segments && offer.Return.segments.length > 0}
                                            <span class="text-muted small ms-3">
                                                <i class="fa fa-calendar me-1"
                                                ></i>
                                                {formatFlightDate(
                                                    offer.Return.segments[0]
                                                        .departure_time,
                                                )}
                                            </span>
                                        {/if}
                                    </div>

                                    {#if offer.Return.segments && Array.isArray(offer.Return.segments)}
                                        {#each offer.Return.segments as seg}
                                            <div
                                                class="segment-row row align-items-center g-3 py-2 bg-light rounded-3 px-2 mb-2"
                                            >
                                                <div
                                                    class="col-12 col-md-3 d-flex align-items-center"
                                                >
                                                    {#if seg.airline?.LogoURL}
                                                        <img
                                                            src={seg.airline
                                                                .LogoURL}
                                                            alt={seg.airline
                                                                .Name}
                                                            class="airline-logo me-2"
                                                            style="height: 28px; max-width: 50px; object-fit: contain;"
                                                        />
                                                    {/if}
                                                    <div>
                                                        <span
                                                            class="fw-bold d-block text-dark"
                                                            >{seg.airline
                                                                ?.Name ||
                                                                seg.airline
                                                                    ?.Code}</span
                                                        >
                                                        <span
                                                            class="text-muted small"
                                                            >Vuelo {seg.airline
                                                                ?.Code ||
                                                                ""}-{seg.flight_number}</span
                                                        >
                                                    </div>
                                                </div>

                                                <div
                                                    class="col-12 col-md-5 text-center"
                                                >
                                                    <div
                                                        class="d-flex align-items-center justify-content-center gap-3"
                                                    >
                                                        <div class="text-start">
                                                            <strong
                                                                class="fs-5 text-dark d-block"
                                                                >{formatFlightTime(
                                                                    seg.departure_time,
                                                                )}</strong
                                                            >
                                                            <span
                                                                class="badge bg-light text-dark border"
                                                                >{seg.origin
                                                                    ?.code}</span
                                                            >
                                                        </div>

                                                        <div
                                                            class="flight-line flex-grow-1 text-center position-relative px-2"
                                                        >
                                                            <span
                                                                class="duration-badge small text-muted d-block"
                                                            >
                                                                {formatDuration(
                                                                    seg.duration,
                                                                )}
                                                            </span>
                                                            <div
                                                                class="line-bar position-relative my-1"
                                                            >
                                                                <i
                                                                    class="fa fa-plane fa-flip-horizontal text-success position-absolute"
                                                                    style="top: -7px; left: 45%;"
                                                                ></i>
                                                            </div>
                                                            <span
                                                                class="stops-text small text-success fw-semibold"
                                                                >Directo</span
                                                            >
                                                        </div>

                                                        <div class="text-end">
                                                            <strong
                                                                class="fs-5 text-dark d-block"
                                                                >{formatFlightTime(
                                                                    seg.arrival_time,
                                                                )}</strong
                                                            >
                                                            <span
                                                                class="badge bg-light text-dark border"
                                                                >{seg
                                                                    .destination
                                                                    ?.code}</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>

                                                <div
                                                    class="col-12 col-md-4 text-md-end text-muted small"
                                                >
                                                    {#if seg.baggage && Array.isArray(seg.baggage)}
                                                        <div
                                                            class="baggage-info"
                                                        >
                                                            {#each seg.baggage as bag}
                                                                <span
                                                                    class="badge bg-white text-secondary border me-1"
                                                                >
                                                                    <i
                                                                        class="fa fa-suitcase me-1 text-info"
                                                                    ></i>
                                                                    {bag.Quantity}
                                                                    {bag.Type ===
                                                                    "checked"
                                                                        ? "Bodega"
                                                                        : "Mano"}
                                                                </span>
                                                            {/each}
                                                        </div>
                                                    {/if}
                                                </div>
                                            </div>
                                        {/each}
                                    {/if}
                                </div>
                            {/if}

                            <!-- Condiciones de tarifa -->
                            {#if offer.Conditions && offer.Conditions.length > 0}
                                <div
                                    class="conditions-box bg-white p-2 rounded border border-light mt-3 d-flex flex-wrap gap-2 align-items-center"
                                >
                                    <span class="small fw-bold text-muted me-2">
                                        <i
                                            class="fa fa-shield text-primary me-1"
                                        ></i>Condiciones:
                                    </span>
                                    {#each offer.Conditions as cond}
                                        {#if cond.Type === "refund_before_departure"}
                                            <span
                                                class="badge {cond.Allowed
                                                    ? 'bg-success-soft text-success'
                                                    : 'bg-danger-soft text-danger'}"
                                            >
                                                {cond.Allowed
                                                    ? "Reembolsable"
                                                    : "No reembolsable"}
                                            </span>
                                        {:else if cond.Type === "change_before_departure"}
                                            <span
                                                class="badge {cond.Allowed
                                                    ? 'bg-info-soft text-info'
                                                    : 'bg-secondary'}"
                                            >
                                                {cond.Allowed
                                                    ? `Cambios permitidos ($${cond.PenaltyAmount} ${cond.PenaltyCurrency})`
                                                    : "Sin cambios"}
                                            </span>
                                        {/if}
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <div
                            class="card-footer bg-white py-3 px-4 d-flex justify-content-between align-items-center border-top"
                        >
                            <span class="text-muted small">
                                <i class="fa fa-clock-o me-1"></i> Duración
                                Total: {formatDuration(offer.TotalDuration)}
                            </span>
                            <button
                                class="btn btn-outline-primary btn-sm px-4 fw-semibold"
                                on:click={() => {
                                    Swal.fire({
                                        icon: "success",
                                        title: "Oferta Seleccionada",
                                        html: `Has seleccionado el vuelo <strong>${offer.ID || offer.ProviderOfferID}</strong> por un total de <strong>$${Number(offer.Price || 0).toLocaleString("es-CL")} ${offer.Currency || "USD"}</strong>.`,
                                        confirmButtonColor: "#4e73df",
                                    });
                                }}
                            >
                                <i class="fa fa-check-circle me-1"></i> Seleccionar
                                Oferta
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .gdsair-container {
        padding: 15px;
        background-color: #f8f9fc;
        min-height: 100%;
    }

    .main-title {
        font-size: 22px;
        font-weight: 700;
        color: #333;
        letter-spacing: -0.3px;
    }

    .subtitle {
        font-size: 13px;
        color: #858796;
    }

    .search-card {
        border-radius: 8px !important;
        border: 1px solid #e3e6f0 !important;
        background: #ffffff;
    }

    .card-header {
        border-radius: 8px 8px 0 0 !important;
    }

    /* Estilos compatibles con box_select y PHP clásico */
    .box_select,
    .form-control,
    .form-select {
        border: 1px solid #d1d3e2;
        border-radius: 6px;
        font-size: 0.88rem;
        color: #495057;
        background-color: #fff;
        padding: 7px 12px;
        transition:
            border-color 0.15s ease-in-out,
            box-shadow 0.15s ease-in-out;
    }

    .box_select:focus,
    .form-control:focus,
    .form-select:focus {
        border-color: #4e73df;
        box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.2);
        outline: 0;
    }

    .control-label {
        font-size: 0.82rem;
        color: #4e5154;
    }

    .flight-card {
        border-radius: 10px !important;
        border: 1px solid #e3e6f0 !important;
        overflow: hidden;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
    }

    .flight-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(78, 115, 223, 0.12) !important;
    }

    .line-bar {
        height: 2px;
        background-color: #d1d3e2;
        margin: 12px 0;
    }

    .bg-primary-soft {
        background-color: rgba(78, 115, 223, 0.12);
    }
    .bg-success-soft {
        background-color: rgba(28, 200, 138, 0.12);
    }
    .bg-info-soft {
        background-color: rgba(54, 185, 204, 0.12);
    }
    .bg-danger-soft {
        background-color: rgba(231, 74, 59, 0.12);
    }

    .col-md-offset-3 {
        margin-left: 25%;
    }
    .col-md-offset-2 {
        margin-left: 16.66666667%;
    }

    @media (max-width: 768px) {
        .col-md-offset-3,
        .col-md-offset-2 {
            margin-left: 0 !important;
        }
    }
</style>
