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
                    :image="props.data.asGroupMember.person.imageUrl || undefined"
                    :icon="props.data.asGroupMember.person.imageUrl ? undefined : 'pi pi-user'"
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
                :target-person="data.asGroupMember"
                :role-id="FLOW_CONFIG.CONNECT_MEMBERS_ROLE_ID"
                currentGroupLeadersTitle="Aktuelle Connectoren"
                addGroupLeaderTitle="Connector hinzufügen"
                select-placeholder="Connector auswählen..."
                @member-added="onConnectLeaderAdded"
                @member-removed="onConnectLeaderRemoved"
            />
        </div>

        <!-- Flow Section -->
        <div v-show="activeSection === 'commitment'">
            <Fieldset
                legend="Aktueller Status-Tag"
                class="w-full mb-3"
                :class="{ 'status-tag-mismatch': isStatusTagDifferentFromCommitment }"
            >
                <div class="w-full text-center text-xl">
                    {{ currentStatusTagName || 'Kein Status-Tag gesetzt' }}
                </div>
            </Fieldset>
            <GroupEditor
                :current-members="data.commitment"
                :candidate-members="allCommitmentSteps"
                :target-person="data.asGroupMember"
                :role-id="FLOW_CONFIG.FLOW_MEMBERS_ROLE_ID"
                current-members-title="Aktuelle Commitments"
                add-member-title="Commitment hinzufügen"
                select-placeholder="Commitment auswählen..."
                @member-added="onCommitmentAdded"
                @member-removed="onCommitmentRemoved"
            />
        </div>
        
        <!-- Equip Status -->
        <div v-show="activeSection === 'equip'">
            <Fieldset legend="Steps">
                <EquipDataView :flow-steps="equipFlowSteps"/>
            </Fieldset>
            <Fieldset legend="Aktionen">
                <FlowController
                    :key="equipActionsReloadKey"
                    :load-actions="() => equipActions"
                />
            </Fieldset>
        </div>

        <!-- Taufe -->
        <div v-show="activeSection === 'taufe'">
            <Fieldset legend="Steps">
                <EquipDataView :flow-steps="taufeFlowSteps" />
            </Fieldset>
            <Fieldset legend="Aktionen">
                <FlowController
                    :load-actions="() => [
                        {
                            action: () => appOpenTaufeFlow(),
                            label: 'Taufe Flow öffnen',
                            icon: 'pi pi-play'
                        },
                    ]"
                />
            </Fieldset>
        </div>
        
        <!-- Team-Zugehörigkeit -->
        <div v-show="activeSection === 'team'"> 
            <SubFlowStepTable
                legend="Nächster Schritt"
                :members="props.data.subFlows"
                :sub-flow-parent="teamsSubFlowParent"
                :flow-url="getAppLinkForFlow(EQRM_APP_FLOWS.TEAMCONNECT)"
                tooltip-text="Teams Flow in neuem Tab öffnen"
            />
            <Fieldset legend="Team-Zugehörigkeit">
                <div v-if="data.teams.length === 0" class="text-center text-sm text-gray-500">
                    Keine Teamzugehörigkeit.
                </div>
                <div v-else>
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
                </div>
            </Fieldset>
        </div>

        <!-- Groups -->
        <div v-show="activeSection === 'groups'">
            <SubFlowStepTable
                legend="Nächster Schritt"
                :members="props.data.subFlows"
                :sub-flow-parent="groupsSubFlowParent"
                :flow-url="getAppLinkForFlow(EQRM_APP_FLOWS.EGROUPS)"
                tooltip-text="Gruppen Flow in neuem Tab öffnen"
            />
            <Fieldset legend="Group-Zugehörigkeit">
                <div v-if="data.groups.length === 0" class="text-center text-sm text-gray-500">
                    Keine Groups.
                </div>
                <div v-else>
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
                </div>
            </Fieldset>
        </div>

        <!-- Offboarding -->
        <div v-show="activeSection === 'offboarding'">
            <SubFlowStepTable
                legend="Offboarding"
                :members="props.data.subFlows"
                :sub-flow-parent="offboardingSubFlowParent"
                :flow-url="getAppLinkForFlow(EQRM_APP_FLOWS.OFFBOARDING)"
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
import PersonTimeline from './PersonTimeline.vue';
import GroupMemberEditor from './GroupMemberEditor.vue';
import GroupEditor from './GroupEditor.vue';
import SubFlowStepTable from './SubFlowStepTable.vue';
import EquipDataView from './EquipDataView.vue';
import FlowController from './FlowController.vue';

