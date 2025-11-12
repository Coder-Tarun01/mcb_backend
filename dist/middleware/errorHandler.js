"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err, _req, res, _next) {
    console.error('Error details:', err);
    // In development, show detailed error information
    if (process.env.NODE_ENV === 'development') {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const errorStack = err instanceof Error ? err.stack : undefined;
        console.error('Error message:', errorMessage);
        console.error('Error stack:', errorStack);
        res.status(500).json({
            message: 'Internal Server Error',
            error: errorMessage,
            stack: errorStack,
            details: err
        });
    }
    else {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}
//# sourceMappingURL=errorHandler.js.map