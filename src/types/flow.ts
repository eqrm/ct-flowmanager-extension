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
    events: Array<GroupMember>;
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
    GROUP_TYPE_ID_EVENT: 7,
    GROUP_STATUS_ACTIVE: 1,
    GROUP_STATUS_PENDING: 2,
    GROUP_STATUS_ARCHIVED: 3,
    GROUP_STATUS_FINISHED: 4,
    TAG_AUTOGROUP_ID: 41,
    TAG_KOPFGRUPPE_ID: 74,
    FLOW_ID_EQUIP: 2752,
    FLOW_ID_TEAMS: 2755,
    FLOW_ID_GROUPS: 2764,
    FLOW_ID_TAUFE: 2758,
    FLOW_ID_OFFBOARDING: 2761,
} as const;

export type EqrmAppFlowType =
    | 'egroups'
    | 'teamconnect'
    | 'taufe'
    | 'offboarding'
    | 'equip';

export const EQRM_APP_CONFIG = {
    BASE_URL: 'https://app.eqrm.de/',
    FLOW_URL: 'flows/start-flow',
    FLOW_PARAM_FLOW: 'flow',
    FLOW_PARAM_VALUE_EGROUPS: 'egroups',
    FLOW_PARAM_VALUE_TEAMS: 'teamconnect',
    FLOW_PARAM_VALUE_TAUFE: 'taufe',
    FLOW_PARAM_VALUE_OFFBOARDING: 'offboarding',
    FLOW_PARAM_VALUE_EQUIP: 'equip',
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

export type FlowStepDefinition = {
    id: number;
    name: string;
    initials: string;
    flowId: number;
    equipId?: number;
    eventId?: number;
};

export type FlowStepConfig = {
    flowId: number;
    steps: readonly FlowStepDefinition[];
};

export const EQUIP_STEP_CONFIG: FlowStepConfig = {
    flowId: FLOW_CONFIG.FLOW_ID_EQUIP,
    steps: [
        {
            id: 0,
            name: 'Equip Potential',
            initials: 'P',
            flowId: 1698,
        },
        {
            id: 1,
            name: 'Equip 1',
            initials: '1',
            flowId: 1701,
            equipId: 1249,
            eventId: 2286,
        },
        {
            id: 2,
            name: 'Equip 2',
            initials: '2',
            flowId: 1704,
            equipId: 1252,
            eventId: 2289,
        },
        {
            id: 3,
            name: 'Equip 3',
            initials: '3',
            flowId: 1707,
            equipId: 1255,
            eventId: 2292,
        },
        {
            id: 4,
            name: 'Equip 4',
            initials: '4',
            flowId: 1710,
            equipId: 1258,
            eventId: 2423,
        },
        {
            id: 5,
            name: 'Equip Review',
            initials: 'R',
            flowId: 1713,
        },
    ],
};



// Type guards for better type safety
export type FlowGroupId = typeof FLOW_GROUP_IDS[number];
export type EquipId = NonNullable<(typeof EQUIP_STEP_CONFIG.steps)[number]['equipId']>;
export type EquipEventId = NonNullable<(typeof EQUIP_STEP_CONFIG.steps)[number]['eventId']>;
export type EquipFlowGroupId = (typeof EQUIP_STEP_CONFIG.steps)[number]['flowId'];


export type EquipFlowStepStatus = "Potential" | "Angemeldet" | "Absolviert";

export type EquipFlowStepStatusData = {
    status: EquipFlowStepStatus;
    datum?: Date;
    info?: string;
};

export type EquipFlowStep = {
    id: EquipId;
    name: string;
    status: Array<EquipFlowStepStatusData>;
};

/**
 * Generiert eine vollständige URL zum Starten eines Flows in der EQRM-App.
 * 
 * Diese Hilfsfunktion erstellt Links zu verschiedenen Flow-Typen (eGroups, TeamConnect, 
 * Taufe, Offboarding, Equip) in der externen EQRM-Anwendung. Die generierten URLs
 * können direkt für Buttons oder Links verwendet werden, die Flows in einem neuen Tab öffnen.
 * 
 * @param flowType - Der Typ des zu startenden Flows
 *                   ('egroups' | 'teamconnect' | 'taufe' | 'offboarding' | 'equip')
 * 
 * @returns Vollständige URL zum Flow-Start in der EQRM-App
 * 
 * @example
 * ```typescript
 * const equipUrl = getAppLinkForFlow('equip');
 * // => 'https://app.eqrm.de/flows/start-flow?flow=equip'
 * 
 * const groupsUrl = getAppLinkForFlow('egroups');
 * // => 'https://app.eqrm.de/flows/start-flow?flow=egroups'
 * ```
 * 
 * @example
 * ```vue
 * <Button 
 *   :href="getAppLinkForFlow('teamconnect')" 
 *   as="a"
 *   target="_blank"
 * />
 * ```
 */
export const getAppLinkForFlow = (flowType: EqrmAppFlowType): string => {
    let baseUrl = EQRM_APP_CONFIG.BASE_URL;
    let flowUrl = EQRM_APP_CONFIG.FLOW_URL;
    let flowParam = EQRM_APP_CONFIG.FLOW_PARAM_FLOW;
    return `${baseUrl}${flowUrl}?${flowParam}=${flowType}`;
};

/**
 * Erstellt eine strukturierte Darstellung des Mitgliedschaftsstatus für eine Liste von Gruppen.
 * 
 * Diese generische Funktion mappt Gruppen-Metadaten auf ein UI-freundliches Format,
 * das den Mitgliedschaftsstatus, Labels, Tooltips und Editierbarkeit enthält.
 * Sie wird verwendet, um Flow-, Equip-, Team- und andere Gruppenmitgliedschaften
 * für die Anzeige in der UI (z.B. als Tags oder Avatare) aufzubereiten.
 * 
 * @template T - Record-Typ für das Label-Mapping (z.B. `Record<number, '!0' | '!1' | ...>`)
 * 
 * @param dataSet - Das vollständige Datensatz-Objekt einer Person mit allen Mitgliedschaften
 * @param masterItems - Liste aller verfügbaren Gruppen (z.B. alle Flow-Schritte oder Equip-Levels)
 * @param labelMapping - Mapping von Gruppen-ID zu Anzeige-Label (z.B. `{ 671: '!0', 674: '!1' }`)
 * @param membershipProperty - Property-Name im dataSet, das die zu prüfenden Mitgliedschaften enthält
 *                            (z.B. 'flow', 'equip', 'teams')
 * 
 * @returns Array von Status-Objekten mit folgenden Properties:
 * - `id`: Gruppen-ID
 * - `name`: Gruppenname
 * - `isAutoGroup`: `true`, wenn Gruppe automatisch verwaltet wird (Tag ID 41)
 * - `label`: Kurzes Anzeige-Label (z.B. '!2', '3')
 * - `tooltip`: Vollständiger Tooltip-Text mit Name und optional Beitrittsdatum
 * - `severity`: PrimeVue-Severity ('info' bei Mitgliedschaft, `null` sonst)
 * - `isMember`: `true`, wenn Person in dieser Gruppe Mitglied ist
 * - `editable`: `false` bei Auto-Gruppen, sonst `true` (ermöglicht UI-Kontrolle)
 * 
 */
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






