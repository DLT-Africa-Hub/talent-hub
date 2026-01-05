import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiCalendar, HiLink, HiCheckCircle, HiXCircle } from 'react-icons/hi2';
import { companyApi } from '../../api/company';
import { Button, Input } from '../ui';
import { LoadingSpinner } from '../../index';

const CalendlyIntegration = () => {
  const queryClient = useQueryClient();
  const [publicLink, setPublicLink] = useState('');
  const [isSettingLink, setIsSettingLink] = useState(false);

  const { data: calendlyStatus, isLoading } = useQuery({
    queryKey: ['calendlyStatus'],
    queryFn: async () => {
      const response = await companyApi.getCalendlyStatus();
      return response;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await companyApi.getCalendlyAuthUrl();
      // Redirect to Calendly OAuth URL
      window.location.href = response.authUrl;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await companyApi.disconnectCalendly();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendlyStatus'] });
    },
  });

  const setPublicLinkMutation = useMutation({
    mutationFn: async (link: string) => {
      await companyApi.setCalendlyPublicLink(link);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendlyStatus'] });
      setIsSettingLink(false);
      setPublicLink('');
    },
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleDisconnect = () => {
    if (
      window.confirm(
        'Are you sure you want to disconnect your Calendly account? Candidates will no longer be able to schedule interviews through Calendly.'
      )
    ) {
      disconnectMutation.mutate();
    }
  };

  const handleSetPublicLink = () => {
    if (!publicLink.trim()) {
      return;
    }
    setPublicLinkMutation.mutate(publicLink.trim());
  };

  if (isLoading) {
    return (
      <div className="rounded-[20px] border border-fade bg-white p-[24px] shadow-sm">
        <LoadingSpinner message="Loading Calendly status..." />
      </div>
    );
  }

  const isConnected = calendlyStatus?.connected && calendlyStatus?.enabled;

  return (
    <div className="rounded-[20px] border border-fade bg-white p-[24px] shadow-sm">
      <div className="flex items-center gap-[8px] mb-[20px]">
        <HiCalendar className="text-[20px] text-button" />
        <h3 className="text-[18px] font-semibold text-[#1C1C1C]">
          Calendly Integration
        </h3>
      </div>

      <div className="flex flex-col gap-[20px]">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-[16px] rounded-[12px] bg-[#F8F8F8]">
          <div className="flex items-center gap-[12px]">
            {isConnected ? (
              <HiCheckCircle className="text-[24px] text-green-600" />
            ) : (
              <HiXCircle className="text-[24px] text-gray-400" />
            )}
            <div>
              <p className="text-[15px] font-medium text-[#1C1C1C]">
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
              <p className="text-[13px] text-[#1C1C1C80]">
                {isConnected
                  ? 'Candidates can schedule interviews via Calendly'
                  : 'Connect your Calendly account to enable interview scheduling'}
              </p>
            </div>
          </div>
          {isConnected ? (
            <Button
              variant="danger"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? 'Connecting...' : 'Connect Calendly'}
            </Button>
          )}
        </div>

        {/* Public Link Section */}
        {isConnected && (
          <div className="flex flex-col gap-[12px] p-[16px] rounded-[12px] border border-fade bg-white">
            <div className="flex items-center gap-[8px]">
              <HiLink className="text-[18px] text-[#1C1C1C80]" />
              <label className="text-[14px] font-medium text-[#1C1C1C]">
                Public Calendly Link (Optional)
              </label>
            </div>
            <p className="text-[12px] text-[#1C1C1C80]">
              Share your public Calendly link for candidates to view your
              availability
            </p>
            {calendlyStatus?.publicLink && !isSettingLink ? (
              <div className="flex items-center justify-between p-[12px] rounded-[8px] bg-[#F8F8F8]">
                <a
                  href={calendlyStatus.publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-button hover:text-[#176300] font-medium flex items-center gap-[6px] transition-colors break-all"
                >
                  <HiLink className="text-[16px] shrink-0" />
                  <span className="truncate">{calendlyStatus.publicLink}</span>
                </a>
                <Button
                  variant="secondary"
                  onClick={() => setIsSettingLink(true)}
                  className="ml-4 shrink-0"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                <Input
                  type="url"
                  placeholder="https://calendly.com/your-username/30min"
                  value={publicLink}
                  onChange={(e) => setPublicLink(e.target.value)}
                />
                <div className="flex gap-[8px]">
                  <Button
                    variant="primary"
                    onClick={handleSetPublicLink}
                    disabled={
                      !publicLink.trim() || setPublicLinkMutation.isPending
                    }
                    className="flex-1"
                  >
                    {setPublicLinkMutation.isPending
                      ? 'Saving...'
                      : 'Save Link'}
                  </Button>
                  {isSettingLink && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIsSettingLink(false);
                        setPublicLink('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        {!isConnected && (
          <div className="p-[16px] rounded-[12px] bg-blue-50 border border-blue-200">
            <p className="text-[13px] text-blue-800">
              <strong>How it works:</strong> Connect your Calendly account to
              allow candidates to view your availability and schedule interviews
              directly. You can also set a public Calendly link for easy
              sharing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendlyIntegration;
