declare const BASE_URL: string;
// APIClient class that handles all API calls directly
import { InteractionDefinition, AnyPayload, APIMethodMap } from './generated';
import { CustomAPIMethodMap, customEndpoints as generatedCustomEndpoints, NamespacedCustomEndpoints } from './custom-endpoints.generated';
import { querySchemaFactories, SafeParseResult } from './attributeQuery-zod.generated';

export interface RequestInterceptor {
  (config: RequestInit, url: string, interaction: string): RequestInit | Promise<RequestInit>;
}

export interface ResponseInterceptor {
  (response: Response, url: string, interaction: string): void | Promise<void>;
}

export interface ErrorInterceptor {
  (error: Error, url: string, interaction: string): void | Promise<void>;
}

// Define custom endpoint structure
export interface CustomEndpoint {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  // For custom endpoints, we'll pass the params directly to the body/query
}

export interface APIClientConfig {
  baseUrl?: string;
  userId?: string;
  requestInterceptor?: RequestInterceptor;
  responseInterceptor?: ResponseInterceptor;
  errorInterceptor?: ErrorInterceptor;
  interactions?: Record<string, InteractionDefinition>;
  customEndpoints?: NamespacedCustomEndpoints;
  /**
   * Enable runtime validation of query parameters using Zod schemas.
   * When enabled, attributeQuery fields are validated before sending requests.
   * Default: true
   */
  enableQueryValidation?: boolean;
  /**
   * Maximum recursion depth for query validation.
   * Default: 3
   */
  queryValidationMaxDepth?: number;
}

/**
 * Error thrown when query validation fails
 */
export class QueryValidationError extends Error {
  public readonly validationResult: SafeParseResult;
  public readonly interactionName: string;

  constructor(interactionName: string, validationResult: SafeParseResult) {
    const issues = !validationResult.success && validationResult.error?.issues
      ? validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : 'Unknown validation error';
    super(`Query validation failed for ${interactionName}: ${issues}`);
    this.name = 'QueryValidationError';
    this.interactionName = interactionName;
    this.validationResult = validationResult;
  }
}

export class APIClient {
  private baseUrl: string;
  userId?: string;
  private testUserId?: string;
  private requestInterceptor?: RequestInterceptor;
  private responseInterceptor?: ResponseInterceptor;
  private errorInterceptor?: ErrorInterceptor;
  private interactions: Record<string, InteractionDefinition>;
  private customEndpoints: NamespacedCustomEndpoints;
  private authType: string;
  private authToken?: string;
  private enableQueryValidation: boolean;
  private queryValidationMaxDepth: number;
  public api: APIMethodMap;
  public custom: CustomAPIMethodMap;

  constructor(config: APIClientConfig = {}) {
    this.baseUrl = config.baseUrl || BASE_URL || '';
    this.userId = config.userId
    this.testUserId = typeof window !== 'undefined' ? (window as any).testUserId : undefined;
    if (this.testUserId) {
      console.warn('testUserId is set', this.testUserId)
    }
    this.requestInterceptor = config.requestInterceptor;
    this.responseInterceptor = config.responseInterceptor;
    this.errorInterceptor = config.errorInterceptor;
    this.interactions = config.interactions || {};
    // Use generated custom endpoints by default, but allow override
    this.customEndpoints = config.customEndpoints || generatedCustomEndpoints;
    // Query validation configuration (enabled by default)
    this.enableQueryValidation = config.enableQueryValidation !== false;
    this.queryValidationMaxDepth = config.queryValidationMaxDepth ?? 3;
    
    // Load auth configuration from localStorage (only in browser)
    if (typeof window !== 'undefined' && window.localStorage) {
      this.authType = window.localStorage.getItem('auth_type') || 'cookie';
      if (this.authType === 'jwt') {
        this.authToken = window.localStorage.getItem('auth_token') || undefined;
      }
    } else {
      this.authType = 'cookie';
    }
    
    // Build API methods dynamically from interaction definitions
    this.api = this.buildAPIMethods();
    // Build custom endpoint methods
    this.custom = this.buildCustomMethods();
  }

