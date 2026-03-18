<template>
    <section class="p-4">
        <div class="flex flex-row flex-wrap gap-3 align-items-center">
            <Button
                v-for="(action, index) in actions"
                :key="index"
                :label="action.label"
                :icon="action.icon"
                rounded
                outlined
                :loading="runningActionIndex === index"
                :disabled="isLoading"
                @click="runAction(action)"
            />
            <Button
                v-if="!actions.length && !isLoading"
                label="Keine Aktion verfügbar"
                icon="pi pi-stop"
                rounded
                outlined
                disabled
            />
            <Button
                v-if="isLoading"
                label="Lade Aktionen..."
                icon="pi pi-spin pi-spinner"
                rounded
                outlined
                disabled
            />
        </div>
    </section>
</template>

<script setup lang="ts">
    import { onMounted, ref } from 'vue';
    import Button from 'primevue/button';

    type FlowAction = {
        action: () => void | Promise<void>;
        label: string;
        icon: string;
    };

    interface Props {
        title?: string;
        loadActions: () => FlowAction[] | Promise<FlowAction[]>;
    }

    const props = withDefaults(defineProps<Props>(), {
        title: 'Flow Controller',
    });

    const actions = ref<FlowAction[]>([]);
    const isLoading = ref(false);
    const runningActionIndex = ref<number | null>(null);

    const loadActions = async (): Promise<void> => {
        isLoading.value = true;
        try {
            actions.value = await Promise.resolve(props.loadActions());
        } catch (error) {
            console.error('Fehler beim Laden der Flow-Aktionen:', error);
            actions.value = [];
        } finally {
            isLoading.value = false;
        }
    };

    const runAction = async (action: FlowAction): Promise<void> => {
        const actionIndex = actions.value.indexOf(action);
        if (actionIndex < 0 || isLoading.value) {
            return;
        }

        runningActionIndex.value = actionIndex;
        isLoading.value = true;
        try {
            await Promise.resolve(action.action());
            await loadActions();
        } catch (error) {
            console.error('Fehler beim Ausführen der Flow-Aktion:', error);
        } finally {
            runningActionIndex.value = null;
            isLoading.value = false;
        }
    };

    onMounted(async () => {
        await loadActions();
    });
</script>
