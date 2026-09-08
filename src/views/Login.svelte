<script>
    import { onMount } from "svelte";
    import { navigate } from "svelte-routing";
    import CryptoJS from "crypto-js";
    import api, { fetchServiceData, ROOT_URL } from "../lib/apis";
    import { secureStorage } from "../lib/secureStore";
    import { authStore } from "../stores/auth";
    import { tenantStore } from "../stores/tenant";
    import { get } from "svelte/store";
    import { clearOpeningStore, fetchSaleInfo } from "../stores/openingStore";
    import Swal from "sweetalert2";

    // Props
    export let idcl = "";

    // Leer el tenantStore directamente (se llena desde App.svelte con el subdominio)
    $: tenantValue = $tenantStore;

    // Variables de estado
    let username = "";
    let password = "";
    let accesscode = "";
    let currentStep = "selection"; // selection, user, password, accessCode, forgotUser, forgotCode, forgotReset

    // Forgot password flow state
    let forgotUsername = "";
    let forgotEmail = "";
    let generatedCode = "";
    let enteredCode = "";
    let otpDigits = ["", "", "", "", "", ""];
    let otpInputs = [];
    let newPassword = "";
    // Countdown para expiración del código OTP (15 min)
    let otpSecondsLeft = 0;
    let otpCountdownInterval = null;
    let confirmPassword = "";
    let userId = null;
    let resetLoginType = ""; // "user" o "course"

    let errorMessage = "";
    let loading = false;
    let companyImage = "";
    let imageLoaded = false;
    let imageError = false;
    let code_company = "";
    let schema_name = "global";

    // Configuración base (como en el PHP)
    const IMAGE_BASE = import.meta.env.VITE_FRURL || "http://localhost:5173";
    const HASH_KEY = "749d50a656fb9";
    //leer la tabla company
    async function fetchData() {
        // Reinciar para que el <img> reintente al cambiar company
        imageLoaded = false;
        imageError = false;

        const rawValue = idcl || tenantValue || "";
        console.debug("[Login] fetchData rawValue:", rawValue);

        const respComp = await api.getData(
            "company",
            "",
            `subdominio=${rawValue}`,
            "",
            "global",
        );

        if (respComp.status === "success" && respComp.data.length > 0) {
            const company = respComp.data[0];
            code_company = company.identificador || "";
            schema_name = company.schema_name || "global";
            secureStorage.setItem("codecompany", company.identificador);
        }

        if (code_company) {
            companyImage = `${IMAGE_BASE}/login_logo_${code_company}.png`;
        }
    }

    // Definimos el código de la compañía en un solo bloque reactivo
    // para garantizar que idcl se procese antes de asignar code_company.

    onMount(() => {
        // Limpiar sesión previa
        secureStorage.removeItem("_tk_");
        secureStorage.removeItem("_us_");
        clearOpeningStore();
        fetchData();
    });

    function handleImageError() {
        console.warn("Logotipo no encontrado, se utilizará una alternativa");
        imageError = true;
        // Fallback a una imagen por defecto si existe o un placeholder
        companyImage = "/vite.svg";
    }

    async function handleNextToPassword() {
        if (!username) {
            errorMessage = "Debe ingresar un usuario";
            return;
        }
        errorMessage = "";
        currentStep = "password";
    }

    async function handleLogin() {
        loading = true;
        errorMessage = "";

        try {
            // 1. Buscar parámetros de la compañía
            schema_name = schema_name || "global";
            let plan = 0;
            let company_id = 0;
            if (code_company !== "GRL_999") {
                const queryParams = `identificador=${code_company}`;
                const resp = await api.getData(
                    "company",
                    "",
                    queryParams,
                    "",
                    "global",
                );
                if (resp.status === "success" && resp.data.length > 0) {
                    const company = resp.data[0];
                    company_id = company.id;
                    schema_name = company.schema_name;
                    plan = company.plancode_id;
                }
            }

            let login_status = "invalid";
            let user_data = null;
            let redirect_url = "/admin/index";
            let authToken = "";
            // Si es Login con Usuario y Clave
            if (username && password) {
                // El PHP usa MD5 con una HASH_KEY.
                //       const HASH_KEY = "749d50a656fb9";
                const hashedPassword = CryptoJS.HmacMD5(
                    password,
                    HASH_KEY,
                ).toString();
                //Busca el token para este tipo de registro
                const payload = {
                    login_type: "user",
                    username: username,
                    password: hashedPassword,
                };
                const tokenResponse = await api.setData(
                    "login",
                    payload,
                    "",
                    "",
                    schema_name,
                );
                if (
                    tokenResponse.status === "success" &&
                    tokenResponse.data?.token
                ) {
                    authToken = tokenResponse.data.token;
                    await secureStorage.setItem("_tk_", authToken);
                } else {
                    authToken = "";
                }

                const queryParams = `active=1&username=${username}&password=${hashedPassword}`;
                const resp = await api.getData(
                    "users",
                    "",
                    queryParams,
                    "",
                    schema_name,
                );
                if (
                    authToken &&
                    resp.status === "success" &&
                    resp.data.length > 0
                ) {
                    const user = resp.data[0];
                    user_data = {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        position: user.rol?.description || "Otro",
                        company: user.company_id,
                        schema: schema_name,
                        plancode: plan,
                        rol_id: user.roles_id,
                        codecompany: code_company,
                        permissions:
                            typeof user.rol?.permissions === "string"
                                ? JSON.parse(user.rol.permissions)
                                : user.rol?.permissions || {},
                    };

                    login_status = "success";
                } else {
                    // Buscar en "curso" (Apoderados)
                    // El PHP limpia el RUT: $RutAp=str_replace('.','',$username);
                    const cleanRut = username.replace(/\./g, "");
                    // El password para apoderados parece ser los primeros 4 dígitos del RUT?
                    // $password=Hash::getHash("md5", substr($RutAp,0,4), HASH_KEY);
                    const apoderadoPass = cleanRut.substring(0, 4);
                    const hashedApoPass =
                        CryptoJS.MD5(apoderadoPass).toString();
                    //Busca el token para este tipo de registro
                    const payload = {
                        login_type: "course",
                        rutapod: username.toUpperCase(),
                        password: hashedApoPass,
                    };
                    const tokenResponse = await api.setData(
                        "login",
                        payload,
                        "",
                        "",
                        schema_name,
                    );
                    if (
                        tokenResponse.status === "success" &&
                        tokenResponse.data?.token
                    ) {
                        authToken = tokenResponse.data.token;
                        await secureStorage.setItem("_tk_", authToken);
                    } else {
                        authToken = "";
                    }
                    const apoQueryParams = `rutapod=${username.toUpperCase()}&password=${hashedApoPass}&company_id=${company_id}`;
                    const apoResp = await api.getData(
                        "curso",
                        "",
                        apoQueryParams,
                        "",
                        schema_name,
                    );

                    if (
                        authToken &&
                        apoResp.status === "success" &&
                        apoResp.data.length > 0
                    ) {
                        const course = apoResp.data[0];
                        user_data = {
                            id: course.id,
                            name: course.nombreapod,
                            position: "Apoderado",
                            company: course.company_id,
                            schema: schema_name,
                            plancode: plan,
                            sale: course.sale_id,
                            userrut: course.rutapod,
                            codecompany: code_company,
                        };

                        login_status = "success";
                        redirect_url = "/payment";
                    } else {
                        errorMessage =
                            "No se ha logrado encontrar el usuario en el sistema.";
                    }
                }
            }
            // Si es Login con Código de Acceso
            else if (accesscode) {
                //Busca el token para este tipo de registro
                const payload = {
                    login_type: "access_code",
                    access_code: accesscode,
                };
                const tokenResponse = await api.setData(
                    "login",
                    payload,
                    "",
                    "",
                    schema_name,
                );
                if (
                    tokenResponse.status === "success" &&
                    tokenResponse.data?.token
                ) {
                    authToken = tokenResponse.data.token;
                    await secureStorage.setItem("_tk_", authToken);
                } else {
                    authToken = "";
                }
                //Buscar por usuario
                const queryParams = `accesscode=${accesscode}&activo=1`;
                const resp = await api.getData(
                    "sale",
                    "",
                    queryParams,
                    "",
                    schema_name,
                );

                if (
                    authToken &&
                    resp.status === "success" &&
                    resp.data.length > 0
                ) {
                    const sale = resp.data[0];
                    user_data = {
                        id: "0",
                        name: sale.encargado,
                        position: "General",
                        company: sale.company_id,
                        schema: schema_name,
                        plancode: plan,
                        sale: sale.id,
                        access_code: sale.accesscode,
                        codecompany: code_company,
                    };

                    // Obtener los detalles de la venta de forma asíncrona
                    await fetchSaleInfo(sale.accesscode, schema_name);

                    login_status = "success";
                    redirect_url = "/opening";
                } else {
                    errorMessage =
                        "No se ha logrado encontrar el código de acceso en el sistema.";
                }
            }

            if (login_status === "success") {
                // Guardar datos del usuario (sin token según pedido)
                secureStorage.setItem("_us_", user_data);

                // Actualizar store (isAuthenticated = true)
                authStore.update((s) => ({
                    ...s,
                    isAuthenticated: true,
                    user: user_data,
                    token: null,
                }));

                navigate(
                    `${redirect_url}`
                        .replace(/\/admin\/$/, "")
                        .replace(/\/admin\/admin\//, "/admin/"),
                );
            }
        } catch (error) {
            console.error("Login error:", error);
            errorMessage = "Ocurrió un error al intentar iniciar sesión.";
        } finally {
            loading = false;
        }
    }

    function resetSteps() {
        currentStep = "selection";
        username = "";
        password = "";
        accesscode = "";
        errorMessage = "";
        forgotUsername = "";
        forgotEmail = "";
        generatedCode = "";
        enteredCode = "";
        otpDigits = ["", "", "", "", "", ""];
        newPassword = "";
        confirmPassword = "";
        userId = null;
        resetLoginType = "";
    }

    function handleOtpInput(event, index) {
        const value = event.target.value;
        const digit = value.replace(/\D/g, "").slice(-1);
        otpDigits[index] = digit;
        otpDigits = [...otpDigits];

        if (digit && index < 5) {
            otpInputs[index + 1]?.focus();
        }
    }

    function handleOtpKeyDown(event, index) {
        if (event.key === "Backspace") {
            if (!otpDigits[index] && index > 0) {
                otpInputs[index - 1]?.focus();
                otpDigits[index - 1] = "";
                otpDigits = [...otpDigits];
                event.preventDefault();
            } else {
                otpDigits[index] = "";
                otpDigits = [...otpDigits];
            }
        } else if (event.key === "ArrowLeft" && index > 0) {
            otpInputs[index - 1]?.focus();
        } else if (event.key === "ArrowRight" && index < 5) {
            otpInputs[index + 1]?.focus();
        }
    }

    function handleOtpPaste(event) {
        event.preventDefault();
        const pasteData = (event.clipboardData || window.clipboardData).getData(
            "text",
        );
        const digitsOnly = pasteData.replace(/\D/g, "").slice(0, 6);
        if (!digitsOnly) return;

        for (let i = 0; i < 6; i++) {
            otpDigits[i] = digitsOnly[i] || "";
        }
        otpDigits = [...otpDigits];

        const targetIndex = Math.min(digitsOnly.length, 5);
        otpInputs[targetIndex]?.focus();
    }

    // Acción para manejar el foco de forma accesible (reemplaza autofocus)
    function focus(node) {
        node.focus();
    }

    // Forgot password: request code
    async function handleForgotUser() {
        if (!forgotUsername || !forgotUsername.trim()) {
            errorMessage = "Por favor ingresa tu usuario o rut.";
            return;
        }

        errorMessage = "";
        loading = true;
        try {
            const schema = schema_name || "global";
            const cleanUser = forgotUsername.trim();

            // 1. Validar en tabla 'users' (Usuarios del sistema)
            const userPayload = {
                login_type: "user",
                username: cleanUser,
            };
            const userResp = await api.setData(
                "restore",
                userPayload,
                "",
                "",
                schema,
            );
            console.log("userResp restore:", userResp);

            if (userResp.status === "success" && userResp.data?.id) {
                userId = Number(userResp.data.id);
                forgotEmail = userResp.data.email || "";
                resetLoginType = userResp.data.type || "user";
                if (userResp.data.token) {
                    await secureStorage.setItem("_tk_", userResp.data.token);
                }
            } else {
                // 2. Si no es usuario, validar en tabla 'curso' (Apoderados por rutapod)
                const cursoPayload = {
                    login_type: "course",
                    rutapod: cleanUser.toUpperCase(),
                };
                const cursoResp = await api.setData(
                    "restore",
                    cursoPayload,
                    "",
                    "",
                    schema,
                );
                console.log("cursoResp restore:", cursoResp);

                if (cursoResp.status === "success" && cursoResp.data?.id) {
                    userId = Number(cursoResp.data.id);
                    forgotEmail = cursoResp.data.email || "";
                    resetLoginType = cursoResp.data.type || "course";
                    if (cursoResp.data.token) {
                        await secureStorage.setItem(
                            "_tk_",
                            cursoResp.data.token,
                        );
                    }
                } else {
                    errorMessage = "Usuario o rut de apoderado no encontrado.";
                    loading = false;
                    return;
                }
            }

            // 3. Generar código de 6 dígitos, guardarlo con expiración de 3 min
            generatedCode = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = Date.now() + 3 * 60 * 1000; // 3 minutos en ms
            await secureStorage.setItem("_reset_code_", generatedCode);
            await secureStorage.setItem("_reset_code_exp_", String(expiresAt));

            // 4. Enviar código por correo
            console.log("forgotEmail", forgotEmail);
            const emailPayload = {
                email: forgotEmail,
                code: generatedCode,
            };
            try {
                const emailResp = await api.setData(
                    "send-code",
                    emailPayload,
                    "",
                    "",
                    schema,
                );
                console.log("emailResp restore:", emailResp);
            } catch (errMail) {
                console.warn("send-code no configurado o falló:", errMail);
            }
            try {
                const codePaylaod = {
                    code: generatedCode,
                    email: forgotEmail,
                };
                const emailResp = await api.setData(
                    "send-code",
                    codePaylaod,
                    "",
                    "",
                    schema,
                );
                console.log("emailResp restore:", emailResp);
            } catch (errMail) {
                console.warn("send-code no configurado o falló:", errMail);
            }

            const maskedEmail =
                forgotEmail && forgotEmail.includes("@")
                    ? forgotEmail.replace(/(.{2})(.*)(@.*)/, "$1****$3")
                    : "tu correo registrado";

            Swal.fire({
                icon: "info",
                title: "Código enviado",
                text: `Se ha enviado un código de 6 dígitos a ${maskedEmail}. El código es válido por 3 minutos.`,
                confirmButtonColor: "#4e73df",
            });

            otpDigits = ["", "", "", "", "", ""];
            currentStep = "forgotCode";

            // Iniciar contador regresivo de 3 minutos
            if (otpCountdownInterval) clearInterval(otpCountdownInterval);
            otpSecondsLeft = 3 * 60;
            otpCountdownInterval = setInterval(() => {
                otpSecondsLeft -= 1;
                if (otpSecondsLeft <= 0) {
                    clearInterval(otpCountdownInterval);
                    otpSecondsLeft = 0;
                }
            }, 1000);

            setTimeout(() => {
                otpInputs[0]?.focus();
            }, 100);
        } catch (e) {
            console.error(e);
            errorMessage = "Error al solicitar el código de recuperación.";
        } finally {
            loading = false;
        }
    }

    // Verify code entered by user
    async function handleVerifyCode() {
        enteredCode = otpDigits.join("").trim();
        if (!enteredCode || enteredCode.length < 6) {
            errorMessage = "Ingresa el código completo de 6 dígitos recibido.";
            return;
        }

        // Verificar expiración del código (15 minutos)
        const expStored = await secureStorage.getItem("_reset_code_exp_");
        if (!expStored || Date.now() > Number(expStored)) {
            await secureStorage.removeItem("_reset_code_");
            await secureStorage.removeItem("_reset_code_exp_");
            if (otpCountdownInterval) clearInterval(otpCountdownInterval);
            otpSecondsLeft = 0;
            errorMessage = "El código ha expirado. Por favor solicita uno nuevo.";
            return;
        }

        const storedCode = await secureStorage.getItem("_reset_code_");
        if (storedCode && enteredCode === String(storedCode).trim()) {
            // Eliminar de secureStorage luego de la comparación exitosa
            await secureStorage.removeItem("_reset_code_");
            await secureStorage.removeItem("_reset_code_exp_");
            if (otpCountdownInterval) clearInterval(otpCountdownInterval);
            currentStep = "forgotReset";
            errorMessage = "";
        } else {
            errorMessage = "El código ingresado es incorrecto.";
        }
    }

    // Reset password: guardar según corresponda ('users' o 'course')
    async function handleResetPassword() {
        if (!newPassword) {
            errorMessage = "Ingresa la nueva contraseña.";
            return;
        }
        if (newPassword.length < 4) {
            errorMessage = "La contraseña debe tener al menos 4 caracteres.";
            return;
        }
        if (newPassword !== confirmPassword) {
            errorMessage = "Las contraseñas no coinciden.";
            return;
        }

        loading = true;
        errorMessage = "";
        try {
            const schema = schema_name || "global";
            let updateResult = null;

            if (resetLoginType === "user") {
                // Usuarios del sistema usan HMAC-MD5 con HASH_KEY
                const hashedPassword = CryptoJS.HmacMD5(
                    newPassword,
                    HASH_KEY,
                ).toString();
                updateResult = await api.updateData(
                    "users",
                    { password: hashedPassword },
                    "",
                    userId,
                    schema,
                );
            } else if (resetLoginType === "course") {
                // Apoderados usan MD5 estándar
                const hashedApoPass = CryptoJS.MD5(newPassword).toString();
                updateResult = await api.updateData(
                    "curso",
                    { password: hashedApoPass },
                    "",
                    userId,
                    schema,
                );
            } else {
                errorMessage = "No se pudo determinar el tipo de cuenta.";
                loading = false;
                return;
            }

            if (updateResult && updateResult.status === "success") {
                // Limpiar tokens temporales de recuperación
                await secureStorage.removeItem("_tk_");
                await secureStorage.removeItem("_reset_code_");

                resetSteps();

                await Swal.fire({
                    icon: "success",
                    title: "¡Contraseña actualizada!",
                    text: "Tu contraseña se ha cambiado exitosamente. Por favor inicia sesión.",
                    confirmButtonColor: "#0d6efd",
                });
            } else {
                errorMessage =
                    updateResult?.message ||
                    "No se pudo actualizar la contraseña. Inténtalo nuevamente.";
            }
        } catch (e) {
            console.error(e);
            errorMessage = "Error al actualizar la contraseña.";
        } finally {
            loading = false;
        }
    }
</script>

<!-- Bootstrap CSS e Icons desde CDN (aunque idealmente se instalan, se respetan los links del usuario) -->
<svelte:head>
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        rel="stylesheet"
    />
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css"
        rel="stylesheet"
    />
</svelte:head>

<div class="split-container">
    <!-- Columna izquierda: Imagen -->
    <div class="left-panel">
        <div class="image-wrapper {imageLoaded ? 'loaded' : ''}">
            {#if companyImage && !imageError}
                <img
                    src={companyImage}
                    alt="Logo Empresa"
                    class="img-fluid logo-img"
                    on:load={() => (imageLoaded = true)}
                    on:error={handleImageError}
                />
            {:else}
                <div class="fallback-logo">
                    <i class="bi bi-building"></i>
                    <span>{companyImage}</span>
                </div>
            {/if}
        </div>
    </div>

    <!-- Columna derecha: Login -->
    <div class="right-panel">
        <div class="form-wrapper">
            <h1 class="form-header">
                {#if currentStep.startsWith("forgot")}
                    Recuperar Clave
                {:else}
                    Bienvenido
                {/if}
            </h1>

            {#if errorMessage}
                <div class="alert alert-danger text-center" role="alert">
                    {errorMessage}
                </div>
            {/if}

            <!-- Selección inicial -->
            {#if currentStep === "selection"}
                <div id="selectionCard" class="card fade-in">
                    <div class="text-center mb-4">
                        <p>¿Cómo deseas ingresar?</p>
                    </div>
                    <div class="d-grid gap-2">
                        <button
                            type="button"
                            class="btn btn-primary"
                            on:click={() => (currentStep = "user")}
                        >
                            Ingresar con Usuario y Clave
                        </button>
                        <button
                            type="button"
                            class="btn btn-secondary"
                            on:click={() => (currentStep = "accessCode")}
                        >
                            Ingresar con Código de Acceso
                        </button>
                    </div>
                </div>
            {/if}

            <!-- Formulario usuario + clave -->
            {#if currentStep === "user"}
                <div id="userCard" class="card fade-in">
                    <div class="mb-3 text-start">
                        <label for="username" class="form-label">Usuario</label>
                        <div class="input-group">
                            <span class="input-group-text"
                                ><i class="fa fa-user"></i></span
                            >
                            <input
                                type="text"
                                class="form-control"
                                id="username"
                                bind:value={username}
                                placeholder="Ingresa tu usuario"
                                required
                            />
                        </div>
                    </div>
                    <div class="d-grid gap-2">
                        <button
                            type="button"
                            class="btn btn-primary"
                            on:click={handleNextToPassword}>Siguiente</button
                        >
                        <button
                            type="button"
                            class="btn btn-link enlace-gris"
                            on:click={resetSteps}>Volver</button
                        >
                    </div>
                </div>
            {/if}

            {#if currentStep === "password"}
                <form on:submit|preventDefault={handleLogin}>
                    <div id="passwordCard" class="card fade-in">
                        <div class="mb-3 text-start">
                            <div
                                class="d-flex justify-content-between align-items-center mb-1"
                            >
                                <label for="password" class="form-label mb-0"
                                    >Clave</label
                                >
                            </div>
                            <div class="input-group">
                                <span class="input-group-text"
                                    ><i class="fa fa-lock"></i></span
                                >
                                <input
                                    type="password"
                                    class="form-control"
                                    id="password"
                                    bind:value={password}
                                    placeholder="Ingresa tu clave"
                                    required
                                    use:focus
                                />
                            </div>
                        </div>
                        <div class="d-grid gap-2">
                            <button
                                type="submit"
                                class="btn btn-success"
                                disabled={loading}
                            >
                                {#if loading}
                                    <span
                                        class="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                    ></span>
                                    Ingresando...
                                {:else}
                                    Ingresar
                                {/if}
                            </button>
                            <button
                                type="button"
                                class="btn btn-link enlace-gris"
                                on:click={() => (currentStep = "user")}
                                >Volver</button
                            >
                            <button
                                type="button"
                                class="btn btn-link enlace-gris p-0 text-decoration-none"
                                style="font-size: 0.85rem;"
                                on:click={() => (currentStep = "forgotUser")}
                            >
                                ¿Olvidaste tu clave?
                            </button>
                        </div>
                    </div>
                </form>
            {/if}

            <!-- Formulario código de acceso -->
            {#if currentStep === "accessCode"}
                <form on:submit|preventDefault={handleLogin}>
                    <div id="accessCodeCard" class="card fade-in">
                        <div class="mb-3 text-start">
                            <label for="accesscode" class="form-label"
                                >Código de acceso</label
                            >
                            <div class="input-group">
                                <span class="input-group-text"
                                    ><i class="bi bi-lock"></i></span
                                >
                                <input
                                    type="text"
                                    class="form-control"
                                    id="accesscode"
                                    bind:value={accesscode}
                                    placeholder="Código de acceso"
                                    required
                                    use:focus
                                />
                            </div>
                        </div>
                        <div class="d-grid gap-2">
                            <button
                                type="submit"
                                class="btn btn-success"
                                disabled={loading}
                            >
                                {#if loading}
                                    <span
                                        class="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                    ></span>
                                    Ingresando...
                                {:else}
                                    Ingresar
                                {/if}
                            </button>
                            <button
                                type="button"
                                class="btn btn-link enlace-gris"
                                on:click={resetSteps}>Volver</button
                            >
                        </div>
                    </div>
                </form>
            {/if}

            <!-- Pasos de recuperación de contraseña dentro del formulario -->
            {#if currentStep === "forgotUser"}
                <form on:submit|preventDefault={handleForgotUser}>
                    <div class="card fade-in">
                        <div class="mb-3 text-start">
                            <label class="form-label" for="forgotUser"
                                >Usuario o RUT de Apoderado</label
                            >
                            <div class="input-group">
                                <span class="input-group-text"
                                    ><i class="fa fa-user"></i></span
                                >
                                <input
                                    id="forgotUser"
                                    class="form-control"
                                    placeholder="Ingresa tu usuario o rut"
                                    bind:value={forgotUsername}
                                    required
                                    use:focus
                                />
                            </div>
                        </div>
                        <div class="d-grid gap-2">
                            <button
                                type="submit"
                                class="btn btn-primary"
                                disabled={loading}
                            >
                                {#if loading}<span
                                        class="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                    ></span> Enviando...{:else}Enviar código{/if}
                            </button>
                            <button
                                type="button"
                                class="btn btn-link enlace-gris"
                                on:click={resetSteps}>Volver</button
                            >
                        </div>
                    </div>
                </form>
            {/if}

            {#if currentStep === "forgotCode"}
                <form on:submit|preventDefault={handleVerifyCode}>
                    <div class="card fade-in">
                        <div class="mb-3 text-start">
                            <label class="form-label mb-1" for="otp-0"
                                >Código de verificación</label
                            >
                            <p class="text-muted small mb-3">
                                Ingresa el código de 6 dígitos enviado a tu
                                correo:
                            </p>
                            <div
                                class="otp-container"
                                on:paste={handleOtpPaste}
                            >
                                {#each otpDigits as digit, i}
                                    <input
                                        id={"otp-" + i}
                                        type="text"
                                        inputmode="numeric"
                                        pattern="[0-9]*"
                                        maxlength="1"
                                        class="otp-input"
                                        bind:this={otpInputs[i]}
                                        value={digit}
                                        on:input={(e) => handleOtpInput(e, i)}
                                        on:keydown={(e) =>
                                            handleOtpKeyDown(e, i)}
                                        autocomplete="one-time-code"
                                    />
                                {/each}
                            </div>

                            <!-- Contador regresivo de expiración -->
                            <div class="otp-timer mt-3 text-center">
                                {#if otpSecondsLeft > 0}
                                    <span class="otp-timer-text {otpSecondsLeft < 120 ? 'expiring' : ''}">
                                        <i class="fa fa-clock-o me-1"></i>
                                        El código expira en
                                        <strong>
                                            {String(Math.floor(otpSecondsLeft / 60)).padStart(2, "0")}:{String(otpSecondsLeft % 60).padStart(2, "0")}
                                        </strong>
                                    </span>
                                {:else}
                                    <span class="otp-timer-text expired">
                                        <i class="fa fa-times-circle me-1"></i>
                                        El código ha expirado.
                                    </span>
                                {/if}
                            </div>
                        </div>
                        <div class="d-grid gap-2 mt-2">
                            {#if otpSecondsLeft > 0}
                                <button type="submit" class="btn btn-primary"
                                    >Verificar código</button
                                >
                            {:else}
                                <button
                                    type="button"
                                    class="btn btn-warning"
                                    on:click={resetSteps}
                                >
                                    <i class="fa fa-refresh me-1"></i>Solicitar nuevo código
                                </button>
                            {/if}
                            <button
                                type="button"
                                class="btn btn-link enlace-gris"
                                on:click={resetSteps}>Volver</button
                            >
                        </div>
                    </div>
                </form>
            {/if}


            {#if currentStep === "forgotReset"}
                <form on:submit|preventDefault={handleResetPassword}>
                    <div class="card fade-in">
                        <div class="mb-3 text-start">
                            <label class="form-label" for="newPassword"
                                >Nueva contraseña</label
                            >
                            <div class="input-group">
                                <span class="input-group-text"
                                    ><i class="fa fa-lock"></i></span
                                >
                                <input
                                    type="password"
                                    id="newPassword"
                                    class="form-control"
                                    bind:value={newPassword}
                                    placeholder="Nueva contraseña"
                                    required
                                    use:focus
                                />
                            </div>
                        </div>
                        <div class="mb-3 text-start">
                            <label class="form-label" for="confirmPassword"
                                >Confirmar contraseña</label
                            >
                            <div class="input-group">
                                <span class="input-group-text"
                                    ><i class="fa fa-lock"></i></span
                                >
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    class="form-control"
                                    bind:value={confirmPassword}
                                    placeholder="Confirmar contraseña"
                                    required
                                />
                            </div>
                        </div>
                        <div class="d-grid gap-2">
                            <button
                                type="submit"
                                class="btn btn-success"
                                disabled={loading}
                            >
                                {#if loading}<span
                                        class="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                    ></span> Actualizando...{:else}Cambiar
                                    contraseña{/if}
                            </button>
                            <button
                                type="button"
                                class="btn btn-link enlace-gris"
                                on:click={resetSteps}>Volver</button
                            >
                        </div>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Estilos globales para html/body */
    :global(html),
    :global(body) {
        height: 100%;
        margin: 0;
        overflow-x: hidden;
        background-color: #f0f2f5;
        font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            sans-serif;
    }

    .split-container {
        height: 100vh;
        display: flex;
        flex-direction: row;
        width: 100vw;
    }

    .left-panel {
        flex: 0.8; /* Hacemos este panel un poco más estrecho para mover todo a la izquierda */
        background-color: #ffffff;
        background-image: radial-gradient(
                at 0% 0%,
                hsla(210, 100%, 98%, 1) 0,
                transparent 50%
            ),
            radial-gradient(
                at 50% 0%,
                hsla(210, 100%, 96%, 1) 0,
                transparent 50%
            ),
            radial-gradient(
                at 100% 0%,
                hsla(210, 100%, 98%, 1) 0,
                transparent 50%
            );
        display: flex;
        align-items: center;
        justify-content: flex-start; /* Alineamos al inicio (izquierda) */
        padding: 60px 0 60px 10%; /* Mucho padding a la derecha para empujarlo a la izquierda */
        position: relative;
        overflow: hidden;
    }

    .left-panel::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(
            circle at center,
            transparent 0%,
            rgba(255, 255, 255, 0.8) 100%
        );
        pointer-events: none;
    }

    .right-panel {
        flex: 1.2; /* Aumentamos el peso del lado derecho */
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 30px 40px 30px 5%; /* Acercamos el formulario más al centro */
        background-color: #f0f2f5;
        z-index: 1;
    }

    .image-wrapper {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
        transition: all 1s cubic-bezier(0.22, 1, 0.36, 1);
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .image-wrapper.loaded {
        opacity: 1;
        transform: scale(1) translateY(0);
    }

    .logo-img {
        max-width: 80%;
        max-height: 80%;
        object-fit: contain;
        filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.06));
    }

    .fallback-logo {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #adb5bd;
    }

    .fallback-logo i {
        font-size: 5rem;
    }

    .form-wrapper {
        width: 100%;
        max-width: 420px;
        padding: 20px;
    }

    .card {
        width: 100%;
        padding: 35px;
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.03);
        transition:
            transform 0.3s ease,
            box-shadow 0.3s ease;
    }

    .fade-in {
        animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    .form-header {
        font-size: 2.2rem;
        font-weight: 800;
        margin-bottom: 2.5rem;
        color: #1a1a1a;
        text-align: center;
        letter-spacing: -0.5px;
    }

    .form-label {
        font-weight: 600;
        color: #4a5568;
        font-size: 0.9rem;
        margin-bottom: 0.6rem;
    }

    .input-group-text {
        background-color: #f8fafc;
        border-right: none;
        color: #64748b;
        padding-left: 1.2rem;
        border-radius: 12px 0 0 12px;
    }

    .form-control {
        padding: 12px 1rem;
        font-size: 1rem;
        border-radius: 0 12px 12px 0;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-left: none;
        transition: all 0.2s ease;
    }

    .input-group-text {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-right: none;
        color: #64748b;
        padding-left: 1.2rem;
        border-radius: 12px 0 0 12px;
    }

    .form-control:focus {
        outline: none;
        box-shadow: none;
        background-color: #f8fafc;
        border-color: #e2e8f0;
    }

    .btn {
        padding: 12px;
        font-weight: 600;
        border-radius: 12px;
        transition: all 0.2s ease;
    }

    .btn-primary {
        background-color: #0d6efd;
        border: none;
        box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2);
    }

    .btn-primary:hover {
        background-color: #0b5ed7;
        transform: translateY(-1px);
        box-shadow: 0 6px 15px rgba(13, 110, 253, 0.25);
    }

    .btn-secondary {
        background-color: #f1f5f9;
        border: none;
        color: #475569;
    }

    .btn-secondary:hover {
        background-color: #e2e8f0;
        color: #1e293b;
    }

    .btn-success {
        background-color: #10b981;
        border: none;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }

    .btn-success:hover {
        background-color: #059669;
        transform: translateY(-1px);
        box-shadow: 0 6px 15px rgba(16, 185, 129, 0.25);
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .enlace-gris {
        text-decoration: none;
        color: #64748b;
        font-size: 0.9rem;
        font-weight: 500;
        transition: color 0.2s;
    }

    .enlace-gris:hover {
        color: #1e293b;
    }

    /* Estilos para el código OTP de 6 dígitos */
    .otp-container {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin: 12px 0 16px 0;
    }

    .otp-input {
        width: 48px;
        height: 54px;
        text-align: center;
        font-size: 1.4rem;
        font-weight: 700;
        color: #1e293b;
        background-color: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        transition: all 0.2s ease;
        outline: none;
    }

    .otp-input:focus {
        border-color: #0d6efd;
        background-color: #ffffff;
        box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.15);
        transform: translateY(-2px);
    }

    /* Contador regresivo OTP */
    .otp-timer {
        font-size: 0.82rem;
    }

    .otp-timer-text {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        border-radius: 99px;
        background-color: #f1f5f9;
        color: #64748b;
        font-weight: 500;
        transition: all 0.3s ease;
    }

    .otp-timer-text.expiring {
        background-color: #fff7ed;
        color: #c2410c;
        font-weight: 600;
        animation: pulse-warning 1s ease-in-out infinite;
    }

    .otp-timer-text.expired {
        background-color: #fef2f2;
        color: #dc2626;
        font-weight: 600;
    }

    @keyframes pulse-warning {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.7; }
    }

    /* Ajuste para móviles */
    @media (max-width: 992px) {
        .split-container {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
        }
        .left-panel {
            flex: 0 0 350px;
            padding: 40px;
        }
        .right-panel {
            padding: 40px 20px;
            justify-content: center; /* En móvil volvemos a centrar */
        }
        .form-header {
            font-size: 1.8rem;
        }
        .otp-container {
            gap: 4px;
        }
        .otp-input {
            width: 40px;
            height: 48px;
            font-size: 1.2rem;
        }
    }
</style>
