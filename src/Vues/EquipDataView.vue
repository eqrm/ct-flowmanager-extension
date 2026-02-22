
<template>
    <div class="card">
        <DataTable :value="effectiveFlowSteps">
            <Column field="name">
                <template #body="slotProps">
                    <div class="font-semibold">{{ slotProps.data.name }}</div>
                </template>
            </Column>
            <Column header="Status">
                <template #body="slotProps">
                    <i :class="getStatusIcon(getCurrentStatus(slotProps.data))" :style="{ color: getStatusColor(getCurrentStatus(slotProps.data)) }"></i>
                </template>
            </Column>
            <Column header="Absolviert" :bodyStyle="{ verticalAlign: 'top' }">
                <template #body="slotProps">
                    <div>{{ getStatusDate(slotProps.data, "Absolviert") }}</div>
                    <small
                        v-if="getStatusBy(slotProps.data, 'Absolviert')"
                        class="text-color-secondary"
                        :style="{ whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }"
                    >
                        {{ getStatusBy(slotProps.data, "Absolviert") }}
                    </small>
                </template>
            </Column>
            <Column header="Potential" :bodyStyle="{ verticalAlign: 'top' }">
                <template #body="slotProps">
                    <div>{{ getStatusDate(slotProps.data, "Potential") }}</div>
                    <small
                        v-if="getStatusBy(slotProps.data, 'Potential')"
                        class="text-color-secondary"
                        :style="{ whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }"
                    >
                        {{ getStatusBy(slotProps.data, "Potential") }}
                    </small>
                </template>
            </Column>
            <Column header="Angemeldet" :bodyStyle="{ verticalAlign: 'top' }">
                <template #body="slotProps">
                    <div>{{ getStatusDate(slotProps.data, "Angemeldet") }}</div>
                    <small
                        v-if="getStatusBy(slotProps.data, 'Angemeldet')"
                        class="text-color-secondary"
                        :style="{ whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }"
                    >
                        {{ getStatusBy(slotProps.data, "Angemeldet") }}
                    </small>
                </template>
            </Column>

        </DataTable>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import type { 
    EquipFlowStep, 
    EquipFlowStepStatus, 
    EquipFlowStepStatusData 
} from "../types/flow";

type FlowSteps = Array<EquipFlowStep>;

const props = defineProps<{
    flowSteps?: FlowSteps;
}>();

/**
 * Liefert die PrimeIcon-Klasse für einen gegebenen Status.
 * @param status Aktueller Equip-Status oder `null`.
 * @returns CSS-Klasse für das Status-Icon.
 */
function getStatusIcon(status: null | EquipFlowStepStatus): string {
    switch (status) {
        case "Potential":
            return "pi pi-star";
        case "Angemeldet":
            return "pi pi-user-plus";
        case "Absolviert":
            return "pi pi-check-circle";
        default:
            return "pi pi-minus-circle";
    }
}

/**
 * Liefert die Farbe für die visuelle Darstellung eines Status.
 * @param status Aktueller Equip-Status oder `null`.
 * @returns Farbwert als Hex-String.
 */
function getStatusColor(status: null | EquipFlowStepStatus): string {
    switch (status) {
        case "Potential":
            return "#FFA500";
        case "Angemeldet":
            return "#3B82F6";
        case "Absolviert":
            return "#10B981";
        default:
            return "#9CA3AF";
    }
}

/**
 * Formatiert ein Datum für die Anzeige in der Tabelle.
 * @param date Zu formatierendes Datum.
 * @returns Lokalisierter Datums-String.
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString();
}

/**
 * Konvertiert einen möglichen Datumswert robust in ein gültiges `Date`-Objekt.
 * @param value Eingabewert als `Date`, String oder leerer Wert.
 * @returns Valides `Date`-Objekt oder `null`, falls nicht parsebar.
 */
