import React, { useEffect, useState } from 'react';
import { BsSearch } from 'react-icons/bs';
import { useParams, useSearchParams } from 'react-router-dom';
import { companies } from '../data/companies';
import ChatModal from '../components/message/ChatModal';

interface Company {
  id?: string | number;
  name: string;
  role?: string;
  image: string;
}

const Messages: React.FC = () => {
  const [activeChat, setActiveChat] = useState<Company | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  
  const { id } = useParams<{ id?: string }>();

  const chatId = id

  const openChat = (company: Company) => {
    setActiveChat(company);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

 

  // Check URL param on mount
  useEffect(() => {
    if (chatId) {
      const companyToOpen = companies.find(
        (company) => String(company.id) === chatId
      );
      if (companyToOpen) {
        openChat(companyToOpen);
      }
    }
  }, [chatId]);

  return (
    <div className="py-[20px] relative min-h-screen px-[20px] pb-[120px] lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] items-start justify-center">
      <div className="flex flex-col gap-[20px] w-full md:gap-[30px]">
        <div className="flex flex-col gap-[30px] lg:flex-row justify-between items-start lg:items-center">
          <p className="font-medium text-[22px] text-[#1C1C1C]">Messages</p>

          <div className="flex gap-2.5 items-center self-end text-fade px-5 py-[13.5px] border border-button rounded-[10px] w-full max-w-[708px]">
            <BsSearch />
            <input
              type="text"
              className="w-full placeholder:text-fade text-[#1c1c1c] outline-none"
              placeholder="Search messages"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full">
        {companies.map((company: Company) => (
          <div
            key={company.id ?? company.name}
            onClick={() => openChat(company)}
            className="py-[20px] px-[10px] border-b border-[#00000033] hover:bg-[#00000008] cursor-pointer w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-[27px]">
              <div className="w-[71px] aspect-square relative overflow-hidden rounded-[10px]">
                <img
                  src={company.image}
                  alt={company.name}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex flex-col gap-1 lg:gap-[5px]">
                <p className="text-[#1C1C1C] font-medium text-[15px] lg:text-[20px]">
                  {company.name}
                </p>
                <p className="text-[#1C1C1C80] font-thin text-[13px] lg:text-[18px]">
                  {company.role}
                </p>
                <p className="text-[#1C1C1C80] font-normal text-[13px] lg:text-[18px] truncate max-w-[250px] lg:max-w-[400px]">
                  {company.name}: What do you think about the project
                </p>
              </div>
            </div>

            <p className="text-[#1C1C1C80] font-normal text-[13px] lg:text-[18px]">
              12:30am
            </p>
          </div>
        ))}
      </div>

      {isOpen && <ChatModal company={activeChat} onClose={closeChat} />}
    </div>
  );
};

export default Messages;
