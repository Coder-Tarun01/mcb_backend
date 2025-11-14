"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTPEmail = exports.verifyEmailConnection = void 0;
// Re-export from the new mail service for backward compatibility
var mailService_1 = require("../services/mailService");
Object.defineProperty(exports, "verifyEmailConnection", { enumerable: true, get: function () { return mailService_1.verifyEmailConnection; } });
Object.defineProperty(exports, "sendOTPEmail", { enumerable: true, get: function () { return mailService_1.sendOTPEmail; } });
//# sourceMappingURL=emailService.js.map