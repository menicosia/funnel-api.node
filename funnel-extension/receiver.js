chrome.extension.onMessage.addListener(
    function(message, sender, sendResponse) {
        var googleDocument = googleDocsUtil.getGoogleDocument();
        console.log("Returning selected text: " + googleDocument.selectedText);

        sendResponse(googleDocument.selectedText);
    }) ;