// Types and Utils
import {  
    EQRM_APP_FLOWS,
    FLOW_CONFIG,
    EQUIP_STEP_CONFIG,
    TAUFE_STEP_CONFIG,
    hasFlowLevelMismatch,
    getAppLinkForFlow, 
    type EquipFlowStep,
    type FlowStepConfig,
    type TableDataSet, 
    type SubFlowStep
} from '../types/flow';
import type { 
    Person, 
    Group, 
    GroupMember, 
    PersonMasterData 
} from '../utils/ct-types';
import {
    flowApiClient,
    type FlowActionsApiAction,
} from '../utils/flowApiClient';
import type { 
    MenuItem 
} from 'primevue/menuitem';
import { 
    churchtoolsClient 
} from '@churchtools/churchtools-client';

// =============================================================================
// PROPS & EMITS
// =============================================================================

const props = defineProps<{
    data: TableDataSet;
    selectedCommitmentId?: number | null;
    //connectLeaders: Array<GroupMember>;
    visible: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'equip-action-triggered', personDomainIdentifier: number): void;
}>();

// =============================================================================
// DEPENDENCY INJECTION
// =============================================================================

const allCommitmentSteps = inject<Array<Group>>('allCommitmentSteps', []);
const allConnectGroupLeaders = inject<Array<GroupMember>>('allConnectGroupLeaders', []);
const allSubFlows = inject<Array<SubFlowStep>>('allSubFlows', []);
const masterData = inject<PersonMasterData | null>('masterData', null);

// =============================================================================
// REACTIVE STATE
// =============================================================================

const activeSection = ref('connect');
const equipFlowStatus = ref<Array<EquipFlowStep>>([]);
const taufeFlowStatus = ref<Array<EquipFlowStep>>([]);
const equipActionsReloadKey = ref(0);

type FlowAction = {
    action: () => void | Promise<void>;
    label: string;
    icon: string;
};

// =============================================================================
// COMPUTED PROPERTIES
// =============================================================================

const visible = computed({
    get: () => props.visible,
    set: (v: boolean) => emit('update:visible', v),
});

const currentStatusTagName = computed(() => {
    const person = props.data.asPerson;
    if (!person?.growPathId || !masterData?.growPaths) return '';

    const growPath = masterData.growPaths.find((path: { id: number; name?: string; nameTranslated?: string }) => path.id === person.growPathId);
    if (!growPath) return '';

    return (growPath.nameTranslated || growPath.name || '').trim();
});

const currentStatusTagIndex = computed(() => {
    const person = props.data.asPerson;
    if (!person?.growPathId || !masterData?.growPaths) return -1;

    const sortedGrowPaths = [...masterData.growPaths].sort((a, b) => a.sortKey - b.sortKey);
    return sortedGrowPaths.findIndex(path => path.id === person.growPathId);
});

const isStatusTagDifferentFromCommitment = computed(() => {
    const selectedCommitmentId = props.selectedCommitmentId;
    if (!selectedCommitmentId) return false;
    if (currentStatusTagIndex.value < 0) return false;

    return hasFlowLevelMismatch({
        commitmentGroupId: Number(selectedCommitmentId),
        statusTagIndex: currentStatusTagIndex.value,
    });
});

