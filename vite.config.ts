import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    return defineConfig({
        base: `/ccm/${process.env.VITE_KEY}/`,
        plugins: [vue()],
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: `@import "primevue/resources/themes/saga-blue/theme.css";`
                }
            }
        }
    });
};
