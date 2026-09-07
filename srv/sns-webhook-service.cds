// srv/sns-webhook.cds

@protocol: 'rest'
service SnsWebhookService @(path: '/snswh') {
    // We define a simple unbound action here.
    // While SNS sends POST requests to the endpoint,
    // CAP's way to handle custom non-CRUD operations
    // on a service is through actions/functions.
    // The actual handling of the raw POST body will be in the JS handler.
    // action HandleSnsNotification(payload : String);
    
    action HandleSnsNotification();
}
