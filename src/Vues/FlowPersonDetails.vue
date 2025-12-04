<template>
    <Dialog
        v-model:visible="visible"
        modal
        :draggable="false"
        dismissableMask
        :style="{ width: '800px', maxWidth: '95vw' }"
        @show="handleDialogShow"
    >
        <!-- Dialog Header mit Avatar und Name -->
        <template #header>
            <div class="flex align-items-center gap-3">
                <Avatar 
                    :image="props.data.person.person.imageUrl || undefined"
                    :icon="props.data.person.person.imageUrl ? undefined : 'pi pi-user'"
                    class="mr-2" 
                    size="xlarge" 
                    shape="circle"
                />
                <div class="text-xl font-semibold">{{ personFullName }}</div>
                <Button
                    icon="pi pi-external-link"
                    as="a"
                    target="_blank"
                    :href="ctPersonLink"
                    rounded
                    outlined
                    v-tooltip.bottom="'Im Personenmodul öffnen'"
                />
            </div>
        </template>

        <!-- Navigation -->
        <div class="mb-4">
            <MenuBar :model="menuItems" />
        </div>

        <!-- Connect Section -->
        <div v-show="activeSection === 'connect'">
            <GroupMemberEditor
                :targetPersonsGroupMemberships="data.connect"
                :currentGroupLeaders="data.connectLeaders"
                :candidateGroupLeaders="allConnectGroupLeaders"
                :target-person="data.person"
                :role-id="FLOW_CONFIG.CONNECT_MEMBERS_ROLE_ID"
                currentGroupLeadersTitle="Aktuelle Connectoren"
                addGroupLeaderTitle="Connector hinzufügen"
                select-placeholder="Connector auswählen..."
                @member-added="onConnectLeaderAdded"
                @member-removed="onConnectLeaderRemoved"
            />
        </div>

        <!-- Flow Section -->
        <div v-show="activeSection === 'tags'">
            <GroupEditor
                :current-members="data.flow"
                :candidate-members="allMasterFlowSteps"
                :target-person="data.person"
                :role-id="FLOW_CONFIG.FLOW_MEMBERS_ROLE_ID"
                current-members-title="Aktuelle Tags"
                add-member-title="Tag hinzufügen"
                select-placeholder="Tag auswählen..."
                @member-added="onMasterFlowAdded"
                @member-removed="onMasterFlowRemoved"
            />
        </div>
        
        <!-- Equip Status -->
        <div v-show="activeSection === 'equip'">
            <Fieldset legend="Equip Status">
                <div class="flex justify-content-between align-items-start gap-3 mt-2">
                    <AvatarDataColumn
                        :data="data"
                        :master-data="allEquipSteps"
                        :level-mapping="EQUIP_INITIALS"
                        data-property="equip"
                    />
                    <Button 
                        icon="pi pi-sitemap" 
                        :href="getAppLinkForFlow('equip')" 
                        as="a"
                        target="_blank"
                        rounded
                        outlined
                        v-tooltip.bottom="'Equip Flow in neuem Tab öffnen'"
                    />
                </div>
            </Fieldset>
            <SubFlowStepTable
                legend="Nächster Schritt"
                :members="props.data.subFlows"
                :sub-flow-parent="equipSubFlowParent"
            />
        </div>

        <!-- Taufe -->
        <div v-show="activeSection === 'taufe'">
            <SubFlowStepTable
                legend="Nächster Schritt"
                :members="props.data.subFlows"
                :sub-flow-parent="taufeSubFlowParent"
                :flow-url="getAppLinkForFlow('taufe')"
                tooltip-text="Taufe Flow in neuem Tab öffnen"
            />
            <Fieldset legend="Taufe">
                <div v-if="taufeLoading">Lade Taufe-Daten…</div>
                <div v-else-if="taufeError" class="text-red-600">Fehler: {{ taufeError }}</div>
                <div v-else-if="taufePerson">
                    <div class="mb-1"><strong>Taufdatum:</strong> {{ taufePerson.dateOfBaptism ? new Date(taufePerson.dateOfBaptism).toLocaleDateString() : '–' }}</div>
                    <div class="mb-1"><strong>Getauft von:</strong> {{ taufePerson.baptisedBy ?? '–' }}</div>
                    <div class="mb-1"><strong>Taufort:</strong> {{ taufePerson.placeOfBaptism ?? '–' }}</div>
                </div>
                <div v-else>Keine Taufe-Informationen vorhanden.</div>
            </Fieldset>
        </div>
        
        <!-- Team-Zugehörigkeit -->
        <div v-show="activeSection === 'team'"> 
            <SubFlowStepTable
                legend="Nächster Schritt"
                :members="props.data.subFlows"
                :sub-flow-parent="teamsSubFlowParent"
                :flow-url="getAppLinkForFlow('teamconnect')"
                tooltip-text="Teams Flow in neuem Tab öffnen"
            />
            <Fieldset legend="Team-Zugehörigkeit">
                <DataTable
                    :value="data.teams"
                    size="large"
                    responsiveLayout="scroll"
                    :pt="{ table: { style: 'min-width: 30rem' } }">
                    <Column width="3rem;">
                        <template #body="{ data: row }">
                            <Avatar 
                                :image="row.group.imageUrl || undefined"
                                :icon="row.group.imageUrl ? undefined : 'pi pi-users'"
                                size="small"
                                shape="circle"
                            />
                        </template>
                    </Column>
                    <Column header="Team">
                        <template #body="{ data: row }">
                            {{ row?.group?.title ?? '–' }}
                        </template>
                    </Column>
                    <Column header="Rolle">
                        <template #body="{ data: row }">
                            {{ getRoleString(row?.groupTypeRoleId)   }}
                        </template>
                    </Column>
                    <Column header="Beigetreten am">
                        <template #body="{ data: row }">
                            {{ formatDate(row?.memberStartDate) }}
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
                                :href="`${row?.group?.frontendUrl}`"
                                v-tooltip.left="`${row?.group?.title ?? '-'} im Gruppenmodul öffnen`"
                            />
                        </template>
                    </Column>
                </DataTable>
            </Fieldset>
        </div>

        <!-- Groups -->
        <div v-show="activeSection === 'groups'">
            <SubFlowStepTable
                legend="Nächster Schritt"
                :members="props.data.subFlows"
                :sub-flow-parent="groupsSubFlowParent"
                :flow-url="getAppLinkForFlow('egroups')"
                tooltip-text="Gruppen Flow in neuem Tab öffnen"
            />
            <Fieldset legend="Group-Zugehörigkeit">
                <DataTable
                    :value="data.groups"
                    size="large"
                    responsiveLayout="scroll"
                    :pt="{ table: { style: 'min-width: 30rem' } }">
                    <Column width="3rem;">
                        <template #body="{ data: row }">
                            <Avatar 
                                :image="row.group.imageUrl || undefined"
                                :icon="row.group.imageUrl ? undefined : 'pi pi-users'"
                                size="small"
                                shape="circle"
                            />
                        </template>
                    </Column>
                    <Column header="Group">
                        <template #body="{ data: row }">
                            <template v-if="row?.group">
                                <div class="flex align-items-center gap-2">
                                    <Tag 
                                        v-bind="(() => {
                                            const status = getGroupStatusConfig(row.group.domainAttributes.groupStatusId);
                                            return { 
                                                severity: status.severity, 
                                                icon: status.icon, 
                                                value: status.label 
                                            };
                                        })()"
                                        rounded
                                    />
                                    <span>{{ row.group.title ?? '–' }}</span>
                                </div>
                            </template>
                        </template>
                    </Column>
                    <Column header="Rolle">
                        <template #body="{ data: row }">
                            {{ getRoleString(row?.groupTypeRoleId)   }}
                        </template>
                    </Column>
                    <Column header="Beigetreten am">
                        <template #body="{ data: row }">
                            {{ formatDate(row?.memberStartDate) }}
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
                                :href="`${row?.group?.frontendUrl}`"
                                v-tooltip.left="`${row?.group?.title ?? '-'} im Gruppenmodul öffnen`"
                            />
                        </template>
                    </Column>
                </DataTable>
            </Fieldset>
        </div>

        <!-- Offboarding -->
        <div v-show="activeSection === 'offboarding'">
            <SubFlowStepTable
                legend="Offboarding"
                :members="props.data.subFlows"
                :sub-flow-parent="offboardingSubFlowParent"
                :flow-url="getAppLinkForFlow('offboarding')"
                tooltip-text="Offboarding Flow in neuem Tab öffnen"
            />
        </div>

        <!-- Timeline Section -->
        <div v-show="activeSection === 'timeline'">
            <Fieldset legend="Aktivitätsverlauf">
                <PersonTimeline ref="timelineRef" :person-id="personId" />
            </Fieldset>
        </div>

        <template #footer>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, inject, watch } from 'vue';

