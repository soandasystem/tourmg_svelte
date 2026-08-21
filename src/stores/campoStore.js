import { writable } from 'svelte/store';

/**
 * Store central del módulo Campo.
 * Mantiene el estado de trabajo activo, actividades, grupo y asistencia.
 */
export const campoStore = writable({
    trabajoActual: null,       // { id, nombre, fecha, grupo_id, estado }
    actividadActual: null,     // { id, nombre, inicio, fin, fotos[] }
    grupoAlumnos: [],          // [{ id, nombre, rut, foto_url, ... }]
    asistencia: {},            // { alumno_id: true | false }
    fotosPendientes: [],       // [{ blob, actividad_id, subiendo: bool }]
});

// Helpers para mutar el store fácilmente
export const campoActions = {
    setTrabajo(trabajo) {
        campoStore.update(s => ({ ...s, trabajoActual: trabajo }));
    },
    setActividad(actividad) {
        campoStore.update(s => ({ ...s, actividadActual: actividad }));
    },
    setGrupo(alumnos) {
        // Inicializa asistencia con todos en false
        const asistencia = {};
        alumnos.forEach(a => { asistencia[a.id] = false; });
        campoStore.update(s => ({ ...s, grupoAlumnos: alumnos, asistencia }));
    },
    marcarAsistencia(alumnoId, presente) {
        campoStore.update(s => ({
            ...s,
            asistencia: { ...s.asistencia, [alumnoId]: presente }
        }));
    },
    agregarFoto(blob, actividadId) {
        campoStore.update(s => ({
            ...s,
            fotosPendientes: [...s.fotosPendientes, { blob, actividadId, subiendo: false, url: null }]
        }));
    },
    reset() {
        campoStore.set({
            trabajoActual: null,
            actividadActual: null,
            grupoAlumnos: [],
            asistencia: {},
            fotosPendientes: [],
        });
    }
};
