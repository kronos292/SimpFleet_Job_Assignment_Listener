const schedule  = require('node-schedule');

const telegramParser = require('./telegramParser');

async function run() {
    // MongoDB Connection
    const db = require('./startup/db');
    await db();

    // Cron job to activate listener every minute
    schedule.scheduleJob('*/5 * * * * *', async() => {
        try {
            // Listen for broadcast
            await telegramParser.listenBroadcast();
        } catch(err) {
            console.log(err);
        }
    });

    // Close db
    await db.mongoose.connection.close();
}

run();