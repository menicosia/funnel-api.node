// funnel-api.node

// NOTE: To run in local mode, provide a VCAP_SERVICES env variable like this:
// VCAP_SERVICES={"p.mysql":[{"credentials":{"uri":"mysql://user:password@127.0.0.1/latticeDB"}}]}
//
// Usage example:
// curl 'http://funnel-api.cfapps.io/json/newState?custName=Verizon&state=Activation&note=From+Chao+Ran+uses+v1+only'

"use strict" ;

var finalhandler = require('finalhandler') ;
var http = require('http') ;
var serveStatic = require('serve-static') ;
var strftime = require('strftime') ;
// var time = require('time') ;
var url = require('url') ;
var util = require('util') ;
var fs = require('fs') ;
var bindMySQL = require('./bind-mysql.js') ;
var FunnelDB = require('./FunnelDB.class.js') ;
var FunnelObj = require('./FunnelObj.class.js') ;
var Tag = require("./tagClass.js") ;

// Variables
var data = "" ;
var activateState = Boolean(false) ;
var mysql_creds = {} ;

// Setup based on Environment Variables

if (process.env.VCAP_APP_PORT) { var port = process.env.VCAP_APP_PORT ;}
else { var port = 8080 ; }
if (process.env.CF_INSTANCE_INDEX) {
    var myIndex = JSON.parse(process.env.CF_INSTANCE_INDEX) ;
}
else { myIndex = 0 ; }
var myInstance = "Instance_" + myIndex + "_Hash" ;
mysql_creds = bindMySQL.getMySQLCreds() ;
if ("host" in mysql_creds) {
    activateState = Boolean(true) ;
}


function dispatchApi(funnelObj, request, response, method, query) {
    console.log("Received JSON request for: " + method) ;
    switch (method) {
    case "dbstatus":
        funnelObj.dbConnectState(response) ;
        break ;
    case "newState":
        // FIXME
        console.log("Got query: " + JSON.stringify(query)) ;
        recordNewState(response, query) ;
        break ;
    case "newEvidenceByCustomerID":
        console.log("Got query: " + JSON.stringify(query)) ;
        if ("customerID" in query
            && "tagID" in query
            && "date" in query
            && "snippet" in query
            && "href" in query) {
            funnelObj.newEvidenceByCustomerID(response, query) ;
        } else {
            console.log("error") ;
            response.end(JSON.stringify(Boolean(false))) ;
        }
        break ;
    case "addCustomer":
        console.log("Got query: " + JSON.stringify(query)) ;
        if ("customerName" in query && "" !== query["customerName"]) {
            funnelObj.addCustomer(response, query["customerName"]) ;
        } else {
            let response_string = "Error, expected \'customerName\'"
            console.log(response_string) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        }
        break ;
    case "addTag":
        // FIXME: SCHEMA-V2
        console.log("Got query: " + JSON.stringify(query)) ;
        if ("tagName" in query && "tagDescription" in query
            && "" !== query["tagName"] && "" !== query["tagDescription"]) {
            let tagToAdd = new Tag(query["tagName"],
                                   query["tagDescription"],
                                   "isEpic" in query ? query["isEpic"] : "0") ;
            console.log("(dispatchApi) tagToAdd: " + JSON.stringify(tagToAdd)) ;
            funnelObj.addTag(response, query, tagToAdd) ;
        } else {
            let response_string = "[ERROR] Expected \'tagName\' and \'tagDescription\'"
            console.log(response_string) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        }
        break ;
    case "addOutcome":
        console.log("Got query: " + JSON.stringify(query)) ;
        if ("outcomeName" in query
            && "outcomeDescription" in query
            && "" !== query["outcomeName"]
            && "" !== query["outcomeDescription"]) {
            funnelObj.addOutcome(response, query) ;
        } else {
            let response_string = "[ERROR] Expected \'outcomeName\' and \'outcomeDescription\'"
            console.log(response_string) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        }
        break ;
    case "getAllOutcomes":
        console.log("Got query: " + JSON.stringify(query)) ;
        funnelObj.getAllOutcomes(response) ;
        break ;
    case "getOutcome":
        break ;
    case "getAllTags":
        // funnelObj.readTable(response, "Tags") ;
        console.log("Got query: " + JSON.stringify(query)) ;
        funnelObj.getAllTags(response) ;
        break ;
    case "getAllCustomers":
        console.log("Got query: " + JSON.stringify(query)) ;
        funnelObj.getAllCustomers(response) ;
        break ;
    case "getCustomer":
        console.log("Got query: " + JSON.stringify(query)) ;
        funnelObj.getCustomer(response, query["customer"]) ;
        break ;
    case "read":
        console.log("Got query: " + JSON.stringify(query)) ;
        funnelObj.readTable(response, query["table"]) ;
        // if (query["table"]) {
        //     console.log("Received request to read table: " + query["table"]) ;
        //     readTable(request, response, query["table"], sql2json) ;
        // } else {
        //     response.end("ERROR: Usage: /json/read?table=name"
        //                  + " (request: " + request.url + ")") ;
        // }
        break ;
    default:
        response.writeHead(404) ;
        response.end(JSON.stringify(Boolean(false))) ;
    }

}

function requestHandler(funnelObj, request, response) {
    var data = "" ;
    let requestParts = url.parse(request.url, true) ;
    let rootCall = requestParts["pathname"].split('/')[1] ;
    console.log("Recieved request for: " + rootCall) ;
    response.setHeader("Access-Control-Allow-Origin", "*") ;
    switch (rootCall) {
    case "env":
	      if (process.env) {
            var v ;
	          data += "<p>" ;

		        for (v in process.env) {
		            data += v + "=" + process.env[v] + "<br>\n" ;
		        }
		        data += "<br>\n" ;
	      } else {
		        data += "<p> No process env? <br>\n" ;
	      }
        response.end(data) ;
        break ;
    case "json":
        var method = requestParts["pathname"].split('/')[2] ;
        dispatchApi(funnelObj, request, response, method, requestParts["query"]) ;
        return(true) ;
        break ;
    case "dbstatus":
        funnelObj.doStatus(response) ;
        break ;
    case "ping":
        funnelObj.doPing(response) ;
        break ;
    default:
        response.writeHead(404) ;
        response.end("404 - not found") ;
    }
}

// MAIN

if (true == activateState) {
    console.log("Connecting to DB...") ;
    var fDB = new FunnelDB(mysql_creds, activateState)
    var fObj = new FunnelObj(fDB) ;
}

var staticServer = serveStatic("static") ;
const monitorServer = http.createServer(function(req, res) {
    var done = finalhandler(req, res) ;
    staticServer(req, res, function() {requestHandler(fObj, req, res, done)}) ;
}) ;

monitorServer.listen(port) ;

console.log("Server up and listening on port: " + port) ;
