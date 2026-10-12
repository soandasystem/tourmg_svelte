import { writable } from 'svelte/store';

export const isSidebarOpen = writable(true);

export const toggleSidebar = () => {
    isSidebarOpen.update((open) => !open);
};
