"use strict";

module.exports = function(app, controller) {

    // Hello world
    app.route("/").get(function(req, res) {
        res.json({ "message" : "Hello world!" });
    });

    // Health check
    app.route("/health").get(function(req, res) {
        res.json({ "status" : "UP" });
    });

    // Environment variables
    app.route("/environment").get(function(req, res) {
        res.json({
            "appName" : process.env.APPLICATION_NAME,
            "platformUrl" : process.env.C8Y_BASEURL, 
            "microserviceIsolation" : process.env.C8Y_MICROSERVICE_ISOLATION,
            "tenant" : process.env.C8Y_BOOTSTRAP_TENANT,
            "bootstrapUser" : process.env.C8Y_BOOTSTRAP_USER,
            "bootstrapPassword" : process.env.C8Y_BOOTSTRAP_PASSWORD
        });
    });
    app.route('/incident').post(function(req, res){
        res.end("yes");
        controller.updateAlarmFromIncident(req.body);
      });
};
