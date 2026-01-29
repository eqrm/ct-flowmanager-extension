<template>
    <div>
        <!-- Aktuelle Mitglieder (immer GroupMember[]) -->
        <Fieldset :legend="currentGroupLeadersTitle" class="mt-4">
            <DataTable
                :value="currentGroupLeaders"
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

                <Column>
                    <template #body="{ data: row }">
                        <Tag
                            :value="getMembershipStatusText(getGroupMemberByConnectLeader(row, targetPersonsGroupMemberships))"
                            :severity="getMemberSeverity(getGroupMemberByConnectLeader(row, targetPersonsGroupMemberships)) || 'default'"
                            rounded
                        />
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
        <Fieldset :legend="addGroupLeaderTitle">
            <div class="flex gap-3 mb-3">
                <Select
                    v-model="selectedGroupLeaderCandidate"
                    :options="candidateGroupLeadersOptions"
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
                    :disabled="!selectedGroupLeaderCandidate"
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
import Tag from 'primevue/tag';

// Types — Person entfernt, nur GroupMember bleibt
import type { GroupMember, MembershipNew, MemberStatus } from '../utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';

// --------------------------- Props ---------------------------
const props = defineProps<{
    targetPersonsGroupMemberships: GroupMember[];      
    currentGroupLeaders: GroupMember[];
    candidateGroupLeaders: GroupMember[];          
    targetPerson: GroupMember;                
    roleId?: number;
    currentGroupLeadersTitle?: string;
    addGroupLeaderTitle?: string;
    selectPlaceholder?: string;
}>();


// --------------------------- Injects ---------------------------
const whoami = inject<GroupMember | null>('whoami', null);
function whoamiName() {
    return whoami ? fullName(whoami) : 'Unbekannt';
}

// --------------------------- Emits ---------------------------
const emit = defineEmits<{
    (e: 'member-added', groupLeader: GroupMember, groupMember: GroupMember): void;
    (e: 'member-removed', groupLeader: GroupMember, groupMember: GroupMember): void;
}>();


// --------------------------- Internal State ---------------------------
const selectedGroupLeaderCandidate = ref<GroupMember | null>(null);


// --------------------------- Computed ----------------
const candidateGroupLeadersOptions = computed(() =>
    (props.candidateGroupLeaders || [])
        .filter(member => !props.currentGroupLeaders.some(cm => cm.person.domainIdentifier === member.person.domainIdentifier))  //  Nur Kandidaten, die noch nicht Mitglied sind
        .map(cm => ({ ...cm, displayName: fullName(cm) }))
);


// --------------------------- Event-Handler ---------------------------

function onCandidateSelected() {
    // Optional hook
}

/** Hinzufügen eines ausgewählten Candidate (GroupMember) */
async function onAdd() {
    if (!selectedGroupLeaderCandidate.value) return;
    try {
        if (!props.roleId) throw new Error('roleId ist erforderlich');
        const candidate = selectedGroupLeaderCandidate.value;
        const comment = `Hinzugefügt durch ${whoamiName()} am ${new Date().toISOString()}`;
        const newMember = await addMemberToGroupApi(
            candidate.group.domainIdentifier, 
            props.targetPerson.person.domainIdentifier, 
            props.roleId, 
            'requested', 
            comment);

            if(newMember) {
                // Event an Parent, damit dieser das currentMembers-Array aktualisiert
                emit('member-added', candidate, newMember);
            }
        // Parent sollte das Array aktualisieren; falls kurzfristig benötigt, kann Parent-Update synchron erfolgen.
    } catch (err) {
        console.error('Fehler beim Hinzufügen:', err);
    } finally {
        selectedGroupLeaderCandidate.value = null;
    }
}

/** Entfernen eines bestehenden GroupMember-Eintrags */
async function onRemove(groupLeader: GroupMember) {
    try {
        await removeMemberFromGroupApi(groupLeader.group.domainIdentifier, props.targetPerson.person.domainIdentifier);
        const groupMember = props.targetPersonsGroupMemberships.find(
            gm => gm.group.domainIdentifier === groupLeader.group.domainIdentifier &&
                  gm.person.domainIdentifier === props.targetPerson.person.domainIdentifier
        );
        if (groupMember) {
            emit('member-removed', groupLeader, groupMember);
        }        
    } catch (err) {
        console.error('Fehler beim Entfernen:', err);
    }
}

// --------------------------- Helfer & API ---------------------------


/**
 * Fügt eine Person als Mitglied zu einer Gruppe hinzu oder aktualisiert deren Mitgliedschaft.
 * 
 * Diese Funktion verwendet den ChurchTools API-Endpunkt PUT /groups/{groupId}/members/{personId},
 * um eine neue Gruppenmitgliedschaft zu erstellen oder eine bestehende zu aktualisieren.
 * Der Endpunkt ist idempotent - mehrfache Aufrufe mit denselben Parametern überschreiben
 * die vorherige Mitgliedschaft.
 * 
 * @param groupId - Domain-Identifier der Gruppe (z.B. Connect-Gruppe ID)
 * @param personId - Domain-Identifier der Person, die hinzugefügt werden soll
 * @param roleId - ID der Gruppenrolle (z.B. 103 für Connect-Leader, 100 für Connect-Mitglieder)
 * @param memberStatus - Status der Mitgliedschaft ('active' | 'requested' | 'to_delete' | 'waiting')
 * @param comment - Optionaler Kommentar zur Mitgliedschaft (z.B. "Hinzugefügt durch ... am ...")
 * 
 * @returns Promise mit dem erstellten/aktualisierten GroupMember-Objekt oder null bei Fehler
 * 
 * @throws Error wenn die API-Anfrage fehlschlägt
 */
