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
      .lean();

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

    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv._id;

        const otherUser = await UserModel.findById(otherUserId).lean();
        if (!otherUser) {
          return null;
        }

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
        );

        let userData: UserProfileData | null = null;

        if (otherUser.role === 'graduate') {
          const graduate = await GraduateModel.findOne({
            userId: otherUserId,
          }).lean();
          userData = {
            _id: otherUserId,
            firstName: graduate?.firstName || '',
            lastName: graduate?.lastName || '',
            profilePictureUrl: graduate?.profilePictureUrl || '',
            position: graduate?.position || '',
          };
        } else if (otherUser.role === 'company') {
          const company = await CompanyModel.findOne({
            userId: otherUserId,
          }).lean();
          userData = {
            _id: otherUserId,
            companyName: company?.companyName || '',
            industry: company?.industry || '',
            website: company?.website || '',
          };
        }

        return {
          _id: otherUserId,
          [otherUser.role === 'graduate' ? 'graduate' : 'company']:
            userData || { _id: otherUserId },
          lastMessage: {
            text: conv.lastMessage.message,
            message: conv.lastMessage.message,
            createdAt: conv.lastMessage.createdAt,
          },
          updatedAt: conv.lastMessage.createdAt,
          unreadCount: conv.unreadCount,
        };
      })
    );

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
