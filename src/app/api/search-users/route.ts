import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return Response.json({ users: [] }, { status: 200 });
    }

    const regex = new RegExp('^' + escapeRegex(q), 'i');
    const users = await UserModel.find({ username: regex })
      .limit(8)
      .select('username isAcceptingMessages')
      .lean();

    return Response.json(
      {
        users: users.map((u) => ({
          username: u.username,
          isAcceptingMessages: u.isAcceptingMessages,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error searching users:', error);
    return Response.json(
      { users: [], message: 'Error searching users' },
      { status: 500 }
    );
  }
}


