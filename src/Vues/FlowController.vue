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
                @click="runAction(action)"
            />
            <Button
                v-if="!actions.length"
                label="no action"
                icon="pi pi-stop"
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
        action: () => void;
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

    const runAction = (action: FlowAction): void => {
        action.action();
    };

    onMounted(async () => {
        actions.value = await Promise.resolve(props.loadActions());
    });
</script>
