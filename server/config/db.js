const oracledb = require('oracledb');
require('dotenv').config();

// Fetch CLOBs as strings for consistency and ease of use in JSON
oracledb.fetchAsString = [oracledb.CLOB];

// Configuration for Oracle DB
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    walletLocation: process.env.DB_WALLET_PATH,
    configDir: process.env.DB_WALLET_PATH,
    walletPassword: process.env.DB_WALLET_PASSWORD,
};

let pool;

// ANSI Colors for clear logging
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

// Helper to normalize Oracle results (uppercase keys to camelCase)
const normalize = (row) => {
    if (!row) return null;
    const normalized = {};
    
    // Key mapping for common fields to ensure camelCase
    const keyMap = {
        'FOUNDERID': 'founderId',
        'CREATEDAT': 'createdAt',
        'UPDATEDAT': 'updatedAt',
        'WEBSITEURL': 'websiteUrl',
        'NUMREVIEWS': 'numReviews',
        'UPVOTES': 'upvotes',
        'FOUNDERNAME': 'founderName',
        'FOUNDERAVATAR': 'founderAvatar',
        'PRODUCTNAME': 'productName',
        'PRODUCTLOGO': 'productLogo',
        'PRODUCTTAGLINE': 'productTagline',
        'USERNAME': 'userName',
        'USERAVATAR': 'userAvatar',
        'CNT': 'cnt',
        'AVGRATING': 'avgRating',
        'POSTID': 'postId',
        'PRODUCTID': 'productId',
        'AUTHORID': 'authorId',
        'RECIPIENTID': 'recipientId',
        'SENDERID': 'senderId',
        'ISREAD': 'isRead',
        'GOOGLEID': 'googleId',
        'REFRESHTOKEN': 'refreshToken',
        'RESETPASSWORDTOKEN': 'resetPasswordToken',
        'RESETPASSWORDEXPIRES': 'resetPasswordExpires',
        'USERID': 'userId',
        'SENDERNAME': 'senderName',
        'SENDERAVATAR': 'senderAvatar',
        'POSTCONTENT': 'postContent',
        'FOLLOWERID': 'followerId',
        'FOLLOWINGID': 'followingId',
        'PARENTID': 'parentId',
        'TOTALCOMMENTS': 'totalComments',
        'OTPCODE': 'otpCode',
        'OTPEXPIRES': 'otpExpires'
    };

    for (const key in row) {
        const camelKey = keyMap[key] || key.toLowerCase();
        normalized[camelKey] = row[key];
    }
    return normalized;
};

const normalizeArray = (rows) => (rows ? rows.map(normalize) : []);

const connectDB = async () => {
    try {
        if (!pool) {
            pool = await oracledb.createPool({
                user: config.user,
                password: config.password,
                connectString: config.connectString,
                walletLocation: config.walletLocation,
                configDir: config.configDir,
                walletPassword: config.walletPassword,
                poolMax: 10,
                poolMin: 1,
                poolIncrement: 1,
                poolTimeout: 60
            });
            console.log(`${colors.green}${colors.bright}✅ Oracle DB Connected via Pool${colors.reset}`);
        }
        return pool;
    } catch (error) {
        console.error(`${colors.red}${colors.bright}❌ Oracle DB connection failed:${colors.reset}`, error.message);
        process.exit(1);
    }
};

/**
 * Execute a query and return normalized results (lowercase keys)
 */
const query = async (sql, params = {}, options = {}) => {
    const startTime = Date.now();
    const pool = await connectDB();
    const connection = await pool.getConnection();
    
    try {
        // Log the query
        const cleanSql = sql.replace(/\s+/g, ' ').trim();
        console.log(`${colors.cyan}[DB]${colors.reset} ${colors.dim}${new Date().toLocaleTimeString()}${colors.reset} ${colors.yellow}Executing:${colors.reset} ${cleanSql}`);
        if (Object.keys(params).length > 0) {
            console.log(`${colors.cyan}[DB]${colors.reset} ${colors.yellow}Params:${colors.reset}`, params);
        }

        const result = await connection.execute(sql, params, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: options.autoCommit || false,
            ...options
        });
        
        const duration = Date.now() - startTime;
        
        if (result.rows) {
            console.log(`${colors.cyan}[DB]${colors.reset} ${colors.green}Success${colors.reset} (${duration}ms) - Return ${result.rows.length} rows`);
            return {
                rows: normalizeArray(result.rows),
                rowsAffected: result.rowsAffected,
                outBinds: result.outBinds
                // IMPORTANT: Removed metaData to prevent "Circular structure to JSON" error
            };
        }
        
        console.log(`${colors.cyan}[DB]${colors.reset} ${colors.green}Success${colors.reset} (${duration}ms) - Rows affected: ${result.rowsAffected || 0}`);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`${colors.cyan}[DB]${colors.reset} ${colors.red}Error${colors.reset} (${duration}ms):`, error.message);
        throw error;
    } finally {
        await connection.close();
    }
};

module.exports = {
    connectDB,
    oracledb,
    query,
    normalize,
    normalizeArray
};
