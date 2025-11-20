import { createNotification } from './notification.service';

/**
 * Notification Event Types
 * Pluggable system for adding new notification events
 */
export enum NotificationEventType {
    // Company events
    COMPANY_JOB_CREATED = 'COMPANY_JOB_CREATED',
    COMPANY_JOB_APPLICATION_RECEIVED = 'COMPANY_JOB_APPLICATION_RECEIVED',
    COMPANY_PROFILE_UPDATED = 'COMPANY_PROFILE_UPDATED',

    // Graduate events
    GRADUATE_APPLIED_TO_JOB = 'GRADUATE_APPLIED_TO_JOB',
    GRADUATE_MATCHED_TO_JOB = 'GRADUATE_MATCHED_TO_JOB',

    // Future events (examples)
    // INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
    // APPLICATION_STATUS_CHANGED = 'APPLICATION_STATUS_CHANGED',
    // JOB_ALERT_MATCHED = 'JOB_ALERT_MATCHED',
}

/**
 * Event Payload Interfaces
 */
export interface CompanyJobCreatedPayload {
    jobId: string;
    jobTitle: string;
    companyId: string;
    companyName: string;
}

export interface CompanyJobApplicationReceivedPayload {
    applicationId: string;
    jobId: string;
    jobTitle: string;
    graduateId: string;
    graduateName: string;
    companyId: string;
}

export interface CompanyProfileUpdatedPayload {
    companyId: string;
    companyName: string;
}

export interface GraduateAppliedToJobPayload {
    applicationId: string;
    jobId: string;
    jobTitle: string;
    companyId: string;
    companyName: string;
    graduateId: string;
}

export interface GraduateMatchedToJobPayload {
    matchId: string;
    jobId: string;
    jobTitle: string;
    companyId: string;
    companyName: string;
    matchScore: number;
    graduateId: string;
}

type NotificationPayload =
    | CompanyJobCreatedPayload
    | CompanyJobApplicationReceivedPayload
    | CompanyProfileUpdatedPayload
    | GraduateAppliedToJobPayload
    | GraduateMatchedToJobPayload;

/**
 * Event Handler Interface
 */
interface EventHandler {
    (payload: NotificationPayload): Promise<void>;
}

/**
 * Event Handler Registry
 * Pluggable system - add new handlers here
 */
const eventHandlers: Map<NotificationEventType, EventHandler> = new Map();

/**
 * Register an event handler
 */
export const registerEventHandler = (
    eventType: NotificationEventType,
    handler: EventHandler
): void => {
    eventHandlers.set(eventType, handler);
};

/**
 * Notification Dispatcher
 * Dispatches events to registered handlers
 */
class NotificationDispatcher {
    /**
     * Dispatch a notification event
     */
    async dispatch(
        eventType: NotificationEventType,
        payload: NotificationPayload
    ): Promise<void> {
        const handler = eventHandlers.get(eventType);

        if (!handler) {
            console.warn(
                `[NotificationDispatcher] No handler registered for event: ${eventType}`
            );
            return;
        }

        try {
            await handler(payload);
        } catch (error) {
            console.error(
                `[NotificationDispatcher] Error handling event ${eventType}:`,
                error
            );
            // Don't throw - notifications shouldn't break the main flow
        }
    }

    /**
     * Dispatch multiple events (for batch operations)
     */
    async dispatchBatch(
        events: Array<{ type: NotificationEventType; payload: NotificationPayload }>
    ): Promise<void> {
        await Promise.all(
            events.map((event) => this.dispatch(event.type, event.payload))
        );
    }
}

// Singleton instance
const dispatcher = new NotificationDispatcher();

/**
 * Default Event Handlers
 */

// COMPANY_JOB_CREATED handler
registerEventHandler(
    NotificationEventType.COMPANY_JOB_CREATED,
    async (payload) => {
        const p = payload as CompanyJobCreatedPayload;
        await createNotification({
            userId: p.companyId, // This is the company's userId (User._id)
            type: 'system',
            title: 'Job Created Successfully',
            message: `Your job posting "${p.jobTitle}" has been created and is now live.`,
            relatedId: p.jobId,
            relatedType: 'job',
        });
    }
);

// COMPANY_JOB_APPLICATION_RECEIVED handler
registerEventHandler(
    NotificationEventType.COMPANY_JOB_APPLICATION_RECEIVED,
    async (payload) => {
        const p = payload as CompanyJobApplicationReceivedPayload;
        await createNotification({
            userId: p.companyId,
            type: 'application',
            title: 'New Application Received',
            message: `${p.graduateName} applied to your job "${p.jobTitle}".`,
            relatedId: p.applicationId,
            relatedType: 'application',
        });
    }
);

// COMPANY_PROFILE_UPDATED handler
registerEventHandler(
    NotificationEventType.COMPANY_PROFILE_UPDATED,
    async (payload) => {
        const p = payload as CompanyProfileUpdatedPayload;
        await createNotification({
            userId: p.companyId,
            type: 'system',
            title: 'Profile Updated',
            message: 'Your company profile has been successfully updated.',
            relatedId: p.companyId,
            relatedType: 'company',
        });
    }
);

// GRADUATE_APPLIED_TO_JOB handler
registerEventHandler(
    NotificationEventType.GRADUATE_APPLIED_TO_JOB,
    async (payload) => {
        const p = payload as GraduateAppliedToJobPayload;
        await createNotification({
            userId: p.graduateId,
            type: 'application',
            title: 'Application Submitted',
            message: `Your application for "${p.jobTitle}" at ${p.companyName} has been submitted successfully.`,
            relatedId: p.applicationId,
            relatedType: 'application',
        });
    }
);

// GRADUATE_MATCHED_TO_JOB handler
registerEventHandler(
    NotificationEventType.GRADUATE_MATCHED_TO_JOB,
    async (payload) => {
        const p = payload as GraduateMatchedToJobPayload;
        await createNotification({
            userId: p.graduateId,
            type: 'match',
            title: 'New Job Match!',
            message: `You've been matched with "${p.jobTitle}" at ${p.companyName} (${Math.round(p.matchScore * 100)}% match).`,
            relatedId: p.matchId,
            relatedType: 'match',
        });
    }
);

/**
 * Public API
 */
export const notificationDispatcher = dispatcher;

/**
 * Convenience functions for common events
 */
export const notifyCompanyJobCreated = async (
    payload: CompanyJobCreatedPayload
): Promise<void> => {
    await dispatcher.dispatch(NotificationEventType.COMPANY_JOB_CREATED, payload);
};

export const notifyCompanyJobApplicationReceived = async (
    payload: CompanyJobApplicationReceivedPayload
): Promise<void> => {
    await dispatcher.dispatch(
        NotificationEventType.COMPANY_JOB_APPLICATION_RECEIVED,
        payload
    );
};

export const notifyCompanyProfileUpdated = async (
    payload: CompanyProfileUpdatedPayload
): Promise<void> => {
    await dispatcher.dispatch(
        NotificationEventType.COMPANY_PROFILE_UPDATED,
        payload
    );
};

export const notifyGraduateAppliedToJob = async (
    payload: GraduateAppliedToJobPayload
): Promise<void> => {
    await dispatcher.dispatch(
        NotificationEventType.GRADUATE_APPLIED_TO_JOB,
        payload
    );
};

export const notifyGraduateMatchedToJob = async (
    payload: GraduateMatchedToJobPayload
): Promise<void> => {
    await dispatcher.dispatch(
        NotificationEventType.GRADUATE_MATCHED_TO_JOB,
        payload
    );
};

