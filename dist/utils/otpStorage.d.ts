export declare const generateOTP: () => string;
export declare const storeOTP: (email: string, otp: string) => void;
export declare const verifyOTP: (email: string, inputOTP: string) => {
    valid: boolean;
    message: string;
};
export declare const hasOTP: (email: string) => boolean;
export declare const getOTPRemainingTime: (email: string) => number;
export declare const cleanupExpiredOTPs: () => void;
export declare const getOTPStats: () => {
    total: number;
    active: number;
    expired: number;
};
export declare const clearAllOTPs: () => void;
//# sourceMappingURL=otpStorage.d.ts.map