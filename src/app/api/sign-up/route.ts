import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import bcrypt from 'bcryptjs';
// Verification email removed; simple sign-up without email verification

export async function POST(request: Request) {
  // Debug: Log environment variables
  console.log('Environment variables check:');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'NOT SET');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
  console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');

  try {
    // Connect to database
    await dbConnect();
  } catch (dbError) {
    console.error('Database connection error:', dbError);
    return Response.json(
      {
        success: false,
        message: 'Database connection failed. Please try again later.',
      },
      { status: 500 }
    );
  }

  try {
    const { username, email, password } = await request.json();

    // Validate required fields
    if (!username || !email || !password) {
      return Response.json(
        {
          success: false,
          message: 'Username, email, and password are required',
        },
        { status: 400 }
      );
    }

    // Check if the email is already registered
    const existingUserByEmail = await UserModel.findOne({ email });

    if (existingUserByEmail) {
      return Response.json(
        {
          success: false,
          message: 'User already exists with this email',
        },
        { status: 400 }
      );
    }

    // Create a new user (duplicate usernames are allowed by schema)
    const newUser = new UserModel({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      isVerified: true,
      isAcceptingMessages: true,
      messages: [],
    });

    await newUser.save();

    return Response.json(
      {
        success: true,
        message: 'User registered successfully. You can now sign in.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Error registering user';
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        errorMessage = 'Email already exists';
      } else if (error.message.includes('validation failed')) {
        errorMessage = 'Invalid data provided';
      } else {
        errorMessage = error.message;
      }
    }
    
    return Response.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
