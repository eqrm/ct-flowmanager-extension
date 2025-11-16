<template>
    <div class="person-timeline">
        <div v-if="loading" class="flex justify-content-center p-4">
            <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
        </div>
        
        <Timeline 
            v-else-if="groupedKeyDates.length > 0"
            :value="groupedKeyDates" 
            align="left"
        >
            <template #content="{ item }">
                <div v-for="entry in item.items" :key="entry.date" class="flex align-items-start gap-2">
                    <i :class="['pi', eventIcon(entry.event)]"></i>
                    <div class="flex flex-column">
                        <strong>{{ entry.event }}</strong>
                        <span>{{ entry.details }}</span>
                        <span v-if="entry.groupId" class="text-color-secondary">({{ entry.groupId }})</span>
                    </div>
                </div>
            </template>
            <template #opposite="{ item }">
                <div class="flex flex-column align-items-end">
                    <span class="text-color-secondary">{{ formatDate(item.date) }}</span>
                </div>
            </template>
        </Timeline>
        
        <div v-else class="text-center p-4 text-color-secondary">
            <i class="pi pi-info-circle" style="font-size: 1.5rem"></i>
            <p class="mt-2 mb-0">Keine Aktivitäten gefunden</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Timeline from 'primevue/timeline';
import { fetchPersonDetailsLogs } from '../ParsedLogEntry';
import type { KeyDateEntry } from '../ParsedLogEntry';

// Props
const props = defineProps<{
    personId: number;
}>();

// State
const loading = ref(false);
const groupedKeyDates = ref<GroupedKeyDates>([]);

// Types
type GroupedKeyDates = Array<{ date: string; items: KeyDateEntry[] }>;

// Utility Functions
function formatDate(value?: string | Date | null): string {
    if (!value) return '–';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '–';
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(d);
}

function groupKeyDatesByDay(entries: KeyDateEntry[]): GroupedKeyDates {
    const byDay = new Map<string, KeyDateEntry[]>();
    
    for (const entry of entries) {
        const day = entry.date.split('T')[0];
        if (!byDay.has(day)) {
            byDay.set(day, []);
        }
        byDay.get(day)!.push(entry);
    }
    
    return [...byDay.entries()]
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        .map(([date, items]) => ({ date, items }));
}

function eventIcon(eventLabel: string): string {
    const normalizedEvent = (eventLabel || '').toLowerCase();
    
    if (normalizedEvent.includes('joined')) return 'pi-user-plus';
    if (normalizedEvent.includes('left') || normalizedEvent.includes('deleted')) return 'pi-user-minus';
    if (normalizedEvent.includes('updated') || normalizedEvent.includes('changed')) return 'pi-pencil';
    if (normalizedEvent.includes('created')) return 'pi-plus';
    
    return 'pi-angle-right';
}

// Load timeline data
async function loadTimeline(): Promise<void> {
    if (!props.personId) return;
    
    loading.value = true;
    
    try {
        const entries = await fetchPersonDetailsLogs(props.personId);
        groupedKeyDates.value = groupKeyDatesByDay(entries);
    } catch (error) {
        console.error('Fehler beim Laden der Timeline-Daten:', error);
        groupedKeyDates.value = [];
    } finally {
        loading.value = false;
    }
}

// Public method to refresh timeline
function refresh(): Promise<void> {
    return loadTimeline();
}

// Expose refresh method to parent component
defineExpose({
    refresh
});

// Load data on mount
onMounted(() => {
    loadTimeline();
});
</script>

<style scoped>
.person-timeline {
    margin: 1rem 0;
}

.pi-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>