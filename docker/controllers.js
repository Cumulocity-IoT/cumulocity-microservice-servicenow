"use strict";

/********************* ServcieNow *********************/

// Initialize access to ServcieNow
const password_sn = process.env.SERVICENOW_PASSWORD;
const username_sn = process.env.SERVICENOW_USER;
const instancename_sn = process.env.SERVICENOW_INSTANCENAME;
var url_sn = `https://${instancename_sn}.service-now.com`;

var servicenowClient = require('servicenow-client');
servicenowClient = new servicenowClient(url_sn, username_sn, password_sn);

// Initialize using signing secret from environment variables
const port = process.env.PORT;

var XRegExp = require('xregexp');


// Create new incident in ServiceNow
function createServiceNowIncident (adata, tenant) {

    // Send a message from this app to the specified channel
    let src = adata.source;
    var newIncident = {};
    newIncident.priority = "1";  // state "1" is new
    newIncident.short_description = `New incident for alarm: ${adata.id} of type: ${adata.type} and tenant: ${tenant}!`;
    newIncident.description = `Source: ${src.self}`;
    //newIncident.description = `Source: <${src.self}|${src.name ? src.name : src.id}>`;
    servicenowClient.createRecord('incident', newIncident, (res) => {
        //use response
        console.log(`[INFO] Id of created incident form ServiceNow: ${res}`);
     });
}


// Update corresponding alarm in C8Y, when ServiceNow incident is resolved
async function updateAlarmFromIncident (adata) {

    if (Array.isArray(cachedUsers) && cachedUsers.length) {
        try {
            console.log(`[INFO] Received incident update from ServiceNow:`);
            console.log(adata);

            cachedUsers.forEach(async (user) => {            
                // console.log(`[Debug] Update in tenant: ${user.tenant} and user ${user.name}`);
                var alarmId = XRegExp.exec(adata.u_short_description, /(?<=alarm: )\d+/)[0];
                var tenantId = XRegExp.exec(adata.u_short_description, /(?<=tenant: )t\d+/)[0];
                //console.log(`[Debug] Update in tenant: ${tenantId} and alarm ${alarmId}`);      
                // Service user credentials
                let auth = new BasicAuth({ 
                    user:     user.name,
                    password: user.password,
                    tenant:   user.tenant
                });
                //console.log("User:");
                //console.log(user);

                // tets if state of incident is resolved=6 and if alarm was raised by this tenant
                if (tenantId === user.tenant && '6' === adata.u_state) {
                    // Platform authentication
                    let client = await new Client(auth, baseUrl);
                    const partialUpdateAlarm  = {
                            id: alarmId,
                            status: "CLEARED",
                            resolve_note: "Was resolve in ServiceNow at:" + new Date(Date.now()).toISOString()
                        };
                    // Get filtered alarms and post a message to Slack
                    const { data , res } = await client.alarm.update(partialUpdateAlarm);
                    console.log (`[INFO] Update result: ${res.status} of update alarm: ${alarmId}`);
                }
        
            });
        }
        catch (err) {
            console.error(err);
        }
    }
    else {
        console.log("[ERROR]: Not subscribed/authorized users found.");
    }
}

/********************* Cumulocity IoT *********************/

const { Client, FetchClient, BasicAuth } = require("@c8y/client");

const baseUrl = process.env.C8Y_BASEURL;
let cachedUsers = [];


function start (se){
    console.log("[INFO] Starting service now controler.");
}



// Get the subscribed users
async function getUsers () {
    const {
        C8Y_BOOTSTRAP_TENANT: tenant,
        C8Y_BOOTSTRAP_USER: user,
        C8Y_BOOTSTRAP_PASSWORD: password
    } = process.env;

    const client = new FetchClient(new BasicAuth({ tenant, user, password }), baseUrl);
    const res = await client.fetch("/application/currentApplication/subscriptions");

    return res.json();
 }


// where the magic happens...
(async () => {

    cachedUsers = (await getUsers()).users;

    if (Array.isArray(cachedUsers) && cachedUsers.length) {
        // List filter for unresolved alarms only
        const filter = {
            pageSize: 100,
            withTotalPages: true,
            resolved: false
        };

        try {
            cachedUsers.forEach(async (user) => {
                // Service user credentials
                let auth = new BasicAuth({ 
                    user:     user.name,
                    password: user.password,
                    tenant:   user.tenant
                });

                //console.log("User:");
                //console.log(user);

                // Platform authentication
                let client = await new Client(auth, baseUrl);
        
                // Get filtered alarms and post a message to Slack
                let { data } = await client.alarm.list(filter);
                data.forEach((alarm) => {
                    createServiceNowIncident(alarm, user.tenant);
                });
        
                // Real time subscription for active alarms
                client.realtime.subscribe("/alarms/*", (alarm) => {
                    if (alarm.data.data.status === "ACTIVE") {
                        createServiceNowIncident(alarm.data.data, user.tenant);
                    }
                });
            });
            console.log("[INFO] Listening to alarms ...");
        }
        catch (err) {
            console.error(err);
        }
    }
    else {
        console.log("[ERROR]: Not subscribed/authorized users found.");
    }

})();

module.exports = {
    start, 
    updateAlarmFromIncident
};