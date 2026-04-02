
/**
 * Parameterdefinition einer Flow-Aktion.
 */
export type FlowActionsApiParameter = {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    constraints?: Record<string, unknown>;
};

/**
 * Repräsentiert eine aus der Flow-API geladene Aktion.
 */
export type FlowActionsApiAction = {
    id: string;
    action: string;
    title: string;
    description?: string;
    fromState?: string | null;
    targetState?: string | null;
    parameters?: Array<FlowActionsApiParameter>;
    url?: string;
    icon?: string;
};

/**
 * Metadaten eines aktiven Flows (`GET /flows`).
 */
export type FlowApiFlow = {
    id: string;
    name: string;
    label: string;
    description: string;
    icon: string;
    version: number;
    isActive: boolean;
};

/**
 * Flow-Zuordnung einer Person (`GET /flows/person/{personId}`).
 */
export type FlowApiPersonFlow = {
    id: string;
    name: string;
    label: string;
    flowGroupId: number;
    flowGroupName: string;
    stateKey: string;
};

/**
 * Body-Parameter fuer das Ausfuehren einer Flow-Aktion.
 */
export type RunFlowActionPayload = {
    groupId?: number;
    addComment?: string;
    [key: string]: unknown;
};

/**
 * Ergebnis des Ausfuehrens einer Flow-Aktion.
 */
export type RunFlowActionResult = {
    id?: string;
    action: string;
    fromState?: string | null;
    targetState?: string | null;
    state?: string;
    personId: number;
};

type FlowApiDataResponse<ResponseType> = {
    data: ResponseType;
};

/**
 * Antwortstruktur der Endpoint-Antwort für verfügbare Flow-Aktionen.
 */
export type FlowActionsApiResponse = {
    data: Array<FlowActionsApiAction>;
};

/**
 * Grundkonfiguration des FlowApiClient.
 */
type FlowApiClientConfig = {
    baseUrl?: string;
    version?: string;
    token?: string;
};

/**
 * Unterstützte Query-Parameter für GET-ähnliche Aufrufe.
 */
type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Optionale Einstellungen für generische Flow-API-Requests.
 */
type FlowApiRequestOptions = {
    headers?: HeadersInit;
    timeout?: number;
    needsAuthentication?: boolean;
    params?: QueryParams;
    expectsJson?: boolean;
};

/**
 * Singleton-HTTP-Client für die externe Flow-API.
 *
 * Bietet generische, typisierte Methoden (`get`, `post`, `patch`, `put`, `deleteApi`)
 * sowie Flow-spezifische Komfortmethoden fuer:
 * - aktive Flows
 * - Flow-Zuordnungen einer Person
 * - verfuegbare Aktionen einer Person
 * - Ausfuehren von Flow-Aktionen
 */
class FlowApiClient {
    private static instance: FlowApiClient | null = null;
    private baseUrl = 'https://app.dev.eqrm.de/api';
    private version = 'v1';
    private token: string | null = null;

    private constructor() {}

    /**
     * Liefert die Singleton-Instanz des Clients.
     */
    public static getInstance(): FlowApiClient {
        if (!FlowApiClient.instance) {
            FlowApiClient.instance = new FlowApiClient();
        }
        return FlowApiClient.instance;
    }

    /**
     * Aktualisiert Basis-URL und/oder Zugriffstoken.
     *
     * Die Basis-URL wird normalisiert (kein abschliessender Slash).
     */
    public configure(config: FlowApiClientConfig): void {
        if (config.baseUrl) {
            this.baseUrl = config.baseUrl.replace(/\/$/, '');
        }
        if (config.version) {
            this.version = config.version.replace(/^\/+|\/+$/g, '');
        }
        if (config.token) {
            this.token = config.token;
        }
    }

    /**
     * Gibt an, ob aktuell ein Auth-Token gesetzt ist.
     */
    public isTokenConfigured(): boolean {
        return this.token !== null;
    }

    /**
     * Entfernt das aktuell gespeicherte Auth-Token.
     */
    public clearToken(): void {
        this.token = null;
    }

    /**
     * Führt einen typisierten GET-Request aus.
     */
    public async get<ResponseType>(
        uri: string, 
        options?: FlowApiRequestOptions
    ): Promise<ResponseType> {
        return await this.request<ResponseType>('GET', uri, undefined, options);
    }

    /**
     * Führt einen typisierten POST-Request aus.
     */
    public async post<ResponseType, RequestType = Record<string, unknown>>(
        uri: string,
        data?: RequestType,
        options?: FlowApiRequestOptions,
    ): Promise<ResponseType> {
        return await this.request<ResponseType, RequestType>('POST', uri, data, options);
    }

    /**
     * Führt einen typisierten PATCH-Request aus.
     */
    public async patch<ResponseType, RequestType = Record<string, unknown>>(
        uri: string,
        data?: RequestType,
        options?: FlowApiRequestOptions,
    ): Promise<ResponseType> {
        return await this.request<ResponseType, RequestType>('PATCH', uri, data, options);
    }

    /**
     * Führt einen typisierten PUT-Request aus.
     */
    public async put<ResponseType, RequestType = Record<string, unknown>>(
        uri: string,
        data: RequestType,
        options?: FlowApiRequestOptions,
    ): Promise<ResponseType> {
        return await this.request<ResponseType, RequestType>('PUT', uri, data, options);
    }

    /**
     * Führt einen typisierten DELETE-Request aus.
     */
    public async deleteApi<ResponseType, RequestType = Record<string, unknown>>(
        uri: string,
        data?: RequestType,
        options?: FlowApiRequestOptions,
    ): Promise<ResponseType> {
        return await this.request<ResponseType, RequestType>('DELETE', uri, data, options);
    }

