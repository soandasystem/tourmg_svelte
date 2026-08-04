import axios from 'axios';
import { secureStorage } from './secureStore';

/**
 * RENDER_ENDPOINT es la base de la URL para las peticiones API.
 * En desarrollo usa el proxy de Vite (/proxy-api → tourmanager-bnd.onrender.com/api).
 * En producción debe definirse VITE_API_BASE_URL en el .env con la URL completa.
 */
// En prod no existe el proxy de Vite (/proxy-api). Render debe inyectar VITE_RENDER con la URL base
// Ej: "https://tourmanager-bnd.onrender.com/api/v3.5/"
// En ese caso armamos ${VITE_RENDER}/${service}.
// En dev usamos el proxy de Vite.
const getApiEndpoint = () => {
    if (import.meta.env.DEV) {
        return "/proxy-api/v3.5";
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl && !apiBaseUrl.startsWith("/proxy-api")) {
        return apiBaseUrl;
    }

    const renderUrl = import.meta.env.VITE_RENDER || "https://tourmanager-bnd.onrender.com";
    if (renderUrl.includes("/api")) {
        return renderUrl;
    }
    return `${renderUrl.replace(/\/$/, "")}/api/v3.5`;
};

export const RENDER_ENDPOINT = getApiEndpoint();
export const ROOT_URL = import.meta.env.DEV ? "" : `${(import.meta.env.VITE_RENDER || "https://tourmanager-bnd.onrender.com").replace(/\/$/, "")}/`;


/**
 * Clase que replica la lógica de la clase PHP Renderrequest proporcionada.
 */
class RenderRequest {
    /**
     * Obtiene datos desde el servicio especificado.
     * Reemplaza a getData($service, $body = "", $urlencode = "", $id = "", $company = "global")
     */
    async getData(service, body = "", urlencode = "", id = "", schema = "global", company = "") {
        let endpoint = `${RENDER_ENDPOINT}/${service}`;
        if (id) endpoint += `/${id}`;
        if (urlencode) endpoint += `?${urlencode}`;

        const token = secureStorage.getItem('_tk_');

        try {
            const response = await axios.get(endpoint, {
                headers: {
                    'Accept': 'application/json',
                    'X-Tenant-Schema': schema
                },
                validateStatus: () => true // Capturar respuestas de error para procesar el JSON
            });

            const result = response.data;
            let data = [];
            let message = {};

            if (!result || result.success === undefined) {
                message = { status: "error", data: data, message: result?.error || "Error desconocido" };
            } else {
                if (!result.success) {
                    message = { status: "error", data: data, message: result.error };
                } else {
                    message = { status: "success", data: result.data, message: "" };
                }
            }
            return message;
        } catch (error) {
            return { status: "error", data: [], message: "Curl error: " + error.message };
        }
    }

    /**
     * Envía nuevos datos al servicio (POST).
     * Reemplaza a setData($service, $body = "", $urlencode = "", $id = "", $company = "global")
     */
    async setData(service, body = null, urlencode = "", id = "", schema = "global", company = "") {
        let endpoint = `${RENDER_ENDPOINT}/${service}`;
        if (id) endpoint += `/${id}`;
        if (urlencode) endpoint += `?${urlencode}`;

        const token = secureStorage.getItem('_tk_');

        try {
            const response = await axios.post(endpoint, body, {
                headers: {
                    'Accept': 'application/json',
                    'X-Tenant-Schema': schema
                },
                validateStatus: (status) => status >= 200 && status < 300
            });

            const result = response.data;
            return { status: "success", data: result, message: "" };
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            return { status: "error", data: [], message: "Error: " + errorMsg };
        }
    }

    /**
     * Actualiza datos existentes (PATCH).
     * Reemplaza a updateData($service, $body = "", $urlencode = "", $id = "", $company = "global")
     */
    async updateData(service, body = null, urlencode = "", id = "", schema = "global", company = "") {
        let endpoint = `${RENDER_ENDPOINT}/${service}`;
        if (id) endpoint += `/${id}`;
        if (urlencode) endpoint += `?${urlencode}`;

        const token = secureStorage.getItem('_tk_');

        try {
            const response = await axios.patch(endpoint, body, {
                headers: {
                    'Accept': 'application/json',
                    'X-Tenant-Schema': schema
                },
                validateStatus: (status) => status >= 200 && status < 300
            });

            const result = response.data;
            return { status: "success", data: result, message: "" };
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            return { status: "error", data: [], message: "Error: " + errorMsg };
        }
    }

    /**
     * Elimina datos (DELETE).
     * Reemplaza a deleteData($service, $body = "", $urlencode = "", $id = "", $company = "global")
     */
    async deleteData(service, body = "", urlencode = "", id = "", schema = "global", company = "") {
        let endpoint = `${RENDER_ENDPOINT}/${service}`;
        if (id) endpoint += `/${id}`;
        if (urlencode) endpoint += `?${urlencode}`;

        const token = secureStorage.getItem('_tk_');

        try {
            const response = await axios.delete(endpoint, {
                headers: {
                    'Accept': 'application/json',
                    'X-Tenant-Schema': schema
                },
                validateStatus: () => true
            });

            const result = response.data;
            if (result && result.success === false) {
                return { status: "error", data: [], message: result.error || "Error al eliminar" };
            }
            return { status: "success", data: result, message: "" };
        } catch (error) {
            return { status: "error", data: [], message: "Error: " + error.message };
        }
    }
}

const api = new RenderRequest();
export default api;

// Función de compatibilidad para el código existente que usa fetchServiceData
export const fetchServiceData = async (service, schema, token) => {
    // Nota: El token se ignora deliberadamente si ya está en secureStorage 
    // a través del comportamiento de la clase, pero se puede integrar si es necesario.
    const result = await api.getData(service, "", "", "", schema);
    if (result.status === "success") {
        return { success: true, data: result.data };
    } else {
        return { success: false, error: result.message };
    }
};
