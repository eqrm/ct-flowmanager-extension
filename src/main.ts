import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { PersonMasterData, Group, GroupMember, Person, GroupHierarchy } from './utils/ct-types';
import { FLOW_GROUP_IDS, EQUIP_IDS, FLOW_CONFIG, type SubFlowStep } from './types/flow';
import { createApp, ref } from 'vue';
import App from './Vues/App.vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import Tooltip from 'primevue/tooltip';


// only import reset.css in development mode to keep the production bundle small and to simulate CT environment
if (import.meta.env.MODE === 'development') {
    import('./utils/reset.css');
}

declare const window: Window &
    typeof globalThis & {
        settings: {
            base_url?: string;
        };
    };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

if (import.meta.env.MODE === 'development') {
    churchtoolsClient.enableCrossOriginRequests();
}

const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;
if (import.meta.env.MODE === 'development' && username && password) {
    await churchtoolsClient.post('/login', { username, password });
}

const KEY = import.meta.env.VITE_KEY;
export { KEY };

try {
    //  --------------------------------------------------------------------------
    //  Whoami aufrufen, um die Authentifizierung zu testen
    //  --------------------------------------------------------------------------
    console.log('Loading whoami...');
    const whoami = ref<Person | null>(null);
    whoami.value = await churchtoolsClient.get<Person>('/whoami');

    //  --------------------------------------------------------------------------
    //  Masterdata laden
    //  --------------------------------------------------------------------------
    console.log('Loading masterdata...');
    const masterdata = ref<PersonMasterData | null>(null)
    masterdata.value = await churchtoolsClient.get<PersonMasterData>('/person/masterdata');

    //  --------------------------------------------------------------------------
    //  Flow-Gruppen laden
    //  --------------------------------------------------------------------------
    console.log('Loading flow groups...');  
    const flowGroups : Array<SubFlowStep> = await churchtoolsClient.getAllPages<Array<Group>>('/groups', { 
        include: ['tags'], 
        group_type_ids: [FLOW_CONFIG.GROUP_TYPE_ID_FLOW] })
        .then(results => results.flat());

    console.log('Loading flow group hierarchies...');
    const hierarchies = await churchtoolsClient.get<Array<GroupHierarchy>>('/groups/hierarchies', {
        group_type_ids: [FLOW_CONFIG.GROUP_TYPE_ID_FLOW]
    })

    //  Gruppentypen filtern
    const allMasterFlowSteps = ref<Array<Group> | null>(null);      //  Alle Tags !0 - !6
    const allSubFlowSteps = ref<Array<SubFlowStep> | null>(null);   //  Alle Sub-Flow-Steps, z.B. '#Equip Potential'
    const allSubFlows = ref<Array<SubFlowStep> | null>(null);       //  Alle Sub-Flows, z.B. 'Flow Equip'
    allMasterFlowSteps.value = flowGroups.filter(g => (FLOW_GROUP_IDS as readonly number[]).includes(g.id)) as Array<Group>;
    allSubFlows.value = flowGroups.filter(g => g.tags?.some(tag => tag.id === FLOW_CONFIG.TAG_KOPFGRUPPE_ID)) as Array<SubFlowStep>;
    allSubFlowSteps.value = flowGroups.filter(g => ! (allMasterFlowSteps.value!.some(mf => mf.id === g.id) || allSubFlows.value!.some(sf => sf.id === g.id))) as Array<SubFlowStep>;

    //  Parent-Child-Beziehungen zuweisen
    allSubFlows.value.forEach(subFlow => {
        const hierarchy = hierarchies.find(h => h.groupId === subFlow.id);
        if (hierarchy) {
            subFlow.childrenIds = hierarchy.children;
            subFlow.parentIds = undefined;
        }});
    allSubFlowSteps.value.forEach(subFlowStep => {
        const hierarchy = hierarchies.find(h => h.groupId === subFlowStep.id);
        if (hierarchy) {
            subFlowStep.parentIds = hierarchy.parents.filter(p => allSubFlows.value!.some(sf => sf.id === p));
            subFlowStep.childrenIds = undefined;
        }});

    //  --------------------------------------------------------------------------
    //  Equip-Gruppen laden
    //  --------------------------------------------------------------------------
    console.log('Loading equip groups...');
    const allEquipSteps = ref<Array<Group> | null>(null)
    allEquipSteps.value = await churchtoolsClient.getAllPages<Array<Group>>('/groups', { 
        ids: EQUIP_IDS, 
        include: ['tags'] })
        .then(results => results.flat());

    //  --------------------------------------------------------------------------
    //  Connect-Gruppen laden (für Connector-Auswahl)
    //  --------------------------------------------------------------------------
    console.log('Loading connect groups...');
    const connectGroups = ref<Array<Group> | null>(null)
    connectGroups.value = await churchtoolsClient.getAllPages<Array<Group>>('/groups', { 
        group_type_ids: [FLOW_CONFIG.CONNECT_GROUPTYPE_ID], 
        include: ['tags'] })
        .then(results => results.flat());

    console.log('Loading connect group leaders...');
    const allConnectGroupLeaders = ref<Array<GroupMember> | null>(null);
    allConnectGroupLeaders.value = await Promise.all(
        connectGroups.value!.map(async (group) => {
            const leaders = await churchtoolsClient.getAllPages<Array<GroupMember>>(`/groups/${group.id}/members`, {
                role_ids: [FLOW_CONFIG.CONNECT_LEADERS_ROLE_ID]
            }).then(results => results.flat());
            return leaders;
        })
    ).then(arrays => arrays.flat());

    //  --------------------------------------------------------------------------
    //  Vue App initialisieren
    //  --------------------------------------------------------------------------
    console.log('Initializing Vue app...');
    const app = createApp(App);
    app.use(PrimeVue, {
        theme: {
            preset: Aura
        }
    });
    app.provide('contactLabels', masterdata.value?.contactLabels);
    app.provide('groupCategories', masterdata.value?.groupCategories);
    app.provide('groupTypes', masterdata.value?.groupTypes);
    app.provide('campuses', masterdata.value?.campuses);
    app.provide('groupStatuses', masterdata.value?.groupStatuses);
    app.provide('allMasterFlowSteps', allMasterFlowSteps.value);
    app.provide('allSubFlowSteps', allSubFlowSteps.value);
    app.provide('allSubFlows', allSubFlows.value);
    app.provide('allEquipSteps', allEquipSteps.value);
    app.provide('allConnectGroupLeaders', allConnectGroupLeaders.value);
    app.provide('whoami', whoami.value);
    app.directive('tooltip', Tooltip);
    app.mount('#app');

} catch (error) {
    console.error('Error loading initial data:', error);
}

