<template class="p-fluid">
    <div class="flex flex-column gap-4 p-4">
        <Fieldset legend="Filter">
            <div class="flex gap-2">
                <FloatLabel variant="on">
                    <InputText 
                        id="filter-text" 
                        v-model="filterText" 
                        style="min-width: 20rem">                            
                    </InputText>
                    <label for="filter-text">Person</label>
                </FloatLabel>
                <FloatLabel variant="on">
                    <Select 
                        v-model="filters.commitment.value" 
                        :options="allCommitmentSteps" 
                        style="min-width: 20rem" 
                        :showClear="false" 
                        optionLabel="name" 
                        optionValue="id"
                        id="commitment-select">
                        <template #option="slotProps">
                            <Tag :value="slotProps.option.name"/>
                        </template>
                    </Select>
                    <label for="commitment-select">Commitment</label>
                </FloatLabel>
                <Button
                    class="ml-2" 
                    icon="pi pi-search" 
                    label="Suchen" 
                    outlined
                    rounded
                    @click="fetchData({ page: 0, rows: MAX_ROWS })">
                </Button>
                <Button
                    class="ml-2" 
                    icon="pi pi-pencil" 
                    outlined
                    rounded
                    @click="personPickerVisible = true"
                    v-tooltip.bottom="`Erweiterte Suche`">
                </Button>
                <Button
                    class="ml-2" 
                    icon="pi pi-times" 
                    severity="info"
                    outlined
                    rounded
                    @click="filterText = null; filters.commitment.value = COMMITMENT_GROUP_IDS[0]; fetchData({ page: 0, rows: MAX_ROWS })"
                    v-tooltip.bottom="`Suche leeren`">
                </Button>
            </div>
        </Fieldset>
        <Fieldset legend="Personen" class="mt-2">        
            <DataTable 
                :value="tableDataSet" 
                :paginator="true"
                :rows="MAX_ROWS"
                :totalRecords="totalRecords"
                :loading="loading"
                :lazy="true"
                :sortField="serverSortField"
                :sortOrder="serverSortOrder"
                v-model:filters="filters"
                filterDisplay="menu"
                @sort="onServerSort"        
                @page="fetchData"
                dataKey="data.asGroupMember.person.domainAttribute.id" 
                responsiveLayout="scroll" 
                rowExpansionTemplate="slotProps" 
                columnResizeMode="fit"
                :rowClass="(data) => isStatusTagDifferentFromCommitment(data) ? 'row-status-mismatch' : ''">
                
                <!-- Name -->
                <Column 
                    field="vorname" 
                    header="Vorname" 
                    :sortable="true">
                    <template #body="{ data }">
                        {{ data.asGroupMember.person.domainAttributes.firstName }}
                    </template>
                </Column>
                <Column 
                    field="name" 
                    header="Name" 
                    :sortable="true">
                    <template #body="{ data }">
                        {{ data.asGroupMember.person.domainAttributes.lastName }}
                    </template>
                </Column>
                
                <!-- Status-Tag -->
                <Column 
                    header="Status-Tag"
                    field="commitment" 
                    :showFilterMenu="false">
                    <template #body="slotProps">
                        <Avatar 
                            v-if="getStatusTagLabel(slotProps.data.asPerson)"
                            :label="getStatusTagLabel(slotProps.data.asPerson)"
                            v-tooltip.bottom="getStatusTagFullName(slotProps.data.asPerson)"
                            class="mr-2"/>
                    </template>
                </Column> 
                
                <!-- Connect Leaders -->     
                <Column 
                    field="connect" 
                    header="Connect" 
                    :showFilterMenu="false">
                    <template #body="slotProps">                
                        <div class="flex grid gap-2">
                            <div v-for="leader in slotProps.data.connectLeaders" :key="leader.id">
                                <OverlayBadge 
                                    :severity="getMemberSeverity(getGroupMemberByConnectLeader(leader, slotProps.data.connect))" 
                                    class="mr-2">
                                    <Avatar 
                                        :label="leader.person.initials" 
                                        v-tooltip.bottom="fullName(leader) + ` (${getMembershipStatusText(getGroupMemberByConnectLeader(leader, slotProps.data.connect))})`"/>
                                </OverlayBadge>
                            </div>
                        </div>
                    </template>
                </Column>
                
                <!-- Equip -->
                <Column 
                    field="equip" 
                    header="Equip" 
                    :showFilterMenu="false">
                    <template #body="slotProps">
                        <AvatarDataColumn
                            :data="slotProps.data"
                            :master-data="visibleEquipGroups"
                            :level-mapping="equipInitialsMapping"
                            data-property="equip"
                        />
                    </template>
                </Column>
                
                <!-- Nächster Schritt -->     
                <Column 
                    field="subFlows" 
                    header="Nächster Schritt" 
                    :showFilterMenu="false">
                    <template #body="slotProps">
                        <div class="flex flex-wrap grid gap-2">
                            <div v-for="flow in slotProps.data.subFlows" :key="flow.id">
                                <Tag severity="secondary" >{{ flow.group.title }}</Tag>
                            </div> 
                        </div>
                    </template>
                </Column>
                
                <!-- letzte Änderung -->
                <Column 
                    field="joined" 
                    header="Mitglied seit" 
                    dataType="date"
                    :sortable="true">
                    <template #body="{ data }">
                        {{ data.asGroupMember.memberStartDate ? new Date(data.asGroupMember.memberStartDate).toLocaleDateString() : '–' }}
                    </template>
                </Column>
                
                <!-- Aktionen -->
                <Column>
                    <template #body="slotProps">
                        <Button 
                            v-tooltip.bottom="`Kontakt von ${fullName(slotProps.data.asGroupMember)} im Personen-Modul öffnen`"
                            icon="pi pi-user" 
                            class="p-button-text" 
                            as="a" 
                            target="_blank" 
                            :href="getPersonUrl(slotProps.data.asGroupMember.person.domainIdentifier)" 
                        />
                    </template>
                </Column>
                <Column>
                    <template #body="slotProps">
                        <Button 
                            v-tooltip.bottom="` ${fullName(slotProps.data.asGroupMember)} bearbeiten`"
                            icon="pi pi-pencil" 
                            class="p-button-text"
                            @click="openPersonDialog(slotProps.data)"
                        />
                    </template>
                </Column>
            </DataTable>
        </Fieldset> 
    </div>
    <!-- Dialog mit den Details der ausgewählten Zeile -->
    <FlowPersonDetails
        v-if="personDialogVisible && selectedRow"
        v-model:visible="personDialogVisible"
        :data="selectedRow"
        :connectLeaders="connectGroupSetInstance.allConnectGroupLeaders"
        @equip-action-triggered="onEquipActionTriggered"
    />
    <PersonPickerDialog
        v-model:visible="personPickerVisible"
        @confirm="onPersonPickerConfirm"
    />
