"use strict";

require("dotenv").config();
const express = require("express");
var bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Application endpoints
const routes = require("./routes");
const controller = require("./controllers");
routes(app, controller); 

// Server listening on port 80
app.use(express.json());
app.listen(process.env.PORT);
console.log(`${process.env.APPLICATION_NAME} in version ${process.env.VERSION} started on port ${process.env.PORT}`);

// Cumulocity and ServiceNow controllers

controller.start();