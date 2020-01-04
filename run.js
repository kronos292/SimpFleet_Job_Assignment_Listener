const telegramParser = require('./telegramParser');

async function run() {
    // MongoDB Connection
    const db = require('./startup/db');
    await db();

    // Listen for broadcast
    await telegramParser.listenBroadcast();

    // Close db
    await db.mongoose.connection.close();
}

run();