    /**
     * Liefert das konfigurierte Token oder wirft einen Fehler, wenn keines gesetzt ist.
     */
    private requireToken(): string {
        if (!this.token) {
            throw new Error('flowApiClient ist nicht konfiguriert: kein Token gesetzt.');
        }
        return this.token;
    }

    /**
     * Baut aus Base-URL, Endpoint und optionalen Query-Parametern eine vollstaendige URL.
     */
    private buildUrl(uri: string, params?: QueryParams): string {
        const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
        const normalizedVersion = this.version.replace(/^\/+|\/+$/g, '');
        const normalizedPath = uri.startsWith('/') ? uri : `/${uri}`;
        const url = new URL(`${cleanBaseUrl}/${normalizedVersion}${normalizedPath}`);

        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value === null || value === undefined) {
                    continue;
                }
                url.searchParams.set(key, String(value));
            }
        }

        return url.toString();
    }

    /**
     * Baut Request-Header mit Standardwerten und optionaler Bearer-Authentifizierung.
     */
    private buildHeaders(
        needsAuthentication: boolean,
        headers?: HeadersInit,
        hasBody?: boolean,
    ): Headers {
        const result = new Headers(headers);
        result.set('Accept', 'application/json');

        if (hasBody && !result.has('Content-Type')) {
            result.set('Content-Type', 'application/json');
        }

        if (needsAuthentication) {
            result.set('Authorization', `Bearer ${this.requireToken()}`);
        }

        return result;
    }

    /**
     * Zentrale Request-Funktion fuer alle HTTP-Methoden.
     *
     * - optionaler Timeout via `AbortController`
     * - automatische JSON-Serialisierung fuer Body-Daten
     * - konsistente Fehlerbehandlung mit HTTP-Status und Response-Text
     * - bei `204 No Content` oder nicht-JSON-Antworten wird `undefined` zurueckgegeben
     */
    private async request<ResponseType, RequestType = unknown>(
        method: string,
        uri: string,
        data?: RequestType,
        options?: FlowApiRequestOptions,
    ): Promise<ResponseType> {
        const needsAuthentication = options?.needsAuthentication !== false;
        const expectsJson = options?.expectsJson !== false;
        const hasBody = data !== undefined;
        const timeout = options?.timeout;
        const controller = timeout ? new AbortController() : undefined;
        const timeoutId = timeout && controller
            ? setTimeout(() => controller.abort(), timeout)
            : undefined;

        try {
            const response = await fetch(this.buildUrl(uri, options?.params), {
                method,
                headers: this.buildHeaders(needsAuthentication, options?.headers, hasBody),
                body: hasBody ? JSON.stringify(data) : undefined,
                signal: controller?.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Flow API ${method} ${uri} failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`,
                );
            }

            if (response.status === 204) {
                return undefined as ResponseType;
            }

            if (!expectsJson) {
                return undefined as ResponseType;
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    `Flow API ${method} ${uri} returned non-JSON response (${contentType || 'unknown content-type'}).`,
                );
            }

            return await response.json() as ResponseType;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    /**
     * Extrahiert das `data`-Feld aus Standardantworten und validiert das Grundformat.
     */
    private unwrapData<ResponseType>(
        response: FlowApiDataResponse<ResponseType>, 
        uri: string)
    : ResponseType {
        if (!response || !('data' in response)) {
            throw new Error(`Flow API GET ${uri} returned an invalid payload (missing data field).`);
        }

        return response.data;
    }

    /**
     * Laedt alle aktiven Flows (`GET /flows`).
     */
    public async listFlows(): Promise<Array<FlowApiFlow>> {
        const endpoint = '/flows';
        const response = await this.get<FlowApiDataResponse<Array<FlowApiFlow>>>(endpoint);
        return this.unwrapData(response, endpoint);
    }

    /**
     * Laedt alle Flows, in denen die Person aktuell enthalten ist (`GET /flows/person/{personId}`).
     */
    public async getPersonFlows(personId: number): Promise<Array<FlowApiPersonFlow>> {
        const endpoint = `/flows/person/${personId}`;
        const response = await this.get<FlowApiDataResponse<Array<FlowApiPersonFlow>>>(endpoint);
        return this.unwrapData(response, endpoint);
    }

    /**
     * Laedt die verfuegbaren Aktionen einer Person fuer einen bestimmten Flow.
     */
    public async getFlowActions(
        userId: number, 
        flowId: string
    ): Promise<Array<FlowActionsApiAction>> {
        const endpoint = `/flows/${encodeURIComponent(flowId)}/person/${userId}/actions`;
        const response = await this.get<FlowActionsApiResponse>(endpoint);
        const actions = this.unwrapData(response, endpoint);
        return Array.isArray(actions) ? actions : [];
    }

    /**
     * Loest eine konkrete Flow-Aktion fuer eine Person aus.
     *
     * Der Request-Body kann action-abhaengige Parameter enthalten, z.B. `groupId`
     * oder `addComment` (siehe `FlowActionsApiAction.parameters`).
     */
    public async runFlowAction(
        userId: number,
        flowId: string,
        actionId: string,
        payload?: RunFlowActionPayload,
    ): Promise<RunFlowActionResult> {
        const endpoint = `/flows/${encodeURIComponent(flowId)}/person/${userId}/actions/${encodeURIComponent(actionId)}`;
        const response = await this.post<FlowApiDataResponse<RunFlowActionResult>, RunFlowActionPayload>(
            endpoint,
            payload,
        );

        return this.unwrapData(response, endpoint);
    }

}

/**
 * Exportierte Singleton-Instanz des FlowApiClient.
 */
export const flowApiClient = FlowApiClient.getInstance();
