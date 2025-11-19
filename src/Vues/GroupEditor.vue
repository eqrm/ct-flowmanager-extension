<template>
    <div>
        <!-- Aktuelle Mitglieder (immer GroupMember[]) -->
        <Fieldset :legend="currentMembersTitle" class="mt-4">
            <DataTable
                :value="currentMembers"
                size="large"
                dataKey="personId"
                responsiveLayout="scroll"
                :pt="{ table: { style: 'min-width: 30rem' } }"
                :showHeader="false"
            >
                <Column style="width: 3rem;">
                    <template #body="{ data: row }">
                        <Avatar 
                            :image="row.group.imageUrl || undefined"
                            :icon="row.group.imageUrl ? undefined : 'pi pi-users'"
                            size="small"
                            shape="circle"
                        />
                    </template>
                </Column>

                <Column>
                    <template #body="{ data: row }">
                        <div class="flex align-items-center justify-content-between">
                            <span>{{ row.group.title }}</span>
                        </div>
                    </template>
                </Column>

                <Column style="width: 3rem;">
                    <template #body="{ data: row }">
                        <Button
                            icon="pi pi-times"
                            size="small"
                            severity="danger"
                            :disabled="isNotDeletable(row)"
                            rounded
                            outlined
                            @click="onRemove(row)"
                            v-tooltip.left="isNotDeletable(row) ? 'Diese Gruppe kann nicht entfernt werden.' : `${row.group.title} entfernen`"
                        />
                    </template>
                </Column>
            </DataTable>
        </Fieldset>

        <!-- Hinzufügen: nur GroupMember-Optionen -->
        <Fieldset :legend="addMemberTitle">
            <div class="flex gap-3 mb-3">
                <Select
                    v-model="selectedCandidate"
                    :options="candidateOptions"
                    :placeholder="selectPlaceholder"
                    optionLabel="displayName"
                    :filter="true"
                    filterPlaceholder="Suchen..."
                    class="flex-1"
                    :showClear="true"
                    @change="onCandidateSelected"
                >
                    <template #option="{ option }">
                        <div class="flex align-items-center gap-2">
                            <Avatar 
                                :image="option.imageUrl || undefined"
                                :icon="option.imageUrl ? undefined : 'pi pi-user'"
                                size="small"
                                shape="circle"
                            />
                            <span>{{ option.displayName }}</span>
                        </div>
                    </template>

                    <template #value="{ value }">
                        <div v-if="value" class="flex align-items-center gap-2">
                            <Avatar 
                                :image="value.imageUrl || undefined"
                                :icon="value.imageUrl ? undefined : 'pi pi-user'"
                                size="small"
                                shape="circle"
                            />
                            <span>{{ value.displayName }}</span>
                        </div>
                    </template>
                </Select>

                <Button
                    icon="pi pi-user-plus"
                    rounded
                    outlined
                    :disabled="!selectedCandidate"
                    @click="onAdd"
                />
            </div>
        </Fieldset>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue';

// PrimeVue
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Fieldset from 'primevue/fieldset';
import Select from 'primevue/select';

// Types — Person entfernt, nur GroupMember bleibt
import type { GroupMember, MembershipNew, Group } from '../utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { FLOW_CONFIG } from '../types/flow';

// --------------------------- Props ---------------------------
const props = defineProps<{
    currentMembers: GroupMember[];
    candidateMembers: Group[];          
    targetPerson: GroupMember;              
    roleId?: number;
    currentMembersTitle?: string;
    addMemberTitle?: string;
    selectPlaceholder?: string;
}>();

// Events: Parent aktualisiert den State (Props sind read-only)
const emit = defineEmits<{
    (e: 'member-added', member: GroupMember): void;
    (e: 'member-removed', member: GroupMember): void;
}>();



// --------------------------- Internal State ---------------------------
const selectedCandidate = ref<Group | null>(null);

// --------------------------- Computed: Select-Options ---------------------------
const candidateOptions = computed(() =>
    (props.candidateMembers || [])
    .filter(step => !step.tags?.map(tag => tag.id).includes(FLOW_CONFIG.TAG_AUTOGROUP_ID))
    .filter(cm => !props.currentMembers.some(m => m.group.domainIdentifier === cm.id.toString()))
    .map(cm => ({ ...cm, displayName: cm.name || 'NN'}))
);


// --------------------------- Helfer & API ---------------------------


