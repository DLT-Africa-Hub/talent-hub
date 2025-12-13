import crypto from 'crypto';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { calendlyConfig } from '../config/secrets';
import { encrypt, decrypt } from '../utils/encryption.utils';

export interface CalendlyUser {
  uri: string;
  name: string;
  email: string;
  slug: string;
  scheduling_url: string;
  timezone: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  current_organization: string;
}

export interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  slug: string;
  scheduling_url: string;
  duration: number;
  kind: 'solo' | 'group' | 'collective' | 'round_robin';
  pooling_type?: 'round_robin' | 'collective';
  type: 'StandardEventType' | 'AdhocEventType';
  color: string;
  created_at: string;
  updated_at: string;
  internal_note?: string;
  description_plain?: string;
  description_html?: string;
  profile: {
    type: string;
    owner: string;
    name: string;
  };
  secret?: boolean;
  booking_method?: 'instant' | 'poll';
  custom_questions?: Array<{
    name: string;
    type: string;
    position: number;
    enabled: boolean;
    required: boolean;
    answer_choices?: string[];
  }>;
}

export interface CalendlyAvailabilitySchedule {
  uri: string;
  name: string;
  user: string;
  timezone: string;
  rules: Array<{
    intervals: Array<{
      from: string; // HH:mm format
      to: string; // HH:mm format
    }>;
    type: 'wday' | 'date';
    wday?: string; // day of week
    date?: string; // specific date
  }>;
}

export interface CalendlyTimeSlot {
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
}