// PrimeVue Components
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Column from 'primevue/column';        
import DataTable from 'primevue/datatable';  
import Dialog from 'primevue/dialog';
import Fieldset from 'primevue/fieldset';
import MenuBar from 'primevue/menubar';
import Tag from 'primevue/tag';

// Local Components
import AvatarDataColumn from './AvatarDataColumn.vue';
import PersonTimeline from './PersonTimeline.vue';
import GroupMemberEditor from './GroupMemberEditor.vue';
import GroupEditor from './GroupEditor.vue';
import SubFlowStepTable from './SubFlowStepTable.vue';

// Types and Utils
import { EQUIP_INITIALS, FLOW_CONFIG, getAppLinkForFlow, type TableDataSet, type SubFlowStep } from '../types/flow';
import type { Person, Group, GroupMember, PersonMasterData } from '../utils/ct-types';
import type { MenuItem } from 'primevue/menuitem';
import { churchtoolsClient } from '@churchtools/churchtools-client';

// =============================================================================
// PROPS & EMITS
// =============================================================================

const props = defineProps<{
    data: TableDataSet;
    //connectLeaders: Array<GroupMember>;
    visible: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
}>();

// =============================================================================
// DEPENDENCY INJECTION
// =============================================================================

const allEquipSteps = inject<Array<Group>>('allEquipSteps', []);
const allMasterFlowSteps = inject<Array<Group>>('allMasterFlowSteps', []);
const allConnectGroupLeaders = inject<Array<GroupMember>>('allConnectGroupLeaders', []);
const allSubFlows = inject<Array<SubFlowStep>>('allSubFlows', []);
const masterData = inject<PersonMasterData | null>('masterData', null);

