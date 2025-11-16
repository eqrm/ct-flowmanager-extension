import type { DomainObjectPerson } from './utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';

type PersonLogEntry = {
  date: string;
  domainId: number;
  domainType: 'person' | string;
  id: number;
  level: number;
  message: string;
  person: DomainObjectPerson;
  personId: number;
  personName: string;
  simulatePersonId: number | null;
  simulatePerson: DomainObjectPerson | null;
};

type ParsedLogEntry = {
  action?: ActionType;   // New | Deleting | Updating
  context?: string;      // Teil vor den Klammern
  groupName?: string;    // Gruppenname (aus G:'…' oder aus dem Kontext hinter dem 1. Token)
  groupId?: number;      // Gruppen-ID (aus G:'…'[#id] oder G123)
};

// Klar benannte Aktions-Typen
export const ActionType = {
  New: 'New',
  Deleting: 'Deleting',
  Updating: 'Updating',
} as const;
export type ActionType = typeof ActionType[keyof typeof ActionType];

export type KeyDateEntry = {
  date: string;   // ISO-String aus dem Log
  event: string;  // "Person angelegt" | "Datenschutzeinwilligung akzeptiert" | "Joined Group" | "Left Group" | "Getauft"
  details: string;
  groupId?: number;
};

// Systemnutzer, deren Logs optional ausgeblendet werden
const EXCLUDED_SYSTEM_USER_NAMES = new Set([
  'worker-user Systemuser',
  'System-Benutzer',
  'Systembenutzer',
  'Don Importer',
]);

/**
 * Lädt die Personen-Logs und erzeugt daraus Key-Date-Einträge.
 */
export async function fetchPersonDetailsLogs(
  personIdNum: number,
  getPersonDetails = false,   // getPersonDetails-Messages einschließen?
  includeSystemUser = false   // Systembenutzer-Messages einschließen?
): Promise<KeyDateEntry[]> {
  if (!personIdNum) return [];

  try {
    const apiLogs = (await churchtoolsClient.oldApi(
      'churchdb/ajax',
      'getPersonDetailsLogs',
      { id: personIdNum }
    )) as PersonLogEntry[];

    const filteredLogs = apiLogs
      .filter(l => getPersonDetails || !l.message.includes('getPersonDetails'))
      .filter(l => includeSystemUser || !EXCLUDED_SYSTEM_USER_NAMES.has(l.personName))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return buildKeyDateEntries(filteredLogs);
  } catch (error) {
    console.error('Fehler beim Laden der Person-Logs:', error);
    return [];
  }
}

// ---------------------------------------------------------
// Parser
// ---------------------------------------------------------

/**
 * Parst eine Log-Nachricht und extrahiert nur die relevanten Informationen
 * für Key-Dates: action, context, groupName.
 */
