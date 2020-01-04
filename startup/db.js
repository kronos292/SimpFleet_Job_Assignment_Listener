const mongoose = require('mongoose');
const aws = require('aws-sdk');
const tunnel = require('tunnel-ssh');

const keys = require('../config/keys');

module.exports = function(testMode) {
    aws.config.update({
        accessKeyId: keys.AWS_KEY,
        secretAccessKey: keys.AWS_SECRET
    });
    const s3 = new aws.S3();
    let getParams = {
        Bucket: keys.MONGO_CONNECT_BUCKET,
        Key: keys.MONGO_CONNECT_KEY
    };

    s3.getObject(getParams, function (err, data) {
        if (err) {
            console.log(err);
        }

        const credentialData = data.Body.toString('utf-8');

        const config = {
            username: keys.MONGO_USER,
            host: keys.MONGO_HOST,
            port: keys.MONGO_PORT,
            dstPort: keys.DESTINATION_PORT,
            localPort: keys.LOCAL_PORT,
            privateKey: credentialData
        };

        tunnel(config, async(error, server) => {

            if (error) {
                console.log("SSH connection error: " + error);
            }

            const mongoURI = testMode? keys.MONGO_TEST_URI: keys.MONGO_URI;
            mongoose.connect(mongoURI, {
                useNewUrlParser: true
            });

            mongoose.Promise = global.Promise;
            const db = mongoose.connection;
            db.on('error', console.error.bind(console, 'DB connection error:'));
            db.once('open', async() => {
                console.log("DB connection successful!");
            });
        });
    });
};

module.exports.mongoose = mongoose;