// =============================================================================
// REACTIVE STATE
// =============================================================================

const activeSection = ref('connect');
const timelineRef = ref<InstanceType<typeof PersonTimeline>>();

// --- Taufe: nachgeladene Personendaten ---
const taufePerson = ref<Person | null>(null);
const taufeLoading = ref(false);
const taufeError = ref<string | null>(null);

// =============================================================================
// COMPUTED PROPERTIES
// =============================================================================

const visible = computed({
    get: () => props.visible,
    set: (v: boolean) => emit('update:visible', v),
});

const personFullName = computed(() => 
    fullName(props.data?.person || {} as GroupMember)
);

const personId = computed(() => 
    Number(props.data?.person?.person?.domainIdentifier) || 0
);

const ctPersonLink = computed(() =>
    props.data?.person?.person?.frontendUrl || '#'
);

const equipSubFlowParent = computed(() => 
    allSubFlows.find(subFlow => subFlow.id === FLOW_CONFIG.FLOW_ID_EQUIP)
);

const teamsSubFlowParent = computed(() => 
    allSubFlows.find(subFlow => subFlow.id === FLOW_CONFIG.FLOW_ID_TEAMS)
);

const groupsSubFlowParent = computed(() => 
    allSubFlows.find(subFlow => subFlow.id === FLOW_CONFIG.FLOW_ID_GROUPS)
);

const offboardingSubFlowParent = computed(() => 
    allSubFlows.find(subFlow => subFlow.id === FLOW_CONFIG.FLOW_ID_OFFBOARDING)
);

