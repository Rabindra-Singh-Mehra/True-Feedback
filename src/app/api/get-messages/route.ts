import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import mongoose from 'mongoose';
import { User } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/options';

export async function GET(request: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const _user: User & { _id?: string; username?: string } = session?.user as any;

  console.log('Get messages API called:');
  console.log('Session:', session ? 'exists' : 'null');
  console.log('User from session:', _user);
  console.log('User ID from session:', _user?._id);
  console.log('Username from session:', _user?.username);

  if (!session || !_user) {
    return Response.json(
      { success: false, message: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    let userDoc = null as any;

    if (_user._id) {
      try {
        const userId = new mongoose.Types.ObjectId(_user._id);
        console.log('Converted user ID:', userId.toHexString());
        userDoc = await UserModel.findById(userId).select('messages username');
        console.log('Direct user lookup by _id:', userDoc ? 'found' : 'not found');
      } catch (e) {
        console.warn('Invalid _id in session, skipping ObjectId findById');
      }
    }

    if (!userDoc && _user.username) {
      userDoc = await UserModel.findOne({ username: _user.username }).select('messages username');
      console.log('Fallback user lookup by username:', userDoc ? 'found' : 'not found');
    }

    if (!userDoc) {
      return Response.json(
        { message: 'User not found', success: false },
        { status: 404 }
      );
    }

    const messages = Array.isArray(userDoc.messages) ? [...userDoc.messages] : [];
    messages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Response.json(
      { messages, success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return Response.json(
      { message: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
