import type { GroupMember, Group } from '../utils/ct-types';

export type TableDataSet = {
    person: GroupMember;
    flow: Array<GroupMember>;
    connect: Array<GroupMember>;
    subFlows: Array<GroupMember>;
    connectLeaders: Array<GroupMember>;
    latestJoinDate?: Date | null;
    equip: Array<GroupMember>;
    teams: Array<GroupMember>;
    groups: Array<GroupMember>;
};

export type SubFlowStep = Group & {
    parentIds?: number[];
    childrenIds?: number[];
};

// Flow Configuration Constants
export const FLOW_CONFIG = {
    CONNECT_GROUPTYPE_ID: 16,
    CONNECT_LEADERS_ROLE_ID: 103,
    CONNECT_MEMBERS_ROLE_ID: 100,
    FLOW_MEMBERS_ROLE_ID: 49,
    GROUP_TYPE_ID_FLOW: 8,
    GROUP_TYPE_ID_MERKMAL: 4,
    GROUP_TYPE_ID_GROUP: 1,
    GROUP_TYPE_ID_TEAM: 2,
    TAG_AUTOGROUP_ID: 41,
    TAG_KOPFGRUPPE_ID: 74,
    FLOW_ID_EQUIP: 2752,
    FLOW_ID_TEAMS: 2755,
    FLOW_ID_GROUPS: 2764,
} as const;

// Flow Group IDs (!0New - !6Friend)
export const FLOW_GROUP_IDS = [671, 674, 677, 680, 683, 686, 1046] as const;

// Flow ID to Level mapping
export const FLOW_INITIALS: Record<number, '!0' | '!1' | '!2' | '!3' | '!4' | '!5' | '!6'> = {
    671: '!0',
    674: '!1',
    677: '!2',
    680: '!3',
    683: '!4',
    686: '!5',
    1046: '!6'
} as const;

// Equip Group IDs (Equip 1-4)
export const EQUIP_IDS = [1249, 1252, 1255, 1258] as const;

// Equip ID to Level mapping
export const EQUIP_INITIALS: Record<EquipId, '1' | '2' | '3' | '4'> = {
    1249: '1',
    1252: '2', 
    1255: '3',
    1258: '4'
} as const;

// Type guards for better type safety
export type FlowGroupId = typeof FLOW_GROUP_IDS[number];
export type EquipId = typeof EQUIP_IDS[number];

// Generische Funktion für Membership-Status-Mapping
export const createMembershipStatus = <T extends Record<number, string>>(
    dataSet: TableDataSet,
    masterItems: Array<Group> | undefined,
    labelMapping: T,
    membershipProperty: keyof TableDataSet
) => {
    return masterItems?.map(masterItem => {
        const membershipList = dataSet[membershipProperty] as Array<GroupMember>;
        const membership = membershipList.find(member => {
            return Number(member.group.domainIdentifier) === masterItem.id;
        });
        const joinDate = membership?.memberStartDate;
        
        // Check if group has the auto-group tag (ID 41)
        const isAutoGroup = masterItem.tags?.some(tag => tag.id === FLOW_CONFIG.TAG_AUTOGROUP_ID) ?? false;
        
        return {
            id: masterItem.id,
            name: masterItem.name,
            isAutoGroup,
            label: labelMapping[masterItem.id as keyof T] || '?',
            tooltip: masterItem.name + (joinDate ? ` (seit ${new Date(joinDate).toLocaleDateString('de-DE')})` : ''),
            severity: membership ? 'info' : null,
            isMember: !!membership,
            editable: !isAutoGroup,
        };
    }) || [];
};