const taufeSubFlowParent = computed(() => 
    allSubFlows.find(subFlow => subFlow.id === FLOW_CONFIG.FLOW_ID_TAUFE)
);

// =============================================================================
// MENU CONFIGURATION
// =============================================================================

const menuItems = ref<MenuItem[]>([
    {
        label: 'Connect',
        icon: 'pi pi-users',
        command: () => { activeSection.value = 'connect'; }
    },
    {
        label: 'Tags',
        icon: 'pi pi-tags',
        command: () => { 
            activeSection.value = 'tags';
        }
    },
    {
        label: 'Equip',
        icon: 'pi pi-graduation-cap',
        command: () => {
            activeSection.value = 'equip';
        }
    },
    {
        label: 'Taufe',
        icon: 'pi pi-heart',
        command: () => {
            activeSection.value = 'taufe';
        }
    },
    {
        label: 'Team',
        icon: 'pi pi-users',
        command: () => {
            activeSection.value = 'team';
        }
    },
    {
        label: 'Groups',
        icon: 'pi pi-th-large',
        command: () => {
            activeSection.value = 'groups';
        }
    },
    {
        label: 'Offboarding',
        icon: 'pi pi-sign-out',
        command: () => {
            activeSection.value = 'offboarding';
        }
    },
    {
        label: 'Timeline',
        icon: 'pi pi-calendar',
        command: () => { activeSection.value = 'timeline'; }
    }
]);


// =============================================================================
// EVENT HANDLERS
// =============================================================================

function handleDialogShow(): void {
    console.log('Dialog geöffnet für Person:', personId.value);
    activeSection.value = 'connect';
}

function onConnectLeaderAdded(groupLeader: GroupMember, groupMember: GroupMember): void {
    console.log('GroupMember hinzugefügt.', 'Leader:', groupLeader, 'Member:', groupMember);
    props.data.connectLeaders.push(groupLeader);
    props.data.connect.push(groupMember);
}

function onConnectLeaderRemoved(groupLeader: GroupMember, groupMember: GroupMember): void {
    console.log('GroupMember entfernt.', 'Leader:', groupLeader, 'Member:', groupMember);
    props.data.connectLeaders = props.data.connectLeaders.filter(
        cl => cl.person.domainIdentifier !== groupLeader.person.domainIdentifier
    );
    props.data.connect = props.data.connect.filter(
        cm => !(cm.group.domainIdentifier === groupLeader.group.domainIdentifier &&
        cm.person.domainIdentifier === groupMember.person.domainIdentifier)
    );
}

function onMasterFlowAdded(member: GroupMember): void {
    console.log('Master Flow hinzugefügt:', member);
    props.data.flow.push(member);
}

function onMasterFlowRemoved(member: GroupMember): void {
    console.log('Master Flow entfernt:', member);
    props.data.flow = props.data.flow.filter(
        f => f.group.domainIdentifier !== member.group.domainIdentifier
    );
}



// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================


/**
 * Gibt den Namen einer Rolle anhand ihrer ID zurück.
 * 
 * Sucht in den Master-Daten nach der Rolle mit der übergebenen ID
 * und gibt deren Namen zurück. Wird verwendet, um Rollen-IDs in
 * lesbaren Text zu konvertieren (z.B. für Team-Zugehörigkeiten).
 * 
 * @param roleId - ID der Rolle (kann null/undefined sein)
 * @returns Name der Rolle oder '–' wenn keine Rolle gefunden wurde
 */
function getRoleString(roleId: number | null | undefined): string {
    if (!roleId || !masterData) return '–';
    const role = masterData.roles?.find(r => r.id === roleId);
    return role ? role.name : '–';    
}


/**
 * Generische Funktion zur Erstellung von Vollnamen
 * @param entity - Person oder GroupMember
 * @returns Formatierter Name: "Vorname (Spitzname) Nachname" für Person, "Vorname Nachname" für GroupMember
 */
