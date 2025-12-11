<template>
    <Dialog
        v-model:visible="visibleProxy"
        modal
        :draggable="false"
        dismissableMask
        header="Person auswählen"
        :style="{ width: '600px', maxWidth: '95vw' }"
    >
        <div class="flex flex-column gap-3">
            <Fieldset legend="Personensuche">
                <div class="flex flex-column gap-3 ">
                    <AutoComplete
                        v-model="selectedPerson"
                        :suggestions="searchResults"
                        @complete="onAutoComplete"
                        @item-select="onPersonSelected"
                        optionLabel="displayName"
                        dropdown
                        :virtualScrollerOptions="{ itemSize: 38 }"
                        class="w-full"
                        inputId="person-autocomplete"
                    >
                        <template #option="slotProps">
                            <div class="flex align-items-center gap-2">
                                <Avatar 
                                    v-if="slotProps.option.imageUrl"
                                    :image="slotProps.option.imageUrl" 
                                    size="small"
                                    shape="circle"
                                />
                                <Avatar 
                                    v-else
                                    icon="pi pi-user" 
                                    size="small"
                                    shape="circle"
                                />
                                <span>{{ slotProps.option.displayName }}</span>
                            </div>
                        </template>
                    </AutoComplete>
                    <InputText
                        readonly
                        :value="flowGroupTitle"
                    />
                </div>
            </Fieldset>

            <div class="flex justify-content-end gap-2 mt-2">
                <Button 
                    label="Abbrechen" 
                    icon="pi pi-times" 
                    outlined
                    @click="onCancel" />
                <Button 
                    label="OK" 
                    icon="pi pi-check" 
                    :disabled="isOkDisabled" 
                    @click="onOk" />
            </div>
        </div>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Fieldset from 'primevue/fieldset';
import AutoComplete from 'primevue/autocomplete';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { DomainObjectPerson, GroupMember } from '../utils/ct-types';
import { FLOW_GROUP_IDS, type FlowGroupId } from '../types/flow';

// --------------------------- Props ---------------------------
const props = defineProps<{
    visible: boolean;
}>();

// --------------------------- Emits ---------------------------
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'confirm', payload: { person: DomainObjectPerson & { displayName: string }, groups: Array<GroupMember> }): void;
    (e: 'cancel'): void;
}>();

// --------------------------- Computed ---------------------------
const visibleProxy = computed({
    get: () => props.visible,
    set: (v: boolean) => emit('update:visible', v),
});

const isOkDisabled = computed(
    () => !selectedPerson.value || selectedPersonsGroupMemberships.value.length === 0
);

const flowGroupTitle = computed(() => {
    if (isSearching.value) return 'Suche läuft...';
    
    const memberships = selectedPersonsGroupMemberships.value;
    if (!memberships || memberships.length === 0) {
        return selectedPerson.value ? 'Keine Flow-Gruppe gefunden' : '';
    }
    
    // Nimm die letzte Flow-Gruppenmitgliedschaft
    const lastMembership = memberships[memberships.length - 1];
    return lastMembership?.group?.title ?? 'Unbekannte Gruppe';
});

// --------------------------- State ---------------------------
const searchResults = ref<Array<DomainObjectPerson & { displayName: string }>>([]);
const selectedPerson = ref<(DomainObjectPerson & { displayName: string }) | null>(null);
const selectedPersonsGroupMemberships = ref<Array<GroupMember>>([]);
const isSearching = ref(false);

// --------------------------- Helpers ---------------------------
function toDisplayName(person: DomainObjectPerson) {
    const first = person.domainAttributes?.firstName ?? '';
    const last = person.domainAttributes?.lastName ?? '';
    return `${first} ${last}`.trim();
}

// --------------------------- API ---------------------------

/**
 * Führt eine Personensuche über die ChurchTools-API aus.
 * 
 * - Endpoint: GET /search
 * - Filtert ausschließlich Domain-Typ "person".
 * - Setzt und entfernt den Ladeindikator (isSearching).
 * - Gibt bei Erfolg eine Liste von Such-Domainobjekten zurück, sonst null.
 * 
 * @param query - Suchbegriff (mind. 3 Zeichen empfohlen)
 * @returns Promise mit Array<DomainObjectPerson> oder null bei Fehler
 */