async function addMemberToGroupApi(groupId: string, personId: string, roleId: number, memberStatus: MemberStatus, comment?: string) {
    const body: MembershipNew = {
        groupMemberStatus: memberStatus,
        groupTypeRoleId: roleId,
        comment: comment || null
    };
    const response = await churchtoolsClient.put<Array<GroupMember>>(`/groups/${groupId}/members/${personId}`, body);
    return response[0];
}

/**
 * Entfernt eine Person aus einer Gruppe.
 * 
 * Diese Funktion verwendet den ChurchTools API-Endpunkt DELETE /groups/{groupId}/members/{personId},
 * um eine Gruppenmitgliedschaft zu löschen. Die Mitgliedschaft wird vollständig aus der
 * Datenbank entfernt (keine Archivierung).
 * 
 * @param groupId - Domain-Identifier der Gruppe, aus der die Person entfernt werden soll
 * @param personId - Domain-Identifier der Person, die entfernt werden soll
 * 
 * @returns Promise, das bei erfolgreicher Entfernung aufgelöst wird
 * 
 * @throws Error wenn die API-Anfrage fehlschlägt (z.B. Person ist nicht in der Gruppe)
 */
async function removeMemberFromGroupApi(groupId: string, personId: string) {
    return churchtoolsClient.deleteApi(`/groups/${groupId}/members/${personId}`);
}


/**
 * Prüft, ob ein Gruppenmitglied nicht gelöscht werden kann.
 * 
 * Ein Gruppenmitglied kann nicht entfernt werden, wenn:
 * - Es sich um die Zielperson selbst handelt (Selbstentfernung ist nicht erlaubt)
 * 
 * Diese Funktion dient als Schutz gegen versehentliches Entfernen des eigenen
 * Accounts aus einer Gruppe. Weitere Bedingungen (z.B. Auto-Gruppen) können
 * hier ergänzt werden.
 * 
 * @param member - Das zu prüfende Gruppenmitglied
 * @returns `true`, wenn das Mitglied nicht gelöscht werden kann, sonst `false`
 */
function isNotDeletable(member: GroupMember): boolean {
    // Verhindert das Entfernen des eigenen Accounts
    
    if (member.person.domainIdentifier === props.targetPerson.person.domainIdentifier) {
        return true;
    }
    return false;
}


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

/**
 * PrimeVue Tag Severity-Typen für die visuelle Darstellung von Mitgliedschaftsstatus.
 * Wird verwendet, um den Mitgliedschaftsstatus farblich zu kennzeichnen.
 */
type MemberSeverity = 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' | null;

/**
 * Findet die Gruppenmitgliedschaft einer Zielperson anhand eines Connect-Leaders.
 * 
 * Sucht in den Gruppenmitgliedschaften der Zielperson nach einer Mitgliedschaft
 * in der gleichen Connect-Gruppe, die der übergebene Connect-Leader leitet.
 * 
 * @param connectLeader - Der Connect-Leader (GroupMember), dessen Gruppe gesucht wird
 * @param membersConnectGroups - Array der Connect-Gruppenmitgliedschaften der Zielperson
 * @returns Die gefundene Gruppenmitgliedschaft oder null, wenn keine passende Mitgliedschaft existiert
 */
const getGroupMemberByConnectLeader = (connectLeader: GroupMember, membersConnectGroups: Array<GroupMember>): GroupMember | null => {
    return membersConnectGroups.find(m => m.group.domainIdentifier === connectLeader.group.domainIdentifier) || null;
};

/**
 * Ermittelt die PrimeVue Severity-Stufe basierend auf dem Mitgliedschaftsstatus.
 * 
 * Mappt ChurchTools Mitgliedschaftsstatus auf PrimeVue Tag-Severity-Werte
 * für die farbliche Kennzeichnung in der UI:
 * - active: 'success' (grün) - Person wurde vom Connecter übernommen
 * - requested: 'warn' (orange) - Person wurde Connecter zugewiesen
 * - to_delete: 'danger' (rot) - Connect-Phase ist abgeschlossen
 * - waiting: 'info' (blau) - Person wartet
 * 
 * @param member - Die Gruppenmitgliedschaft, deren Status geprüft werden soll
 * @returns PrimeVue Severity-Wert oder null, wenn kein Status vorhanden ist
 */
const getMemberSeverity = (member: GroupMember | null): MemberSeverity => {
    const memberStatus = member?.groupMemberStatus;
    if (!memberStatus) {
        return null;
    }
    const statusMap: Record<MemberStatus, MemberSeverity> = {
        active: 'success',
        requested: 'warn',
        to_delete: 'danger',
        waiting: 'info'
    };
    return statusMap[memberStatus];
};

/**
 * Liefert den deutschen Anzeigetext für einen Mitgliedschaftsstatus.
 * 
 * Übersetzt ChurchTools Mitgliedschaftsstatus in benutzerfreundliche
 * deutsche Beschreibungen für die UI-Anzeige.
 * 
 * @param member - Die Gruppenmitgliedschaft, deren Statustext benötigt wird
 * @returns Deutscher Statustext oder 'unknown', wenn keine Mitgliedschaft vorhanden ist
 */
const getMembershipStatusText = (member: GroupMember | null): string => {
    const statusMap: Record<MemberStatus, string> = {
        active: 'Connecter hat übernommen',
        requested: 'An Connecter zugewiesen',
        to_delete: 'Connect abgeschlossen',
        waiting: 'Wartet'
    };
    return member ? statusMap[member.groupMemberStatus] : 'unknown';
}


</script>