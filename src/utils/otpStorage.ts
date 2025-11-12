// In-memory OTP storage with expiry
interface OTPData {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

// Store OTPs in memory (in production, consider using Redis)
const otpStorage = new Map<string, OTPData>();

// OTP expiry time (5 minutes)
const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_ATTEMPTS = 3; // Maximum verification attempts

// Generate a 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP for an email
export const storeOTP = (email: string, otp: string): void => {
  const expiresAt = Date.now() + OTP_EXPIRY_TIME;
  
  otpStorage.set(email, {
    code: otp,
    email,
    expiresAt,
    attempts: 0
  });
  
  console.log(`📧 OTP stored for ${email}, expires at: ${new Date(expiresAt).toISOString()}`);
  
  // Clean up expired OTPs
  cleanupExpiredOTPs();
};

// Verify OTP for an email
export const verifyOTP = (email: string, inputOTP: string): { valid: boolean; message: string } => {
  const otpData = otpStorage.get(email);
  
  if (!otpData) {
    return { valid: false, message: 'No OTP found for this email. Please request a new OTP.' };
  }
  
  // Check if OTP has expired
  if (Date.now() > otpData.expiresAt) {
    otpStorage.delete(email);
    return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
  }
  
  // Check if max attempts exceeded
  if (otpData.attempts >= MAX_ATTEMPTS) {
    otpStorage.delete(email);
    return { valid: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
  }
  
  // Increment attempts
  otpData.attempts++;
  
  // Verify OTP code
  if (otpData.code === inputOTP) {
    // OTP is valid, remove it from storage
    otpStorage.delete(email);
    console.log(`✅ OTP verified successfully for ${email}`);
    return { valid: true, message: 'OTP verified successfully.' };
  } else {
    console.log(`❌ Invalid OTP attempt for ${email} (attempt ${otpData.attempts}/${MAX_ATTEMPTS})`);
    
    if (otpData.attempts >= MAX_ATTEMPTS) {
      otpStorage.delete(email);
      return { valid: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
    }
    
    return { 
      valid: false, 
      message: `Invalid OTP. ${MAX_ATTEMPTS - otpData.attempts} attempts remaining.` 
    };
  }
};

// Check if OTP exists for email (without consuming it)
export const hasOTP = (email: string): boolean => {
  const otpData = otpStorage.get(email);
  if (!otpData) return false;
  
  // Check if expired
  if (Date.now() > otpData.expiresAt) {
    otpStorage.delete(email);
    return false;
  }
  
  return true;
};

// Get remaining time for OTP
export const getOTPRemainingTime = (email: string): number => {
  const otpData = otpStorage.get(email);
  if (!otpData) return 0;
  
  const remaining = otpData.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / 1000)); // Return seconds
};

// Clean up expired OTPs
export const cleanupExpiredOTPs = (): void => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [email, otpData] of otpStorage.entries()) {
    if (now > otpData.expiresAt) {
      otpStorage.delete(email);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
  }
};

// Get OTP storage stats (for debugging)
export const getOTPStats = () => {
  const now = Date.now();
  const activeOTPs = Array.from(otpStorage.values()).filter(otp => now <= otp.expiresAt);
  
  return {
    total: otpStorage.size,
    active: activeOTPs.length,
    expired: otpStorage.size - activeOTPs.length
  };
};

// Clear all OTPs (for testing)
export const clearAllOTPs = (): void => {
  otpStorage.clear();
  console.log('🧹 All OTPs cleared');
};

