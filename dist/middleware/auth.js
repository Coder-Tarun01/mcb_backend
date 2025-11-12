"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'No token provided',
            code: 'NO_TOKEN'
        });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        // Differentiate between different JWT errors
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Session expired. Please login again.',
                code: 'TOKEN_EXPIRED'
            });
        }
        else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Invalid authentication token',
                code: 'TOKEN_INVALID'
            });
        }
        else if (err.name === 'NotBeforeError') {
            return res.status(401).json({
                message: 'Token not yet valid',
                code: 'TOKEN_NOT_ACTIVE'
            });
        }
        return res.status(401).json({
            message: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
}
function authorize(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map