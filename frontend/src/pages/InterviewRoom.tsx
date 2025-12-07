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
  VideoPreview,
  DeviceSettings,
  useCallStateHooks,
  CallingState,
  Icon,
  createSoundDetector,
} from '@stream-io/video-react-sdk';
import { createStreamClient } from '../utils/streamClient';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import interviewApi from '../api/interview';
import { Button, PageLoader } from '../components/ui';
import ErrorState from '../components/ui/ErrorState';
import { useAuth } from '../context/AuthContext';
import { Mic, Webcam } from 'lucide-react';

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

// Audio Volume Indicator Component
function AudioVolumeIndicator() {
  const { useMicrophoneState } = useCallStateHooks();
  const { isEnabled, mediaStream } = useMicrophoneState();
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!isEnabled || !mediaStream) return;

    const disposeSoundDetector = createSoundDetector(
      mediaStream,
      ({ audioLevel }) => setAudioLevel(audioLevel),
      { detectionFrequencyInMs: 80, destroyStreamOnStop: false }
    );

    return () => {
      disposeSoundDetector().catch(console.error);
    };
  }, [isEnabled, mediaStream]);

  if (!isEnabled) return null;

  return (
    <div className="flex w-72 items-center gap-3 rounded-md bg-slate-900 p-4">
      <Icon icon="mic" />
      <div className="h-1.5 flex-1 rounded-md bg-white">
        <div
          className="h-full w-full origin-left bg-blue-500"
          style={{
            transform: `scaleX(${audioLevel / 100})`,
          }}
        />
      </div>
    </div>
  );
}

// Permission Prompt Component
function PermissionPrompt() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <Webcam size={40} />
        <Mic size={40} />
      </div>
      <p className="text-center">
        Please allow access to your microphone and camera to join the call
      </p>
    </div>
  );
}

// Setup UI Component
function SetupUI({
  call,
  onSetupComplete,
  isJoining = false,
}: {
  call: Call;
  onSetupComplete: () => void;
  isJoining?: boolean;
}) {
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const micState = useMicrophoneState();
  const camState = useCameraState();
  const [micCamDisabled, setMicCamDisabled] = useState(false);

  useEffect(() => {
    if (micCamDisabled) {
      call.camera.disable();
      call.microphone.disable();
    } else {
      call.camera.enable();
      call.microphone.enable();
    }
  }, [micCamDisabled, call]);

  if (!micState.hasBrowserPermission || !camState.hasBrowserPermission) {
    return <PermissionPrompt />;
  }

  return (
    <div className="flex flex-col items-center gap-3 p-8">
      <h1 className="text-center text-2xl font-bold text-white">Setup</h1>
      <VideoPreview />
      <div className="flex h-16 items-center gap-3">
        <AudioVolumeIndicator />
        <DeviceSettings />
      </div>
      <label className="flex items-center gap-2 font-medium text-white">
        <input
          type="checkbox"
          checked={micCamDisabled}
          onChange={(e) => setMicCamDisabled(e.target.checked)}
          className="rounded"
        />
        Join with mic and camera off
      </label>
      <Button onClick={onSetupComplete} disabled={isJoining}>
        {isJoining ? 'Joining...' : 'Join meeting'}
      </Button>
    </div>
  );
}

// Call UI Component
function CallUI() {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <PageLoader message="Joining call..." />
      </div>
    );
  }

  return (
    <>
      <style>{callControlsStyle}</style>
      <SpeakerLayout />
      <CallControls />
    </>
  );
}

