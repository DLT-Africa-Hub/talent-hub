import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { messageApi } from '../api/message';
import ChatModal from '../components/message/ChatModal';
import { DEFAULT_COMPANY_IMAGE, DEFAULT_PROFILE_IMAGE } from '../utils/job.utils';
import { LoadingSpinner } from '../index';
import { SearchBar } from '../components/ui';

interface Conversation {
  id: string;
  name: string;
  role?: string;
  image: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: messagesResponse,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const response = await messageApi.getMessages({ page: 1, limit: 100 });
      return response;
    },
  });

  const conversations = useMemo(() => {
    if (!messagesResponse) return [];

    let conversationsData: any[] = [];
    if (Array.isArray(messagesResponse)) {
      conversationsData = messagesResponse;
    } else if (messagesResponse?.conversations && Array.isArray(messagesResponse.conversations)) {
      conversationsData = messagesResponse.conversations;
    } else if (messagesResponse?.messages && Array.isArray(messagesResponse.messages)) {
      conversationsData = messagesResponse.messages;
    }

    return conversationsData.map((conv: any): Conversation => {
      let name = 'Unknown';
      let role = '';
      let image = DEFAULT_COMPANY_IMAGE;

      if (user?.role === 'graduate') {
        const company = conv.company || conv.companyId || {};
        name = company.companyName || company.name || 'Company';
        image = company.logo || company.image || DEFAULT_COMPANY_IMAGE;
      } else if (user?.role === 'company') {
        const graduate = conv.graduate || conv.graduateId || {};
        const firstName = graduate.firstName || '';
        const lastName = graduate.lastName || '';
        name = `${firstName} ${lastName}`.trim() || 'Graduate';
        role = graduate.position || graduate.role || '';
        image = graduate.profilePictureUrl || graduate.image || DEFAULT_PROFILE_IMAGE;
      }

      const lastMessage = conv.lastMessage?.text || conv.lastMessage || '';
      const lastMessageTime = conv.lastMessage?.createdAt
        ? new Date(conv.lastMessage.createdAt)
        : conv.updatedAt
          ? new Date(conv.updatedAt)
          : undefined;

      return {
        id: conv._id || conv.id || '',
        name,
        role,
        image,
        lastMessage,
        lastMessageTime,
        unreadCount: conv.unreadCount || 0,
      };
    });
  }, [messagesResponse, user?.role]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.name.toLowerCase().includes(q) ||
        conv.role?.toLowerCase().includes(q) ||
        conv.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const formatTime = useCallback((date?: Date): string => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const openChat = useCallback(
    (conversation: Conversation) => {
      setActiveChat(conversation);
      setIsOpen(true);
      navigate(`/messages/${conversation.id}`, { replace: true });
    },
    [navigate]
  );

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setActiveChat(null);
    navigate('/messages', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (id && conversations.length > 0) {
      const conversationToOpen = conversations.find(
        (conv) => conv.id === id
      );
      if (conversationToOpen && !isOpen) {
        openChat(conversationToOpen);
      }
    }
  }, [id, conversations, isOpen, openChat]);

  const error = useMemo(() => {
    if (!queryError) return null;
    const err = queryError as any;
    return err.response?.data?.message || 'Failed to load messages. Please try again.';
  }, [queryError]);

  return (
    <div className="py-[20px] relative min-h-screen px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] items-start">
      <div className="flex flex-col gap-[20px] w-full md:gap-[30px]">
        <div className="flex flex-col gap-[30px] lg:flex-row justify-between items-start lg:items-center">
          <p className="font-medium text-[22px] text-[#1C1C1C]">Messages</p>

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search messages by name, role, or content..."
            className="self-end"
          />
        </div>
      </div>

      {error && (
        <div className="w-full rounded-[12px] bg-red-50 border border-red-200 p-[16px]">
          <p className="text-[14px] text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <LoadingSpinner message="Loading messages..." fullPage />
      )}

      {!loading && (
        <>
          {filteredConversations.length > 0 ? (
            <div className="flex flex-col w-full">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => openChat(conversation)}
                  className="py-[20px] px-[10px] border-b border-[#00000033] hover:bg-[#00000008] cursor-pointer w-full flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-[27px]">
                    <div className="w-[71px] aspect-square relative overflow-hidden rounded-[10px]">
                      <img
                        src={conversation.image}
                        alt={conversation.name}
                        className="object-cover w-full h-full"
                      />
                      {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <span className="absolute top-[-4px] right-[-4px] flex items-center justify-center min-w-[20px] h-[20px] px-[6px] rounded-full bg-button text-white text-[10px] font-semibold">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 lg:gap-[5px]">
                      <p className="text-[#1C1C1C] font-medium text-[15px] lg:text-[20px]">
                        {conversation.name}
                      </p>
                      {conversation.role && (
                        <p className="text-[#1C1C1C80] font-thin text-[13px] lg:text-[18px]">
                          {conversation.role}
                        </p>
                      )}
                      {conversation.lastMessage && (
                        <p className="text-[#1C1C1C80] font-normal text-[13px] lg:text-[18px] truncate max-w-[150px] lg:max-w-[400px]">
                          {conversation.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {conversation.lastMessageTime && (
                    <p className="text-[#1C1C1C80] font-normal text-[13px] lg:text-[18px]">
                      {formatTime(conversation.lastMessageTime)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-[80px] w-full bg-white rounded-[16px] border border-fade">
              <div className="w-[100px] h-[100px] rounded-[16px] bg-[#E8F5E3] flex items-center justify-center mb-[20px]">
                <div className="w-[64px] h-[64px] rounded-[10px] bg-[#DBFFC0] flex items-center justify-center">
                  <span className="text-[32px] text-button font-bold">×</span>
                </div>
              </div>
              <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[8px]">
                {searchQuery ? 'No messages found' : 'No messages yet'}
              </p>
              <p className="text-[14px] text-[#1C1C1C80] text-center max-w-[400px]">
                {searchQuery
                  ? 'Try adjusting your search to find conversations.'
                  : 'Your conversations will appear here once you start messaging.'}
              </p>
            </div>
          )}
        </>
      )}

      {isOpen && activeChat && (
        <ChatModal
          company={{
            id: activeChat.id,
            name: activeChat.name,
            role: activeChat.role,
            image: activeChat.image,
          }}
          onClose={closeChat}
        />
      )}
    </div>
  );
};

export default Messages;