function toDateValue(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Sucht den Eintrag zu einem bestimmten Status innerhalb eines Flow-Schritts.
 * @param flowStep Datensatz der aktuellen Tabellenzeile.
 * @param status Gesuchter Status (`Potential`, `Angemeldet`, `Absolviert`).
 * @returns Gefundener Statuseintrag oder `undefined`.
 */
function getStatusEntry(
    flowStep: EquipFlowStep | null | undefined,
    status: "Potential" | "Angemeldet" | "Absolviert"
): EquipFlowStepStatusData | undefined {
    if (!flowStep || !Array.isArray(flowStep.status)) {
        return undefined;
    }

    return flowStep.status.find((item) => item.status === status);
}

/**
 * Ermittelt das Datum für einen bestimmten Status eines Flow-Schritts.
 * @param flowStep Datensatz der aktuellen Tabellenzeile.
 * @param status Gesuchter Status (`Potential`, `Angemeldet`, `Absolviert`).
 * @returns Formatiertes Datum oder `-`, wenn kein Datum vorhanden ist.
 */
function getStatusDate(flowStep: EquipFlowStep | null | undefined, status: "Potential" | "Angemeldet" | "Absolviert"): string {
    const entry = getStatusEntry(flowStep, status);

    const dateValue = toDateValue(entry?.datum);

    return dateValue ? formatDate(dateValue) : "-";
}

/**
 * Liefert den optionalen `by`-Wert zu einem Status für die sekundäre Anzeige.
 * @param flowStep Datensatz der aktuellen Tabellenzeile.
 * @param status Gesuchter Status (`Potential`, `Angemeldet`, `Absolviert`).
 * @returns `by`-Text oder `null`, wenn kein Wert vorhanden ist.
 */
function getStatusBy(flowStep: EquipFlowStep | null | undefined, status: "Potential" | "Angemeldet" | "Absolviert"): string | null {
    const entry = getStatusEntry(flowStep, status);
    if (!entry?.info) {
        return null;
    }

    return entry.info;
}

/**
 * Ermittelt den für das Icon anzuzeigenden Status anhand einer festen Priorität.
 * Priorität: `Absolviert` > `Angemeldet` > `Potential`.
 * @param flowStep Datensatz der aktuellen Tabellenzeile.
 * @returns Priorisierter Status oder `null`, wenn kein Status vorhanden ist.
 */
function getCurrentStatus(flowStep: EquipFlowStep | null | undefined): EquipFlowStepStatus | null {
    if (!flowStep || !Array.isArray(flowStep.status) || flowStep.status.length === 0) {
        return null;
    }

    const hasAbsolviert = flowStep.status.some((entry) => entry.status === "Absolviert");
    if (hasAbsolviert) {
        return "Absolviert";
    }

    const hasAngemeldet = flowStep.status.some((entry) => entry.status === "Angemeldet");
    if (hasAngemeldet) {
        return "Angemeldet";
    }

    const hasPotential = flowStep.status.some((entry) => entry.status === "Potential");
    if (hasPotential) {
        return "Potential";
    }

    return null;
}


const defaultFlowSteps = ref<FlowSteps>([
    {
        id: 1,
        name: "Equip 1",
        status: [
            {
                status: "Absolviert",
                datum: new Date("2024-02-15"),
                info: "User 1"
            }
        ]
    },
    {
        id: 2,
        name: "Equip 2",
        status: [
            {
                status: "Angemeldet",
                datum: new Date("2024-04-19"),
            },
            {
                status: "Potential",
                datum: new Date("2024-04-10"),
                info: "User 3"
            }
        ]
    },
    {  
        id: 3,
        name: "Equip 3",
        status: []
    },
    {
        id: 4,
        name: "Equip 4",
        status: []
    }
]);

/**
 * Effektive Datenquelle für die Tabelle.
 *
 * Verwendet die von außen übergebenen `flowSteps`,
 * andernfalls die lokalen `defaultFlowSteps` als Fallback.
 */
const effectiveFlowSteps = computed<FlowSteps>(() => props.flowSteps ?? defaultFlowSteps.value);

</script>
