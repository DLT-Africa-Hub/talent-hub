import React, { useMemo, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { useNavigate } from "react-router-dom";

// Example notification list
const notifications = [
  {
    id: 1,
    type: "job",
    title: "Congratulations! You got the job",
    description: "Your application for Frontend Developer has been approved.",
    company: { name: "Acme Corp", image:  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069"},
    date: new Date(),
   
  },
  {
    id: 2,
    type: "message",
    title: "New message from Tech Co.",
    description: "Hey, we want to discuss your interview...",
    company: { name: "Tech Co.", image:  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069" },
    date: new Date(new Date().setDate(new Date().getDate() - 1)), 

  },
 
];

interface Company {
  name: string;
  image: string;
}

interface NotificationType {
  id: string;
  type: string;
  title: string;
  description: string;
  company: Company;
  date: Date;
  img: string;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!query.trim()) return notifications;
    const q = query.toLowerCase();
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.company.name.toLowerCase().includes(q)
    );
  }, [query]);

  const openNotification = (notification: NotificationType) => {
    setReadMap((prev) => ({ ...prev, [notification.id]: true }));

  
    if (notification.type === "job") {
      navigate(`/company-preview/${notification.id}`);
    } else if (notification.type === "message") {
      navigate(`/messages/${notification.id}`);
    } else {
      console.warn("Unknown notification type:", notification.type);
    }
  };

 
  const today = filtered.filter(
    (n) =>
      n.date.toDateString() === new Date().toDateString()
  );
  const yesterday = filtered.filter(
    (n) =>
      n.date.toDateString() ===
      new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
  );

  const renderNotification = (n: NotificationType) => {
    const isRead = !!readMap[n.id];
    return (
      <button
        key={n.id}
        onClick={() => openNotification(n)}
        className="w-full text-left py-4 px-2 flex items-center justify-between gap-4 hover:bg-[#00000008] cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[10px] overflow-hidden flex-shrink-0">
            <img src={n.company.image} alt={n.company.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <p className="text-[#1C1C1C] font-medium">{n.title}</p>
              {!isRead && <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <p className="text-[#1C1C1C80] text-sm truncate max-w-[300px]">{n.description}</p>
          </div>
        </div>
        <p className="text-[#1C1C1C80] text-[12px]">{isRead ? "Read" : "New"}</p>
      </button>
    );
  };

  return (
    <div className="py-5 px-5 min-h-screen flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <p className="font-medium text-[22px] text-[#1C1C1C]">Notifications</p>
        <div className="flex gap-2.5 items-center text-fade px-4 py-2 border border-button rounded-[10px] w-full max-w-[500px]">
          <BsSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search notifications"
            className="w-full outline-none bg-transparent text-[#1C1C1C]"
          />
        </div>
      </div>

      {today.length > 0 && (
        <div>
          <p className="font-semibold text-[#1C1C1C] mb-2">Today</p>
          <div className="flex flex-col divide-y">{today.map(renderNotification)}</div>
        </div>
      )}

      {yesterday.length > 0 && (
        <div>
          <p className="font-semibold text-[#1C1C1C] mb-2">Yesterday</p>
          <div className="flex flex-col divide-y">{yesterday.map(renderNotification)}</div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-[#1C1C1C80] py-8">No notifications found</p>
      )}
    </div>
  );
};

export default Notifications;
