"use strict" ;

var mysql = require('mysql') ;

class FunnelDB {
    constructor(mysql_creds, activateState) {
        this.mysql_creds = mysql_creds ;
        this.activateState = activateState ;
        this.dbClient = undefined ;
        this.dbConnectState = undefined ;
        this.dbConnectTimer = undefined ; 
    }
    
    // Connection logic

    _handleDBError(err) {
        this.dbConnectState = false ;
        if (err) {
            console.warn("Issue with database, " + err.code
                         + ". Attempting to reconnect every 1 second.")
            this.dbConnectTimer = setTimeout(this.MySQLConnect.bind(this), 1000) ;
        }
    }

    _handleDBConnect(err) {
        if (err) { _handleDBError(err); }
        else {
            this.dbClient.on('error', (err) => this._handleDBError(err) ) ;
            this.dbConnectState = true ;
            // stop trying to reconnect
            if (this.dbConnectTimer) {
                clearTimeout(this.dbConnectTimer) ;
                this.dbConnectTimer = undefined ;
            }
            console.log("Connected to database.") ;
        }
    }
    
    MySQLConnect() {
        // console.log("ActivateState: " + this.activateState) ;
        // console.log("mysql_creds: " + Object.keys(this.mysql_creds)) ;
        if (this.dbConnectState) {
            console.log("MySLQConnect called, but already connected to DB. Skipping.") ;
        }
        else if (this.activateState) {
            this.dbClient = mysql.createConnection( this.mysql_creds ) ;
            this.dbClient.connect(this._handleDBConnect.bind(this)) ;
        } else {
            console.log("ActivateState not true, aborting...") ;
            this.dbClient = undefined ;
        }
    }

    // Status and Ping

    _handleDBPing(response, err) {
        if (err) {
            console.log("MySQL Connection error: " + err) ;
            response.end("MySQL connection error: " + err) ;
            this.dbClient.destroy() ;
            this.MySQLConnect() ;
        } else {
            response.end("MySQL ping successful.") ;
        }
    }

    doPing(response) {
        if (this.dbConnectState) {
            this.dbClient.ping(function (err) {
                this._handleDBPing(response, err) ;
            }.bind(this) ) ;
        } else {
            response.end("[ERROR] No connection to database.") ;
        }
    }

    doStatus(response) {
        if (this.dbConnectState) {
            this.dbClient.query("SHOW STATUS LIKE 'Ssl_version'",
                           function (err, results, fields) {
                               response.end(JSON.stringify(results[0]["Value"])) ;
                           }) ;
        } else {
            response.end("[ERROR] No connection to database.") ;
        }
    }

    // Generic get & set methods

    //
    getAllTags(response, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select TagID,Name from Tags" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, (error, results, fields) => {cb(response, error, results, fields)}) ;
        } else {
            console.log("Unable to satisfy getAllTags request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

    // 
    getAllCustomers(response, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select CustomerID,Name from Customer" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, (error, results, fields) => {cb(response, error, results, fields)}) ;
        } else {
            console.log("Unable to satisfy getAllCustomers request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

    // 
    getCustomer(response, name, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select * from Customer where Name LIKE ?" ;
            console.log("SQL: " + sql + "\n... and Name: " + name) ;
            this.dbClient.query(sql, name, (error, results, fields) => {
                cb(response, name, error, results, fields) ;
            }) ;
        } else {
            console.log("Unable to satisfy getCustomer request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

    //
    addCustomer(response, name, cb) {
        console.log("fDB.addCustomer called") ;
        if (this.activateState && this.dbConnectState) {
            let sql = "insert into Customer values (NULL, 0, 0, ?)" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, name, (error, results, fields) => {
                cb(response, name, error, results, fields) ;
            }) ;
        } else {
            console.log("Unable to satisfy addCustomer request; DB not ready") ;
            cb(response, name, undefined) ;
        }
    }

    //
    newEvidence(response, customerID, tag, snippet, href, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "insert into Evidence values (NULL, CURDATE(), ?, 0, ?, ?, ?)" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, [customerID, tag, snippet, href],
                                (error, results, fields) => {
                                    cb(response, customerID, error, results, fields) ;
                                } ) ;
        } else {
            console.log("Unable to satisfy newEvidence request; DB not ready") ;
            cb(response, customerID, undefined) ;
        }
    }
}

module.exports = FunnelDB ;
