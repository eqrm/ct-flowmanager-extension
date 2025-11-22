<template>
<!--
    <Tabs value="1">
        <TabList>
            <Tab value="1">Flow Manager</Tab>
        </TabList>
        <TabPanels>
            <TabPanel value="1"> 
-->
                <FlowTable :flow-id="FLOW_GROUP_IDS[0]"/>
<!--
            </TabPanel>
        </TabPanels>
    </Tabs>
-->
</template>


<script setup lang="ts">
    import '../types/flow.ts';
    import 'primeflex/primeflex.css'
 /*   import Tabs from 'primevue/tabs';
    import TabList from 'primevue/tablist';
    import Tab from 'primevue/tab';
    import TabPanels from 'primevue/tabpanels';
    import TabPanel from 'primevue/tabpanel'; */
    import FlowTable from './FlowTable.vue'; 
import { FLOW_CONFIG, FLOW_GROUP_IDS, FLOW_INITIALS } from '../types/flow.ts';
</script>