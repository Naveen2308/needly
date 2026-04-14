-- Users Table
CREATE TABLE Users (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    email VARCHAR2(100) UNIQUE NOT NULL,
    password VARCHAR2(255),
    googleId VARCHAR2(100) UNIQUE,
    avatar VARCHAR2(500),
    bio VARCHAR2(300),
    website VARCHAR2(255),
    role VARCHAR2(20) DEFAULT 'user',
    refreshToken VARCHAR2(500),
    resetPasswordToken VARCHAR2(255),
    resetPasswordExpires TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Followers Table
CREATE TABLE UserFollowers (
    followerId VARCHAR2(36) NOT NULL,
    followingId VARCHAR2(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (followerId, followingId),
    CONSTRAINT fk_follow_follower FOREIGN KEY (followerId) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_following FOREIGN KEY (followingId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Products Table
CREATE TABLE Products (
    id VARCHAR2(36) PRIMARY KEY,
    founderId VARCHAR2(36) NOT NULL,
    name VARCHAR2(100) NOT NULL,
    tagline VARCHAR2(255) NOT NULL,
    description CLOB NOT NULL,
    websiteUrl VARCHAR2(500),
    logo VARCHAR2(500),
    category VARCHAR2(50) NOT NULL,
    upvotes NUMBER DEFAULT 0,
    rating NUMBER DEFAULT 0,
    numReviews NUMBER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_founder FOREIGN KEY (founderId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Product Upvotes Table
CREATE TABLE ProductUpvotes (
    productId VARCHAR2(36) NOT NULL,
    userId VARCHAR2(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (productId, userId),
    CONSTRAINT fk_upvote_product FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE,
    CONSTRAINT fk_upvote_user FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Posts Table
CREATE TABLE Posts (
    id VARCHAR2(36) PRIMARY KEY,
    founderId VARCHAR2(36) NOT NULL,
    productId VARCHAR2(36),
    content CLOB NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_founder FOREIGN KEY (founderId) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_product FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE
);

-- Post Likes Table
CREATE TABLE PostLikes (
    postId VARCHAR2(36) NOT NULL,
    userId VARCHAR2(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (postId, userId),
    CONSTRAINT fk_plike_post FOREIGN KEY (postId) REFERENCES Posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_plike_user FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- User Saved Posts Table
CREATE TABLE UserSavedPosts (
    userId VARCHAR2(36) NOT NULL,
    postId VARCHAR2(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, postId),
    CONSTRAINT fk_saved_user FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_post FOREIGN KEY (postId) REFERENCES Posts(id) ON DELETE CASCADE
);

-- User Saved Products Table
CREATE TABLE UserSavedProducts (
    userId VARCHAR2(36) NOT NULL,
    productId VARCHAR2(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, productId),
    CONSTRAINT fk_usp_user FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_usp_product FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE
);

-- Comments Table
CREATE TABLE Comments (
    id VARCHAR2(36) PRIMARY KEY,
    postId VARCHAR2(36),
    productId VARCHAR2(36),
    authorId VARCHAR2(36) NOT NULL,
    content CLOB NOT NULL,
    rating NUMBER,
    parentId VARCHAR2(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_author FOREIGN KEY (authorId) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parentId) REFERENCES Comments(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE Notifications (
    id VARCHAR2(36) PRIMARY KEY,
    recipientId VARCHAR2(36) NOT NULL,
    senderId VARCHAR2(36) NOT NULL,
    type VARCHAR2(50) NOT NULL,
    productId VARCHAR2(36),
    postId VARCHAR2(36),
    message VARCHAR2(500),
    isRead NUMBER(1) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_recipient FOREIGN KEY (recipientId) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_sender FOREIGN KEY (senderId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Triggers to update 'updatedAt' columns
CREATE OR REPLACE TRIGGER trg_users_updated_at
BEFORE UPDATE ON Users
FOR EACH ROW
BEGIN
    :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_products_updated_at
BEFORE UPDATE ON Products
FOR EACH ROW
BEGIN
    :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON Posts
FOR EACH ROW
BEGIN
    :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON Comments
FOR EACH ROW
BEGIN
    :NEW.updatedAt := CURRENT_TIMESTAMP;
END;
/
