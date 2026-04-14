const { connectDB, sql } = require('./db');

const initDB = async () => {
    try {
        const pool = await connectDB();
        console.log('🚀 Initializing SQL Database Tables with GUIDs...');

        const dropQueries = [
            'IF OBJECT_ID(\'PostLikes\', \'U\') IS NOT NULL DROP TABLE PostLikes',
            'IF OBJECT_ID(\'ProductUpvotes\', \'U\') IS NOT NULL DROP TABLE ProductUpvotes',
            'IF OBJECT_ID(\'UserSavedPosts\', \'U\') IS NOT NULL DROP TABLE UserSavedPosts',
            'IF OBJECT_ID(\'UserFollowers\', \'U\') IS NOT NULL DROP TABLE UserFollowers',
            'IF OBJECT_ID(\'Notifications\', \'U\') IS NOT NULL DROP TABLE Notifications',
            'IF OBJECT_ID(\'Comments\', \'U\') IS NOT NULL DROP TABLE Comments',
            'IF OBJECT_ID(\'Posts\', \'U\') IS NOT NULL DROP TABLE Posts',
            'IF OBJECT_ID(\'Products\', \'U\') IS NOT NULL DROP TABLE Products',
            'IF OBJECT_ID(\'Users\', \'U\') IS NOT NULL DROP TABLE Users'
        ];

        console.log('🗑 Dropping existing tables...');
        for (const query of dropQueries) {
            await pool.request().query(query);
        }

        const createQueries = [
            `CREATE TABLE Users (
                id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                name NVARCHAR(100) NOT NULL,
                email NVARCHAR(100) NOT NULL UNIQUE,
                password NVARCHAR(255),
                googleId NVARCHAR(100) UNIQUE NULL,
                avatar NVARCHAR(255) NULL,
                bio NVARCHAR(300) DEFAULT '',
                website NVARCHAR(255) DEFAULT '',
                role NVARCHAR(20) DEFAULT 'user',
                refreshToken NVARCHAR(MAX) NULL,
                resetPasswordToken NVARCHAR(100) NULL,
                resetPasswordExpires DATETIME2 NULL,
                createdAt DATETIME2 DEFAULT GETDATE(),
                updatedAt DATETIME2 DEFAULT GETDATE()
            )`,

            `CREATE TABLE Products (
                id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                founderId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                name NVARCHAR(100) NOT NULL,
                tagline NVARCHAR(255) NOT NULL,
                description NVARCHAR(MAX) NOT NULL,
                websiteUrl NVARCHAR(255) NOT NULL,
                logo NVARCHAR(255) NULL,
                category NVARCHAR(50) NOT NULL,
                rating FLOAT DEFAULT 0,
                numReviews INT DEFAULT 0,
                createdAt DATETIME2 DEFAULT GETDATE(),
                updatedAt DATETIME2 DEFAULT GETDATE()
            )`,

            `CREATE TABLE Posts (
                id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                founderId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                productId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Products(id),
                content NVARCHAR(MAX) NOT NULL,
                mediaUrl NVARCHAR(255) NOT NULL,
                createdAt DATETIME2 DEFAULT GETDATE(),
                updatedAt DATETIME2 DEFAULT GETDATE()
            )`,

            `CREATE TABLE Comments (
                id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                userId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                productId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Products(id),
                postId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Posts(id),
                parentId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Comments(id),
                rating INT NULL,
                text NVARCHAR(2000) NOT NULL,
                createdAt DATETIME2 DEFAULT GETDATE(),
                updatedAt DATETIME2 DEFAULT GETDATE()
            )`,

            `CREATE TABLE Notifications (
                id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                recipientId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                senderId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                type NVARCHAR(20) NOT NULL,
                postId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Posts(id),
                productId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Products(id),
                message NVARCHAR(255),
                readStatus BIT DEFAULT 0,
                createdAt DATETIME2 DEFAULT GETDATE()
            )`,

            `CREATE TABLE UserFollowers (
                followerId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                followingId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                PRIMARY KEY (followerId, followingId)
            )`,

            `CREATE TABLE UserSavedPosts (
                userId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                postId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Posts(id),
                PRIMARY KEY (userId, postId)
            )`,

            `CREATE TABLE ProductUpvotes (
                productId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Products(id),
                userId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                PRIMARY KEY (productId, userId)
            )`,

            `CREATE TABLE PostLikes (
                postId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Posts(id),
                userId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(id),
                PRIMARY KEY (postId, userId)
            )`
        ];

        console.log('🔨 Creating tables with GUIDs...');
        for (const query of createQueries) {
            await pool.request().query(query);
        }

        console.log('✅ Database Initialization Complete');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database Initialization Failed:', err);
        process.exit(1);
    }
};

initDB();
