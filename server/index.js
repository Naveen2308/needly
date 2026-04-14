const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const { connectDB } = require('./config/db');

dotenv.config();
connectDB();
require('./config/passport')(passport);

const app = express();
app.set('trust proxy', 1);

app.use(cors({
    origin: (origin, callback) => {
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

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'ngrok-skip-browser-warning']
}));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const color = res.statusCode >= 400 ? "\x1b[31m" : "\x1b[32m";
        console.log(`\x1b[36m[Needly API]\x1b[0m \x1b[2m${new Date().toLocaleTimeString()}\x1b[0m ${req.method} ${req.originalUrl} ${color}${res.statusCode}\x1b[0m \x1b[2m(${duration}ms)\x1b[0m`);
    });
    next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

const http = require('http');
const socket = require('./socket');

const server = http.createServer(app);
socket.init(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://localhost:${PORT}`);
});