function fullName(entity: Person | GroupMember): string {
    let firstName: string = '';
    let lastName: string = '';
    let nickname: string = '';
    
    // Person-Typ: direkter Zugriff auf Properties
    if ('firstName' in entity && 'lastName' in entity) {
        firstName = entity.firstName?.trim() || '';
        lastName = entity.lastName?.trim() || '';
        nickname = entity.nickname?.trim() || '';
        
        // Für Person: "Vorname (Spitzname) Nachname"
        const parts = [
            firstName,
            nickname ? `(${nickname})` : '',
            lastName
        ].filter(Boolean);
        
        return parts.length > 0 ? parts.join(' ') : 'NN';
    }
    
    // GroupMember-Typ: Zugriff über person.domainAttributes
    if ('person' in entity && entity.person?.domainAttributes) {
        firstName = entity.person.domainAttributes.firstName?.trim() || '';
        lastName = entity.person.domainAttributes.lastName?.trim() || '';
        
        // Für GroupMember: "Vorname Nachname"
        const parts = [firstName, lastName].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : 'NN';
    }
    
    return 'NN';
}

/**
 * Formatiert ein ISO-Datum in ein lokalisiertes deutsches Datumsformat.
 * @param isoDate - Datum im Format YYYY-MM-DD oder ISO-String
 * @returns Formatiertes Datum (z.B. "15.11.2024") oder '–' wenn kein Datum vorhanden
 */
function formatDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '–';
    
    try {
        const date = new Date(isoDate);
        // Prüfe ob Datum gültig ist
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
 * Gibt Severity, Icon und Label für einen Gruppenstatus zurück.
 * 
 * Mappt ChurchTools Gruppenstatus-IDs auf PrimeVue Tag-Konfigurationen
 * mit passenden Farben und Icons für die UI-Darstellung.
 * 
 * @param statusId - ID des Gruppenstatus aus FLOW_CONFIG
 * @returns Objekt mit severity (PrimeVue), icon (PrimeIcons) und label (Text)
 */
function getGroupStatusConfig(statusId: number | null | undefined): {
    severity: 'success' | 'warn' | 'secondary' | 'danger' | 'info' | 'contrast' | undefined;
    icon: string;
    label: string;
} {
    let label = masterData?.groupStatuses?.find(status => status.id === statusId)?.nameTranslated || 'Unbekannt';

    switch (statusId) {
        case FLOW_CONFIG.GROUP_STATUS_ACTIVE:
            return { severity: 'success', icon: 'pi pi-check-circle', label: label };
        case FLOW_CONFIG.GROUP_STATUS_PENDING:
            return { severity: 'warn', icon: 'pi pi-clock', label: label };
        case FLOW_CONFIG.GROUP_STATUS_ARCHIVED:
            return { severity: 'secondary', icon: 'pi pi-inbox', label: label };
        case FLOW_CONFIG.GROUP_STATUS_FINISHED:
            return { severity: 'danger', icon: 'pi pi-times-circle', label: label };
        default:
            return { severity: 'info', icon: 'pi pi-question-circle', label: 'Unbekannt' };
    }
}



/**
 * Lädt Personendaten, wenn die Taufe-Sektion aktiviert wird.
 * Nutzt fetch gegen /persons/{id} — Endpunkt ggf. anpassen.
 */
async function loadTaufePerson(): Promise<void> {
    const id = personId.value;
    if (!id) {
        taufePerson.value = null;
        return;
    }
    taufeLoading.value = true;
    try {
        taufePerson.value = await churchtoolsClient.get<Person>(`/persons/${id}`);
    } catch (err: unknown) {
        console.error('Fehler beim Laden der Taufe-Daten:', err);
        taufePerson.value = null;
    } finally {
        taufeLoading.value = false;
    }
}

// Watcher: beim Wechsel in 'taufe' nachladen
watch(() => activeSection.value, (val) => {
    if (val === 'taufe') {
        loadTaufePerson();
    } else {
        // optional: Daten freigeben, wenn Sektion verlassen wird
        // taufePerson.value = null;
        // taufeError.value = null;
    }
});


</script>
