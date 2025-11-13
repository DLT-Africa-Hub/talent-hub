import React, { useEffect, useRef, useState, FormEvent } from 'react';
import { FiX } from 'react-icons/fi';
import { AiOutlineSend } from 'react-icons/ai';
import { GrAttachment } from 'react-icons/gr';

interface Company {
  id?: string | number;
  name: string;
  role?: string;
  image?: string;
}

interface Message {
  id: number;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

interface ChatModalProps {
  company: Company | null;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ company, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'them',
      text: `Hi, this is ${company?.name} — Horem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.`,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    {
      id: 1,
      sender: 'me',
      text: `Hi, this is ${company?.name} — Horem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.`,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: 'me',
      text: input.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  return (
    <div
      className="fixed  inset-0 z-40 md:inset-auto  lg:bottom-0 lg:right-0 md:w-[530px] md:h-[571px] font-inter md:rounded-[12px]"
      aria-modal="true"
      role="dialog"
    >
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/40"
        onClick={onClose}
      ></div>

      <div className="relative h-full md:h-full md:border md:border-fade  bg-white shadow-2xl md:shadow-lg md:rounded-[20px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start gap-[22px] px-4 py-3 w-full">
          <div className="flex  w-full justify-between">
            <div className="flex items-center  gap-[22px] ">
              <div className="w-[71px] aspect-square relative overflow-hidden rounded-full">
                {company?.image && (
                  <img
                    src={company.image}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="">
                <p className="font-semibold text-[22px] text-[#1C1C1C]">
                  {company?.name}
                </p>
                <p className="text-[#1C1C1C80] text-[18px] font-medium">
                  {company?.role}
                </p>
              </div>
            </div>

            <div>
              {' '}
              <div className="flex items-center gap-[5px] py-2.5 px-5 border-2 border-[#5CFF0D] rounded-[20px] bg-[#EFFFE2]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#5CFF0D]"></span>
                <p className="text-[#5CFF0D] font-medium text-[14px]">online</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-md hover:bg-[#00000006]"
            aria-label="Close chat"
          >
            <FiX size={18} />
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
          className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-white to-[#fafafa]"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] ${
                m.sender === 'me' ? 'ml-auto text-left' : ''
              }`}
            >
              <div
                className={`inline-block px-3 py-2 text-[14px] font-medium rounded-lg ${
                  m.sender === 'me'
                    ? 'bg-fade text-[#1C1C1C]'
                    : 'bg-fade text-[#1C1C1C]'
                } break-words`}
              >
                {m.text}
              </div>
              <div className="text-[11px] text-[#00000066] mt-1">{m.time}</div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSend}
          className="px-[20px] py-[28px] border-t-2 border-fade flex items-center gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a message"
            className="flex-1 outline-none placeholder:text-[#1C1C1C80] bg-fade px-3 py-2 rounded-[20px]"
          />

          <button
            className="p-2 rounded-full bg-fade cursor-pointer text-[#1C1C1C80]"
            aria-label="Send message"
          >
            <GrAttachment size={18} />
          </button>

          <button
            type="submit"
            className="p-2 rounded-full cursor-pointer bg-fade text-[#1C1C1C80]"
            aria-label="Send message"
          >
            <AiOutlineSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
