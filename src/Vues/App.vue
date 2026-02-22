<template>
<!--    <Tabs value="1">
        <TabList>
            <Tab value="1">Flow Manager</Tab>
            <Tab value="2">Equip</Tab>
            <Tab value="3">Flow Control</Tab>
        </TabList>
        <TabPanels>
            <TabPanel value="1">  -->
                <FlowTable :flow-id="FLOW_GROUP_IDS[0]"/>
<!--            </TabPanel>
            <TabPanel value="2">
                <EquipDataView />
            </TabPanel>
            <TabPanel value="3">
                <FlowController
                    title="Flow Control"
                    :load-actions="loadFlowControlActions"
                />
            </TabPanel>
        </TabPanels>
    </Tabs> -->
</template>


<script setup lang="ts">
    import '../types/flow.ts';
    import 'primeflex/primeflex.css'
    import Tabs from 'primevue/tabs';
    import TabList from 'primevue/tablist';
    import Tab from 'primevue/tab';
    import TabPanels from 'primevue/tabpanels';
    import TabPanel from 'primevue/tabpanel';
    import FlowController from './FlowController.vue';
    import FlowTable from './FlowTable.vue'; 
    import EquipDataView from './EquipDataView.vue';
    import { FLOW_GROUP_IDS } from '../types/flow.ts';

    type FlowAction = {
        action: () => void;
        label: string;
        icon: string;
    };

    const loadFlowControlActions = (): FlowAction[] => {
        return [
            {
                action: () => console.log('FlowControl: Aktion 1 ausgeführt'),
                label: 'Aktion 1',
                icon: 'pi pi-play',
            },
            {
                action: () => console.log('FlowControl: Aktion 2 ausgeführt'),
                label: 'Aktion 2',
                icon: 'pi pi-play',
            },
        ];
    };
</script>