</template>

<style scoped>
:deep(.row-status-mismatch) {
    background-color: rgba(220, 38, 38, 0.08) !important;
}
</style>

<script lang="ts" setup>
    import type { 
        Group, 
        DomainObjectPerson,
        PersonSetting,
        Person,
        GroupMember, 
        MetaPagination, 
        MemberStatus,
        GrowPath } from '../utils/ct-types';
    import type { 
        PageResponse, 
        Params } from '@churchtools/churchtools-client/dist/churchtoolsClient';
    import { 
        churchtoolsClient } from '@churchtools/churchtools-client';
    import type { 
        TableDataSet
     } from '../types/flow';
    import { 
        FLOW_CONFIG, 
        COMMITMENT_GROUP_IDS, 
        EQUIP_STEP_CONFIG,
        STATUS_TAG_LABELS,
        hasFlowLevelMismatch,
    } from '../types/flow';
    import { 
        FilterMatchMode } from '@primevue/core/api';
    import { 
        ref, 
        watch, 
        onMounted, 
        computed, 
        inject,
        type Ref } from 'vue';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import Button from 'primevue/button';
    import Avatar from 'primevue/avatar';
    import Tag from 'primevue/tag';
    import Select from 'primevue/select';
    import FlowPersonDetails from './FlowPersonDetails.vue';
    import AvatarDataColumn from './AvatarDataColumn.vue';
    import Fieldset from 'primevue/fieldset';
    import FloatLabel from 'primevue/floatlabel';
    import InputText from 'primevue/inputtext';
    import OverlayBadge from 'primevue/overlaybadge';
    import PersonPickerDialog from './PersonPickerDialog.vue';

    type DataTablePageEvent = { page: number; rows: number };

    // ConnectGroupSet class bleibt unverändert...
    class ConnectGroupSet {
        private _allConnectGroups: Array<Group> = [];
        private _allConnectGroupLeaders: Array<GroupMember> = [];

        /**
         * Lädt alle Connect-Gruppen und deren Leitende aus ChurchTools neu.
         */
        public async reload() {
            try {
                this._allConnectGroups = (await churchtoolsClient.getAllPages<Array<Group>>('/groups', {
                    group_type_ids: [FLOW_CONFIG.CONNECT_GROUPTYPE_ID]
                })).flat();
                this._allConnectGroupLeaders = (await Promise.all(
                    this._allConnectGroups.map(async g => {
                        const connectgroupLeaders = (await churchtoolsClient.get<Array<GroupMember>>(`/groups/${g.id}/members`))
                            .filter(m => m.groupTypeRoleId === FLOW_CONFIG.CONNECT_LEADERS_ROLE_ID);
                        return connectgroupLeaders;
                    })
                )).flat();
            }
            catch (error) {
                console.error('Error fetching connect groups or leaders:', error);
            }
        }

        /**
         * Ermittelt alle Connect-Leitenden für die angegebenen Gruppen-IDs.
         *
         * @param groupIds - Domain-Identifier der Connect-Gruppen
         * @returns Gefilterte Liste der Leitenden
         */
        public getLeaders(groupIds: Array<number>): Array<GroupMember> {
            const leaders: Array<GroupMember> = [];
            leaders.push(...this._allConnectGroupLeaders.filter(l => groupIds.includes(Number(l.group.domainIdentifier))));
            return leaders;
        }
        
        /**
         * Gibt alle geladenen Connect-Gruppen zurück.
         */
        public get allConnectGroups(): Array<Group> {
            return this._allConnectGroups;
        }

        /**
         * Gibt alle geladenen Connect-Leitenden zurück.
         */
        public get allConnectGroupLeaders(): Array<GroupMember> {
            return this._allConnectGroupLeaders;
        }
    }

    /**
     * Standardanzahl an Zeilen pro Seite in der DataTable.
     */
    const MAX_ROWS = 10;
    const tableDataSet = ref<Array<TableDataSet>>([]);
    const connectGroupSetInstance = new ConnectGroupSet();
    const totalRecords = ref(0);
    const loading = ref(false);
    const allCommitmentSteps = inject<Array<Group>>('allCommitmentSteps', []);
    const allEquipGroups = inject<Array<Group>>('allEquipGroups', []);
    const whoami = inject<Person>('whoami');
    const growPaths = inject<Ref<Array<GrowPath>>>('growPaths', ref([]));

    const personDialogVisible = ref(false);
    const personPickerVisible = ref(false);
    const selectedRow = ref<TableDataSet | null>(null);

    /**
     * Öffnet den Detaildialog für die ausgewählte Tabellenzeile.
     *
     * @param row - Datensatz der ausgewählten Person
     */
    const openPersonDialog = (row: TableDataSet) => {
        selectedRow.value = row;
        personDialogVisible.value = true;
    };

    // Sort-Status der DataTable (Name/Vorname)
    const serverSortField = ref<'name' | 'vorname' | 'joined'>('name');
    const serverSortOrder = ref<1 | -1>(1);

    /**
     * Übersetzt sortierbare UI-Felder in die API-Feldnamen für Server-Sorting.
     */
    const orderFields: Record<'name' | 'vorname' | 'joined', string> = {
        name: 'person_lastName',
        vorname: 'person_firstName',
        joined: 'member_memberStartDate',
    };

    /**
     * Übersetzt PrimeVue-Sortorder (`1` / `-1`) in API-Richtungen (`ASC` / `DESC`).
     */
    const orderDirections: Record<'1' | '-1', 'ASC' | 'DESC'> = {
        '1': 'ASC',
        '-1': 'DESC',
    };

    const props = defineProps<{
        commitmentId: number | null
    }>();

    /**
     * Enthält den aktiven Tabellenfilter; initial mit übergebenem Commitment oder Standard-Commitment.
     */
    const filters = ref({
        commitment: { value: props.commitmentId ?? COMMITMENT_GROUP_IDS[0], matchMode: FilterMatchMode.EQUALS },
    });

    const filterText = ref<string | null>(null);

    /**
     * Liste aller relevanten Equip-Gruppen-IDs aus der Step-Konfiguration.
     */
    const equipIds = EQUIP_STEP_CONFIG.steps
        .map(step => step.completionAttributeId)
        .filter((id): id is number => typeof id === 'number');

    /**
     * Mapping von Equip-Gruppen-ID auf Kürzel für die Avatar-Darstellung.
     */
    const equipInitialsMapping: Record<number, string> = EQUIP_STEP_CONFIG.steps.reduce((mapping, step) => {
        if (typeof step.completionAttributeId === 'number') {
            mapping[step.completionAttributeId] = step.initials;
        }
        return mapping;
    }, {} as Record<number, string>);

    const visibleEquipGroups = computed<Array<Group>>(() => {
        return allEquipGroups.filter(group => equipIds.includes(group.id));
    });

    const selectedCommitmentId = computed(() => filters.value.commitment.value as number | null);
    const lastFetchEvent = ref<DataTablePageEvent>({ page: 0, rows: MAX_ROWS });

    const currentUserId = computed(() => Number(whoami?.id));

    /**
     * Übernimmt den Sortierstatus aus der DataTable in die serverseitigen Sortier-Refs.
     *
     * @param event - PrimeVue Sort-Event mit Feld und Richtung
     */
    const onServerSort = (event: any) => {
        serverSortField.value = event.sortField;
        serverSortOrder.value = event.sortOrder;
    };


    /**
     * Übernimmt die Auswahl aus dem PersonPicker und startet eine neue Suche.
     *
     * @param payload - Ausgewählte Person inklusive Gruppenkontext
     */
    const onPersonPickerConfirm = (payload: { person: DomainObjectPerson & { displayName: string }, groups: Array<GroupMember> }) => {
        if (!payload.person) return;
        if (!payload.groups || payload.groups.length === 0) return;
        if (!payload.groups[0].group.domainAttributes.groupTypeId) return;

        filterText.value = payload.person.displayName;
        filters.value.commitment.value = Number(payload.groups[payload.groups.length - 1]?.group.domainIdentifier); 
        fetchData({ page: 0, rows: MAX_ROWS });
        personPickerVisible.value = false;
    };

    /**
     * Aktualisiert die Tabellenzeile nach einer Equip-Aktion und synchronisiert den Detaildialog.
     *
     * @param personId - Domain-Identifier der bearbeiteten Person
     */
    const onEquipActionTriggered = async (personId: number): Promise<void> => {
        await fetchData(lastFetchEvent.value);

        const refreshedRow = tableDataSet.value.find(
            row => Number(row.asGroupMember.person.domainIdentifier) === personId
        );

        if (refreshedRow) {
            selectedRow.value = refreshedRow;
        }
    };


    /**
     * Lädt die Flow-Tabellendaten serverseitig mit Paging, Suche und Sortierung.
     *
     * @param event - Paging-Event der DataTable
     */
    const fetchData = async (event: DataTablePageEvent) => {
        lastFetchEvent.value = { ...event };
        loading.value = true;
        try {            
            const stationId = await fetchStationFilterId(currentUserId.value);
            console.log('Station ID for filtering:', stationId);

            const sortField = orderFields[serverSortField.value] ?? 'person_lastName';
            const sortDir = orderDirections[String(serverSortOrder.value) as '1' | '-1'];
            const commitmentGroupId = selectedCommitmentId.value ?? COMMITMENT_GROUP_IDS[0];
            const params: Params = {
                page: event.page + 1, 
                limit: event.rows, 
                orderFields: [sortField], 
                orderDirections: [sortDir]
            };
            if (filterText.value) {
                params.query = filterText.value;
            }
            if (stationId) {
                params.person_campusId = stationId;
            }
            const response = await churchtoolsClient.get<PageResponse<Array<GroupMember>>>(
                `/groups/${commitmentGroupId}/members`, 
                params,
                true);
            const commitmentGroupMemberPage = response.data.data;
            totalRecords.value = (response.data.meta as MetaPagination).pagination?.total || 0;

            const rows: TableDataSet[] = await Promise.all(
                commitmentGroupMemberPage.map(async (groupMember) => {
                    const personsGroups = await churchtoolsClient.get<Array<GroupMember>>(
                        `/persons/${groupMember.person.domainIdentifier}/groups`, {
                        show_to_delete_memberships: true,               //  default: false
                        show_requested_or_waiting_memberships: true     //  default: false    
                    });
                    const personDetails = await churchtoolsClient.get<Person>(
                        `/persons/${groupMember.person.domainIdentifier}`);
                    const subFlowGroups = personsGroups.filter(g => {
                        const isFlowType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_FLOW;
                        const isNotMainFlow = !COMMITMENT_GROUP_IDS.includes(Number(g.group.domainIdentifier) as any);
                        return isFlowType && isNotMainFlow;
                    });
                    const commitmentGroups = personsGroups.filter(g => {
                        const isFlowType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_FLOW;
                        const isMainFlow = COMMITMENT_GROUP_IDS.includes(Number(g.group.domainIdentifier) as any);
                        return isFlowType && isMainFlow;
                    });
                    const equipGroups = personsGroups.filter(g => {
                        const isEquipType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_MERKMAL;
                        return isEquipType;
                    });
                    const connectGroups = personsGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.CONNECT_GROUPTYPE_ID);
                    const commitmentGroupJoins = commitmentGroups.map(g => g.memberStartDate ? new Date(g.memberStartDate) : null);
                    const groups = personsGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_GROUP);
                    const teams = personsGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_TEAM);
                    const events = personsGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_EVENT);
                    return {
                        asGroupMember: groupMember,
                        asPerson: personDetails,
                        commitment: commitmentGroups,
                        connect: connectGroups,
                        subFlows: subFlowGroups,
                        connectLeaders: connectGroupSetInstance.getLeaders(
                            connectGroups.map(g => Number(g.group.domainIdentifier))),
                        latestJoinDate: commitmentGroupJoins.at(-1),
                        equip: equipGroups,
                        groups: groups,
                        teams: teams,
                        events: events
                    };
                })
            );
            tableDataSet.value = rows;
        } catch (error) {
            console.error('Error fetching connect groups or leaders:', error);
        } finally {
            loading.value = false;
        }     
    };

    /**
     * Lädt Daten neu, sobald sich Sortierung oder Flow-Filter ändern.
     */
    watch([serverSortField, serverSortOrder, filters], async () => {
        await fetchData({ page: 0, rows: MAX_ROWS });
    });

    /**
     * Initialisiert beim Mounten die Connect-Daten und die erste Tabellenabfrage.
     */
    onMounted(async () => {
        await connectGroupSetInstance.reload();
        await fetchData({page:0, rows: MAX_ROWS});
    });

    //  Helpers

    /**
     * Erzeugt einen robusten Anzeigenamen aus Vor- und Nachname.
     *
     * @param member - Gruppenmitglied mit Personendaten
     * @returns Vollständiger Name oder Fallback-Text
     */
    const fullName = (member: GroupMember): string => {
        const firstName = member?.person?.domainAttributes?.firstName?.trim() ?? '';
        const lastName = member?.person?.domainAttributes?.lastName?.trim() ?? '';
        
        // Nur Teile hinzufügen, die nicht leer sind
        const parts = [firstName, lastName].filter(Boolean);
        
        return parts.join(' ') || 'Unbekannt';
    };

    type MemberSeverity = 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' | null;

    /**
     * Sucht das Connect-Gruppenmitglied einer leitenden Person innerhalb der Mitgliedschaften.
     *
     * @param connectLeader - Leitendes Connect-Mitglied
     * @param membersConnectGroups - Connect-Mitgliedschaften der betrachteten Person
     * @returns Gefundenes Mitglied oder null
     */
    const getGroupMemberByConnectLeader = (connectLeader: GroupMember, membersConnectGroups: Array<GroupMember>): GroupMember | null => {
        return membersConnectGroups.find(m => m.group.domainIdentifier === connectLeader.group.domainIdentifier) || null;
    };

    /**
     * Leitet den Gruppenstatus auf die visuelle Badge-Schwere ab.
     *
     * @param member - Gruppenmitglied oder null
     * @returns PrimeVue-Severity für OverlayBadge
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
     * Übersetzt den internen Membership-Status in eine verständliche Bezeichnung.
     *
     * @param member - Gruppenmitglied oder null
     * @returns Lokalisierter Statustext
     */
    const getMembershipStatusText = (member: GroupMember | null): string => {
        const statusMap: Record<MemberStatus, string> = {
            active: 'Durch Connecter übernommen',
            requested: 'An Connecter zugewiesen',
            to_delete: 'Connect abgeschlossen',
            waiting: 'Wartet'
        };
        return member ? statusMap[member.groupMemberStatus] : 'unknown';
    }



    /**
     * Erstellt die ChurchTools Personen-URL für das PersonView-Modul.
     * 
     * @param personId - DomainIdentifier der Person
     * @returns Vollständige URL zum PersonView-Modul mit searchEntry-Parameter
     */
    const getPersonUrl = (personId: string): string => {
        return `https://eqrm.church.tools/?q=churchdb#PersonView/searchEntry:${personId}`;
    };

    
    /**
     * Lädt die Stations-Filter-ID aus den globalen Personeneinstellungen.
     *
     * @param id - Personen-ID des aktuellen Benutzers
     * @returns Stations-ID oder null bei Fehler bzw. fehlendem Wert
     */
    const fetchStationFilterId = async (id: number): Promise<number | null> => {
        try {
            const personSettings = await churchtoolsClient.get<PersonSetting | null>(`/persons/${id}/settings/global/station`);
            return Number(personSettings?.value);
        } catch (error) {
            console.error('Error fetching person settings:', error);
            return null;
        }
    };

    const resolveGrowPath = (person: Person): GrowPath | null => {
        const growPathId = person?.growPathId;
        if (!growPathId) return null;
        return growPaths.value.find(path => path.id === growPathId) ?? null;
    };

    const getStatusTagLabel = (person: Person): string => {
        const growPath = resolveGrowPath(person);
        if (!growPath) return '';

        const sortedGrowPaths = [...growPaths.value].sort((a, b) => a.sortKey - b.sortKey);
        const activeIndex = sortedGrowPaths.findIndex(path => path.id === growPath.id);
        if (activeIndex < 0) return '';

        return STATUS_TAG_LABELS[activeIndex as keyof typeof STATUS_TAG_LABELS] ?? '';
    };

    const getStatusTagFullName = (person: Person): string => {
        const growPath = resolveGrowPath(person);
        if (!growPath) return '';
        return (growPath.nameTranslated || growPath.name || '').trim();
    };

    const isStatusTagDifferentFromCommitment = (data: TableDataSet): boolean => {
        const selectedCommitment = selectedCommitmentId.value;
        if (!selectedCommitment) return false;

        const growPath = resolveGrowPath(data.asPerson);
        if (!growPath) return false;

        const sortedGrowPaths = [...growPaths.value].sort((a, b) => a.sortKey - b.sortKey);
        const statusTagIndex = sortedGrowPaths.findIndex(path => path.id === growPath.id);
        if (statusTagIndex < 0) return false;

        return hasFlowLevelMismatch({
            commitmentGroupId: Number(selectedCommitment),
            statusTagIndex,
        });
    };

</script>