import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  StreamVideo,
  StreamVideoClient,
  User,
  StreamCall,
  Call,
  SpeakerLayout,
  CallControls,
  StreamTheme,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
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

    const streamApiKey = import.meta.env.VITE_STREAM_API_KEY;
    if (!streamApiKey) {
      console.error('VITE_STREAM_API_KEY is not set');
      return;
    }

    // Create Stream user object
    const streamUser: User = {
      id: user.id || 'user-' + Date.now(),
      name: user.email || 'Guest',
      image: undefined, // Profile picture not available in AuthUser type
    };

    // Token provider function - fetches token from backend
    const tokenProvider = async () => {
      try {
        const token = await interviewApi.getStreamToken();
        return token;
      } catch (error) {
        console.error('Failed to fetch Stream token:', error);
        throw new Error(
          'Failed to get Stream token. Please ensure you are authenticated.'
        );
      }
    };

    const client = new StreamVideoClient({
      apiKey: streamApiKey,
      user: streamUser,
      tokenProvider,
    });

    setVideoClient(client);

    return () => {
      client.disconnectUser();
      setVideoClient(undefined);
    };
  }, [interview, user]);

  // Create and join call
  useEffect(() => {
    if (!videoClient || !interview?.roomSlug) return;

    const myCall = videoClient.call('default', interview.roomSlug);

    myCall.join({ create: true }).catch((err) => {
      console.error('Failed to join the call', err);
    });

    setCall(myCall);

    return () => {
      setCall(undefined);
      myCall.leave().catch((err) => {
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
      <div className="w-full lg:w-2/3 bg-black min-h-[50vh]">
        {videoClient && call ? (
          <StreamVideo client={videoClient}>
            <StreamTheme>
              <StreamCall call={call}>
                <SpeakerLayout />
                <CallControls onLeave={() => navigate(-1)} />
              </StreamCall>
            </StreamTheme>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-white p-8">
            <div>
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
