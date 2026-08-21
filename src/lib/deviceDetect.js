import { writable } from 'svelte/store';

/**
 * Detecta el tipo de dispositivo basado en el ancho de pantalla y user agent.
 * @returns {'mobile' | 'tablet' | 'desktop'}
 */
export function getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1200) {
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (hasTouch) return 'tablet';
    }
    return 'desktop';
}

/**
 * Store reactivo que se actualiza al cambiar el tamaño de ventana.
 */
function createDeviceStore() {
    const { subscribe, set } = writable(getDeviceType());
    let resizeTimer;
    function handleResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { set(getDeviceType()); }, 150);
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
    }
    return {
        subscribe,
        refresh: () => set(getDeviceType())
    };
}

export const deviceStore = createDeviceStore();

/**
 * Verifica si la app está corriendo como PWA instalada (standalone).
 */
export function isStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}
