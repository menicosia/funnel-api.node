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
var time = require('time') ;
var url = require('url') ;
var util = require('util') ;
// var mysql = require('mysql') ;
var fs = require('fs') ;
var bindMySQL = require('../bind-mysql/bind-mysql.js') ;
var FunnelDB = require('./FunnelDB.class.js') ;
var FunnelObj = require('./FunnelObj.class.js') ;

// Variables
var data = "" ;
var activateState = Boolean(false) ;
var mysql_creds = {} ;
var vcap_services = undefined ;
var dbClient = undefined ;
var dbConnectState = Boolean(false) ;
var dbConnectTimer = undefined ;

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

/// FIXME: DELETE ----vv

function sql2json(request, response, error, results, fields) {
    if (error) {
        dbError(response, error) ;
    } else {
        var dataSet = [] ;
        for (var kv in results) {
            dataSet.push( [ results[kv]['K'], results[kv]['V'] ] ) ;
        }
        response.end(JSON.stringify(dataSet)) ;
    }
}

function dbError(response, error) {
    console.error("ERROR getting values: " + error) ;
    response.writeHead(500) ;
    response.end("ERROR getting values: " + JSON.stringify(error)) ;
}
    
function errorDbNotReady(response) {
    errHTML = "<title>Error</title><H1>Error</H1>\n"
    errHTML += "<p>Database info is not set or DB is not ready<br>\n" ;
    errHTML += "<hr><A HREF=\"/dbstatus\">/dbstatus</A>\n" ;
    response.writeHead(500) ;
    response.end(errHTML) ;
}

function readTable(request, response, table, callBack) {
    if ("mysql" == activateState && dbConnectState) {
        dbClient.query('SELECT K, V from ' + table,
                       function (error, results, fields) {
                           callBack(request, response, error, results, fields) ;
                       }) ;
    } else {
        errorDbNotReady(request, response) ;
    }
}

function handleWriteState(error, results, fields, response) {
    if (error) {
        dbClient.rollback(function() {
            dbError(response, error) ;
        }) ;
    } else {
        dbClient.commit(function(err) {
            if (err) {
                dbClient.rollback(function() {
                    dbError(response, err) ;
                }) ;
            } else {
                response.writeHead("200") ;
                response.end("Succeeded.") ;
                console.log("Added note / updated state.") ;
            }
        }) ;
    }
}

function writeState(error, results, fields, customerID, stateID, response) {
    if (error) {
        dbClient.rollback(function() {
            dbError(response, error) ;
        }) ;
    } else {
        dbClient.query("update Customer SET StateID = ? where CustomerID = ?",
                       [stateID, customerID], function (error, results, fields) {
                           handleWriteState(error, results, fields, response)
                       }) ;
    }
}

function writeNote(httpquery, error, results, fields, stateID, response) {
    if (error) { dbError(response, error) }
    else if (0 == results.length) {
        dbError(response, "Invalid Customer Name") ;
    } else {
        var customerID = results[0]["CustomerID"] ;
        var values = ["NULL", customerID, stateID, dbClient.escape(query["note"]), "NOW()"].join(",") ;
        var sql = "insert into Note values (" + values + ")" ;
        console.log("SQL: " + sql) ;
        dbClient.beginTransaction(function(err) {
            if (err) { throw err; }
            dbClient.query(sql, function (error, results, fields) {
                writeState(error, results, fields, customerID, stateID, response) ;
            }) ;
        }) ;
    }
}

// Take the results of mapState, add on a customer
function mapCustomer(httpquery, error, results, fields, callback, response) {
    if (error) { dbError(response, error) }
    else if (0 == results.length) {
        dbError(response, "Invalid State") ;
    } else {
        var stateID = results[0]["StateID"] ;
        var sql = "select CustomerID from Customer where Name LIKE ?" ;
        dbClient.query(sql, httpquery["custName"], function (error, results, fields) {
            callback(httpquery, error, results, fields, stateID, response) ;
        }) ;
    }
}

function mapState(response, httpquery) {
    var sql = "select StateID from State where Name LIKE ?" ;
    dbClient.query(sql, httpquery["state"], function (error, results, fields) {
        mapCustomer(httpquery, error, results, fields, writeNote, response) ;
    }) ;
}

// recordNewState -> mapState -> mapCustomer -> writeNote -> writeState -> handleWriteState
function recordNewState(response, httpquery) {
    if ("mysql" == activateState && dbConnectState) {
        mapState(response, httpquery) ;
    } else {
        errorDbNotReady(response) ;
    }
}

/// FIXME: DELETE ----^^

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
            && "snippet" in query
            && "href" in query) {
            funnelObj.newEvidenceByCustomerID(response, query["customerID"],
                                              query["tagID"], query["snippet"],
                                              query["href"]) ;
        } else {
            console.log("error") ;
            request.end(JSON.stringify(Boolean(false))) ;
        }
        break ;
    case "addCustomer":
        console.log("Got query: " + JSON.stringify(query)) ;
        funnelObj.addCustomer(response, query["customer"]) ;
        break ;
    case "getAllTags":
        funnelObj.getAllTags(response) ;
        break ;
    case "getAllCustomers":
        funnelObj.getAllCustomers(response) ;
        break ;
    case "getCustomer":
        console.log("Got query: " + JSON.stringify(query)) ;
        funnelObj.getCustomer(response, query["customer"]) ;
        break ;
    case "read":
        if (query["table"]) {
            console.log("Received request to read table: " + query["table"]) ;
            readTable(request, response, query["table"], sql2json) ;
        } else {
            response.end("ERROR: Usage: /json/read?table=name"
                         + " (request: " + request.url + ")") ;
        }
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
