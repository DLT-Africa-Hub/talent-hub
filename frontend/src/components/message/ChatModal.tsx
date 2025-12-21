import { useEffect, useRef, useState, FormEvent, useMemo } from 'react';
import { FiX } from 'react-icons/fi';
import { AiOutlineSend } from 'react-icons/ai';
import { GrAttachment } from 'react-icons/gr';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { messageApi } from '../../api/message';
import { graduateApi } from '../../api/graduate';
import { companyApi } from '../../api/company';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { useToastContext } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSocket } from '@/context/SocketContext';

interface Company {
  id?: string | number;
  name: string;
  role?: string;
  image?: string;
}

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
  offerId?: string;
  applicationId?: string;
}

interface ChatModalProps {
  company: Company | null;
  onClose: () => void;
}

// Component to render message with clickable job titles
const MessageContent: React.FC<{
  message: string;
  jobId?: string;
  userRole?: string;
}> = ({ message, jobId, userRole }) => {
  const navigate = useNavigate();

  // Extract job title from message (text in quotes)
  const extractJobTitle = (msg: string): string | null => {
    const match = msg.match(/"([^"]+)"/);
    return match ? match[1] : null;
  };

  const jobTitle = extractJobTitle(message);

  // Search for job by title if jobId is not provided
  const { data: jobSearchResult } = useQuery({
    queryKey: ['jobSearchByTitle', jobTitle],
    queryFn: async () => {
      if (!jobTitle || userRole !== 'admin' || jobId) return null;
      try {
        const response = await adminApi.getAllJobs({ q: jobTitle, limit: 1 });
        const jobs = response.data || [];
        if (jobs.length > 0) {
          const job = jobs[0];
          // Extract job ID - handle both id and _id formats
          return job.id || (job._id ? String(job._id) : null);
        }
        return null;
      } catch (error) {
        console.error('Error searching for job:', error);
        return null;
      }
    },
    enabled: !!jobTitle && userRole === 'admin' && !jobId,
  });

  // Use provided jobId or search result
  const resolvedJobId = jobId || jobSearchResult;

  const handleJobTitleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Job title clicked', { resolvedJobId, userRole, jobTitle });
    if (resolvedJobId && userRole === 'admin') {
      // Navigate to admin jobs page and store jobId to open modal
      navigate('/admin/jobs', { state: { openJobId: resolvedJobId } });
    }
  };

  // Parse message to find job title in quotes and make it clickable
  const renderMessage = () => {
    // Check if message contains quoted text (job title pattern)
    const hasQuotedText = /"[^"]+"/.test(message);

    // Only make clickable if:
    // 1. Message contains quoted text (job title)
    // 2. We have a resolvedJobId (either from applicationId or search)
    // 3. User is admin
    if (!hasQuotedText || !resolvedJobId || userRole !== 'admin') {
      return <span>{message}</span>;
    }

    // Match text in quotes (job title)
    const parts = message.split(/"([^"]+)"/);
    if (parts.length <= 1) {
      // No quotes found, return as-is
      return <span>{message}</span>;
    }

    return (
      <>
        {parts.map((part, index) => {
          // Odd indices are the quoted text (job titles)
          if (index % 2 === 1) {
            return (
              <button
                key={index}
                type="button"
                onClick={handleJobTitleClick}
                className="inline-block text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer px-0 py-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                style={{
                  animation: 'blink 1.5s ease-in-out infinite',
                  pointerEvents: 'auto',
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(37, 99, 235, 0.5)',
                }}
              >
                "{part}"
              </button>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  return <div>{renderMessage()}</div>;
};

const ChatModal: React.FC<ChatModalProps> = ({ company, onClose }) => {
  const { user } = useAuth();
  const { success, error: showError } = useToastContext();
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingSignedOffer, setIsUploadingSignedOffer] = useState(false);
  const [isConfirmingHire, setIsConfirmingHire] = useState(false);
  const [showConfirmHireDialog, setShowConfirmHireDialog] = useState(false);
  const [showMarkHiredDialog, setShowMarkHiredDialog] = useState(false);
  const {
    socket,
    onlineUsers,
    typingUsers,
    startTyping,
    stopTyping,
    refreshUnreadCount,
  } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signedOfferInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  // Check if the company/user we're chatting with is online
  const isCompanyOnline = company?.id
    ? onlineUsers.has(company.id as string)
    : false;

  const CLOUDINARY_UPLOAD_PRESET = import.meta.env
    .VITE_CLOUDINARY_UPLOAD_PRESET;
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const { data: messages, isLoading } = useQuery({
    queryKey: ['conversation', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const response = await messageApi.getConversation(company.id as string);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!company?.id,
    refetchInterval: false, // Real-time updates via Socket.IO
    retry: (failureCount, error) => {
      // Don't retry on 429 errors
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 429) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Find offerId or applicationId from messages
  const { offerId, applicationId } = useMemo(() => {
    if (!messages || !Array.isArray(messages))
      return { offerId: null, applicationId: null };

    // First, try to find offerId directly
    const offerMessage = messages.find((msg: Message) => msg.offerId);
    if (offerMessage?.offerId) {
      const foundOfferId =
        typeof offerMessage.offerId === 'string'
          ? offerMessage.offerId
          : offerMessage.offerId.toString();
      return {
        offerId: foundOfferId,
        applicationId: offerMessage.applicationId
          ? typeof offerMessage.applicationId === 'string'
            ? offerMessage.applicationId
            : offerMessage.applicationId.toString()
          : null,
      };
    }

    // If no offerId, try to find applicationId
    const appMessage = messages.find((msg: Message) => msg.applicationId);
    if (appMessage?.applicationId) {
      const foundAppId =
        typeof appMessage.applicationId === 'string'
          ? appMessage.applicationId
          : appMessage.applicationId.toString();
      return { offerId: null, applicationId: foundAppId };
    }

    return { offerId: null, applicationId: null };
  }, [messages]);

  // Fetch offer details by offerId (for graduates)
  const { data: offerDataById, isLoading: isLoadingOfferById } = useQuery({
    queryKey: ['offer', offerId],
    queryFn: async () => {
      if (!offerId) return null;
      try {
        const response = await graduateApi.getOfferById(offerId);
        return response.offer;
      } catch (error) {
        console.error('Error fetching offer by ID:', error);
        return null;
      }
    },
    enabled: !!offerId && user?.role === 'graduate',
    refetchInterval: 5000, // Refetch every 5 seconds to check for status updates
  });

  // Fetch offer details by applicationId (fallback for graduates)
  const { data: offerDataByApp, isLoading: isLoadingOfferByApp } = useQuery({
    queryKey: ['offer-by-app', applicationId],
    queryFn: async () => {
      if (!applicationId) return null;
      try {
        const response = await graduateApi.getOffer(applicationId);
        return response.offer;
      } catch (error) {
        console.error('Error fetching offer by application ID:', error);
        return null;
      }
    },
    enabled: !!applicationId && !offerId && user?.role === 'graduate',
    refetchInterval: 5000, // Refetch every 5 seconds to check for status updates
  });

  // Fetch offer details by offerId (for companies)
  const { data: offerDataForCompany, isLoading: isLoadingOfferForCompany } =
    useQuery({
      queryKey: ['offer-company', offerId],
      queryFn: async () => {
        if (!offerId) return null;
        try {
          const response = await companyApi.getOfferById(offerId);
          return response.offer;
        } catch (error) {
          console.error('Error fetching offer by ID for company:', error);
          return null;
        }
      },
      enabled: !!offerId && user?.role === 'company',
      refetchInterval: 5000, // Refetch every 5 seconds to check for status updates
    });

  // Fetch offer details by offerId (for admins)
  const { data: offerDataForAdmin, isLoading: isLoadingOfferForAdmin } =
    useQuery({
      queryKey: ['offer-admin', offerId],
      queryFn: async () => {
        if (!offerId) return null;
        try {
          const response = await adminApi.getOfferById(offerId);
          // Admin API returns { success: true, data: offer } or { offer }
          return response.data || response.offer || response;
        } catch (error) {
          // Don't log 429 errors (rate limiting) as they're expected
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status !== 429) {
            console.error('Error fetching offer by ID for admin:', error);
          }
          return null;
        }
      },
      enabled: !!offerId && user?.role === 'admin',
      refetchInterval: (query) => {
        // Only refetch if we have data and it's not in a terminal state
        const offer = query.state.data as any;
        if (
          offer &&
          (offer.status === 'accepted' ||
            offer.status === 'hired' ||
            offer.status === 'rejected')
        ) {
          return false; // Don't refetch if offer is in terminal state
        }
        return 10000; // Refetch every 10 seconds for pending/signed offers
      },
      retry: (failureCount, error) => {
        // Don't retry on 429 errors
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 429) {
          return false;
        }
        return failureCount < 3;
      },
    });

  // Use offer from appropriate source based on user role
  const offer =
    user?.role === 'company'
      ? offerDataForCompany || null
      : user?.role === 'admin'
        ? offerDataForAdmin || null
        : offerDataById || offerDataByApp || null;
  const isLoadingOffer =
    user?.role === 'company'
      ? isLoadingOfferForCompany
      : user?.role === 'admin'
        ? isLoadingOfferForAdmin
        : isLoadingOfferById || isLoadingOfferByApp;

  const handleUploadSignedOffer = async (file: File) => {
    const offerIdToUpload = offer?._id || offer?.id || offerId;

    if (!offerIdToUpload) {
      showError('Unable to upload signed offer. Offer ID not found.');
      return;
    }

    setIsUploadingSignedOffer(true);
    try {
      await graduateApi.uploadSignedOffer(offerIdToUpload.toString(), file);

      // Invalidate queries to refresh offer status
      queryClient.invalidateQueries({ queryKey: ['offer', offerId] });
      queryClient.invalidateQueries({
        queryKey: ['offer-by-app', applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversation', company?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });

      success(
        'Contract signed successfully! The company has been notified and will confirm your hire.'
      );
    } catch (error) {
      console.error('Upload signed offer error:', error);
      showError('Failed to upload signed contract. Please try again.');
    } finally {
      setIsUploadingSignedOffer(false);
      if (signedOfferInputRef.current) {
        signedOfferInputRef.current.value = '';
      }
    }
  };

  const handleSignedOfferFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF
    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      showError('Only PDF files are allowed for signed offers.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB');
      return;
    }

    handleUploadSignedOffer(file);
  };

  const handleConfirmHire = async () => {
    const offerIdToConfirm = offer?._id || offer?.id || offerId;

    if (!offerIdToConfirm || !offer) {
      showError('Unable to confirm hire. Offer ID not found.');
      return;
    }

    setShowConfirmHireDialog(true);
  };

  const confirmHireAction = async () => {
    const offerIdToConfirm = offer?._id || offer?.id || offerId;

    if (!offerIdToConfirm || !offer) {
      showError('Unable to confirm hire. Offer ID not found.');
      setShowConfirmHireDialog(false);
      return;
    }

    setIsConfirmingHire(true);
    try {
      // For admins, update application status to 'hired' directly
      // For companies, use the confirmHire endpoint which also updates offer status
      if (user?.role === 'admin' && applicationId) {
        await adminApi.updateApplicationStatus(applicationId, 'hired');
      } else {
        await companyApi.confirmHire(offerIdToConfirm.toString());
      }

      // Invalidate and refetch all queries to refresh data immediately
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['offer-company'],
          exact: false,
        }),
        queryClient.invalidateQueries({ queryKey: ['offer'], exact: false }),
        queryClient.invalidateQueries({
          queryKey: ['conversation'],
          exact: false,
        }),
        queryClient.invalidateQueries({ queryKey: ['messages'], exact: false }),
        queryClient.invalidateQueries({
          queryKey: ['companyApplications'],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ['companyMatches'],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ['companyCandidates'],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ['adminJob'],
          exact: false,
        }),
      ]);

      // Refetch immediately to ensure UI updates
      queryClient.refetchQueries({
        queryKey: ['companyApplications'],
        exact: false,
      });

      success(
        'Hire confirmed successfully! The candidate has been marked as hired.'
      );
      setShowConfirmHireDialog(false);
    } catch (error) {
      console.error('Confirm hire error:', error);
      showError('Failed to confirm hire. Please try again.');
    } finally {
      setIsConfirmingHire(false);
    }
  };

  // Mutation for marking applicant as hired (without offer)
  const markHiredMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      // Use admin API if user is admin, otherwise use company API
      if (user?.role === 'admin') {
        return await adminApi.updateApplicationStatus(applicationId, 'hired');
      }
      return await companyApi.updateApplicationStatus(applicationId, 'hired');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversation', company?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({
        queryKey: ['companyApplications'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['companyCandidates'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['adminJob'],
        exact: false,
      });
      success('Applicant marked as hired successfully!');
      setShowMarkHiredDialog(false);
    },
    onError: (error: unknown) => {
      console.error('Mark hired error:', error);
      showError('Failed to mark applicant as hired. Please try again.');
    },
  });

  const handleMarkHired = () => {
    if (!applicationId) {
      showError('Application ID not found. Cannot mark as hired.');
      return;
    }
    setShowMarkHiredDialog(true);
  };

  const confirmMarkHired = () => {
    if (!applicationId) {
      showError('Application ID not found. Cannot mark as hired.');
      setShowMarkHiredDialog(false);
      return;
    }
    markHiredMutation.mutate(applicationId);
  };

  // Listen for new messages via Socket.IO
  useEffect(() => {
    if (!socket || !company?.id) return;

    const handleNewMessage = (message: Message) => {
      // Check if message is for this conversation
      if (
        (message.senderId === company.id && message.receiverId === user?.id) ||
        (message.receiverId === company.id && message.senderId === user?.id)
      ) {
        // Invalidate queries to refresh messages
        queryClient.invalidateQueries({
          queryKey: ['conversation', company.id],
        });
        queryClient.invalidateQueries({ queryKey: ['messages'] });

        // Auto-mark as read if chat is open
        if (
          message.senderId === company.id &&
          message.receiverId === user?.id
        ) {
          messageApi.markAsRead(company.id as string).then(() => {
            refreshUnreadCount();
          });
        }
      }
    };

    const handleMessageRead = (_data: {
      messageId: string;
      readBy: string;
      readAt: Date;
    }) => {
      // Update local message state to show read receipt
      queryClient.invalidateQueries({
        queryKey: ['conversation', company.id],
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleMessageRead);

    // Join conversation room
    socket.emit('conversation:join', company.id);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleMessageRead);
      socket.emit('conversation:leave', company.id);
    };
  }, [socket, company?.id, user?.id, queryClient, refreshUnreadCount]);

  // Cleanup typing timeout on unmount or company change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isTyping && company?.id) {
        stopTyping(company.id as string);
      }
    };
  }, [company?.id, isTyping, stopTyping]);

  useEffect(() => {
    if (company?.id && messages && messages.length > 0) {
      const hasUnread = messages.some(
        (msg: Message) =>
          !msg.read &&
          msg.receiverId === user?.id &&
          msg.senderId === company.id
      );

      if (hasUnread) {
        messageApi.markAsRead(company.id as string).then(() => {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
          refreshUnreadCount();
        });
      }
    }
  }, [company?.id, messages, user, queryClient, refreshUnreadCount]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      message: string;
      fileUrl?: string;
      fileName?: string;
    }) => {
      if (!company?.id) throw new Error('No conversation selected');
      return await messageApi.sendMessage({
        receiverId: company.id as string,
        message: data.message,
        type: data.fileUrl ? 'file' : 'text',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversation', company?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Upload file to Cloudinary
  const uploadToCloudinary = async (
    file: File
  ): Promise<{ url: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadProgress(100);

      return {
        url: data.secure_url,
        fileName: file.name,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (!company?.id) return;

    // Start typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      startTyping(company.id as string);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(company.id as string);
    }, 2000);

    // Stop typing if input is empty
    if (!value.trim() && isTyping) {
      setIsTyping(false);
      stopTyping(company.id as string);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();

    if (
      (!input.trim() && !selectedFile) ||
      sendMessageMutation.isPending ||
      isUploading
    ) {
      return;
    }

    // Stop typing when sending
    if (isTyping && company?.id) {
      setIsTyping(false);
      stopTyping(company.id as string);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }

    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadToCloudinary(selectedFile);
        fileUrl = uploadResult.url;
        fileName = uploadResult.fileName;
      }

      // Send message with or without file
      await sendMessageMutation.mutateAsync({
        message: input.trim() || `Sent a file: ${fileName}`,
        fileUrl,
        fileName,
      });

      // Reset form
      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Send message error:', error);
      showError('Failed to send message. Please try again.');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isMyMessage = (msg: Message) => {
    const myId = user?.id;
    return (
      msg.senderId === myId || msg.senderId.toString() === myId?.toString()
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const docExts = ['pdf', 'doc', 'docx', 'txt'];

    if (imageExts.includes(ext || '')) return '🖼️';
    if (docExts.includes(ext || '')) return '📄';
    return '📎';
  };

  return (
    <div
      className="fixed inset-0 z-40 md:inset-auto lg:bottom-0 lg:right-0 md:w-[530px] md:h-[571px] font-inter md:rounded-[12px]"
      aria-modal="true"
      role="dialog"
    >
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/40"
        onClick={onClose}
      ></div>

      <div className="relative h-full md:h-full md:border md:border-fade bg-white shadow-2xl md:shadow-lg md:rounded-[20px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start gap-[22px] px-4 py-3 w-full">
          <div className="flex w-full justify-between">
            <div className="flex items-center gap-[22px]">
              <div className="w-[71px] aspect-square relative overflow-hidden rounded-full">
                {company?.image && (
                  <img
                    src={company.image}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="font-semibold text-[22px] text-[#1C1C1C]">
                  {company?.name}
                </p>
                {company?.role && (
                  <p className="text-[#1C1C1C80] text-[18px] font-medium">
                    {company?.role}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-[5px] py-2.5 px-5 border-2 rounded-[20px] ${
                  isCompanyOnline
                    ? 'border-[#5CFF0D] bg-[#EFFFE2]'
                    : 'border-gray-300 bg-gray-100'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCompanyOnline ? 'bg-[#5CFF0D]' : 'bg-gray-400'
                  }`}
                ></span>
                <p
                  className={`font-medium text-[14px] ${
                    isCompanyOnline ? 'text-[#5CFF0D]' : 'text-gray-600'
                  }`}
                >
                  {isCompanyOnline ? 'online' : 'offline'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-md hover:bg-[#00000006] p-1"
            aria-label="Close chat"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="w-full flex items-center justify-center mb-2">
          <p className="text-[14px] px-[20px] rounded-[20px] py-[10px] text-[#1C1C1C] bg-fade">
            Today
          </p>
        </div>

        {/* Messages area */}
        <div
          ref={messagesRef}
          className="flex-1 p-4 overflow-y-auto space-y-3 bg-linear-to-b from-white to-[#fafafa]"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#1C1C1C80]">Loading messages...</p>
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#1C1C1C80]">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg: Message) => {
              const isMine = isMyMessage(msg);
              return (
                <div
                  key={msg._id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 text-[14px] font-medium rounded-lg wrap-break-words ${
                      isMine
                        ? 'bg-[#5CFF0D20] text-[#1C1C1C]'
                        : 'bg-fade text-[#1C1C1C]'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col gap-1">
                      <MessageContent
                        message={msg.message}
                        jobId={
                          msg.applicationId
                            ? typeof msg.applicationId === 'string'
                              ? msg.applicationId
                              : typeof msg.applicationId === 'object' &&
                                  msg.applicationId !== null
                                ? '_id' in msg.applicationId
                                  ? String(
                                      (msg.applicationId as { _id: unknown })
                                        ._id
                                    )
                                  : String(msg.applicationId)
                                : String(msg.applicationId)
                            : undefined
                        }
                        userRole={user?.role}
                      />

                      {/* Display file attachment */}
                      {msg.fileUrl && msg.fileName && (
                        <div className="mt-2 pt-2 border-t border-[#00000020]">
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[#0066CC] hover:underline"
                          >
                            <span className="text-[16px]">
                              {getFileIcon(msg.fileName)}
                            </span>
                            <span className="text-[13px] truncate max-w-[200px]">
                              {msg.fileName}
                            </span>
                          </a>
                        </div>
                      )}

                      {/* Display offer badge */}
                      {msg.type === 'offer' && (
                        <div className="mt-2 inline-block px-2 py-1 bg-[#5CFF0D] text-white text-[11px] rounded-md font-semibold">
                          📄 Offer Letter
                        </div>
                      )}

                      {/* Timestamp inside message bubble */}
                      <div className="flex justify-end mt-1">
                        <span className="text-[10px] text-[#00000066]">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Typing indicator */}
        {company?.id && typingUsers.has(company.id as string) && (
          <div className="px-4 py-2 bg-[#F5F5F5] border-t border-fade">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-[#1C1C1C80] rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></span>
                <span
                  className="w-2 h-2 bg-[#1C1C1C80] rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></span>
                <span
                  className="w-2 h-2 bg-[#1C1C1C80] rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></span>
              </div>
              <span className="text-[12px] text-[#1C1C1C80]">
                {company.name} is typing...
              </span>
            </div>
          </div>
        )}

        {/* File preview */}
        {selectedFile && (
          <div className="px-4 py-2 bg-[#F5F5F5] border-t border-fade">
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[20px]">
                  {getFileIcon(selectedFile.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1C1C1C] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-[#1C1C1C80]">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-[#00000010] rounded-full transition-colors"
                aria-label="Remove file"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="px-4 py-2 bg-[#F5F5F5] border-t border-fade">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#5CFF0D] h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="text-[12px] text-[#1C1C1C80]">
                {uploadProgress}%
              </span>
            </div>
          </div>
        )}

        {/* Loading offer indicator */}
        {user?.role === 'graduate' &&
          isLoadingOffer &&
          (offerId || applicationId) &&
          !offer && (
            <div className="px-4 py-2 border-t border-fade bg-[#F5F5F5]">
              <p className="text-[12px] text-[#1C1C1C80]">
                Loading offer information...
              </p>
            </div>
          )}

        {/* Show pending offer with upload prompt */}
        {user?.role === 'graduate' && offer && offer.status === 'pending' && (
          <div className="px-4 py-3 border-t border-fade bg-[#FFF9E6]">
            <div className="flex flex-col gap-3">
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1C1C1C] mb-1">
                  Offer Pending Signature
                </p>
                <p className="text-[12px] text-[#1C1C1C80]">
                  Please download, sign, and upload your signed offer document
                  (PDF). Once uploaded, the company will be notified and can
                  confirm your hire.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={signedOfferInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleSignedOfferFileSelect}
                  className="hidden"
                  disabled={isUploadingSignedOffer}
                />
                <button
                  onClick={() => signedOfferInputRef.current?.click()}
                  disabled={isUploadingSignedOffer}
                  className="px-4 py-2 bg-[#FFA500] text-white font-semibold text-[14px] rounded-[20px] hover:bg-[#FF8C00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploadingSignedOffer
                    ? 'Uploading...'
                    : 'Upload Signed Contract'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contract Signed Status - Show when offer is signed (for graduate) */}
        {user?.role === 'graduate' && offer && offer.status === 'signed' && (
          <div className="px-4 py-3 border-t border-fade bg-[#E8F5E9]">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">✅</span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E7D32] mb-1">
                  Contract Signed
                </p>
                <p className="text-[12px] text-[#1C1C1C80]">
                  Your signed offer document has been uploaded. Waiting for
                  company confirmation.
                </p>
              </div>
            </div>
          </div>
        )}

        {user?.role === 'graduate' && offer && offer.status === 'accepted' && (
          <div className="px-4 py-3 border-t border-fade bg-[#E8F5E9]">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🎉</span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E7D32] mb-1">
                  Hire Confirmed!
                </p>
                <p className="text-[12px] text-[#1C1C1C80]">
                  Congratulations! The company has confirmed your hire. Welcome
                  to the team!
                </p>
              </div>
            </div>
          </div>
        )}

        {(user?.role === 'company' || user?.role === 'admin') &&
          offer &&
          offer.status === 'signed' && (
            <div className="px-4 py-3 border-t border-fade bg-[#EFFFE2]">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#1C1C1C] mb-1">
                    Contract Signed
                  </p>
                  <p className="text-[12px] text-[#1C1C1C80]">
                    The candidate has uploaded their signed offer document.
                    Preview the contract before confirming the hire.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {offer.signedDocumentUrl && (
                    <a
                      href={offer.signedDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white border-2 border-[#5CFF0D] text-[#5CFF0D] font-semibold text-[14px] rounded-[20px] hover:bg-[#F0FFF0] transition-colors whitespace-nowrap flex items-center gap-2"
                    >
                      <span>📄</span>
                      Preview Contract
                    </a>
                  )}
                  <button
                    onClick={handleConfirmHire}
                    disabled={isConfirmingHire}
                    className="px-4 py-2 bg-[#5CFF0D] text-white font-semibold text-[14px] rounded-[20px] hover:bg-[#4DE600] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {isConfirmingHire ? 'Confirming...' : 'Confirm Hire'}
                  </button>
                </div>
              </div>
            </div>
          )}

        {user?.role === 'company' && offer && offer.status === 'accepted' && (
          <div className="px-4 py-3 border-t border-fade bg-[#E8F5E9]">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">✅</span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E7D32] mb-1">
                  Hire Confirmed
                </p>
                <p className="text-[12px] text-[#1C1C1C80]">
                  The candidate has been marked as hired and the job posting has
                  been closed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mark as Hired button for companies and admins (only when offer has been sent and accepted) - This is a fallback if confirmHire wasn't used */}
        {(user?.role === 'company' || user?.role === 'admin') &&
          applicationId &&
          offer &&
          offer.status === 'accepted' && (
            <div className="px-4 py-3 border-t border-fade bg-[#F5F5F5]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#1C1C1C] mb-1">
                    Mark as Hired
                  </p>
                  <p className="text-[12px] text-[#1C1C1C80]">
                    Mark this applicant as hired. The offer has been accepted.
                  </p>
                </div>
                <button
                  onClick={handleMarkHired}
                  disabled={markHiredMutation.isPending}
                  className="px-4 py-2 bg-[#5CFF0D] text-white font-semibold text-[14px] rounded-[20px] hover:bg-[#4DE600] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {markHiredMutation.isPending ? 'Marking...' : 'Mark as Hired'}
                </button>
              </div>
            </div>
          )}

        {/* Show rejected status */}
        {user?.role === 'graduate' && offer && offer.status === 'rejected' && (
          <div className="px-4 py-3 border-t border-fade bg-[#FFEBEE]">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">❌</span>
              <p className="text-[14px] font-semibold text-[#C62828]">
                Offer Rejected
              </p>
            </div>
          </div>
        )}

        {/* Input area */}
        <form
          onSubmit={handleSend}
          className="px-[20px] py-[28px] border-t-2 border-fade flex items-center gap-3"
        >
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Write a message"
            className="flex-1 outline-none placeholder:text-[#1C1C1C80] bg-fade px-3 py-2 rounded-[20px] text-[14px]"
            disabled={sendMessageMutation.isPending || isUploading}
          />

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-full cursor-pointer transition-colors ${
              selectedFile
                ? 'bg-[#5CFF0D20] text-[#5CFF0D]'
                : 'bg-fade text-[#1C1C1C80] hover:bg-[#00000010]'
            }`}
            aria-label="Attach file"
            disabled={isUploading}
          >
            <GrAttachment size={18} />
          </button>

          <button
            type="submit"
            className="p-2 rounded-full cursor-pointer bg-fade text-[#1C1C1C80] disabled:opacity-50 hover:bg-[#00000010] transition-colors"
            aria-label="Send message"
            disabled={
              sendMessageMutation.isPending ||
              isUploading ||
              (!input.trim() && !selectedFile)
            }
          >
            <AiOutlineSend size={18} />
          </button>
        </form>
      </div>

      <ConfirmDialog
        isOpen={showConfirmHireDialog}
        title="Confirm Hire"
        message="Are you sure you want to confirm this hire? This will mark the candidate as hired and close the job posting."
        confirmText="Confirm Hire"
        cancelText="Cancel"
        variant="info"
        onConfirm={confirmHireAction}
        onCancel={() => setShowConfirmHireDialog(false)}
        isLoading={isConfirmingHire}
      />

      <ConfirmDialog
        isOpen={showMarkHiredDialog}
        title="Mark as Hired"
        message="Are you sure you want to mark this applicant as hired? This will update the application status to 'hired'."
        confirmText="Mark as Hired"
        cancelText="Cancel"
        variant="info"
        onConfirm={confirmMarkHired}
        onCancel={() => setShowMarkHiredDialog(false)}
        isLoading={markHiredMutation.isPending}
      />
    </div>
  );
};

export default ChatModal;
