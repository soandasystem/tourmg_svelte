<script>
    import { Router, Route, navigate } from "svelte-routing";
    import { onMount } from "svelte";
    import { authStore } from "./stores/auth";
    import { tenantStore } from "./stores/tenant";
    import Index from "./views/admin/index.svelte";

    // Vistas
    import Login from "./views/Login.svelte";
    import MainLayout from "./components/MainLayout.svelte";
    import Company from "./views/admin/company.svelte";
    import Programs from "./views/admin/programs.svelte";
    import Roles from "./views/admin/roles.svelte";
    import School from "./views/admin/school.svelte";
    import Users from "./views/admin/users.svelte";
    import Gateways from "./views/admin/gateways.svelte";
    import Quotes from "./views/admin/quotes.svelte";
    import Sales from "./views/admin/sales.svelte";
    import Course from "./views/admin/course.svelte";
    import Voucher from "./views/admin/voucher.svelte";
    import Entry from "./views/admin/entry.svelte";
    import Opening from "./views/opening/index.svelte";
    import OpeningPassengers from "./views/opening/passengers.svelte";
    import OpeningContratTravel from "./views/opening/contrattravel.svelte";
    import OpeningPaymentRsv from "./views/opening/paymentrsv.svelte";
    import PaymentIndex from "./views/payment/index.svelte";
    import PaymentPassengers from "./views/payment/passengers.svelte";
    import PaymentMedicalRecord from "./views/payment/medicalrecord.svelte";
    import PaymentContratTravel from "./views/payment/contrattravel.svelte";
    import PaymentSales from "./views/payment/paymentsales.svelte";
    import Continuaflow from "./views/flowpagos/continuaflow.svelte";
    // Importamos CSS global
    import "./app.css";

    // Extraer tenant desde el subdominio
    const hostParts = window.location.hostname.split(".");
    if (
        hostParts.length >= 2 &&
        hostParts[0] !== "localhost" &&
        hostParts[0] !== "www" &&
        hostParts[0] !== "127"
    ) {
        // Los navegadores normalizan los hostnames a minúsculas (estándar DNS/URL).
        // Convertimos a mayúsculas para preservar el formato original del identificador.
        tenantStore.set(hostParts[0]);
    }
</script>

<Router>
    <!-- Ruta Login -->
    <Route path="/login">
        <Login />
    </Route>

    <!-- Ruta raíz -->
    <Route path="/" exact>
        <Login />
    </Route>

    <!-- Rutas con Layout -->
    <Route path="/admin/index">
        <MainLayout>
            <Index />
        </MainLayout>
    </Route>

    <Route path="/admin/company">
        <MainLayout>
            <Company />
        </MainLayout>
    </Route>

    <Route path="/admin/programs">
        <MainLayout>
            <Programs />
        </MainLayout>
    </Route>

    <Route path="/admin/roles">
        <MainLayout>
            <Roles />
        </MainLayout>
    </Route>

    <Route path="/admin/school">
        <MainLayout>
            <School />
        </MainLayout>
    </Route>

    <Route path="/admin/users">
        <MainLayout>
            <Users />
        </MainLayout>
    </Route>

    <Route path="/admin/gateways">
        <MainLayout>
            <Gateways />
        </MainLayout>
    </Route>

    <Route path="/admin/quotes">
        <MainLayout>
            <Quotes />
        </MainLayout>
    </Route>

    <Route path="/admin/sales">
        <MainLayout>
            <Sales />
        </MainLayout>
    </Route>

    <Route path="/admin/course">
        <MainLayout>
            <Course />
        </MainLayout>
    </Route>

    <Route path="/admin/voucher">
        <MainLayout>
            <Voucher />
        </MainLayout>
    </Route>

    <Route path="/admin/entry">
        <MainLayout>
            <Entry />
        </MainLayout>
    </Route>

    <Route path="/opening">
        <Opening />
    </Route>

    <Route path="/opening/passengers">
        <OpeningPassengers />
    </Route>

    <Route path="/opening/contrattravel">
        <OpeningContratTravel />
    </Route>

    <Route path="/opening/paymentrsv">
        <OpeningPaymentRsv />
    </Route>

    <Route path="/payment">
        <PaymentIndex />
    </Route>

    <Route path="/payment/passengers">
        <PaymentPassengers />
    </Route>

    <Route path="/payment/medicalrecord">
        <PaymentMedicalRecord />
    </Route>

    <Route path="/payment/contrattravel">
        <PaymentContratTravel />
    </Route>

    <Route path="/payment/paymentsales">
        <PaymentSales />
    </Route>

    <Route path="/flowpagos/continuaflow">
        <Continuaflow />
    </Route>
</Router>
