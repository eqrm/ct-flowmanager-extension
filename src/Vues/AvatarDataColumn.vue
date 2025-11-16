<template>
    <div class="flex flex-wrap grid gap-2">
        <div v-for="item in avatarData" :key="item.label">
            <OverlayBadge 
                v-if="item.severity" 
                :severity="item.severity">
                <Avatar 
                    :label="item.label"
                    v-tooltip.bottom="item.tooltip"/>
            </OverlayBadge>
            <Avatar 
                v-else 
                :label="item.label"
                v-tooltip.bottom="item.tooltip"/>
        </div> 
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Avatar from 'primevue/avatar';
import OverlayBadge from 'primevue/overlaybadge';
import type { TableDataSet } from '../types/flow';
import { createMembershipStatus } from '../types/flow';
import type { Group } from '../utils/ct-types';

// Props
const props = defineProps<{
    data: TableDataSet;
    masterData: Array<Group> | undefined;
    levelMapping: Record<number, string>;
    dataProperty: keyof TableDataSet;
}>();

// Computed Avatar Data
const avatarData = computed(() => {
    return createMembershipStatus(
        props.data,
        props.masterData,
        props.levelMapping,
        props.dataProperty
    );
});
</script>