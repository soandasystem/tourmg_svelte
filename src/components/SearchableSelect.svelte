<!-- src/components/SearchableSelect.svelte -->
<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";

    export let id = "";
    export let name = "";
    export let value = "";
    /** @type {Array<{ value: string|number, label: string, sublabel?: string }>} */
    export let items = [];
    export let placeholder = "Seleccionar";
    export let searchPlaceholder = "Escribe para buscar...";
    export let disabled = false;
    export let loading = false;
    export let loadingText = "Cargando opciones...";

    const dispatch = createEventDispatcher();

    let isOpen = false;
    let searchTerm = "";
    let searchInputRef = null;
    let containerRef = null;

    // Normalizar texto para búsqueda insensible a acentos
    function normalizeStr(str) {
        return (str || "")
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    // Filtrar elementos según el término de búsqueda
    $: filteredItems = (() => {
        if (!searchTerm.trim()) return items;
        const term = normalizeStr(searchTerm);
        return items.filter((item) => {
            const labelNorm = normalizeStr(item.label);
            const valueNorm = normalizeStr(item.value);
            const sublabelNorm = normalizeStr(item.sublabel);
            return (
                labelNorm.includes(term) ||
                valueNorm.includes(term) ||
                sublabelNorm.includes(term)
            );
        });
    })();

    // Obtener la etiqueta del item seleccionado
    $: selectedItem = items.find((i) => String(i.value) === String(value));
    $: displayLabel = selectedItem ? selectedItem.label : placeholder;

    function toggleDropdown() {
        if (disabled || loading) return;
        isOpen = !isOpen;
        if (isOpen) {
            searchTerm = "";
            setTimeout(() => {
                if (searchInputRef) searchInputRef.focus();
            }, 60);
        }
    }

    function selectOption(item) {
        value = item.value;
        isOpen = false;
        searchTerm = "";
        dispatch("change", { value: item.value, item });
    }

    function handleClickOutside(event) {
        if (containerRef && !containerRef.contains(event.target)) {
            isOpen = false;
        }
    }

    function handleKeyDown(event) {
        if (event.key === "Escape" && isOpen) {
            isOpen = false;
        }
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
    });

    onDestroy(() => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
    });
</script>

