import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  Call,
  SpeakerLayout,
  CallControls,
  StreamTheme,
} from '@stream-io/video-react-sdk';
import { createStreamClient } from '../utils/streamClient';
import '@stream-io/video-react-sdk/dist/css/styles.css';

// Custom styles to position call controls at bottom
const callControlsStyle = `
  .str-video__call-controls {
    position: absolute !important;
    bottom: 24px !important;
    top: auto !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    z-index: 50 !important;
  }
`;
import interviewApi from '../api/interview';
import { Button, PageLoader } from '../components/ui';
import ErrorState from '../components/ui/ErrorState';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';

const InterviewRoom = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const [call, setCall] = useState<Call>();
  const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(
    null
  );
  const [streamError, setStreamError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['interviewRoom', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null;
      return interviewApi.getInterviewBySlug(slug);
    },
  });

  const interview = data?.interview;

  // Initialize Stream video client
  useEffect(() => {
    if (!interview || !user || !interview.roomSlug) return;

    // Fetch token and initialize client
    const initializeClient = async () => {
      try {
        const userId = user.id || 'user-' + Date.now();
        const userName = user.email || 'Guest';

        // Check cache first
        let token: string;
        if (
          tokenCacheRef.current &&
          tokenCacheRef.current.expiresAt > Date.now() + 60 * 60 * 1000
        ) {
          token = tokenCacheRef.current.token;
        } else {
          // Fetch token from backend with retry logic
          const maxRetries = 3;

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const fetchedToken = await interviewApi.getStreamToken();

              if (!fetchedToken) {
                console.error('Token is empty or undefined');
                throw new Error('Token is empty or undefined');
              }

              token = fetchedToken;

              // Cache the token (Stream tokens expire in 1 hour)
              tokenCacheRef.current = {
                token,
                expiresAt: Date.now() + 55 * 60 * 1000, // Cache for 55 minutes (token valid for 1 hour)
              };

              break; // Success, exit retry loop
            } catch (error) {
              const apiError = error as {
                response?: { status?: number };
                code?: string;
                message?: string;
              };

              // If it's a 429 (rate limit), wait before retrying
              if (apiError.response?.status === 429) {
                if (attempt < maxRetries - 1) {
                  // Exponential backoff: wait 2^attempt seconds
                  const waitTime = Math.pow(2, attempt) * 1000;
                  console.warn(
                    `Rate limited. Retrying in ${waitTime / 1000} seconds...`
                  );
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  continue;
                } else {
                  const errorMsg =
                    'Too many requests. Please wait a moment and refresh the page.';
                  setStreamError(errorMsg);
                  return;
                }
              }

              // Network/CORS errors
              if (
                apiError.code === 'ERR_NETWORK' ||
                apiError.message?.includes('CORS') ||
                apiError.message === 'Network Error'
              ) {
                const errorMsg =
                  'Cannot connect to server. Please check if the backend is running and CORS is configured correctly.';
                setStreamError(errorMsg);
                return;
              }

              // For other errors
              console.error('Failed to fetch Stream token:', error);
              if (attempt === maxRetries - 1) {
                const errorMsg =
                  'Failed to get Stream token. Please ensure you are authenticated.';
                setStreamError(errorMsg);
                return;
              }
            }
          }

          // If we exhausted retries without success
          if (!token!) {
            setStreamError('Failed to get Stream token after retries.');
            return;
          }
        }

        // Initialize client using the utility function
        const client = createStreamClient(userId, token!, userName);

        setVideoClient(client);
        setStreamError(null); // Clear any previous errors
      } catch (error) {
        console.error('Failed to initialize Stream client:', error);
        setStreamError(
          'Failed to initialize video client. Please refresh the page.'
        );
      }
    };

    initializeClient();

    return () => {
      if (videoClient) {
        videoClient.disconnectUser();
      }
      setVideoClient(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview, user]); // videoClient is intentionally excluded - it's set inside the effect

  // Create and join call
  useEffect(() => {
    if (!videoClient || !interview?.roomSlug) return;

    const myCall = videoClient.call('default', interview.roomSlug);

    myCall.join({ create: true }).catch((err) => {
      console.error('Failed to join the call', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join the call';
      if (
        errorMessage.includes('rate limit') ||
        errorMessage.includes('Too many requests')
      ) {
        setStreamError(
          'Too many requests. Please wait a moment and refresh the page.'
        );
      } else if (errorMessage.includes('token')) {
        setStreamError('Authentication error. Please refresh the page.');
      } else {
        setStreamError('Failed to join the call. Please try again.');
      }
    });

    setCall(myCall);

    return () => {
      setCall(undefined);
      myCall.leave().catch((err: unknown) => {
        console.error('Failed to leave the call', err);
      });
    };
  }, [videoClient, interview?.roomSlug]);

  const formattedDate = useMemo(() => {
    if (!interview?.scheduledAt) return '';
    const date = new Date(interview.scheduledAt);
    if (Number.isNaN(date.getTime())) return interview.scheduledAt;
    return date.toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [interview?.scheduledAt]);

  if (isLoading) {
    return <PageLoader message="Preparing interview room..." />;
  }

  if (error || !interview) {
    const fallbackDestination =
      user?.role === 'company' ? '/company' : '/graduate';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 gap-4">
        <ErrorState
          title="Unable to load interview"
          message={
            (error as ApiError)?.response?.data?.message ||
            (error as Error)?.message ||
            'Please check the link and try again.'
          }
          variant="fullPage"
        />
        <Button onClick={() => navigate(fallbackDestination)}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const counterpartLabel =
    interview.participant?.role === 'company' ? 'Candidate' : 'Company';
  const counterpartName =
    interview.participant?.role === 'company'
      ? interview.graduate?.name || 'Candidate'
      : interview.company?.name || 'Company';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8F8F8]">
      <div className="w-full lg:w-2/3 bg-black min-h-[50vh] relative">
        {videoClient && call ? (
          <StreamVideo client={videoClient}>
            <StreamTheme>
              <StreamCall call={call}>
                <style>{callControlsStyle}</style>
                <SpeakerLayout />
                <CallControls onLeave={() => navigate(-1)} />
              </StreamCall>
            </StreamTheme>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-white p-8">
            <div>
              {streamError ? (
                <>
                  <h3 className="text-xl font-semibold mb-4 text-red-400">
                    Connection Error
                  </h3>
                  <p className="text-gray-300 mb-4">{streamError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Refresh Page
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-4">
                    Preparing video call...
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {!import.meta.env.VITE_STREAM_API_KEY &&
                      'Stream API key is not configured'}
                  </p>
                  {interview.roomSlug && (
                    <p className="text-sm text-gray-400">
                      Room ID: {interview.roomSlug}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="w-full lg:w-1/3 bg-white border-l border-fade flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[#1C1C1C80]">{counterpartLabel}</p>
          <h2 className="text-2xl font-semibold text-[#1C1C1C]">
            {counterpartName}
          </h2>
          {interview.job?.title && (
            <p className="text-sm text-[#1C1C1C80]">{interview.job.title}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 text-sm text-[#1C1C1C80]">
          <div className="flex items-center justify-between">
            <span>Date</span>
            <span className="font-medium text-[#1C1C1C]">{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Duration</span>
            <span className="font-medium text-[#1C1C1C]">
              {interview.durationMinutes || 30} mins
            </span>
          </div>
          {interview.job?.location && (
            <div className="flex items-center justify-between">
              <span>Location</span>
              <span className="font-medium text-[#1C1C1C]">
                {interview.job.location}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="w-full"
          >
            Back to dashboard
          </Button>
          <Button
            onClick={() => {
              if (interview.roomUrl && navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(interview.roomUrl);
              }
            }}
            className="w-full"
          >
            Copy interview link
          </Button>
        </div>

        <p className="text-xs text-[#1C1C1C80]">
          Grant your browser permission to use your microphone and camera so
          participants can see and hear you clearly.
        </p>
      </div>
    </div>
  );
};

export default InterviewRoom;