  private buildAPIMethods(): APIMethodMap {
    const methods: any = {};
    
    // Create a method for each interaction
    Object.entries(this.interactions).forEach(([methodName, definition]) => {
      if (definition.type === 'query') {
        // Query-type interactions accept two parameters: payload and query
        methods[methodName] = async (payload: any, query?: any) => {
          return this.callInteraction(definition, payload, query);
        };
      } else {
        // Mutation-type interactions accept only one parameter
        methods[methodName] = async (payload: any) => {
          return this.callInteraction(definition, payload);
        };
      }
    });
    
    return methods as APIMethodMap;
  }

  private buildCustomMethods(): CustomAPIMethodMap {
    const methods: any = {};
    
    // Create methods for each custom endpoint, supporting nested namespace structure
    Object.entries(this.customEndpoints).forEach(([key, value]) => {
      // Check if value is a CustomEndpoint (has 'path' property) or a namespace object
      if (value && typeof value === 'object' && 'path' in value) {
        // Root-level endpoint without namespace
        const endpoint = value as CustomEndpoint;
        methods[key] = async (params?: any) => {
          return this.callCustomEndpoint(endpoint, undefined, key, params);
        };
      } else if (value && typeof value === 'object') {
        // Namespace object containing endpoints
        methods[key] = {};
        Object.entries(value).forEach(([apiName, endpoint]) => {
          methods[key][apiName] = async (params?: any) => {
            return this.callCustomEndpoint(endpoint as CustomEndpoint, key, apiName, params);
          };
        });
      }
    });
    
    return methods as CustomAPIMethodMap;
  }

