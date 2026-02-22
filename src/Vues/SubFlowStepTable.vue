<template>
    <Fieldset :legend="legend">
        <div v-if="filteredMembers.length === 0" class="text-center text-sm text-gray-500">
            Keine Informationen.
        </div>
        <div v-else class="flex justify-content-between align-items-start gap-3 mt-2">
            <DataTable
                :value="filteredMembers"
                size="large"
                responsiveLayout="scroll"
                :pt="{ table: { style: 'min-width: 30rem' } }">
                <Column header="Step">
                    <template #body="{ data: row }">
                        {{ row?.group?.title ?? '–' }}
                    </template>
                </Column>
                <Column header="Gestartet am">
                    <template #body="{ data: row }">
                        {{ formatDate(row?.memberStartDate) }}
                    </template>
                </Column>
                <Column>
                    <template #body="{ data: row }">
                        {{ formatTimeSince(row?.memberStartDate) }}
                    </template>
                </Column>
            </DataTable>
            <Button 
                v-if="flowUrl"
                icon="pi pi-sitemap" 
                :href="flowUrl" 
                as="a"
                target="_blank"
                rounded
                outlined
                v-tooltip.bottom="tooltipText"
            />
        </div>
    </Fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Fieldset from 'primevue/fieldset';

import type { GroupMember } from '../utils/ct-types';
import type { SubFlowStep } from '../types/flow';

// =============================================================================
// PROPS
// =============================================================================

const props = defineProps<{
    /** Titel der Fieldset-Legende */
    legend: string;
    /** Alle verfügbaren GroupMembers (SubFlows) */
    members: Array<GroupMember>;
    /** SubFlow-Parent zur Filterung */
    subFlowParent?: SubFlowStep;
    /** Optionale URL zum Flow (z.B. 'https://app.eqrm.de/flows/start-flow?flow=teams') */
    flowUrl?: string;
    /** Optionaler Tooltip-Text für den Button */
    tooltipText?: string;
}>();

// =============================================================================
// COMPUTED
// =============================================================================

const filteredMembers = computed(() => {
    if (!props.subFlowParent?.childrenIds) return [];
    
    return props.members.filter(member => 
        props.subFlowParent!.childrenIds?.includes(Number(member.group.domainIdentifier))
    );
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Formatiert ein ISO-Datum in ein lokalisiertes deutsches Datumsformat.
 */
function formatDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '–';
    
    try {
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return '–';
        
        return new Intl.DateTimeFormat('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    } catch (error) {
        console.error('Fehler beim Formatieren des Datums:', error);
        return '–';
    }
}

/**
 * Berechnet die Zeitspanne seit einem Startdatum.
 */
function formatTimeSince(startDate: string | null | undefined): string {
    if (!startDate) return '–';
    
    try {
        const start = new Date(startDate);
        const now = new Date();
        
        if (isNaN(start.getTime())) return '–';
        
        const diffMs = now.getTime() - start.getTime();
        const days = Math.floor(diffMs / 86400000);
        
        if (days > 14) {
            const weeks = Math.floor(days / 7);
            return `seit ${weeks} Woche${weeks !== 1 ? 'n' : ''}`;
        }
        
        return `seit ${days} Tag${days !== 1 ? 'en' : ''}`;
        
    } catch (error) {
        console.error('Fehler beim Berechnen der Zeitspanne:', error);
        return '–';
    }
}
</script>