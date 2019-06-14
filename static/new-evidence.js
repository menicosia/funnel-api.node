// New Evidence - code to access the funnel-API and populate a new evidence form

var dbStatus = undefined ;

window.onload = function () {
    getDBstatus() ;
}

function getDBstatus() {
    var url = document.baseURI + "json/dbstatus" ;
    console.log("document.baseURI is: " + document.baseURI) ;
    console.log("URL: " + url) ;
    var request = new XMLHttpRequest() ;
    request.onload = function () {
        if (200 == request.status) {
            q = JSON.parse(request.responseText) ;
            dbStatus = q ;
            displayDBstatus() ;
            populateSelect("customers") ;
            populateSelect("tags") ;
            populateSelect("outcomes") ;
        }
    } ;
    request.open("GET", url) ;
    request.send(null) ;
}

function displayDBstatus() {
    var span = document.getElementById("dbstatus") ;
    span.innerHTML = dbStatus ;
}

function populateSelect(what) {
    let url = document.baseURI + "json/" ;
    let selectElement = undefined ;
    let requestUrl = undefined ;
    let key = undefined ;
    let value = undefined ;
    console.log("populate called on: " + what) ;
    switch(what) {
      case "customers":
          requestUrl = url + "getAllCustomers" ;
          selectElement = "customerlist" ;
          key = "Name" ;
          value = "CustomerID" ;
          break ;
      case "tags":
          requestUrl = url + "getAllTags" ;
          selectElement = "taglist" ;
          key = "Name" ;
          value = "TagID" ;
          break ;
      case "outcomes":
          requestUrl = url + "getAllOutcomes" ;
          selectElement = "outcomelist" ;
          key = "Name" ;
          value = "OutcomeID" ;
          break ;
    }

    if (dbStatus) {
        var request = new XMLHttpRequest() ;
        request.onload = function () {
            if (200 == request.status) {
                console.log("request for " + what + " got data: "
                            + JSON.stringify(request.response)) ;
                updateSelect(JSON.parse(request.responseText), selectElement, key, value) ;
            } else {
                console.log("Failed to get data from server.") ;
            }
        }
        console.log("Calling: " + requestUrl) ;
        request.open("GET", requestUrl) ;
        request.send(null) ;
    } else {
        console.log("dbStatus not true, not loading data: " + dbStatus) ;
    }
}

function updateSelect(data, element, key, value) {
    let thisElement = document.getElementById(element) ;
    for (i = 0 ; i < data.length ; i++) {
        // var newOpt = document.createElement("option", { is : "foobar" }) ;
        var newOpt = new Option(data[i][key], data[i][value])
        // newOpt.appendChild(document.createTextNode(data[i]["Name"])) ;
        thisElement.insertBefore(newOpt, thisElement.firstChild) ;
    }
}