const personFullName = computed(() => 
    fullName(props.data?.asGroupMember || {} as GroupMember)
);

const personId = computed(() => 
    Number(props.data?.asGroupMember?.person?.domainIdentifier) || 0
);

const ctPersonLink = computed(() =>
    props.data?.asGroupMember?.person?.frontendUrl || '#'
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


const equipFlowSteps = computed<Array<EquipFlowStep>>(() => equipFlowStatus.value);
const taufeFlowSteps = computed<Array<EquipFlowStep>>(() => taufeFlowStatus.value);
const equipActions = ref<Array<FlowAction>>([
    {
        action: () => appOpenEquipFlow(),
        label: 'Equip Flow öffnen',
        icon: 'pi pi-play'
    }
]);

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
        label: 'Commitment',
        icon: 'pi pi-tags',
        command: () => { 
            activeSection.value = 'commitment';
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

function onCommitmentAdded(member: GroupMember): void {
    console.log('Commitment hinzugefügt:', member);
    props.data.commitment.push(member);
}

function onCommitmentRemoved(member: GroupMember): void {
    console.log('Commitment entfernt:', member);
    props.data.commitment = props.data.commitment.filter(
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
 * Öffnet den Equip Flow in einem neuen Tab.
 * Verwendet die getAppLinkForFlow Utility, um die URL zu generieren.
 */
function appOpenEquipFlow(): void {
    const url = getAppLinkForFlow(EQRM_APP_FLOWS.EQUIP);
    window.open(url, '_blank');
}

/**
 * Öffnet den Taufe Flow in einem neuen Tab.
 */
function appOpenTaufeFlow(): void {
    const url = getAppLinkForFlow(EQRM_APP_FLOWS.TAUFE);
    window.open(url, '_blank');
}

/**
 * Erstellt aus einer Schrittkonfiguration den anzeigbaren Flow-Status.
 */
function buildFlowStatusFromConfig(config: FlowStepConfig): Array<EquipFlowStep> {
    const flowStatus: Array<EquipFlowStep> = [];

    for (const stepConfig of config.steps) {
        const completionStepGroupMember = stepConfig.completionAttributeId
            ? props.data.equip.find(g => Number(g.group.domainIdentifier) === stepConfig.completionAttributeId)
            : null;
        const flowStepGroupMember = stepConfig.flowId
            ? props.data.subFlows.find(g => Number(g.group.domainIdentifier) === stepConfig.flowId)
            : null;
        const eventStepGroupMember = stepConfig.eventId
            ? props.data.events.find(g => Number(g.group.domainIdentifier) === stepConfig.eventId)
            : null;

        const step: EquipFlowStep = {
            id: stepConfig.id,
            name: stepConfig.name,
            status: []
        };

        if (completionStepGroupMember) {
            step.status.push({
                status: 'Absolviert',
                datum: completionStepGroupMember.memberStartDate ? new Date(completionStepGroupMember.memberStartDate) : undefined,
                info: completionStepGroupMember.registeredBy?.toString()
            });
        }

        if (flowStepGroupMember) {
            step.status.push({
                status: 'Potential',
                datum: flowStepGroupMember.memberStartDate ? new Date(flowStepGroupMember.memberStartDate) : undefined,
                info: flowStepGroupMember.group.title
            });
        }

        if (eventStepGroupMember) {
            step.status.push({
                status: 'Angemeldet',
                datum: eventStepGroupMember.memberStartDate ? new Date(eventStepGroupMember.memberStartDate) : undefined,
                info: eventStepGroupMember.group.title
            });
        }

        flowStatus.push(step);
    }

    return flowStatus;
}

/**
 * Befüllt den lokalen Equip-Status-Container aus den Personendaten.
 */
function populateEquipFlowStatusFromData(): void {
    equipFlowStatus.value = buildFlowStatusFromConfig(EQUIP_STEP_CONFIG);
}

/**
 * Befüllt den lokalen Taufe-Status-Container aus den Personendaten.
 */
function populateTaufeFlowStatusFromData(): void {
    taufeFlowStatus.value = buildFlowStatusFromConfig(TAUFE_STEP_CONFIG);
}

/**
 * Lädt die Equip-Aktionen für die aktuell ausgewählte Person.
 */
async function loadEquipActions(): Promise<void> {
    await ensureFlowClientToken();
    const apiActions: Array<FlowActionsApiAction> = await flowApiClient.getFlowActions(personId.value, 'equip');

    if (apiActions.length === 0) {
        equipActions.value = [
            {
                action: () => appOpenEquipFlow(),
                label: 'Equip Flow öffnen',
                icon: 'pi pi-play'
            }
        ];
        equipActionsReloadKey.value += 1;
        return;
    }

    equipActions.value = apiActions.map((apiAction) => ({
        label: apiAction.title,
        icon: apiAction.icon ?? 'pi pi-play',
        action: async () => {
            await flowApiClient.runFlowAction(personId.value, 'equip', apiAction.id);
            emit('equip-action-triggered', personId.value);
        },
    }));
    equipActionsReloadKey.value += 1;
}

/**
 * Lädt einmalig ein ChurchTools-Logintoken und konfiguriert damit den {@link flowApiClient}.
 *
 * Ist das Token im Singleton bereits gesetzt, kehrt die Funktion sofort zurück (No-op).
 * Andernfalls werden `/whoami` und `/persons/{id}/logintoken` aufgerufen und das
 * resultierende Token via `flowApiClient.configure()` gesetzt.
 *
 * @throws {Error} Wenn der Server kein Token zurückgibt oder ein Netzwerkfehler auftritt.
 */
async function ensureFlowClientToken(): Promise<void> {
    if (flowApiClient.isTokenConfigured()) return;
    try {
        const whoAmI = await churchtoolsClient.get<Person>('/whoami');
        const tokenResponse = await churchtoolsClient.get<string>(`/persons/${whoAmI.id}/logintoken`);
        const token = tokenResponse;
        if (!token) throw new Error('Konnte keinen Logintoken laden.');
        flowApiClient.configure({ token });
    } catch (error) {
        console.error('Fehler beim Laden des Logintokens:', error);
        throw error;
    }
}

/**
 * Reagiert auf Wechsel der aktiven Sektion und lädt sektionsspezifische Daten nach.
 *
 * - `equip`: Befüllt den Equip-Flow-Status aus den Personendaten, lädt dann per
 *   {@link ensureFlowClientToken} + {@link flowApiClient.getFlowActions} die verfügbaren
 *   API-Aktionen und schreibt sie in `equipActions`.
 * - `taufe`: Befüllt den Taufe-Flow-Status aus den bereits vorhandenen Daten.
 * - Alle anderen Sektionen: keine Nachlade-Logik (auskommentierte Freigabe-Option vorhanden).
 */
watch(() => activeSection.value, (val) => {
    if (val === 'equip') {
        populateEquipFlowStatusFromData();
        void loadEquipActions()
            .catch((error: unknown) => {
                console.error('Fehler beim Aktualisieren der Equip-Aktionen:', error);
            });
        return;
    }

    if (val === 'taufe') {
        populateTaufeFlowStatusFromData();
    } else {
        // optional: Daten freigeben, wenn Sektion verlassen wird
        // currently no section-specific cleanup required
    }
});

watch(
    () => props.data,
    () => {
        if (activeSection.value !== 'equip') return;
        populateEquipFlowStatusFromData();
        void loadEquipActions().catch((error: unknown) => {
            console.error('Fehler beim Aktualisieren des Equip-Blocks:', error);
        });
    }
);


</script>

<style scoped>
:deep(.p-fieldset.status-tag-mismatch .p-fieldset-content) {
    background-color: rgba(220, 38, 38, 0.08) !important;
}
</style>
