import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { sendOTPEmail, sendRegistrationEmail, logEmailError, verifyEmailConnection } from '../services/mailService';
import { generateOTP, storeOTP, verifyOTP as verifyOTPCode, hasOTP, getOTPRemainingTime } from '../utils/otpStorage';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, phone, role, companyName, skills } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Prepare user data based on role
    const userData: any = {
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      role: role || 'employee',
    };

    // Add role-specific fields
    if (role === 'employer' && companyName) {
      userData.companyName = companyName;
    } else if (role === 'employee' && skills) {
      userData.skills = skills;
    }

    const user = await User.create(userData);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Safely extract user data without password
    console.log('User object from database:', user);
    console.log('User dataValues:', user.dataValues);
    
    const responseUserData = {
      id: user.id || user.dataValues?.id,
      email: user.email || user.dataValues?.email,
      name: user.name || user.dataValues?.name,
      phone: user.phone || user.dataValues?.phone,
      role: user.role || user.dataValues?.role,
      companyName: user.companyName || user.dataValues?.companyName,
      skills: user.skills || user.dataValues?.skills,
      resumeUrl: user.resumeUrl || user.dataValues?.resumeUrl,
      avatarUrl: user.avatarUrl || user.dataValues?.avatarUrl,
      createdAt: user.createdAt || user.dataValues?.createdAt,
      updatedAt: user.updatedAt || user.dataValues?.updatedAt
    };

    console.log('Final responseUserData:', responseUserData);

    // Send registration confirmation email (non-blocking)
    try {
      const emailResult = await sendRegistrationEmail(
        user.email,
        user.name,
        user.role
      );
      
      if (emailResult.success) {
        console.log('✅ Registration email sent successfully');
      } else {
        logEmailError('User Registration', emailResult.error, user.email);
      }
    } catch (emailError) {
      logEmailError('User Registration', emailError, user.email);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      token,
      user: responseUserData,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', user.id, user.email);
    console.log('User dataValues:', user.dataValues);

    // Get password from dataValues
    const userPassword = user.password || user.dataValues?.password;
    console.log('User password available:', !!userPassword);

    // Verify password
    const valid = await bcrypt.compare(password, userPassword);
    if (!valid) {
      console.log('Invalid password for user:', user.email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Password valid, generating token...');

    // Determine token expiry based on rememberMe
    const tokenExpiry = rememberMe ? '30d' : '24h'; // 30 days if remember me, 24 hours otherwise
    console.log('Token expiry:', tokenExpiry, 'Remember me:', rememberMe);

    // Generate JWT token
    const tokenPayload = { 
      id: user.id || user.dataValues?.id, 
      email: user.email || user.dataValues?.email, 
      role: user.role || user.dataValues?.role,
      rememberMe: !!rememberMe
    };
    
    const token = jwt.sign(
      tokenPayload, 
      JWT_SECRET,
      { expiresIn: tokenExpiry } as jwt.SignOptions
    );
    console.log('Token generated successfully with expiry:', tokenExpiry);

    // Extract user data safely from dataValues
    const userData = {
      id: user.id || user.dataValues?.id,
      email: user.email || user.dataValues?.email,
      name: user.name || user.dataValues?.name,
      phone: user.phone || user.dataValues?.phone,
      role: user.role || user.dataValues?.role,
      companyName: user.companyName || user.dataValues?.companyName,
      skills: user.skills || user.dataValues?.skills,
      resumeUrl: user.resumeUrl || user.dataValues?.resumeUrl,
      avatarUrl: user.avatarUrl || user.dataValues?.avatarUrl,
      createdAt: user.createdAt || user.dataValues?.createdAt,
      updatedAt: user.updatedAt || user.dataValues?.updatedAt
    };

    console.log('Sending response with user data:', userData);

    res.json({
      token,
      user: userData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      companyName: user.companyName,
      skills: user.skills,
      resumeUrl: user.resumeUrl,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long' 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await user.update({ password: hashedNewPassword });

    console.log(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export async function sendOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    console.log('OTP request for email:', email);

    // Check if user exists
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address. Please register first.' });
    }

    // Check if there's already an active OTP
    if (hasOTP(email.toLowerCase())) {
      const remainingTime = getOTPRemainingTime(email.toLowerCase());
      return res.status(429).json({ 
        message: `Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new OTP`,
        remainingTime 
      });
    }

    // Verify email connection
    const emailConnectionValid = await verifyEmailConnection();
    if (!emailConnectionValid) {
      return res.status(500).json({ 
        message: 'Email service is currently unavailable. Please try again later.' 
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(email.toLowerCase(), otp);

    // Send OTP email
    const emailResult = await sendOTPEmail(email.toLowerCase(), otp);
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({ 
        message: 'Unable to send OTP at the moment. Please try again.' 
      });
    }

    console.log(`✅ OTP sent successfully to ${email}`);

    res.json({
      success: true,
      message: 'OTP sent successfully to your email address',
      email: email.toLowerCase() // Return normalized email
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export async function verifyOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'OTP must be a 6-digit number' });
    }

    console.log('OTP verification attempt for email:', email);

    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Verify OTP
    const verification = verifyOTPCode(email.toLowerCase(), otp);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    console.log('OTP verified successfully for user:', user.email);

    // Generate JWT token (same logic as regular login)
    const tokenPayload = { 
      id: user.id || user.dataValues?.id, 
      email: user.email || user.dataValues?.email, 
      role: user.role || user.dataValues?.role,
      rememberMe: false // OTP login doesn't support remember me
    };
    
    const token = jwt.sign(
      tokenPayload, 
      JWT_SECRET,
      { expiresIn: '24h' } as jwt.SignOptions // 24 hours for OTP login
    );

    // Extract user data safely
    const userData = {
      id: user.id || user.dataValues?.id,
      email: user.email || user.dataValues?.email,
      name: user.name || user.dataValues?.name,
      phone: user.phone || user.dataValues?.phone,
      role: user.role || user.dataValues?.role,
      companyName: user.companyName || user.dataValues?.companyName,
      skills: user.skills || user.dataValues?.skills,
      resumeUrl: user.resumeUrl || user.dataValues?.resumeUrl,
      avatarUrl: user.avatarUrl || user.dataValues?.avatarUrl,
      createdAt: user.createdAt || user.dataValues?.createdAt,
      updatedAt: user.updatedAt || user.dataValues?.updatedAt
    };

    console.log('OTP login successful for user:', userData.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}