type EmailResponse {
    status        : String;
    method        : String;
    readyForReply : String;
}

type BasicMailResponse {
    status  : String;
    message : String;
}

type BasicAttachment {
    filename    : String;
    path        : String;
    contentType : String; // MIME type of the attachment (e.g., 'application/pdf', 'image/png').
}

service EmailBasicService @(path: '/email') {
    action sendEmail(to : array of String,
                     subject : String,
                     body : String,
                     htmlBody : String,
                     shouldObserveReplies : String,
                     attachmentBase64 : String,
                     attachmentName : String)                         returns EmailResponse;

    action sendSmtpOtsukaEmail(to : array of String,
                               subject : String,
                               body : String,
                               htmlBody : String,                               
                               attachmentBase64 : String,
                               attachmentName : String)               returns BasicMailResponse;

    action sendSmtpGmailEmail(to : String,
                              subject : String,
                              body : String,
                              htmlBody : String,
                              attachments : array of BasicAttachment) returns BasicMailResponse;


    action sendSmtpOutlookEmail(to : String,
                                subject : String,
                                text : String,
                                htmlText : String)                    returns BasicMailResponse;

// action processBPAMailReplyComplete(payload : Map) returns Boolean;
}
