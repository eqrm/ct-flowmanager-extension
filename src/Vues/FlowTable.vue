<template class="p-fluid">
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
            field="flow" 
            :showFilterMenu="true" 
            :showFilterMatchModes="false">
            <template #header>
                <div class ="flex flex-column mr-2">
                    <strong>Flow</strong>
                    <strong v-if="selectedFlowLabel">({{ selectedFlowLabel }})</strong>
                </div>
            </template>
            <template #body="slotProps">
                <AvatarDataColumn
                    :data="slotProps.data"
                    :master-data="allMasterFlowSteps"
                    :level-mapping="FLOW_INITIALS"
                    data-property="flow"
                />
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <Select 
                    v-model="filterModel.value" 
                    @change="filterCallback()" 
                    :options="allMasterFlowSteps" 
                    placeholder="Select One" 
                    style="min-width: 12rem" 
                    :showClear="true" 
                    optionLabel="name" 
                    optionValue="id">
                    <template #option="slotProps">
                        <Tag :value="slotProps.option.name"/>
                    </template>
                </Select>
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
                        <Avatar 
                            :label="leader.person.initials" 
                            v-tooltip.bottom="fullName(leader)"/>
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
   
   <!-- Dialog mit den Details der ausgewählten Zeile -->
   <FlowPersonDetails
     v-if="personDialogVisible && selectedRow"
     v-model:visible="personDialogVisible"
     :data="selectedRow"
     :connectLeaders="connectGroupSetInstance.allConnectGroupLeaders"
   />    
</template>

<script lang="ts" setup>
    import type { Group, GroupMember, MetaPagination } from '../utils/ct-types';
    import type { PageResponse } from '@churchtools/churchtools-client/dist/churchtoolsClient';
    import { churchtoolsClient } from '@churchtools/churchtools-client';
    import type { SubFlowStep, TableDataSet } from '../types/flow';
    import { FLOW_CONFIG, FLOW_GROUP_IDS, EQUIP_IDS, FLOW_INITIALS, EQUIP_INITIALS } from '../types/flow';
    import { FilterMatchMode } from '@primevue/core/api';
    import { ref, watch, onMounted, computed, inject } from 'vue';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import Button from 'primevue/button';
    import Avatar from 'primevue/avatar';
    import Tag from 'primevue/tag';
    import Select from 'primevue/select';
    import FlowPersonDetails from './FlowPersonDetails.vue';
    import AvatarDataColumn from './AvatarDataColumn.vue';

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

    const personDialogVisible = ref(false);
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

    const selectedFlowId = computed(() => filters.value.flow.value as number | null);

    // --- Neu: human-readable Label für den aktuellen Flow-Filter ---
    const selectedFlowLabel = computed(() => {
        const id = selectedFlowId.value;
        if (!id) return '–';
        const item = allMasterFlowSteps?.find(step => Number(step.id) === Number(id));
        return item?.name ?? String(id);
    });

    const onServerSort = (event: any) => {
        serverSortField.value = event.sortField;
        serverSortOrder.value = event.sortOrder;
    };

    const fetchData = async (event: DataTablePageEvent) => {
        loading.value = true;
        try {            
            const sortField = orderFields[serverSortField.value] ?? 'person_lastName';
            const sortDir = orderDirections[String(serverSortOrder.value) as '1' | '-1'];
            const flowGroupId = selectedFlowId.value ?? FLOW_GROUP_IDS[0];
            const response = await churchtoolsClient.get<PageResponse<Array<GroupMember>>>(
                `/groups/${flowGroupId}/members`, {
                    page: event.page + 1, 
                    limit: event.rows, 
                    orderFields: [sortField], 
                    orderDirections: [sortDir]
                }, 
                true);
            const flowGroupMember = response.data.data;
            totalRecords.value = (response.data.meta as MetaPagination).pagination?.total || 0;

            const rows: TableDataSet[] = await Promise.all(
                flowGroupMember.map(async (groupMember) => {
                    const personGroups = await churchtoolsClient.get<Array<GroupMember>>(`/persons/${groupMember.person.domainIdentifier}/groups`);
                    const subFlowGroups = personGroups.filter(g => {
                        const isFlowType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_FLOW;
                        const isNotMainFlow = !FLOW_GROUP_IDS.includes(Number(g.group.domainIdentifier) as any);
                        return isFlowType && isNotMainFlow;
                    });
                    const flowGroups = personGroups.filter(g => {
                        const isFlowType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_FLOW;
                        const isMainFlow = FLOW_GROUP_IDS.includes(Number(g.group.domainIdentifier) as any);
                        return isFlowType && isMainFlow;
                    });
                    const equipGroups = personGroups.filter(g => {
                        const isEquipType = g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_MERKMAL;
                        const isEquipGroup = EQUIP_IDS.includes(Number(g.group.domainIdentifier) as any);                    
                        return isEquipType && isEquipGroup;
                    });
                    const connectGroups = personGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.CONNECT_GROUPTYPE_ID);
                    const flowGroupJoins = flowGroups.map(g => g.memberStartDate ? new Date(g.memberStartDate) : null);
                    const groups = personGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_GROUP);
                    const teams = personGroups.filter(g => g.group.domainAttributes.groupTypeId === FLOW_CONFIG.GROUP_TYPE_ID_TEAM);

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

    /**
     * Erstellt die ChurchTools Personen-URL für das PersonView-Modul.
     * 
     * @param personId - DomainIdentifier der Person
     * @returns Vollständige URL zum PersonView-Modul mit searchEntry-Parameter
     */
    const getPersonUrl = (personId: string): string => {
        return `https://eqrm.church.tools/?q=churchdb#PersonView/searchEntry:${personId}`;
    };

</script>