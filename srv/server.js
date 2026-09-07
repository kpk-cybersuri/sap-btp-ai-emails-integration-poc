const cds = require('@sap/cds');
const { loadAllSecrets, secrets } = require('./lib/secretLoader');
const { initEmailTransporter } = require('./lib/emailbasic-helper');
const { initializeHuggingFaceClient } = require('./lib/huggingface-client');

// cds.on('bootstrap', app => {
//   console.log('[LIFECYCLE] CAP Application bootstrapping...');  
//   secretLoader.loadAllSecrets();
// });

// cds.on('served', () => {
//   console.log('[LIFECYCLE] All CAP services are served and ready.');
// });

// cds.on('listening', ({ url }) => {
//   console.log(`[LIFECYCLE] CAP server is listening at: ${url}`);
// });

// cds.on('shutdown', () => {
//   console.log('[LIFECYCLE] CAP Application shutting down...');
//   // This is where you'd perform cleanup tasks, close connections, etc.
// });


module.exports = async (o) => {
  // o.from = ['srv', 'srv/testcheck-service']; // This is an option for cds.serve, not cds watch folder config  

  cds.on('bootstrap', () => {
    // app.use('/my-custom-path', (req, res) => res.send('Hello from custom path!'));
    console.log('[LIFECYCLE] CAP Application bootstrapping...');
    loadAllSecrets();
    console.log("Loaded the Secrets during cds bootstrap.....");

    try {
      initializeHuggingFaceClient(secrets.HF_API_TOKEN);
    } catch (error) {
      console.error(`Application startup failed: ${error.message}`);
      // Optionally, exit the process if a critical dependency like HF client can't be initialized
      // process.exit(1); 
    }

    const googleAppPassword = secrets.GOOGLE_APPPW;
    if (googleAppPassword) {
      initEmailTransporter(googleAppPassword);
    } else {
      console.error("Bootstrap: GOOGLE_APPPW not found. Email service may not function.");
    }

  });

  cds.on('served', (services) => {
    // Services are now available
    console.log('[LIFECYCLE] All CAP services are served and ready.');
    // console.log("check if Dev or Prod, isDev? " + logger.isDevEnv());
    // console.log('Services served:', Object.keys(services));        
  });

  cds.on('listening', ({ url }) => {
    console.log(`[LIFECYCLE] CAP server is listening at: ${url}`);
  });

  cds.on('shutdown', () => {
    console.log('[LIFECYCLE] CAP Application shutting down...');    
  });

  // Delegate to the default CDS server setup
  return cds.server(o);
};