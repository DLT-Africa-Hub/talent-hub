export interface NotificationCompany {
  name: string;
  image: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  company: NotificationCompany;
  createdAt: Date;
  displayDate: string;
  read: boolean;
  relatedId?: string | null;
  relatedType?: string | null;
}