async function searchPersonsApi(query: string) : Promise<Array<DomainObjectPerson> | null> {
    isSearching.value = true;
    try {
        return await churchtoolsClient.get<Array<DomainObjectPerson>>('/search', {
            query,
            domain_types: ['person'],
        });
    } catch (error) {
        console.error('Fehler bei der Personensuche:', error);
        return null;
    } finally {
        isSearching.value = false;
    }
}

/**
 * Lädt alle Gruppenmitgliedschaften einer Person über die ChurchTools-API.
 * 
 * - Endpoint: GET /persons/{personId}/groups
 * - Gibt ein Array von GroupMember-Objekten zurück.
 * - Liefert bei Fehler ein leeres Array.
 * 
 * @param personId - DomainIdentifier der Person
 * @returns Promise mit Array<GroupMember> oder leeres Array bei Fehler
 */
async function getPersonsGroupsApi(personId: string): Promise<Array<GroupMember>> {
    try {
        return await churchtoolsClient.get<Array<GroupMember>>(`/persons/${personId}/groups`);
    } catch (error) {
        console.error('Fehler beim Laden der Personengruppen:', error);
        return [];
    }
}

// --------------------------- Events ---------------------------

/**
 * Führt die Personensuche über die ChurchTools-API aus, sobald im AutoComplete-Feld getippt wird.
 * 
 * - Mindestens 3 Zeichen erforderlich, sonst wird die Ergebnisliste geleert.
 * - Ruft searchPersonsApi auf und mappt die Ergebnisse auf displayName-Objekte.
 * - Aktualisiert searchResults für die AutoComplete-Vorschlagsliste.
 * 
 * @param event - AutoComplete complete-Event mit query-String
 */
async function onAutoComplete(event: { query: string }) {
    const q = (event.query || '').trim();
    if (q.length < 3) {
        searchResults.value = [];
        return;
    }
    const results = await searchPersonsApi(q);
    searchResults.value = (results ?? []).map(p => ({ ...p, displayName: toDisplayName(p) }));
}

/**
 * Wird sofort bei Auswahl einer Person im AutoComplete aufgerufen.
 * 
 * Lädt alle Gruppenmitgliedschaften der Person über die API und filtert sie auf Flow-Gruppen
 * (IDs aus FLOW_GROUP_IDS). Die gefilterten GroupMember werden in selectedPersonsGroupMemberships
 * gespeichert und bestimmen, ob der OK-Button aktiv ist.
 * 
 * @param event - AutoComplete item-select-Event mit ausgewähltem PersonDomainObject
 */
async function onPersonSelected(event: { value: DomainObjectPerson & { displayName: string } }) {
    const person = event.value;
    if (!person?.domainIdentifier) return;
    const groupMembers = await getPersonsGroupsApi(person.domainIdentifier);
    const flowGroupMembers = groupMembers.filter(
        gm => FLOW_GROUP_IDS.includes(Number(gm.group!.domainIdentifier) as FlowGroupId));
    selectedPersonsGroupMemberships.value = flowGroupMembers;
}

/**
 * Bricht die Auswahl ab, schließt den Dialog und setzt State zurück.
 * 
 * - Leert selectedPerson und selectedPersonsGroupMemberships.
 * - Emit 'cancel' für Parent-Komponente.
 * - Emit 'update:visible' false, um Dialog zu schließen.
 */
function onCancel() {
    selectedPerson.value = null;
    selectedPersonsGroupMemberships.value = [];
    emit('cancel');
    emit('update:visible', false);
}

/**
 * Bestätigt die Auswahl und schließt den Dialog.
 * 
 * - Prüft, dass eine Person ausgewählt ist.
 * - Emit 'confirm' mit Person und gefilterten Flow-Gruppenmitgliedschaften.
 * - Emit 'update:visible' false, um Dialog zu schließen.
 * - Setzt State zurück.
 */
function onOk() {
    if (!selectedPerson.value) return;
    emit('confirm', { person: selectedPerson.value, groups: selectedPersonsGroupMemberships.value });
    emit('update:visible', false);
    selectedPerson.value = null;
    selectedPersonsGroupMemberships.value = [];
}
</script>