const telegram = require('telegram-bot-api');
const moment = require('moment-timezone');
const axios = require('axios');

const JobAssignment = require('simpfleet_models/models/JobAssignment');
const Job = require('simpfleet_models/models/Job');
const JobOfflandItem = require('simpfleet_models/models/JobOfflandItem');
const JobItem = require('simpfleet_models/models/JobItem');
const CareOffParty = require('simpfleet_models/models/CareOffParty');
const Vessel = require('simpfleet_models/models/Vessel');
const JobTracker = require('simpfleet_models/models/JobTracker');
const PaymentTracker = require('simpfleet_models/models/PaymentTracker');
const User = require('simpfleet_models/models/User');
const Notification = require('simpfleet_models/models/Notification');
const PSAVessel = require('simpfleet_models/models/PSAVessel');
const PickupLocation = require('simpfleet_models/models/PickupLocation');
const PickupDetail = require('simpfleet_models/models/PickupDetail');
const UserCompany = require('simpfleet_models/models/UserCompany');
const JobPrice = require('simpfleet_models/models/JobPrice');
const IdIndex = require('simpfleet_models/models/IdIndex');
const VesselLoadingLocation = require('simpfleet_models/models/VesselLoadingLocation');
const LogisticsCompany = require('simpfleet_models/models/LogisticsCompany');

const keys = require('./config/keys');

const emailMethods = require('simpfleet_models/emails/emailMethods');
const telegramBotMethods = require('simpfleet_models/telegram/telegramBotMethods');

const api = new telegram({
    token: keys.SIMPFLEET_TELEGRAM_BOT_TOKEN
});

const CALLBACK_KEY = 'job_assignment';
const STATUS_ASSIGNED = 'Assigned';
const STATUS_PENDING = 'Pending';

async function listenBroadcast() {
    try {
        // Get updates from Telegram bot
        const res = await axios.get(`https://api.telegram.org/bot${keys.SIMPFLEET_TELEGRAM_BOT_TOKEN}/getUpdates`);
        const updates = res.data;
        const results = updates.result;

        // Parse through all the results
        for(let i = 0; i < results.length; i++) {
            const result = results[i];

            // Filter the callback query results
            const {callback_query} = result;
            if(callback_query) {
                // Filter the callback query data
                const {data} = callback_query;
                const callback_query_data = data.split(" ");
                const key = callback_query_data[0];
                const logisticsCompanyId = callback_query_data[1];
                const jobId = callback_query_data[2];

                // Validate that it is the correct callback data
                if(key && key === CALLBACK_KEY) {
                    // Get the job assignment involved and assign the logistics company
                    let jobAssignment = await JobAssignment.findOne({job: jobId}).select();
                    if(jobAssignment.status !== STATUS_ASSIGNED) {
                        jobAssignment.logisticsCompany = await LogisticsCompany.findOne({_id: logisticsCompanyId}).select();
                        jobAssignment.status = STATUS_ASSIGNED;
                        await jobAssignment.save();

                        // Send job booking info to 3PL telegram chat
                        const job = await Job.findOne({_id: jobId}).populate({
                            path: 'vessel',
                            model: 'vessels'
                        }).populate({
                            path: 'vesselLoadingLocation',
                            model: 'vesselLoadingLocations'
                        }).populate({
                            path: 'user',
                            model: 'users'
                        }).populate({
                            path: 'jobTrackers',
                            model: 'jobTrackers'
                        }).populate({
                            path: 'paymentTrackers',
                            model: 'paymentTrackers'
                        }).populate({
                            path: 'pickupDetails',
                            model: 'pickupDetails',
                            populate: [
                                {
                                    path: 'pickupLocation',
                                    model: 'pickupLocations'
                                }
                            ]
                        }).populate({
                            path: 'careOffParties',
                            model: 'careOffParties',
                            populate: [
                                {
                                    path: 'job',
                                    model: 'jobs'
                                }
                            ]
                        }).populate({
                            path: 'jobItems',
                            model: 'jobItems'
                        }).populate({
                            path: 'jobOfflandItems',
                            model: 'jobOfflandItems'
                        }).select();

                        // Email logistics party with job information
                        await emailMethods.sendJobBookingLogisticsOrderEmail(job, jobAssignment);

                        // Send job booking info to assigned 3PL
                        await telegramBotMethods.sendJobBookingInfo(job);
                    }
                }
            }
        }
    } catch(err) {
        console.log(err);
    }
}

module.exports.listenBroadcast = listenBroadcast;