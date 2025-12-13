import { Request, Response } from 'express';
import Interview from '../models/Interview.model';
import Application from '../models/Application.model';
import { createNotification } from '../services/notification.service';
import calendlyService, {
  CalendlyWebhookPayload,
} from '../services/calendly.service';

/**
 * Handle Calendly webhook events
 * POST /api/v1/webhooks/calendly
 */
export const handleCalendlyWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get webhook signature from headers
    // Note: Calendly sends signature in 'calendly-webhook-signature' header
    const signature = (req.headers['calendly-webhook-signature'] ||
      req.headers['x-calendly-webhook-signature']) as string;

    // For signature verification, we need the raw body
    // Since express.json() already parsed it, we stringify it back
    // In production, consider using a raw body parser for webhook routes
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    if (!signature) {
      console.warn('Calendly webhook received without signature');
      // In development, allow without signature; in production, reject
      if (process.env.NODE_ENV === 'production') {
        res.status(401).json({ message: 'Webhook signature required' });
        return;
      }
    } else {
      const isValid = calendlyService.verifyWebhookSignature(
        rawBody,
        signature
      );
      if (!isValid) {
        console.error('Invalid Calendly webhook signature');
        res.status(401).json({ message: 'Invalid webhook signature' });
        return;
      }
    }

    const payload = req.body as CalendlyWebhookPayload;

    if (!payload.event || !payload.payload) {
      res.status(400).json({ message: 'Invalid webhook payload' });
      return;
    }

    const { event, payload: eventPayload } = payload;
    const { event_uri } = eventPayload;

    if (!event_uri) {
      res.status(400).json({ message: 'Missing event_uri in webhook payload' });
      return;
    }

    // Find interview by Calendly event URI
    const interview = await Interview.findOne({
      calendlyEventUri: event_uri,
    })
      .populate({
        path: 'graduateId',
        select: 'userId firstName lastName',
      })
      .populate({
        path: 'companyId',
        select: 'userId companyName',
      })
      .populate({
        path: 'jobId',
        select: 'title',
      });

    if (!interview) {
      // Event not found in our system, but acknowledge webhook
      console.warn(`Calendly webhook received for unknown event: ${event_uri}`);
      res.status(200).json({ message: 'Event not found in system' });
      return;
    }

    // Handle different event types
    switch (event) {
      case 'invitee.created':
        await handleInviteeCreated(interview, eventPayload);
        break;

      case 'invitee.canceled':
        await handleInviteeCanceled(interview, eventPayload);
        break;

      case 'invitee.updated':
        await handleInviteeUpdated(interview, eventPayload);
        break;

      default:
        console.warn(`Unhandled Calendly webhook event type: ${event}`);
    }

    // Always acknowledge webhook
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Calendly webhook error:', error);
    // Still acknowledge to prevent retries for our errors
    res.status(200).json({
      message: 'Webhook received but processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle invitee.created event (interview scheduled)
 */
async function handleInviteeCreated(
  interview: any,
  eventPayload: CalendlyWebhookPayload['payload']
): Promise<void> {
  try {
    // Interview should already be created when company schedules via API
    // This webhook confirms the event was created in Calendly
    let needsSave = false;

    if (interview.status !== 'scheduled') {
      interview.status = 'scheduled';
      needsSave = true;
    }

    // Update invitee URI if available
    if (eventPayload.invitee_uri && !interview.calendlyInviteeUri) {
      interview.calendlyInviteeUri = eventPayload.invitee_uri;
      needsSave = true;
    }

    if (needsSave) {
      await interview.save();
    }

    console.log(`Calendly invitee created for interview ${interview._id}`);
  } catch (error) {
    console.error('Error handling invitee.created:', error);
    throw error;
  }
}

/**
 * Handle invitee.canceled event (interview cancelled)
 */
async function handleInviteeCanceled(
  interview: any,
  _eventPayload: CalendlyWebhookPayload['payload']
): Promise<void> {
  try {
    // Update interview status to cancelled
    interview.status = 'cancelled';
    interview.endedAt = new Date();
    await interview.save();

    // Update application status
    await Application.findByIdAndUpdate(interview.applicationId, {
      interviewScheduledAt: undefined,
      interviewLink: undefined,
    });

    // Send notification to graduate
    if (!interview.graduateId?.userId) {
      console.warn(`No graduate userId found for interview ${interview._id}`);
      return;
    }

    await createNotification({
      userId: interview.graduateId.userId,
      type: 'interview',
      title: 'Interview Cancelled',
      message: `The interview for ${interview.jobId?.title || 'the position'} has been cancelled`,
      relatedId: interview._id,
      relatedType: 'interview',
    });

    console.log(`Calendly invitee canceled for interview ${interview._id}`);
  } catch (error) {
    console.error('Error handling invitee.canceled:', error);
    throw error;
  }
}

/**
 * Handle invitee.updated event (interview rescheduled)
 */
async function handleInviteeUpdated(
  interview: any,
  _eventPayload: CalendlyWebhookPayload['payload']
): Promise<void> {
  try {
    // Fetch updated event details from Calendly if we have access token
    // For now, we'll just log it - the company/user should update via API if needed
    // In a full implementation, you might want to fetch the event details here

    console.log(`Calendly invitee updated for interview ${interview._id}`);

    // Send notification to graduate about reschedule
    if (!interview.graduateId?.userId) {
      console.warn(`No graduate userId found for interview ${interview._id}`);
      return;
    }

    await createNotification({
      userId: interview.graduateId.userId,
      type: 'interview',
      title: 'Interview Updated',
      message: `The interview for ${interview.jobId?.title || 'the position'} has been updated`,
      relatedId: interview._id,
      relatedType: 'interview',
    });
  } catch (error) {
    console.error('Error handling invitee.updated:', error);
    throw error;
  }
}
