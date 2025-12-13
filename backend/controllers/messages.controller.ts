import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MessageModel from '../models/Message.model';
import UserModel from '../models/User.model';
import GraduateModel from '../models/Graduate.model';
import CompanyModel from '../models/Company.model';

/**
 * Send a message
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?.userId;
    if (!senderId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      receiverId,
      message,
      type,
      fileUrl,
      fileName,
      applicationId,
      offerId,
    } = req.body;

    if (!receiverId || !message) {
      return res
        .status(400)
        .json({ message: 'receiverId and message are required' });
    }

    // 🔒 SAFETY FIX — Validate user input to prevent MongoDB operator injection
    if (
      typeof receiverId !== 'string' ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({ message: 'Invalid receiverId format' });
    }

    // Validate receiver
    const receiverExists = await UserModel.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const newMessage = await MessageModel.create({
      senderId,
      receiverId,
      message,
      type: type || 'text',
      fileUrl,
      fileName,
      applicationId,
      offerId,
    });

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error('Send Message Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get conversation between two users
 */
export const getConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { otherUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const messages = await MessageModel.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean()
      .then((msgs) =>
        msgs.map((msg) => ({
          ...msg,
          _id: msg._id.toString(),
          senderId: msg.senderId.toString(),
          receiverId: msg.receiverId.toString(),
          applicationId: msg.applicationId
            ? msg.applicationId.toString()
            : undefined,
          offerId: msg.offerId ? msg.offerId.toString() : undefined,
        }))
      );

    await MessageModel.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json(messages);
  } catch (err) {
    console.error('Conversation Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get list of conversations with user details and unread counts
 */
export const getChatList = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const currentUser = await UserModel.findById(userId).lean();
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const conversations = await MessageModel.aggregate([
      {
        $match: {
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userObjectId] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', userObjectId] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    // Batch fetch all users to avoid N+1 queries
    const otherUserIds = conversations.map((conv) => conv._id);
    const otherUsers = await UserModel.find({
      _id: { $in: otherUserIds },
    }).lean();

    const userMap = new Map(
      otherUsers.map((user) => [user._id.toString(), user])
    );

    // Separate users by role for batch fetching
    const graduateUserIds: mongoose.Types.ObjectId[] = [];
    const companyUserIds: mongoose.Types.ObjectId[] = [];

    otherUsers.forEach((user) => {
      if (user.role === 'graduate') {
        graduateUserIds.push(user._id);
      } else if (user.role === 'company') {
        companyUserIds.push(user._id);
      }
    });

    // Batch fetch graduates and companies
    const [graduates, companies] = await Promise.all([
      graduateUserIds.length > 0
        ? GraduateModel.find({
            userId: { $in: graduateUserIds },
          })
            .select('userId firstName lastName profilePictureUrl position')
            .lean()
        : [],
      companyUserIds.length > 0
        ? CompanyModel.find({
            userId: { $in: companyUserIds },
          })
            .select('userId companyName industry website')
            .lean()
        : [],
    ]);

    // Create maps for quick lookup
    const graduateMap = new Map(
      graduates.map((g) => [g.userId?.toString(), g])
    );
    const companyMap = new Map(companies.map((c) => [c.userId?.toString(), c]));

    type UserProfileData = {
      _id: mongoose.Types.ObjectId;
    } & (
      | {
          firstName?: string;
          lastName?: string;
          profilePictureUrl?: string;
          position?: string;
        }
      | {
          companyName?: string;
          industry?: string;
          website?: string;
        }
      | {
          email?: string;
          username?: string;
        }
    );

    const conversationsWithDetails = conversations
      .map((conv) => {
        const otherUserId = conv._id;
        const otherUser = userMap.get(otherUserId.toString());

        if (!otherUser) {
          return null;
        }

        let userData: UserProfileData | null = null;

        if (otherUser.role === 'graduate') {
          const graduate = graduateMap.get(otherUserId.toString());
          userData = {
            _id: otherUserId,
            firstName: graduate?.firstName || '',
            lastName: graduate?.lastName || '',
            profilePictureUrl: graduate?.profilePictureUrl || '',
            position: Array.isArray(graduate?.position)
              ? graduate.position.join(', ')
              : graduate?.position || '',
          };
        } else if (otherUser.role === 'company') {
          const company = companyMap.get(otherUserId.toString());
          userData = {
            _id: otherUserId,
            companyName: company?.companyName || '',
            industry: company?.industry || '',
            website: company?.website || '',
          };
        } else if (otherUser.role === 'admin') {
          // Handle admin users
          userData = {
            _id: otherUserId,
            email: otherUser.email || '',
            username: 'DLT Africa',
          };
        } else {
          // Fallback for unknown roles
          userData = {
            _id: otherUserId,
            email: otherUser.email || '',
            username: 'Unknown User',
          };
        }

        return {
          _id: otherUserId,
          [otherUser.role === 'graduate'
            ? 'graduate'
            : otherUser.role === 'company'
              ? 'company'
              : 'admin']: userData,
          lastMessage: {
            text: conv.lastMessage.message,
            message: conv.lastMessage.message,
            createdAt: conv.lastMessage.createdAt,
          },
          updatedAt: conv.lastMessage.createdAt,
          unreadCount: conv.unreadCount,
        };
      })
      .filter((conv): conv is NonNullable<typeof conv> => conv !== null);

    const validConversations = conversationsWithDetails.filter(
      (conv) => conv !== null
    );

    return res.status(200).json({ messages: validConversations });
  } catch (err) {
    console.error('Chat List Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark messages from a user as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { otherUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await MessageModel.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Mark Read Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all messages for logged-in user (flat list)
 */
export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const messages = await MessageModel.find({
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ messages });
  } catch (err) {
    console.error('Get All Messages Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get unread counts for logged-in user
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const totalUnread = await MessageModel.countDocuments({
      receiverId: userObjectId,
      read: false,
    });

    const bySender = await MessageModel.aggregate([
      {
        $match: {
          receiverId: userObjectId,
          read: false,
        },
      },
      {
        $group: {
          _id: '$senderId',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          senderId: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    return res.status(200).json({
      totalUnread,
      unreadBySender: bySender,
    });
  } catch (err) {
    console.error('Get Unread Count Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