  private async callCustomEndpoint(
    endpoint: CustomEndpoint,
    namespace: string | undefined,
    apiName: string,
    params?: any
  ): Promise<any> {
    const url = `${this.baseUrl}/custom/${endpoint.path}`;
    const method = endpoint.method || 'POST';
    // Build full method name for logging and interceptors
    const methodName = namespace ? `${namespace}/${apiName}` : apiName;
    
    // Build initial request config
    let config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    // Add body for non-GET requests
    if (method !== 'GET' && params) {
      config.body = JSON.stringify(params||{});
    }

    // Add JWT token if using JWT auth
    if (this.authType === 'jwt' && this.authToken) {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Add test user ID if available
    if (this.testUserId) {
      (config.headers as Record<string, string>)['x-user-id'] = this.testUserId;
    }
    
    try {
      // Apply request interceptor
      if (this.requestInterceptor) {
        config = await this.requestInterceptor(config, url, methodName);
      }
      
      // Make the request
      const response = await fetch(url, config);
      
      console.log(`[APIClient] Response status for ${methodName}:`, response.status);
      
      // Apply response interceptor
      if (this.responseInterceptor) {
        await this.responseInterceptor(response.clone(), url, methodName);
      }
      
      // Handle response
      if (!response.ok) {
        console.log(`[APIClient] Response not OK, status: ${response.status}`);
        const errorBody = await response.json().catch(() => ({}));
        const error = new Error(errorBody.message || errorBody.error?.message || `HTTP error! status: ${response.status}`);
        // Attach full error body and status code for detailed error handling
        (error as any).errorBody = errorBody;
        (error as any).statusCode = response.status;
        console.log(`[APIClient] Created error with statusCode:`, (error as any).statusCode);
        throw error;
      }
      
      return response.json();
    } catch (error) {
      console.log(`[APIClient] Caught error in ${methodName}, statusCode:`, (error as any).statusCode);
      // Apply error interceptor
      if (this.errorInterceptor && error instanceof Error) {
        await this.errorInterceptor(error, url, methodName);
      }
      throw error;
    }
  }

  /**
   * Validate query parameters before sending request
   */
  private validateQuery(interactionName: string, query: any): void {
    if (!this.enableQueryValidation || query === undefined) {
      return;
    }

    // Check if this interaction has a schema factory
    const schemaFactory = querySchemaFactories[interactionName as keyof typeof querySchemaFactories];
    if (!schemaFactory) {
      // No schema defined for this interaction, skip validation
      return;
    }

    // Validate the query
    const result = schemaFactory(this.queryValidationMaxDepth).safeParse(query);
    if (!result.success) {
      throw new QueryValidationError(interactionName, result);
    }
  }

  private async callInteraction(
    definition: InteractionDefinition, 
    payload?: AnyPayload | any,
    query?: any
  ): Promise<any> {
    const url = `${this.baseUrl}/interaction/${definition.name}`;
    
    // Build request body based on interaction type
    const body: any = {};
    
    if (definition.type === 'query') {
      // Validate query parameters before sending (if enabled)
      this.validateQuery(definition.name, query);
      
      // Query-type interactions use both payload and query
      if (payload !== undefined) {
        body.payload = payload;
      }
      if (query !== undefined) {
        body.query = query;
      }
    } else {
      // Mutation-type interactions only use payload
      body.payload = payload;
    }
    
    // Build initial request config
    let config: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    };

    // Add JWT token if using JWT auth
    if (this.authType === 'jwt' && this.authToken) {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (this.testUserId) {
      (config.headers as Record<string, string>)['x-user-id'] = this.testUserId;
    }
    
    try {
      // Apply request interceptor
      if (this.requestInterceptor) {
        config = await this.requestInterceptor(config, url, definition.name);
      }
      
      // Make the request
      const response = await fetch(url, config);
      
      console.log(`[APIClient] Response status for ${definition.name}:`, response.status);
      
      // Apply response interceptor
      if (this.responseInterceptor) {
        await this.responseInterceptor(response.clone(), url, definition.name);
      }
      
      // Handle response
      if (!response.ok) {
        console.log(`[APIClient] Response not OK, status: ${response.status}`);
        const errorBody = await response.json().catch(() => ({}));
        const error = new Error(errorBody.message || errorBody.error?.message || `HTTP error! status: ${response.status}`);
        // Attach full error body and status code for detailed error handling
        (error as any).errorBody = errorBody;
        (error as any).statusCode = response.status;
        console.log(`[APIClient] Created error with statusCode:`, (error as any).statusCode);
        throw error;
      }
      
      return response.json();
    } catch (error) {
      console.log(`[APIClient] Caught error in ${definition.name}, statusCode:`, (error as any).statusCode);
      // Apply error interceptor
      if (this.errorInterceptor && error instanceof Error) {
        await this.errorInterceptor(error, url, definition.name);
      }
      throw error;
    }
  }

  // Utility method to update configuration
  updateConfig(config: Partial<APIClientConfig>) {
    if (config.baseUrl !== undefined) this.baseUrl = config.baseUrl;
    if (config.requestInterceptor !== undefined) this.requestInterceptor = config.requestInterceptor;
    if (config.responseInterceptor !== undefined) this.responseInterceptor = config.responseInterceptor;
    if (config.errorInterceptor !== undefined) this.errorInterceptor = config.errorInterceptor;
    if (config.interactions !== undefined) this.interactions = config.interactions;
    if (config.customEndpoints !== undefined) this.customEndpoints = config.customEndpoints;
    if (config.enableQueryValidation !== undefined) this.enableQueryValidation = config.enableQueryValidation;
    if (config.queryValidationMaxDepth !== undefined) this.queryValidationMaxDepth = config.queryValidationMaxDepth;
    
    // Rebuild API methods with new config
    this.api = this.buildAPIMethods();
    this.custom = this.buildCustomMethods();
  }

  // Update authentication configuration
  updateAuth(authType: 'cookie' | 'jwt', authToken?: string) {
    this.authType = authType;
    if (authType === 'jwt' && authToken) {
      this.authToken = authToken;
    } else {
      this.authToken = undefined;
    }
  }

  // Clear authentication
  clearAuth() {
    this.authType = 'cookie';
    this.authToken = undefined;
  }
}