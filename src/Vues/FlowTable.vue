<template class="p-fluid">
    <div class="flex flex-column gap-4 p-4">
        <Fieldset legend="Tag wählen">
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
                        v-model="filters.flow.value" 
                        :options="allMasterFlowSteps" 
                        style="min-width: 20rem" 
                        :showClear="false" 
                        optionLabel="name" 
                        optionValue="id"
                        id="flow-select">
                        <template #option="slotProps">
                            <Tag :value="slotProps.option.name"/>
                        </template>
                    </Select>
                    <label for="flow-select">Tag</label>
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
                    @click="filterText = null; filters.flow.value = FLOW_GROUP_IDS[0]; fetchData({ page: 0, rows: MAX_ROWS })"
                    v-tooltip.bottom="`Suche leeren`">
                </Button>
            </div>
        </Fieldset>
        <Fieldset legend="Mitglieder im Flow" class="mt-2">        
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
                dataKey="data.person.person.domainAttribute.id" 
                responsiveLayout="scroll" 
                rowExpansionTemplate="slotProps" 
                columnResizeMode="fit">
                
                <!-- Name -->
                <Column 
                    field="vorname" 
                    header="Vorname" 
                    :sortable="true">
                    <template #body="{ data }">
                        {{ data.person.person.domainAttributes.firstName }}
                    </template>
                </Column>
                <Column 
                    field="name" 
                    header="Name" 
                    :sortable="true">
                    <template #body="{ data }">
                        {{ data.person.person.domainAttributes.lastName }}
                    </template>
                </Column>
                
                <!-- Flow -->
                <Column 
                    header="Tag"
                    field="flow" 
                    :showFilterMenu="true" 
                    :showFilterMatchModes="false">
                    <template #body="slotProps">
                        <AvatarDataColumn
                            :data="slotProps.data"
                            :master-data="allMasterFlowSteps"
                            :level-mapping="FLOW_INITIALS"
                            data-property="flow"
                        />
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
                
                <Column 
                    field="equip" 
                    header="Equip" 
                    :showFilterMenu="false">
                    <template #body="slotProps">
                        <AvatarDataColumn
                            :data="slotProps.data"
                            :master-data="allEquipSteps"
                            :level-mapping="EQUIP_INITIALS"
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
                        {{ data.person.memberStartDate ? new Date(data.person.memberStartDate).toLocaleDateString() : '–' }}
                    </template>
                </Column>
                
                <!-- Aktionen -->
                <Column>
                    <template #body="slotProps">
                        <Button 
                            v-tooltip.bottom="`Kontakt von ${fullName(slotProps.data.person)} im Personen-Modul öffnen`"
                            icon="pi pi-user" 
                            class="p-button-text" 
                            as="a" 
                            target="_blank" 
                            :href="getPersonUrl(slotProps.data.person.person.domainIdentifier)" 
                        />
                    </template>
                </Column>
                <Column>
                    <template #body="slotProps">
                        <Button 
                            v-tooltip.bottom="` ${fullName(slotProps.data.person)} bearbeiten`"
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
    />
    <PersonPickerDialog
        v-model:visible="personPickerVisible"
        @confirm="onPersonPickerConfirm"
    />
</template>