<div class="searchable-select-wrapper" bind:this={containerRef}>
    <!-- Input oculto para formularios clásicos -->
    <input type="hidden" {id} {name} {value} />

    <!-- Botón / Trigger que imita el select nativo -->
    <button
        type="button"
        class="form-control form-select-trigger {isOpen ? 'is-open' : ''}"
        on:click={toggleDropdown}
        {disabled}
    >
        <span class="selected-text {!selectedItem ? 'text-muted' : 'text-dark'}">
            {#if loading}
                <span class="spinner-border spinner-border-sm me-1 text-primary" role="status"></span>
                <span class="text-muted">{loadingText}</span>
            {:else}
                {displayLabel}
                {#if selectedItem && selectedItem.sublabel}
                    <span class="badge bg-light text-secondary border ms-2 py-0 px-1 small">
                        {selectedItem.sublabel}
                    </span>
                {/if}
            {/if}
        </span>
        <i class="fa fa-chevron-down chevron-icon {isOpen ? 'rotate' : ''}"></i>
    </button>

    <!-- Menú desplegable con buscador -->
    {#if isOpen}
        <div class="dropdown-panel shadow-lg">
            <!-- Input de búsqueda -->
            <div class="search-box-header">
                <i class="fa fa-search search-icon text-muted"></i>
                <input
                    type="text"
                    class="form-control search-input"
                    placeholder={searchPlaceholder}
                    bind:value={searchTerm}
                    bind:this={searchInputRef}
                    on:click|stopPropagation
                />
                {#if searchTerm}
                    <button
                        type="button"
                        class="clear-search-btn"
                        on:click|stopPropagation={() => (searchTerm = "")}
                    >
                        &times;
                    </button>
                {/if}
            </div>

            <!-- Lista de opciones filtradas -->
            <div class="options-list">
                {#if filteredItems.length === 0}
                    <div class="no-results text-center py-3 text-muted small">
                        <i class="fa fa-search-minus me-1"></i> No se encontraron resultados
                    </div>
                {:else}
                    {#each filteredItems as item}
                        <button
                            type="button"
                            class="option-item {String(item.value) === String(value) ? 'selected' : ''}"
                            on:click|stopPropagation={() => selectOption(item)}
                        >
                            <span class="option-label text-truncate">
                                {item.label}
                            </span>
                            {#if item.sublabel || item.value}
                                <span class="badge bg-light text-dark border ms-2 small font-monospace">
                                    {item.sublabel || item.value}
                                </span>
                            {/if}
                            {#if String(item.value) === String(value)}
                                <i class="fa fa-check text-primary ms-auto"></i>
                            {/if}
                        </button>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .searchable-select-wrapper {
        position: relative;
        width: 100%;
        user-select: none;
    }

    .form-select-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: #ffffff;
        border: 1px solid #d1d3e2;
        border-radius: 6px;
        padding: 7px 12px;
        font-size: 0.88rem;
        cursor: pointer;
        text-align: left;
        min-height: 36px;
        transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }

    .form-select-trigger:focus,
    .form-select-trigger.is-open {
        border-color: #4e73df;
        box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.2);
        outline: none;
    }

    .form-select-trigger:disabled {
        background-color: #e9ecef;
        cursor: not-allowed;
        opacity: 0.75;
    }

    .selected-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-right: 8px;
    }

    .chevron-icon {
        font-size: 0.72rem;
        color: #858796;
        transition: transform 0.2s ease;
        flex-shrink: 0;
    }

    .chevron-icon.rotate {
        transform: rotate(180deg);
        color: #4e73df;
    }

    /* Panel Flotante */
    .dropdown-panel {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        z-index: 1050;
        background-color: #ffffff;
        border: 1px solid #d1d3e2;
        border-radius: 8px;
        overflow: hidden;
        animation: fadeIn 0.15s ease-in-out;
    }

    .search-box-header {
        position: relative;
        padding: 8px 10px;
        background-color: #f8f9fc;
        border-bottom: 1px solid #eaecf4;
        display: flex;
        align-items: center;
    }

    .search-icon {
        position: absolute;
        left: 20px;
        font-size: 0.82rem;
        pointer-events: none;
    }

    .search-input {
        padding-left: 30px !important;
        padding-right: 28px !important;
        font-size: 0.84rem !important;
        height: 32px !important;
        border: 1px solid #d1d3e2 !important;
        border-radius: 5px !important;
        background-color: #ffffff !important;
    }

    .search-input:focus {
        border-color: #4e73df !important;
        box-shadow: 0 0 0 2px rgba(78, 115, 223, 0.15) !important;
    }

    .clear-search-btn {
        position: absolute;
        right: 18px;
        background: none;
        border: none;
        font-size: 1.1rem;
        color: #858796;
        cursor: pointer;
        line-height: 1;
        padding: 0;
    }

    .clear-search-btn:hover {
        color: #e74a3b;
    }

    .options-list {
        max-height: 220px;
        overflow-y: auto;
        padding: 4px 0;
    }

    .option-item {
        width: 100%;
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: none;
        border: none;
        text-align: left;
        font-size: 0.86rem;
        color: #333333;
        cursor: pointer;
        transition: background-color 0.15s ease;
    }

    .option-item:hover {
        background-color: #eaecf4;
        color: #224abe;
    }

    .option-item.selected {
        background-color: rgba(78, 115, 223, 0.12);
        color: #4e73df;
        font-weight: 600;
    }

    .option-label {
        flex: 1;
    }

    /* Scrollbar estilizada */
    .options-list::-webkit-scrollbar {
        width: 6px;
    }
    .options-list::-webkit-scrollbar-track {
        background: #f8f9fc;
    }
    .options-list::-webkit-scrollbar-thumb {
        background: #d1d3e2;
        border-radius: 3px;
    }
    .options-list::-webkit-scrollbar-thumb:hover {
        background: #b7b9cc;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
