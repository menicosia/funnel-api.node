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
            this.dbConnectTimer = setTimeout(this.Connect.bind(this), 1000) ;
        }
    }

    _handleDBConnect(err, cb) {
        if (err) { this._handleDBError(err); }
        else {
            this.dbClient.on('error', (err) => { this._handleDBError(err) } ) ;
            this.dbConnectState = true ;
            // stop trying to reconnect
            if (this.dbConnectTimer) {
                clearTimeout(this.dbConnectTimer) ;
                this.dbConnectTimer = undefined ;
            }
            console.log("Connected to database.") ;
            cb(true) ;
        }
    }
    
    Connect(cb) {
        // console.log("ActivateState: " + this.activateState) ;
        // console.log("mysql_creds: " + Object.keys(this.mysql_creds)) ;
        if (this.dbConnectState) {
            console.log("Connect called, but already connected to MySQL. Skipping.") ;
        }
        else if (this.activateState) {
            var clientConfig = {
                host : this.mysql_creds["host"],
                user : this.mysql_creds["user"],
                password : this.mysql_creds["password"],
                port : this.mysql_creds["port"],
                database : this.mysql_creds["database"]
            } ;
            if (this.mysql_creds["ca_certificate"]) {
                console.log("CA Cert detected; using TLS");
                clientConfig["ssl"] = { ca : this.mysql_creds["ca_certificate"] } ;
            }
            this.dbClient = mysql.createConnection( clientConfig ) ;
            // FIXME: BET - I can call _handleDBConnect without .bind(this)
            this.dbClient.connect((error) => { this._handleDBConnect(error, cb)} );
        } else {
            console.log("ActivateState not true, aborting...") ;
            this.dbClient = undefined ;
        }
    }

    // Schema setup logic

    _handleSetupSchema(err, results, fields, cb) {
        if (null != err) {
            console.error("[ERROR] Unable to setup schema. Error: " + err) ;
        } else {
            console.log("Schema setup OK.") ;
            // FIXME: Don't hardcode schema number; it should be passed in
            // FIXME: Last query should be: UPDATE _Schema_Version SET version = X
            cb(1) ;
        }
    }

    _setupSchema(cb) {
        console.log("Setting up schema...") ;
        // FIXME: This should be some JSON meta-schema, parsed into a big query
        this.dbClient.query("create table _Schema_Version (version int)",
                            (error, results, fields)
                            => {this.handleSetupSchema(error, results, fields, cb)}
                            ) ;
    }

    _handleSchemaVer(err, results, fields, cb) {
        if (null != err) {
            console.error("[ERROR] Unable to check schema version. Error: " + err) ;
            process.exit(1) ;
        } else if (0 == results.length) {
            // This really should never happen?
            this._setupSchema(cb) ;
        } else {
            cb(results[0]["version"]) ;
        }
    }

    _handleSchemaP(err, results, fields, cb) {
        if (null != err) {
            console.error("[ERROR] Unable to check schema version. Error: " + err) ;
            process.exit(1) ;
        } else if (0 == results.length) {
            this._setupSchema(cb) ;
        } else {
            this.dbClient.query("select version from _Schema_Version",
                                (error, results, fields)
                                => {this._handleSchemaVer(error, results, fields, cb)}
                                ) ;
        }
    }

    checkSchemaVersion(cb) {
        this.dbClient.query("show tables LIKE '_Schema_Version'",
                            (error, results, fields)
                            => { this._handleSchemaP(error, results, fields, cb) }
                            ) ;
    }

    // Status and Ping

    _handleDBPing(response, err) {
        if (err) {
            console.log("MySQL connection error: " + err) ;
            response.end("MySQL connection error: " + err) ;
            this.dbClient.destroy() ;
            this.Connect() ;
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
                               response.end(JSON.stringify( {
                                   "dbStatus": this.dbConnectState,
                                   "tls-cipher": results[0]["Value"] } )) ;
                           }.bind(this)) ;
        } else {
            response.end("[ERROR] No connection to database.") ;
        }
    }

    // Generic get & set methods

    // Tags
    getAllTags(response, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select TagID,Name from Tags ORDER BY Name" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, (error, results, fields) => {cb(response, error, results, fields)}) ;
        } else {
            console.log("Unable to satisfy getAllTags request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

    getTag(response, tag, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select * from Tags where Name LIKE ?" ;
            console.log("SQL: " + sql + "\n... and Name: " + tag.name) ;
            this.dbClient.query(sql, tag.name, (error, results, fields) => {
                cb(response, tag, error, results, fields) ;
            }) ;
        } else {
            console.log("Unable to satisfy getTag request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

    addTag(response, tag, cb) {
        console.log("fDB.addTag called") ;
        if (this.activateState && this.dbConnectState) {
            let sql = "insert into Tags values (NULL, ?, ?)" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, [tag.name, tag.desc], (error, results, fields) => {
                cb(response, tag, error, results, fields) ;
            }) ;
        } else {
            console.log("Unable to satisfy addTag request; DB not ready") ;
            cb(response, tag, undefined) ;
        }
    }

    // Customers
    getAllCustomers(response, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select CustomerID,Name from Customer ORDER BY Name" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, (error, results, fields) => {cb(response, error, results, fields)}) ;
        } else {
            console.log("Unable to satisfy getAllCustomers request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

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

    // Evidence
    newEvidence(response, query, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "insert into Evidence values (NULL, ?, ?, 0, ?, ?, ?)" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, [query["date"], query["customerID"],
                                      query["tagID"], query["snippet"], query["href"]],
                                (error, results, fields) => {
                                    cb(response, query["customerID"], error, results, fields) ;
                                } ) ;
        } else {
            console.log("Unable to satisfy newEvidence request; DB not ready") ;
            cb(response, customerID, undefined) ;
        }
    }
}

module.exports = FunnelDB ;
