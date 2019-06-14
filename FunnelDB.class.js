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
        if (err) { this._handleDBError(err); }
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
            console.log("MySQLConnect called, but already connected to DB. Skipping.") ;
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
            let sql = "select TagID,Name,isEpic from Tags ORDER BY Name" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, (error, results, fields) => {cb(response, error, results, fields)}) ;
        } else {
            console.log("Unable to satisfy getAllTags request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

    getTag(response, query, tag, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select * from Tags where Name LIKE ?" ;
            console.log("SQL: " + sql + "\n... and Name: " + tag.name) ;
            this.dbClient.query(sql, tag.name, (error, results, fields) => {
                cb(response, query, tag, error, results, fields) ;
            }) ;
        } else {
            console.log("Unable to satisfy getTag request; DB not ready") ;
            cb(response, undefined) ;
        }
    }

    addTag(response, query, tag, cb) {
        console.log("fDB.addTag called") ;
        if (this.activateState && this.dbConnectState) {
            let sql = "insert into Tags values (NULL, ?, ?, ?)" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, [tag.name, tag.desc, tag.isEpic], (error, results, fields) => {
                cb(response, query, tag, error, results, fields) ;
            }) ;
        } else {
            console.log("Unable to satisfy addTag request; DB not ready") ;
            cb(response, query, tag, undefined) ;
        }
    }

    newOutcomeTagAssignment(response, query, tag, cb) {
      console.log("fDB.newOutcomeTagAssignment called") ;
      if (this.activateState && this.dbConnectState) {
          let sql = "insert into Tag_Br_Outcome values ((select TagID from Tags where Name like ?), ?)" ;
          console.log("SQL: " + sql) ;
          this.dbClient.query(sql, [query["tagName"], query["outcomeID"]], (error, results, fields) => {
              cb(response, query, tag, error, results, fields) ;
          }) ;
      } else {
          console.log("Unable to satisfy newOutcomeTagAssignment request; DB not ready") ;
          cb(response, query, tag, undefined) ;
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

    readTable(response, name, cb) {
      if (this.activateState && this.dbConnectState) {
          let sql = "select * FROM " + name ;
          console.log("SQL: " + sql) ;
          this.dbClient.query(sql, (error, results, fields) => {
              cb(response, name, error, results, fields) ;
          }) ;
      } else {
          console.log("Unable to satisfy readTable request; DB not ready") ;
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
            let sql = "insert into Evidence values (NULL, ?, ?, ?, 0, ?, ?, ?, ?)" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, [query["date"],
                                      query["customerID"],
                                      query["product"],
                                      query["tagID"],
                                      query["snippet"],
                                      query["href"],
                                      "usesFeature" in query ? query["usesFeature"] : "0"],
                                (error, results, fields) => {
                                    cb(response, query["customerID"], error, results, fields) ;
                                } ) ;
        } else {
            console.log("Unable to satisfy newEvidence request; DB not ready") ;
            cb(response, customerID, undefined) ;
        }
    }

    // Outcome
    newOutcome(response, query, cb) {
      if (this.activateState && this.dbConnectState) {
          let sql = "insert into Outcome values (NULL, ?, ?)" ;
          console.log("SQL: " + sql) ;
          this.dbClient.query(sql, [query["outcomeName"],
                                    query["outcomeDescription"]],
                              (error, results, fields) => {
                                  cb(response, query["outcomeName"], error, results, fields) ;
                              } ) ;
      } else {
          console.log("Unable to satisfy addOutcome request; DB not ready") ;
          cb(response, tag, undefined) ;
      }
    }

    getAllOutcomes(response, cb) {
        if (this.activateState && this.dbConnectState) {
            let sql = "select OutcomeID,Name from Outcome ORDER BY Name" ;
            console.log("SQL: " + sql) ;
            this.dbClient.query(sql, (error, results, fields) => {cb(response, error, results, fields)}) ;
        } else {
            console.log("Unable to satisfy getAllOutcomes request; DB not ready") ;
            cb(response, undefined) ;
        }
    }
}

module.exports = FunnelDB ;
