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
                            :image="row.person?.imageUrl || undefined"
                            :icon="row.person?.imageUrl ? undefined : 'pi pi-user'"
                            size="small"
                            shape="circle"
                        />
                    </template>
                </Column>

                <Column>
                    <template #body="{ data: row }">
                        <div class="flex align-items-center justify-content-between">
                            <span>{{ fullName(row) }}</span>
                        </div>
                    </template>
                </Column>

                <Column style="width: 3rem;">
                    <template #body="{ data: row }">
                        <Button
                            icon="pi pi-times"
                            size="small"
                            severity="danger"
                            rounded
                            outlined
                            @click="onRemove(row)"
                            v-tooltip.left="`${fullName(row)} entfernen`"
                        />
                    </template>
                </Column>
                <Column style="width: 3rem;">
                    <template #body="{ data: row }">
                        <Button
                            icon="pi pi-external-link"
                            size="small"
                            target="_blank"
                            rounded
                            outlined
                            as="a"
                            :href="`${row.person?.frontendUrl}`"
                            v-tooltip.left="`${fullName(row)} im Personenmodul öffnen`"
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
                                :image="option.person?.imageUrl || undefined"
                                :icon="option.person?.imageUrl ? undefined : 'pi pi-user'"
                                size="small"
                                shape="circle"
                            />
                            <span>{{ option.displayName }}</span>
                        </div>
                    </template>

                    <template #value="{ value }">
                        <div v-if="value" class="flex align-items-center gap-2">
                            <Avatar 
                                :image="value.person?.imageUrl || undefined"
                                :icon="value.person?.imageUrl ? undefined : 'pi pi-user'"
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
import type { GroupMember, MembershipNew } from '../utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';

// --------------------------- Props ---------------------------
// Vereinfachte API: nur GroupMember bearbeiten.
// currentMembers: vorhandene Mitgliedschaften (GroupMember[])
// candidateMembers: mögliche neue GroupMember-Einträge zum Hinzufügen (GroupMember[])
const props = defineProps<{
    currentMembers: GroupMember[];
    candidateMembers: GroupMember[];          // Kandidaten zum Hinzufügen
    targetPerson: GroupMember;                // jetzt ausschließlich GroupMember
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
const selectedCandidate = ref<GroupMember | null>(null);

// --------------------------- Computed: Select-Options ---------------------------
const candidateOptions = computed(() =>
    (props.candidateMembers || [])
        .filter(member => !props.currentMembers.some(cm => cm.person.domainIdentifier === member.person.domainIdentifier))
        .map(cm => ({ ...cm, displayName: fullName(cm) }))
);

// --------------------------- Helfer & API ---------------------------

/**
 * Erzeugt Anzeige-Namen für GroupMember in einer robusten, typsicheren Weise.
 * Erwartet GroupMember-Objekte mit person und ggf. domainAttributes.
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
    return (props.targetPerson as any).person.domainIdentifier;
}

/** API-Aufrufe */
async function addMemberToGroupApi(groupId: string, personId: string, roleId: number, comment?: string) {
    const body: MembershipNew = {
        groupMemberStatus: 'active',
        groupTypeRoleId: roleId,
        comment: comment || null
    };
    return churchtoolsClient.put(`/groups/${groupId}/members/${personId}`, body);
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
        await addMemberToGroupApi(candidate.group.domainIdentifier, getTargetPersonId(), props.roleId, comment);

        // Event an Parent, damit dieser das currentMembers-Array aktualisiert
        emit('member-added', candidate);
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