function parseGroupActionMessage(input: unknown): ParsedLogEntry {
  const raw = typeof input === 'string' ? input.trim() : String(input ?? '').trim();
  const parsed: ParsedLogEntry = {};
  if (!raw) return parsed;

  // Action (New|Deleting|Updating)
  const actionMatch = raw.match(/^([A-Za-z]+)\s*:\s*/);
  if (actionMatch) {
    switch (actionMatch[1].toLowerCase()) {
      case 'new': parsed.action = ActionType.New; break;
      case 'deleting': parsed.action = ActionType.Deleting; break;
      case 'updating': parsed.action = ActionType.Updating; break;
    }
  }

  // Kontext (vor erster Klammer) und Klammerinhalt
  const rest = actionMatch ? raw.slice(actionMatch[0].length).trim() : raw;
  const openIdx = rest.indexOf('(');
  const closeIdx = rest.lastIndexOf(')');
  const context = openIdx > -1 ? rest.slice(0, openIdx).trim() : rest.trim();
  parsed.context = context;

  const inside = openIdx > -1 && closeIdx > openIdx ? rest.slice(openIdx + 1, closeIdx) : '';

  // Gruppenname aus Klammer (G:'…' oder G:"…")
  const gMatch = inside.match(/G\s*:\s*(?:"([^"]+)"|'([^']+)')/i);
  const groupFromBracket = gMatch ? (gMatch[1] ?? gMatch[2]) : undefined;

  // Gruppen-ID: entweder aus G:'…'[#123] oder kompaktes Format G123
  const gIdFromBracket = inside.match(/G\s*:\s*(?:"[^"]*"|'[^']*')\s*\[#(\d+)\]/i)?.[1];
  const gIdCompact = inside.match(/G\s*#?(\d+)/i)?.[1];
  const parsedGroupId = gIdFromBracket ?? gIdCompact;
  if (parsedGroupId) {
    const num = Number(parsedGroupId);
    if (!Number.isNaN(num)) parsed.groupId = num;
  }

  // Gruppenname aus Kontext: [groupType, ...groupNameTokens]
  const ctxTokens = context ? context.split(/\s+/) : [];
  const nameFromContext = ctxTokens.length > 1 ? ctxTokens.slice(1).join(' ').trim() : undefined;

  // Entscheidung:
  // - Updating: meist kein G:'…' → Name aus Kontext
  // - New/Deleting: bevorzugt G:'…', sonst Kontext
  parsed.groupName =
    parsed.action === ActionType.Updating
      ? (nameFromContext || groupFromBracket || undefined)
      : (groupFromBracket || nameFromContext || undefined);

  return parsed;
}

// ---------------------------------------------------------
// Hilfsfunktionen (Feldänderungen, Einwilligung, Taufe)
// ---------------------------------------------------------

const extractConsentSource = (message: string) =>
  message.match(/durch\s+(.+?)(?:[.\s]|$)/i)?.[1]?.trim() ?? '';

function matchFieldChangeInUpdate(message: string, field: string): { oldValue?: string; newValue?: string } | undefined {
  const re = new RegExp(`${escapeRegExp(field)}\\s*:\\s*'([^']*)'\\s*→\\s*'([^']*)'`);
  const m = message.match(re);
  return m ? { oldValue: m[1], newValue: m[2] } : undefined;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectBaptismFromUpdate(message: string): { place?: string } | null {
  const hasBaptismFlag =
    /getauft\s*:\s*'[^']*'\s*→\s*'1'/.test(message) ||
    /dateOfBaptism\s*:\s*'[^']*'\s*→\s*'\d{4}-\d{2}-\d{2}'/.test(message);
  if (!hasBaptismFlag) return null;
  const place = matchFieldChangeInUpdate(message, 'placeOfBaptism')?.newValue?.trim();
  return { place };
}

// ---------------------------------------------------------
// Key-Dates ableiten
// ---------------------------------------------------------

/**
 * Baut die Key-Date-Einträge aus den gefilterten/ sortierten Logs.
 */
function buildKeyDateEntries(logs: PersonLogEntry[]): KeyDateEntry[] {
  const result: KeyDateEntry[] = [];

  for (const log of logs) {
    const date = log.date;
    const message = log.message ?? '';
    const messageLower = message.toLowerCase();

    // Created
    if (/^neue person mit id/i.test(message) && /angelegt/i.test(message)) {
      result.push({ date, event: 'Person angelegt', details: '' });
      continue;
    }

    // Datenschutzeinwilligung
    if (messageLower.includes('datenschutz') && messageLower.includes('einwilligung') && messageLower.includes('akzeptiert')) {
      result.push({ date, event: 'Datenschutzeinwilligung akzeptiert', details: extractConsentSource(message) });
      continue;
    }

    // Getauft (aus Update-Log)
    if (messageLower.includes('updated:') && (messageLower.includes('getauft') || messageLower.includes('dateofbaptism') || messageLower.includes('placeofbaptism'))) {
      const baptism = detectBaptismFromUpdate(message);
      if (baptism) {
        result.push({ date, event: 'Getauft', details: baptism.place ?? '' });
        continue;
      }
    }

    // Gruppen-Events
    const parsed = parseGroupActionMessage(message);

    if (parsed.action === ActionType.New) {
      result.push({
        date,
        event: 'Joined Group',
        details: parsed.groupName ?? '',
        groupId: parsed.groupId,
      });
      continue;
    }

    if (parsed.action === ActionType.Deleting) {
      result.push({
        date,
        event: 'Left Group',
        details: parsed.groupName || (parsed.context ?? '').trim(),
        groupId: parsed.groupId,
      });
      continue;
    }

    // Updating erzeugt hier keine Key-Dates
  }

  // Älteste zuerst
  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return result;
}