// Meeting Screen Component
function MeetingScreen({
  call,
  navigate,
  user,
}: {
  call: Call;
  navigate: (path: string | number) => void;
  user: any;
}) {
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callEndedAt = useCallEndedAt();
  const callStartsAt = useCallStartsAt();
  const [setupComplete, setSetupComplete] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleSetupComplete() {
    setIsJoining(true);
    setJoinError(null);
    try {
      await call.join({ create: true });
      setSetupComplete(true);
    } catch (error) {
      console.error('Failed to join call:', error);
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? typeof error.message === 'string'
            ? error.message
            : 'Failed to join the call. Please try again.'
          : 'Failed to join the call. Please try again.';
      setJoinError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  }

  const callIsInFuture = callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;

  if (callHasEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white gap-6">
        <p className="font-bold text-xl">This meeting has ended</p>
        <Button
          onClick={() => {
            const destination =
              user?.role === 'admin'
                ? '/admin'
                : user?.role === 'company'
                  ? '/company'
                  : user?.role === 'graduate'
                    ? '/graduate'
                    : '/';
            navigate(destination);
          }}
        >
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (callIsInFuture) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white gap-6">
        <p className="my-3">
          This meeting has not started yet. It will start at{' '}
          <span className="font-bold">
            {callStartsAt?.toLocaleString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </span>
        </p>
        <Button
          onClick={() => {
            const destination =
              user?.role === 'admin'
                ? '/admin'
                : user?.role === 'company'
                  ? '/company'
                  : user?.role === 'graduate'
                    ? '/graduate'
                    : '/';
            navigate(destination);
          }}
        >
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {setupComplete ? (
        <CallUI />
      ) : (
        <>
          {joinError && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 text-center">
              {joinError}
            </div>
          )}
          <SetupUI
            call={call}
            onSetupComplete={handleSetupComplete}
            isJoining={isJoining}
          />
        </>
      )}
    </div>
  );
}

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
                expiresAt: Date.now() + 55 * 60 * 1000,
              };

              break; // Success, exit retry loop
            } catch (error) {
              // Type guard for error with response property
              const hasResponse = (
                err: unknown
              ): err is { response?: { status?: number } } => {
                return (
                  typeof err === 'object' && err !== null && 'response' in err
                );
              };

              // Type guard for error with code/message properties
              const hasErrorProperties = (
                err: unknown
              ): err is { code?: string; message?: string } => {
                return typeof err === 'object' && err !== null;
              };

              // If it's a 429 (rate limit), wait before retrying
              if (hasResponse(error) && error.response?.status === 429) {
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
                hasErrorProperties(error) &&
                (error.code === 'ERR_NETWORK' ||
                  (typeof error.message === 'string' &&
                    (error.message.includes('CORS') ||
                      error.message === 'Network Error')))
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

  // Create call (but don't join yet - wait for setup)
  useEffect(() => {
    if (!videoClient || !interview?.roomSlug) return;

    const myCall = videoClient.call('default', interview.roomSlug);
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
      hour12: true,
    });
  }, [interview?.scheduledAt]);

  if (isLoading) {
    return <PageLoader message="Preparing interview room..." />;
  }

  if (error || !interview) {
    const getFallbackDestination = () => {
      if (user?.role === 'admin') return '/admin';
      if (user?.role === 'company') return '/company';
      if (user?.role === 'graduate') return '/graduate';
      return '/';
    };
    const fallbackDestination = getFallbackDestination();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 gap-4">
        <ErrorState
          title="Unable to load interview"
          message={
            (error &&
            typeof error === 'object' &&
            'response' in error &&
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response &&
            error.response.data &&
            typeof error.response.data === 'object' &&
            'message' in error.response.data &&
            typeof error.response.data.message === 'string'
              ? error.response.data.message
              : error && typeof error === 'object' && 'message' in error
                ? typeof error.message === 'string'
                  ? error.message
                  : 'Please check the link and try again.'
                : 'Please check the link and try again.') ||
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
                <MeetingScreen
                  call={call}
                  navigate={(path) => {
                    if (typeof path === 'number') {
                      navigate(path);
                    } else {
                      navigate(path);
                    }
                  }}
                  user={user}
                />
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
            onClick={() => {
              const destination =
                user?.role === 'admin'
                  ? '/admin'
                  : user?.role === 'company'
                    ? '/company'
                    : user?.role === 'graduate'
                      ? '/graduate'
                      : '/';
              navigate(destination);
            }}
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
