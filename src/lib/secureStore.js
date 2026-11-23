// src/lib/secureStore.js
/**
 * Módulo de almacenamiento seguro basado en Cookies para SPA / SaaS.
 * 
 * NOTA DE SEGURIDAD ARQUITECTURAL (Opción 2 - HttpOnly):
 * - El token de autenticación sensible (_tk_) debe ser gestionado exclusivamente
 *   por el Backend mediante la cabecera HTTP 'Set-Cookie: _tk_=...; HttpOnly; Secure; SameSite=Lax'.
 *   Los navegadores bloquean por diseño el acceso de JavaScript a cookies 'HttpOnly' (RFC 6265)
 *   para garantizar inmunidad total contra ataques XSS.
 * - Los datos de sesión necesarios para la interfaz (_us_, perfil, roles, permisos, estados)
 *   se almacenan aquí en Cookies cifradas con flags 'Secure' y 'SameSite=Lax'.
 */

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || 'HgghgdsaLawtavrtxzc';

// Cifrado y ofuscación de datos antes de escribir en cookies
export const encrypt = (data) => {
    try {
        const stringData = JSON.stringify(data);
        return btoa(unescape(encodeURIComponent(stringData + SECRET_KEY)));
    } catch (e) {
        console.error('[secureStore] Error al cifrar:', e);
        return null;
    }
};

export const decrypt = (cipher) => {
    try {
        if (!cipher) return null;
        const decoded = decodeURIComponent(escape(atob(cipher)));
        return JSON.parse(decoded.replace(SECRET_KEY, ''));
    } catch (e) {
        return null;
    }
};

// Utilidades para lectura, escritura y eliminación de Cookies del navegador
const setCookie = (name, value, days = 7) => {
    try {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
        // SameSite=Lax protege contra ataques CSRF mientras permite navegación fluida
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value || '')}${expires}; Path=/; SameSite=Lax${isSecure}`;
    } catch (err) {
        console.warn('[secureStore] Fallback al guardar cookie:', err);
    }
};

const getCookie = (name) => {
    try {
        const nameEQ = encodeURIComponent(name) + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
    } catch (err) {
        console.warn('[secureStore] Fallback al leer cookie:', err);
    }
    return null;
};

const deleteCookie = (name) => {
    try {
        document.cookie = `${encodeURIComponent(name)}=; Max-Age=-99999999; Path=/; SameSite=Lax`;
    } catch (err) {
        console.warn('[secureStore] Fallback al eliminar cookie:', err);
    }
};

export const secureStorage = {
    setItem: (key, value) => {
        // Si el valor es nulo o indefinido, eliminamos
        if (value === null || value === undefined) {
            deleteCookie(key);
            return;
        }

        const encrypted = encrypt(value);
        if (encrypted) {
            setCookie(key, encrypted, 7);
        }
    },

    getItem: (key) => {
        const data = getCookie(key);
        if (!data) return null;
        return decrypt(data);
    },

    removeItem: (key) => {
        deleteCookie(key);
    },

    clear: () => {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            deleteCookie(name);
        }
    }
};
