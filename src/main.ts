import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { PersonMasterData, Group, GroupMember, Person } from './utils/ct-types';
import { FLOW_GROUP_IDS, EQUIP_IDS, FLOW_CONFIG } from './types/flow';
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
    //  Whoami aufrufen, um die Authentifizierung zu testen
    const whoami = ref<Person | null>(null);
    whoami.value = await churchtoolsClient.get<Person>('/whoami');

    //  Masterdata laden
    const masterdata = ref<PersonMasterData | null>(null)
    masterdata.value = await churchtoolsClient.get<PersonMasterData>('/person/masterdata');

    //  Flow-Gruppen laden
    const allMasterFlowSteps = ref<Array<Group> | null>(null)
    const allSubFlowSteps = ref<Array<Group> | null>(null)
    
    const flowGroups = (await churchtoolsClient.getAllPages<Array<Group>>('/groups', { 
        include: ['tags'], 
        group_type_ids: [FLOW_CONFIG.GROUP_TYPE_ID_FLOW] }))
        .flat();
    allMasterFlowSteps.value = flowGroups.filter(g => (FLOW_GROUP_IDS as readonly number[]).includes(g.id));
    allSubFlowSteps.value = flowGroups.filter(g => ! (FLOW_GROUP_IDS as readonly number[]).includes(g.id));

    //  Equip-Gruppen laden
    const allEquipSteps = ref<Array<Group> | null>(null)
    allEquipSteps.value = (await churchtoolsClient.getAllPages<Array<Group>>('/groups', { 
        ids: EQUIP_IDS, 
        include: ['tags'] }))
        .flat();

    //  Connect-Gruppen laden (für Connector-Auswahl)
    const connectGroups = ref<Array<Group> | null>(null)
    connectGroups.value = (await churchtoolsClient.getAllPages<Array<Group>>('/groups', { 
        group_type_ids: [FLOW_CONFIG.CONNECT_GROUPTYPE_ID], 
        include: ['tags'] }))
        .flat();

    const allConnectGroupLeaders = ref<Array<GroupMember> | null>(null);
    allConnectGroupLeaders.value = await Promise.all(
        connectGroups.value.map(async (group) => {
            const leaders = (await churchtoolsClient.getAllPages<Array<GroupMember>>(`/groups/${group.id}/members`, {
                role_ids: [FLOW_CONFIG.CONNECT_LEADERS_ROLE_ID]
            })).flat();
            return leaders;
        })
    ).then(arrays => arrays.flat());

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
    app.provide('allEquipSteps', allEquipSteps.value);
    app.provide('allConnectGroupLeaders', allConnectGroupLeaders.value);
    app.provide('whoami', whoami.value);
    app.directive('tooltip', Tooltip);
    app.mount('#app');

} catch (error) {
    console.error('Error loading initial data:', error);
}