export interface CalendlyScheduledEvent {
  uri: string;
  name: string;
  status: 'active' | 'canceled';
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  event_type: string; // URI
  location?: {
    type:
      | 'physical'
      | 'google_meet'
      | 'gotomeeting'
      | 'zoom'
      | 'webex'
      | 'microsoft_teams'
      | 'custom';
    location?: string;
    phone_number?: string;
    additional_info?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
  event_memberships: Array<{
    user: string; // URI
    user_email: string;
    user_name: string;
  }>;
  event_guests: Array<{
    email: string;
    created_at: string;
    updated_at: string;
  }>;
  calendar_event?: {
    kind: string;
    external_id: string;
  };
}

export interface CalendlyInvitee {
  uri: string;
  name: string;
  email: string;
  text_reminder_number?: string;
  timezone: string;
  event: string; // Event URI
  created_at: string;
  updated_at: string;
  canceled: boolean;
  canceler_name?: string;
  cancellation?: {
    canceled_by: string;
    reason?: string;
    canceler_type: string;
    created_at: string;
  };
  questions_and_answers?: Array<{
    question: string;
    answer: string;
    position: number;
  }>;
  tracking?: {
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_content?: string;
    utm_term?: string;
    salesforce_uuid?: string;
  };
  rescheduled: boolean;
  old_invitee?: string;
  new_invitee?: string;
  payment?: {
    external_id: string;
    provider: string;
    amount: number;
    currency: string;
    terms: string;
    successful: boolean;
  };
}

export interface CalendlyWebhookPayload {
  event: 'invitee.created' | 'invitee.canceled' | 'invitee.updated';
  time: string;
  payload: {
    event_uri: string;
    invitee_uri: string;
    [key: string]: unknown;
  };
}

class CalendlyService {
  private apiClient: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = calendlyConfig.apiBaseUrl;
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Sets the access token for API requests
   */
  setAccessToken(encryptedToken: string): void {
    try {
      if (!encryptedToken || encryptedToken.trim() === '') {
        throw new Error('Access token is empty');
      }

      const token = decrypt(encryptedToken);

      if (!token || token.trim() === '') {
        throw new Error('Decrypted token is empty');
      }

      this.apiClient.defaults.headers.common['Authorization'] =
        `Bearer ${token}`;
    } catch (error) {
      // Token decryption error - error message already included in thrown error
      throw new Error(
        `Failed to decrypt Calendly access token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Removes the access token
   */
  clearAccessToken(): void {
    delete this.apiClient.defaults.headers.common['Authorization'];
  }

  /**
   * Handles API errors
   */
  private handleError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        message?: string;
        title?: string;
      }>;
      const status = axiosError.response?.status;
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.title ||
        axiosError.message ||
        'Unknown error';

      if (status === 401) {
        throw new Error(`Calendly authentication failed: ${message}`);
      }
      if (status === 403) {
        throw new Error(`Calendly access forbidden: ${message}`);
      }
      if (status === 404) {
        throw new Error(`Calendly resource not found: ${message}`);
      }
      if (status === 429) {
        throw new Error(`Calendly rate limit exceeded: ${message}`);
      }

      throw new Error(
        `Calendly API error (${status || 'unknown'}): ${message}`
      );
    }

    throw new Error(
      `Calendly ${context} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  /**
   * Get current authenticated user information
   */
  async getCurrentUser(encryptedToken: string): Promise<CalendlyUser> {
    try {
      this.setAccessToken(encryptedToken);
      const response = await this.apiClient.get<{ resource: CalendlyUser }>(
        '/users/me'
      );
      return response.data.resource;
    } catch (error) {
      this.handleError(error, 'getCurrentUser');
    }
  }

  /**
   * Get user information by URI
   */
  async getUser(
    userUri: string,
    encryptedToken: string
  ): Promise<CalendlyUser> {
    try {
      this.setAccessToken(encryptedToken);
      const response = await this.apiClient.get<{ resource: CalendlyUser }>(
        userUri
      );
      return response.data.resource;
    } catch (error) {
      this.handleError(error, 'getUser');
    }
  }

  /**
   * Get event types for a user
   */
  async getEventTypes(
    userUri: string,
    encryptedToken: string,
    options?: {
      count?: number;
      page_token?: string;
      sort?: 'created_at:asc' | 'created_at:desc' | 'name:asc' | 'name:desc';
    }
  ): Promise<{
    collection: CalendlyEventType[];
    pagination: { next_page?: string };
  }> {
    try {
      this.setAccessToken(encryptedToken);
      const params = new URLSearchParams();
      if (options?.count) params.append('count', options.count.toString());
      if (options?.page_token) params.append('page_token', options.page_token);
      if (options?.sort) params.append('sort', options.sort);

      const response = await this.apiClient.get<{
        collection: CalendlyEventType[];
        pagination: { next_page?: string };
      }>(
        `/event_types?user=${encodeURIComponent(userUri)}&${params.toString()}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'getEventTypes');
    }
  }

  /**
   * Format date for Calendly API (ISO 8601 without milliseconds)
   */
  private formatDateForCalendly(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      // Format as ISO 8601 without milliseconds: YYYY-MM-DDTHH:mm:ssZ
      return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
    } catch (error) {
      // If parsing fails, return original string
      return dateStr;
    }
  }

  /**
   * Get available time slots for an event type
   */
  async getAvailableTimes(
    eventTypeUri: string,
    startTime: string, // ISO 8601
    endTime: string, // ISO 8601
    encryptedToken: string
  ): Promise<{ collection: CalendlyTimeSlot[] }> {
    try {
      this.setAccessToken(encryptedToken);

      const formattedStartTime = this.formatDateForCalendly(startTime);
      const formattedEndTime = this.formatDateForCalendly(endTime);

      const params = new URLSearchParams({
        event_type: eventTypeUri,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
      });

      const response = await this.apiClient.get<{
        collection: CalendlyTimeSlot[];
      }>(`/event_type_available_times?${params.toString()}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'getAvailableTimes');
    }
  }

  /**
   * Create a scheduled event (book an interview)
   */
  async createScheduledEvent(
    eventTypeUri: string,
    inviteeEmail: string,
    startTime: string, // ISO 8601
    encryptedToken: string,
    options?: {
      inviteeName?: string;
      textReminderNumber?: string;
      location?: string;
      questionsAndAnswers?: Array<{ question: string; answer: string }>;
    }
  ): Promise<CalendlyScheduledEvent> {
    try {
      this.setAccessToken(encryptedToken);

      // Format start_time for Calendly API (ISO 8601 without milliseconds)
      const formattedStartTime = this.formatDateForCalendly(startTime);

      // Calendly API v2 payload structure according to documentation
      const payload: {
        event_type: string;
        start_time: string;
        invitee: {
          email: string;
          name?: string;
          timezone?: string;
          text_reminder_number?: string;
        };
        location?: {
          kind?: string;
          location?: string;
          type?: string;
        };
        questions_and_answers?: Array<{ question: string; answer: string }>;
      } = {
        event_type: eventTypeUri,
        start_time: formattedStartTime,
        invitee: {
          email: inviteeEmail,
        },
      };

      if (options?.inviteeName) {
        payload.invitee.name = options.inviteeName;
      }

      if (options?.textReminderNumber) {
        payload.invitee.text_reminder_number = options.textReminderNumber;
      }

      // Add timezone if not provided (default to UTC)
      if (!payload.invitee.timezone) {
        payload.invitee.timezone = 'UTC';
      }

      if (options?.location) {
        payload.location = {
          kind: 'custom',
          location: options.location,
        };
      }

      if (
        options?.questionsAndAnswers &&
        options.questionsAndAnswers.length > 0
      ) {
        payload.questions_and_answers = options.questionsAndAnswers;
      }

      // Create invitee - this automatically creates the scheduled event
      // Log payload for debugging (remove in production)
      const inviteeResponse = await this.apiClient
        .post<{ resource: CalendlyInvitee }>('/invitees', payload)
        .catch((error) => {
          // Enhanced error logging
          if (error instanceof AxiosError && error.response) {
            console.error('Calendly API error details:', {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              payload: payload,
            });
          }
          throw error;
        });

      const invitee = inviteeResponse.data.resource;

      // Get the scheduled event from the invitee's event URI
      // The event URI is a full URL, so we need to extract the path
      const eventPath = invitee.event.startsWith('http')
        ? new URL(invitee.event).pathname
        : invitee.event;

      const eventResponse = await this.apiClient.get<{
        resource: CalendlyScheduledEvent;
      }>(eventPath);

      return eventResponse.data.resource;
    } catch (error) {
      this.handleError(error, 'createScheduledEvent');
    }
  }

  /**
   * Get scheduled event details
   */
  async getScheduledEvent(
    eventUri: string,
    encryptedToken: string
  ): Promise<CalendlyScheduledEvent> {
    try {
      this.setAccessToken(encryptedToken);
      const response = await this.apiClient.get<{
        resource: CalendlyScheduledEvent;
      }>(eventUri);
      return response.data.resource;
    } catch (error) {
      this.handleError(error, 'getScheduledEvent');
    }
  }

  /**
   * Cancel a scheduled event
   */
  async cancelScheduledEvent(
    eventUri: string,
    reason: string,
    encryptedToken: string
  ): Promise<void> {
    try {
      this.setAccessToken(encryptedToken);
      await this.apiClient.post(`${eventUri}/cancellation`, {
        reason,
      });
    } catch (error) {
      this.handleError(error, 'cancelScheduledEvent');
    }
  }

  /**
   * Get invitee information
   */
  async getInvitee(
    inviteeUri: string,
    encryptedToken: string
  ): Promise<CalendlyInvitee> {
    try {
      this.setAccessToken(encryptedToken);
      const response = await this.apiClient.get<{ resource: CalendlyInvitee }>(
        inviteeUri
      );
      return response.data.resource;
    } catch (error) {
      this.handleError(error, 'getInvitee');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!calendlyConfig.webhookSigningKey) {
      console.warn(
        'Calendly webhook signing key not configured, skipping verification'
      );
      return true; // In development, allow without verification
    }

    try {
      const hmac = crypto.createHmac(
        'sha256',
        calendlyConfig.webhookSigningKey
      );
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Encrypt OAuth tokens for storage
   */
  encryptToken(token: string): string {
    return encrypt(token);
  }

  /**
   * Decrypt OAuth tokens from storage
   */
  decryptToken(encryptedToken: string): string {
    return decrypt(encryptedToken);
  }

  /**
   * Refreshes an expired Calendly access token using the refresh token
   * @param encryptedRefreshToken - Encrypted refresh token
   * @returns New access token, refresh token, and expiration info
   */
  async refreshAccessToken(encryptedRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }> {
    try {
      const refreshToken = decrypt(encryptedRefreshToken);

      if (!calendlyConfig.clientId || !calendlyConfig.clientSecret) {
        throw new Error('Calendly OAuth configuration is incomplete');
      }

      const response = await axios.post(
        'https://auth.calendly.com/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: calendlyConfig.clientId,
          client_secret: calendlyConfig.clientSecret,
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      if (!access_token) {
        throw new Error('Failed to obtain new access token');
      }

      return {
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
        expiresIn: expires_in,
      };
    } catch (error) {
      this.handleError(error, 'refreshAccessToken');
      throw error;
    }
  }
}

// Export singleton instance
export const calendlyService = new CalendlyService();
export default calendlyService;