/**
 * Prüft, ob ein Gruppenmitglied nicht gelöscht werden kann.
 * 
 * Ein Gruppenmitglied kann nicht entfernt werden, wenn die zugehörige Gruppe
 * mit dem Tag für Auto-Gruppen (FLOW_CONFIG.TAG_AUTOGROUP_ID) versehen ist.
 * Dies verhindert das manuelle Entfernen von automatisch verwalteten Gruppenmitgliedschaften.
 * 
 * @param groupMember - Das zu prüfende Gruppenmitglied
 * @returns `true`, wenn das Mitglied nicht gelöscht werden kann, sonst `false`
 */
function isNotDeletable(groupMember: GroupMember): boolean {
    const nDeletable = props.candidateMembers
        .find(cm => cm.id.toString() === groupMember.group.domainIdentifier)
        ?.tags?.some(tag => tag.id === FLOW_CONFIG.TAG_AUTOGROUP_ID);
    return nDeletable ? true : false;
}

/**
 * Gibt den vollständigen Namen einer Person zurück.
 * 
 * Die Funktion extrahiert Vor- und Nachnamen aus verschiedenen Objektstrukturen:
 * - Bei GroupMember-Objekten werden die Daten aus `entity.person.domainAttributes` oder direkt aus `entity.person` gelesen
 * - Unterstützt sowohl `firstName`/`lastName` als auch verschachtelte `domainAttributes`
 * 
 * @param entity - Das Objekt, aus dem der Name extrahiert werden soll (typischerweise GroupMember)
 * @returns Der vollständige Name als "Vorname Nachname", oder "NN" falls keine Namensangaben vorhanden sind
 */
function fullName(entity: unknown): string {
    if (!entity) return 'NN';
    const asAny = entity as any;

    // GroupMember-Form: entity.person exists
    if (asAny && typeof asAny === 'object' && 'person' in asAny && asAny.person) {
        const p = asAny.person as any;
        const first = (p.domainAttributes && p.domainAttributes.firstName) ?? p.firstName ?? '';
        const last = (p.domainAttributes && p.domainAttributes.lastName) ?? p.lastName ?? '';
        return [String(first).trim(), String(last).trim()].filter(Boolean).join(' ') || 'NN';
    }

    return 'NN';
}

/** Liefert die Personen-DomainIdentifier für API-Aufrufe (targetPerson ist GroupMember) */
function getTargetPersonId(): string {
    // props.targetPerson ist jetzt GroupMember => hat person.domainIdentifier
    return props.targetPerson.person.domainIdentifier;
}

/** API-Aufrufe */
async function addMemberToGroupApi(groupId: number, personId: string, roleId: number, comment?: string) : Promise<GroupMember> {
    const body: MembershipNew = {
        groupMemberStatus: 'active',
        groupTypeRoleId: roleId,
        comment: comment || null
    };
    const groupMember = await churchtoolsClient.put<GroupMember[]>(`/groups/${groupId}/members/${personId}`, body);
    return groupMember[0];
}

async function removeMemberFromGroupApi(groupId: string, personId: string) {
    return churchtoolsClient.deleteApi(`/groups/${groupId}/members/${personId}`);
}

// --------------------------- Event-Handler ---------------------------

function onCandidateSelected() {
    // Optional hook
}

/** Hinzufügen eines ausgewählten Candidate (GroupMember) */
async function onAdd() {
    if (!selectedCandidate.value) return;
    try {
        if (!props.roleId) throw new Error('roleId ist erforderlich');
        const candidate = selectedCandidate.value;
        const comment = `Hinzugefügt durch ${whoamiName()} am ${new Date().toISOString()}`;
        const newMember = await addMemberToGroupApi(candidate.id, getTargetPersonId(), props.roleId, comment);
        // Event an Parent, damit dieser das currentMembers-Array aktualisiert
        emit('member-added', newMember);
        // Parent sollte das Array aktualisieren; falls kurzfristig benötigt, kann Parent-Update synchron erfolgen.
    } catch (err) {
        console.error('Fehler beim Hinzufügen:', err);
    } finally {
        selectedCandidate.value = null;
    }
}

/** Entfernen eines bestehenden GroupMember-Eintrags */
async function onRemove(member: GroupMember) {
    try {
        await removeMemberFromGroupApi(member.group.domainIdentifier, getTargetPersonId());
        emit('member-removed', member);
    } catch (err) {
        console.error('Fehler beim Entfernen:', err);
    }
}

// --------------------------- whoami helper ---------------------------
// whoami wird als GroupMember getypt, Person-Typ entfernt
const whoami = inject<GroupMember | null>('whoami', null);
function whoamiName() {
    return whoami ? fullName(whoami) : 'Unbekannt';
}

/**
 * Unterstützt:
 * - GroupMember (hat .person mit .domainAttributes oder direkten Feldern)
 */
</script>