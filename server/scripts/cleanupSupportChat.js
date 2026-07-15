import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';

dotenv.config();

const TARGET_EMAIL = 'ungtrungnam@gmail.com';
const MESSAGE_SNIPPETS = ['LANGG3', 'đơn hàng LANGG3', 'chs game', 'chơi game'];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');

  await mongoose.connect(uri);

  const user = await User.findOne({ email: TARGET_EMAIL });
  if (user) {
    const conversations = await Conversation.find({ customer: user._id });
    const convIds = conversations.map((item) => item._id);
    const messages = await Message.find({ conversation: { $in: convIds } });

    for (const message of messages) {
      const body = String(message.body || '');
      const shouldDelete = MESSAGE_SNIPPETS.some((snippet) =>
        body.toLowerCase().includes(snippet.toLowerCase()),
      );
      if (!shouldDelete) continue;

      await Message.deleteOne({ _id: message._id });
      console.log(`[deleted message] ${body.slice(0, 80)}`);
    }

    for (const conversation of conversations) {
      const lastMessage = await Message.findOne({ conversation: conversation._id })
        .sort({ createdAt: -1 })
        .lean();

      if (!lastMessage) {
        await Conversation.deleteOne({ _id: conversation._id });
        console.log(`[deleted empty conversation] ${conversation._id}`);
        continue;
      }

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            unreadByAdmin: 0,
            lastMessagePreview: String(lastMessage.body || '').slice(0, 200),
            lastMessageAt: lastMessage.createdAt,
          },
        },
      );
    }

    console.log(`[done] cleaned support data for ${TARGET_EMAIL}`);
  } else {
    console.log(`[skip] user not found: ${TARGET_EMAIL}`);
  }

  const orphanConversations = await Conversation.aggregate([
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'conversation',
        as: 'messageDocs',
      },
    },
    { $match: { 'messageDocs.0': { $exists: false } } },
    { $project: { _id: 1 } },
  ]);

  if (orphanConversations.length) {
    await Conversation.deleteMany({
      _id: { $in: orphanConversations.map((item) => item._id) },
    });
    console.log(`[deleted orphan conversations] ${orphanConversations.length}`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
