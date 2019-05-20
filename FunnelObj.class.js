"use strict" ;

class FunnelObj {
    constructor(fDB) {
        this.fDB = fDB ;
        this.fDB.MySQLConnect() ;
    }

    // pass through to FunnelDB implementation

    dbConnectState(response) {
        console.log("dbstatus returning: " + this.fDB.dbConnectState) ;
        response.end(JSON.stringify(this.fDB.dbConnectState)) ;
    }
    doStatus(response) { this.fDB.doStatus(response) }
    doPing(response) { this.fDB.doPing(response) }

    // Get All Tags

    _handleGetAllTags(response, error, results, fields) {
        if (undefined === error || null !== error ) {
            let response_string = "Error querying for all customers: " + error ;
            console.log(response_string) ;
            response.end(response_string) ;
        } else {
            let response_string = JSON.stringify(results) ;
            console.log("getAllTags got results: " + response_string) ;
            response.end(response_string) ;
        }
    }

    getAllTags(response) {
        this.fDB.getAllTags(response, this._handleGetAllTags.bind(this)) ;
    }

    // new tag flow:
    // get tag -> if null, create tag

    _addC_handleAddTag(response, tagToAdd, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error adding, " + tag.name + ": " + error ;
            console.log("_addC_handleAddTag: " + response_string) ;
            response.end(JSON.stringify( [ Boolean(false), result_string ] )) ;
        } else {
            let response_string = JSON.stringify(results) ;
            console.log("_addC_handleAddTag got results: " + response_string) ;
            response.end(JSON.stringify(Boolean(true))) ;
        }
    }

    _addC_handleGetTag(response, tagToAdd, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error querying for tag: " + error ;
            console.log("__addC_getTag: " + response_string) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        } else if (0 == results.length) {
            // IMPORTANT, we move forward adding a tag IFF we got zero results
            console.log("Calling fDB.addTag") ;
            this.fDB.addTag(response, tagToAdd, this._addC_handleAddTag.bind(this))
        } else {
            let response_string = "Error adding, " + name + ", tag already exists."
            console.log("__addC_getTag: " + response_string ) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        }
    }

    addTag(response, tagToAdd) {
        this.fDB.getTag(response, tagToAdd, this._addC_handleGetTag.bind(this)) ;
    }

    // Get All Customers

    _handleGetAllCustomers(response, error, results, fields) {
        if (undefined === error || null !== error ) {
            let response_string = "Error querying for all customers: " + error ;
            console.log(response_string) ;
            response.end(response_string) ;
        } else {
            let response_string = JSON.stringify(results) ;
            console.log("getAllCustomers got results: " + response_string) ;
            response.end(response_string) ;
        }
    }

    getAllCustomers(response) {
        this.fDB.getAllCustomers(response, this._handleGetAllCustomers.bind(this)) ;
    }

    // Get One Customer

    _handleGetCustomer(response, name, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error querying for a single customer: " + error ;
            console.log("_getCustomer_cb: " + response_string) ;
            response.end(JSON.stringify(response_string)) ;
        } else {
            let response_string = JSON.stringify(results) ;
            console.log("getCustomer got results: " + results) ;
            response.end(response_string) ;
        }
    }

    getCustomer(response, name) {
        this.fDB.getCustomer(response, name, this._handleGetCustomer.bind(this)) ;
    }

    _handleReadTable(response, name, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error reading table: " + error ;
            console.log("_readTable_cb: " + response_string) ;
            response.end(JSON.stringify(response_string)) ;
        } else {
            let response_string = JSON.stringify(results) ;
            console.log("readTable got results: " + results) ;
            response.end(response_string) ;
        }
    }

    readTable(response, name) {
        this.fDB.readTable(response, name, this._handleReadTable.bind(this)) ;
    }

    // new customer flow:
    // get customer -> if null, create customer

    _addC_handleAddCustomer(response, name, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error adding, " + name + ": " + error ;
            console.log("_addC_handleAddCustomer: " + response_string) ;
            response.end(JSON.stringify( [ Boolean(false), result_string ] )) ;
        } else {
            let response_string = JSON.stringify(results) ;
            console.log("_addC_handleAddCustomer got results: " + response_string) ;
            response.end(JSON.stringify(Boolean(true))) ;
        }
    }

    _addC_handleGetCustomer(response, name, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error querying for customer: " + error ;
            console.log("__addC_getCustomer: " + response_string) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        } else if (0 == results.length) {
            // IMPORTANT, we move forward adding a customer IFF we got zero results
            console.log("Calling fDB.addCustomer") ;
            this.fDB.addCustomer(response, name, this._addC_handleAddCustomer.bind(this))
        } else {
            let response_string = "Error adding, " + name + ", customer already exists."
            console.log("__addC_getCustomer: " + response_string ) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        }
    }

    addCustomer(response, name) {
        this.fDB.getCustomer(response, name, this._addC_handleGetCustomer.bind(this)) ;
    }

    // new evidence flow
    //
    // let's just do something simple for now, no edge-checking of inputs
    // don't interpret customer or label; just blindly insert the values

    _handleNewEvidence(response, customerID, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error adding new evidence for customer " + customerID + ": " + error ;
            console.log("_handleNewEvidence: " + response_string) ;
            response.end(JSON.stringify( [ Boolean(false), response_string ] )) ;
        } else {
            console.log("_handleNewEvidence: " + JSON.stringify(results)) ;
            response.end(JSON.stringify(Boolean(true))) ;
        }
    }

    newEvidenceByCustomerID(response, query) {
        this.fDB.newEvidence(response, query,
                             this._handleNewEvidence.bind(this)) ;
    }

    _handleNewOutcome(response, name, error, results, fields) {
        if (undefined === error || null !== error) {
            let response_string = "Error adding, " + name + ": " + error ;
            console.log("_handleAddOutcome: " + response_string) ;
            response.end(JSON.stringify( [ Boolean(false), result_string ] )) ;
        } else {
            let response_string = JSON.stringify(results) ;
            console.log("_handleAddOutcome got results: " + response_string) ;
            response.end(JSON.stringify(Boolean(true))) ;
        }
    }

    addOutcome(response, query) {
        this.fDB.newOutcome(response, query,
                            this._handleNewOutcome.bind(this)) ;
    }
}

module.exports = FunnelObj ;
