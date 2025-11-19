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
                :current-members="data.connectLeaders"
                :candidate-members="allConnectGroupLeaders"
                :target-person="data.person"
                :role-id="FLOW_CONFIG.CONNECT_MEMBERS_ROLE_ID"
                current-members-title="Aktuelle Connectoren"
                add-member-title="Connector hinzufügen"
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
                        icon="pi pi-pencil" 
                        :href="'https://app.eqrm.de/flows/start-flow?flow=equip'" 
                        as="a"
                        target="_blank"
                        rounded
                        outlined
                        v-tooltip.bottom="'Equip Flow in neuem Tab öffnen'"
                    />
                </div>
            </Fieldset>
            <Fieldset legend="Nächster Schritt">
                <DataTable
                    :value="filterGroupMembersBySubFlowParent(props.data.subFlows, equipSubFlowParent!)"
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
                        <template #body="{data: row}">
                            {{ formatTimeSince(row?.memberStartDate) }}
                        </template>
                    </Column>
                </DataTable>
            </Fieldset>
        </div>

        <!-- Taufe -->
        <div v-show="activeSection === 'taufe'">
            <Fieldset legend="Taufe">
                <p>Taufe-Informationen werden hier angezeigt...</p>
            </Fieldset>
        </div>
        
        <!-- Team-Zugehörigkeit -->
        <div v-show="activeSection === 'team'">
            <Fieldset legend="Nächster Schritt">
                <div class="flex justify-content-between align-items-start gap-3 mt-2">
                    <DataTable
                        :value="filterGroupMembersBySubFlowParent(props.data.subFlows, teamsSubFlowParent!)"
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
                            <template #body="{data: row}">
                                {{ formatTimeSince(row?.memberStartDate) }}
                            </template>
                        </Column>
                    </DataTable>
                    <Button 
                        icon="pi pi-pencil" 
                        :href="'https://app.eqrm.de/flows/start-flow?flow=teams'" 
                        as="a"
                        target="_blank"
                        rounded
                        outlined
                        v-tooltip.bottom="'Teams Flow in neuem Tab öffnen'"
                    </Button>
                </div>
            </Fieldset>            
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
            <Fieldset legend="Group-Zugehörigkeit">
                <p>Group-Informationen werden hier angezeigt...</p>
            </Fieldset>
        </div>

        <!-- Offboarding -->
        <div v-show="activeSection === 'offboarding'">
            <Fieldset legend="Offboarding">
                <p>Offboarding-Optionen werden hier angezeigt...</p>
            </Fieldset>
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
import { computed, ref, inject } from 'vue';

// PrimeVue Components
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Column from 'primevue/column';        
import DataTable from 'primevue/datatable';  
import Dialog from 'primevue/dialog';
import Fieldset from 'primevue/fieldset';
import MenuBar from 'primevue/menubar';

// Local Components
import AvatarDataColumn from './AvatarDataColumn.vue';
import PersonTimeline from './PersonTimeline.vue';
import GroupMemberEditor from './GroupMemberEditor.vue';
import GroupEditor from './GroupEditor.vue';

// Types and Utils
import { EQUIP_INITIALS, FLOW_CONFIG, type TableDataSet, type SubFlowStep } from '../types/flow';
import type { Person, Group, GroupMember, PersonMasterData } from '../utils/ct-types';
import type { MenuItem } from 'primevue/menuitem';

// =============================================================================
// PROPS & EMITS
// =============================================================================

const props = defineProps<{
    data: TableDataSet;
    connectLeaders: Array<GroupMember>;
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
 * Filtert GroupMembers nach Zugehörigkeit zu einem SubFlow-Parent.
 * 
 * Prüft, ob die Gruppen-ID eines GroupMembers in der childrenIds-Liste
 * des übergebenen SubFlow-Parents enthalten ist. Dadurch werden nur
 * Mitgliedschaften in Untergruppen (Children) des SubFlows zurückgegeben.
 * 
 * @param members - Array aller zu filternden GroupMember-Objekte
 * @param subFlow - SubFlowStep-Objekt, das die childrenIds-Liste enthält
 * @returns Gefiltertes Array mit GroupMembers, deren Gruppen Kinder des SubFlows sind
 */
function filterGroupMembersBySubFlowParent(members: Array<GroupMember>, subFlow: SubFlowStep): Array<GroupMember> {
    return members.filter(member => 
        subFlow.childrenIds?.includes(Number(member.group.domainIdentifier)));
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
 * Berechnet die Zeitspanne seit einem Startdatum und formatiert sie als Text.
 * - Bis 14 Tage: "seit X Tagen"
 * - Ab 15 Tagen: "seit X Wochen"
 * 
 * @param startDate - Startdatum im Format YYYY-MM-DD oder ISO-String
 * @returns Formatierter Text (z.B. "seit 5 Tagen" oder "seit 3 Wochen") oder '–' wenn kein Datum
 */
function formatTimeSince(startDate: string | null | undefined): string {
    if (!startDate) return '–';
    
    try {
        const start = new Date(startDate);
        const now = new Date();
        
        // Prüfe ob Datum gültig ist
        if (isNaN(start.getTime())) return '–';
        
        // Berechne Differenz in Millisekunden
        const diffMs = now.getTime() - start.getTime();
        
        // Berechne Tage (86400000 ms = 1 Tag)
        const days = Math.floor(diffMs / 86400000);
        
        // Wenn mehr als 14 Tage, berechne Wochen
        if (days > 14) {
            const weeks = Math.floor(days / 7);
            return `seit ${weeks} Woche${weeks !== 1 ? 'n' : ''}`;
        }
        
        // Ansonsten Tage
        return `seit ${days} Tag${days !== 1 ? 'en' : ''}`;
        
    } catch (error) {
        console.error('Fehler beim Berechnen der Zeitspanne:', error);
        return '–';
    }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function handleDialogShow(): void {
    console.log('Dialog geöffnet für Person:', personId.value);
    activeSection.value = 'connect';
}

// ----------------- Event-Handler für GroupMemberEditor -----------------

// Connect (GroupMember-Modus)
function onConnectLeaderAdded(member: GroupMember): void {
    console.log('GroupMember hinzugefügt:', member);
    props.data.connectLeaders.push(member);
}

function onConnectLeaderRemoved(member: GroupMember): void {
    console.log('GroupMember entfernt:', member);
    props.data.connectLeaders = props.data.connectLeaders.filter(
        cl => cl.person.domainIdentifier !== member.person.domainIdentifier
    );
}

function onMasterFlowAdded(member: GroupMember): void {
    console.log('Master Flow hinzugefügen:', member);
    props.data.flow.push(member);
}

function onMasterFlowRemoved(member: GroupMember): void {
    console.log('Master Flow entfernt:', member);
    props.data.flow = props.data.flow.filter(
        f => f.group.domainIdentifier !== member.group.domainIdentifier
    );
}



</script>
