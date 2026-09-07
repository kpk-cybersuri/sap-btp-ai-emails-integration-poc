type Flow1Status {
    status  : String;
    message : String;
}

service BpaPocFlowService @(path: '/bpf') {
    action mailflow1(toEmail : String,
                     optionalMessageText : String)    returns Flow1Status;    

    action idocwf1(toMail : String,
               optionalMessageText : String)          returns Flow1Status;

    // action flow2(toEmail : String,
    //              optionalMessageText : String)        returns Flow1Status;

// action mailFlow1(toEmail : String,
//                  optionalMessageText : String,
//                  needChart : String,
//                  sendTableAsAttachment : String) returns Flow1Status;
}
