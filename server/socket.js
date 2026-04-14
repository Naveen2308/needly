const socketio = require('socket.io');

let io;
const userSockets = new Map();

const init = (server) => {
    const allowedOrigins = [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'http://localhost:5000',
        'https://needly.fun',
        'https://api.needly.fun'
    ];

    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
        allowedOrigins.push(frontendUrl);
    }

    io = socketio(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('identify', (userId) => {
            if (userId) {
                userSockets.set(userId.toString(), socket.id);
                console.log(`User ${userId} associated with socket ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    console.log(`User ${userId} disconnected`);
                    break;
                }
            }
        });
    });

    return io;
};

const sendNotification = (userId, notification) => {
    const socketId = userSockets.get(userId.toString());
    if (socketId && io) {
        io.to(socketId).emit('new-notification', notification);
        console.log(`Notification sent to User ${userId} via socket ${socketId}`);
    }
};

module.exports = { init, sendNotification };
