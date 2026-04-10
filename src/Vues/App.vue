<template>
<!--    <Tabs value="1">
        <TabList>
            <Tab value="1">Flow Manager</Tab>
            <Tab value="2">Equip</Tab>
            <Tab value="3">Flow Control</Tab>
        </TabList>
        <TabPanels>
            <TabPanel value="1">  -->
                <FlowTable :commitmentId="COMMITMENT_GROUP_IDS[0]"/>
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
    import FlowTable from './FlowTable.vue'; 
    import { COMMITMENT_GROUP_IDS } from '../types/flow.ts';

</script>