<script lang="ts" setup>
    import type { 
        Group, 
        DomainObjectPerson,
        PersonSetting,
        Person,
        GroupMember, 
        MetaPagination, 
        MemberStatus } from '../utils/ct-types';
    import type { 
        PageResponse, 
        Params } from '@churchtools/churchtools-client/dist/churchtoolsClient';
    import { 
        churchtoolsClient } from '@churchtools/churchtools-client';
    import type { 
        SubFlowStep, 
        TableDataSet } from '../types/flow';
    import { 
        FLOW_CONFIG, 
        FLOW_GROUP_IDS, 
        EQUIP_IDS, 
        FLOW_INITIALS, 
        EQUIP_INITIALS } from '../types/flow';
    import { 
        FilterMatchMode } from '@primevue/core/api';
    import { 
        ref, 
        watch, 
        onMounted, 
        computed, 
        inject } from 'vue';
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

        public getLeaders(groupIds: Array<number>): Array<GroupMember> {
            const leaders: Array<GroupMember> = [];
            leaders.push(...this._allConnectGroupLeaders.filter(l => groupIds.includes(Number(l.group.domainIdentifier))));
            return leaders;
        }
        
        public get allConnectGroups(): Array<Group> {
            return this._allConnectGroups;
        }

        public get allConnectGroupLeaders(): Array<GroupMember> {
            return this._allConnectGroupLeaders;
        }
    }

    const MAX_ROWS = 10;
    const tableDataSet = ref<Array<TableDataSet>>([]);
    const connectGroupSetInstance = new ConnectGroupSet();
    const totalRecords = ref(0);
    const loading = ref(false);
    const allMasterFlowSteps = inject<Array<Group>>('allMasterFlowSteps');
    const allEquipSteps = inject<Array<SubFlowStep>>('allEquipSteps');
    const whoami = inject<Person>('whoami');

    const personDialogVisible = ref(false);
    const personPickerVisible = ref(false);
    const selectedRow = ref<TableDataSet | null>(null);
    const openPersonDialog = (row: TableDataSet) => {
        selectedRow.value = row;
        personDialogVisible.value = true;
    };

    // Sort-Status der DataTable (Name/Vorname)
    const serverSortField = ref<'name' | 'vorname' | 'joined'>('name');
    const serverSortOrder = ref<1 | -1>(1);

    // Mappe die UI-Felder auf API-Felder
    const orderFields: Record<'name' | 'vorname' | 'joined', string> = {
        name: 'person_lastName',
        vorname: 'person_firstName',
        joined: 'member_memberStartDate',
    };

    const orderDirections: Record<'1' | '-1', 'ASC' | 'DESC'> = {
        '1': 'ASC',
        '-1': 'DESC',
    };

    const props = defineProps<{
        flowId: number | null
    }>();

    const filters = ref({
        flow: { value: props.flowId ?? FLOW_GROUP_IDS[0], matchMode: FilterMatchMode.EQUALS },
    });

    const filterText = ref<string | null>(null);

    const selectedFlowId = computed(() => filters.value.flow.value as number | null);

    const currentUserId = computed(() => Number(whoami?.id));

    const onServerSort = (event: any) => {
        serverSortField.value = event.sortField;
        serverSortOrder.value = event.sortOrder;
    };


    const onPersonPickerConfirm = (payload: { person: DomainObjectPerson & { displayName: string }, groups: Array<GroupMember> }) => {
        if (!payload.person) return;
        if (!payload.groups || payload.groups.length === 0) return;
        if (!payload.groups[0].group.domainAttributes.groupTypeId) return;

        filterText.value = payload.person.displayName;
        filters.value.flow.value = Number(payload.groups[payload.groups.length - 1]?.group.domainIdentifier); 
        fetchData({ page: 0, rows: MAX_ROWS });
        personPickerVisible.value = false;
    };


    const fetchData = async (event: DataTablePageEvent) => {
        loading.value = true;
        try {            
            const stationId = await fetchStationFilterId(currentUserId.value);
            console.log('Station ID for filtering:', stationId);

            const sortField = orderFields[serverSortField.value] ?? 'person_lastName';
            const sortDir = orderDirections[String(serverSortOrder.value) as '1' | '-1'];
            const flowGroupId = selectedFlowId.value ?? FLOW_GROUP_IDS[0];
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
                `/groups/${flowGroupId}/members`, 
                params,
                true);
            const flowGroupMember = response.data.data;
            totalRecords.value = (response.data.meta as MetaPagination).pagination?.total || 0;

            const rows: TableDataSet[] = await Promise.all(
                flowGroupMember.map(async (groupMember) => {
                    const personsGroups = await churchtoolsClient.get<Array<GroupMember>>(
                        `/persons/${groupMember.person.domainIdentifier}/groups`, {
                        show_to_delete_memberships: true,               //  default: false
                        show_requested_or_waiting_memberships: true     //  default: false    
                    });
                    const subFlowGroups = personsGroups.filter(g => {
                        const isFlowType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_FLOW;
                        const isNotMainFlow = !FLOW_GROUP_IDS.includes(Number(g.group.domainIdentifier) as any);
                        return isFlowType && isNotMainFlow;
                    });
                    const flowGroups = personsGroups.filter(g => {
                        const isFlowType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_FLOW;
                        const isMainFlow = FLOW_GROUP_IDS.includes(Number(g.group.domainIdentifier) as any);
                        return isFlowType && isMainFlow;
                    });
                    const equipGroups = personsGroups.filter(g => {
                        const isEquipType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_MERKMAL;
                        const isEquipGroup = EQUIP_IDS.includes(Number(g.group.domainIdentifier) as any);                    
                        return isEquipType && isEquipGroup;
                    });
                    const connectGroups = personsGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.CONNECT_GROUPTYPE_ID);
                    const flowGroupJoins = flowGroups.map(g => g.memberStartDate ? new Date(g.memberStartDate) : null);
                    const groups = personsGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_GROUP);
                    const teams = personsGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_TEAM);
                    return {
                        person: groupMember,
                        flow: flowGroups,
                        connect: connectGroups,
                        subFlows: subFlowGroups,
                        connectLeaders: connectGroupSetInstance.getLeaders(
                            connectGroups.map(g => Number(g.group.domainIdentifier))),
                        latestJoinDate: flowGroupJoins.at(-1),
                        equip: equipGroups,
                        groups: groups,
                        teams: teams,
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

    watch([serverSortField, serverSortOrder, filters], async () => {
        await fetchData({ page: 0, rows: MAX_ROWS });
    });

    onMounted(async () => {
        await connectGroupSetInstance.reload();
        await fetchData({page:0, rows: MAX_ROWS});
    });

    //  Helpers
    const fullName = (member: GroupMember): string => {
        const firstName = member?.person?.domainAttributes?.firstName?.trim() ?? '';
        const lastName = member?.person?.domainAttributes?.lastName?.trim() ?? '';
        
        // Nur Teile hinzufügen, die nicht leer sind
        const parts = [firstName, lastName].filter(Boolean);
        
        return parts.join(' ') || 'Unbekannt';
    };

    type MemberSeverity = 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' | null;

    const getGroupMemberByConnectLeader = (connectLeader: GroupMember, membersConnectGroups: Array<GroupMember>): GroupMember | null => {
        return membersConnectGroups.find(m => m.group.domainIdentifier === connectLeader.group.domainIdentifier) || null;
    };

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

    
    const fetchStationFilterId = async (id: number): Promise<number | null> => {
        try {
            const personSettings = await churchtoolsClient.get<PersonSetting | null>(`/persons/${id}/settings/global/station`);
            return Number(personSettings?.value);
        } catch (error) {
            console.error('Error fetching person settings:', error);
            return null;
        }
    };

</script>