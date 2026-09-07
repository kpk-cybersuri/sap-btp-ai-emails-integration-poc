const cds = require('@sap/cds');
const axios = require('axios');
const { secrets } = require('./secretLoader');
const { AuthTokens: CdsAuthTokens } = cds.entities('my.app');
const { DailyIdocData: DIData, DailyFetches: DF } = cds.entities('my.app');

// async function getValidTokenTest(tx, AuthTokens) {
//     console.log("--- STARTING getValidToken ---");
//     console.log(`Checking if cds.entities is defined: ${!!cds.entities}`);
//     if (cds.entities) {
//         console.log(`Checking if cds.entities('my.app') is defined: ${!!cds.entities('my.app')}`);
//         if (cds.entities('my.app')) {
//             console.log(`Checking if AuthTokens is defined in cds.entities('my.app'): ${!!cds.entities('my.app').AuthTokens}`);
//         }
//         // throw new Error("Oops");
//     }
//     const now = new Date();
//     let tokens;

//     try {
//         console.log("Attempting to run the SELECT query with the passed AuthTokens...");
//         tokens = await tx.run(
//             SELECT.from(AuthTokens).limit(1)
//         );
//         console.log("SELECT query executed successfully.");
//     } catch (e) {
//         console.error("Attempt 1 failed. Error caught:", e.message);
//         console.log("Attempting alternative query syntax...");
//         try {
//             // This is the most reliable way to reference an entity in production
//             // const { AuthTokens: CdsAuthTokens } = cds.entities('my.app');
//             console.log(`Checking if the alternative CdsAuthTokens is defined: ${!!CdsAuthTokens}`);

//             tokens = await tx.run(
//                 SELECT.from(CdsAuthTokens).limit(1)
//             );
//             console.log("Alternative SELECT query executed successfully.");
//         } catch (e2) {
//             console.error("Alternative attempt also failed. Error caught:", e2.message);
//             // Re-throw the original error after logging for clarity
//             throw new Error("Both query attempts failed. Check your entity definitions and service bindings.");
//         }
//     }

//     if (tokens && tokens.length && new Date(tokens[0].expiresAt) > now) {
//         console.log("Using Existing Token ...");
//         return tokens[0].accessToken;
//     }

//     // await tx.run(
//     //     SELECT.from(my.app.AuthTokens).limit(1)
//     // );
//     // if (tokens.length && new Date(tokens[0].expiresAt) > now) {
//     //     console.log("Using Existing Token ...");
//     //     return tokens[0].accessToken;
//     // }


//     const basicAuth = Buffer.from(`${secrets.OAPI_CLIENT_ID}:${secrets.OAPI_CLIENT_SECRET}`).toString('base64');
//     const res = await axios.post(secrets.OAPI_OAUTH_URL, 'grant_type=client_credentials', {
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//             'Authorization': `Basic ${basicAuth}`
//         }
//     });
//     console.warn("Token Api Called ...");
//     const token = res.data.access_token;
//     const expiresAt = new Date(now.getTime() + (res.data.expires_in - 60) * 1000);

//     // if (tokens.length) {
//     //     await tx.run(
//     //         UPDATE.entity(AuthTokens)
//     //             .set({
//     //                 accessToken: token,
//     //                 expiresAt: expiresAt
//     //             })
//     //             .where({
//     //                 ID: tokens[0].ID
//     //             })
//     //     );
//     // } else {
//     //     await tx.run(INSERT.into(AuthTokens).entries({
//     //         ID: cds.utils.uuid(),
//     //         accessToken: token,
//     //         expiresAt: expiresAt
//     //     }));
//     // }
//     // return token;
//     if (tokens.length) {
//         try {
//             console.log("Attempting to UPDATE existing token...");
//             await tx.run(
//                 UPDATE.entity(CdsAuthTokens)
//                     .set({
//                         accessToken: token,
//                         expiresAt: expiresAt
//                     })
//                     .where({
//                         ID: tokens[0].ID
//                     })
//             );
//             console.log("UPDATE successful.");
//         } catch (e) {
//             console.error("UPDATE query failed. Error:", e.message);
//             throw e; // Re-throw the error after logging
//         }
//     } else {
//         try {
//             console.log("Attempting to INSERT a new token...");
//             await tx.run(INSERT.into(CdsAuthTokens).entries({
//                 ID: cds.utils.uuid(),
//                 accessToken: token,
//                 expiresAt: expiresAt
//             }));
//             console.log("INSERT successful.");
//         } catch (e) {
//             console.error("INSERT query failed. Error:", e.message);
//             throw e; // Re-throw the error after logging
//         }
//     }
//     return token;
// }

async function getValidToken(tx, AuthTokens) {
    console.log(`Checking if cds.entities is defined: ${!!cds.entities}`);
    const now = new Date();
    let tokens;    
    try {
        console.log("Attempting to SELECT with the passed AuthTokens...");
        tokens = await tx.run(
            SELECT.from(AuthTokens).limit(1)
        );
        console.log("SELECT query executed successfully.");
    } catch (e) {
        console.error("Attempt 1 failed. Error caught:", e.message);
        console.log("Attempting alternative query syntax...");
        try {
            console.log(`Checking if the alternative CdsAuthTokens is defined: ${!!CdsAuthTokens}`);
            tokens = await tx.run(
                SELECT.from(CdsAuthTokens).limit(1)
            );
            console.log("Alternative SELECT query executed successfully.");
        } catch (e2) {
            console.error("Alternative attempt also failed. Error caught:", e2.message);
            // throw new Error("Both query attempts failed. Check your entity definitions and service bindings.");
            return "";
        }
    }
    if (tokens.length && new Date(tokens[0].expiresAt) > now) {
        console.log("Using Existing Token ...");
        return tokens[0].accessToken;
    }
    const basicAuth = Buffer.from(`${secrets.OAPI_CLIENT_ID}:${secrets.OAPI_CLIENT_SECRET}`).toString('base64');
    const res = await axios.post(secrets.OAPI_OAUTH_URL, 'grant_type=client_credentials', {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`
        }
    });
    console.warn("Token Api Called ...");
    const token = res.data.access_token;
    const expiresAt = new Date(now.getTime() + (res.data.expires_in - 60) * 1000);
    // if (tokens.length) {
    //     await tx.run(
    //         UPDATE.entity(AuthTokens)
    //             .set({
    //                 accessToken: token,
    //                 expiresAt: expiresAt
    //             })
    //             .where({
    //                 ID: tokens[0].ID
    //             })
    //     );
    // } else {
    //     await tx.run(INSERT.into(AuthTokens).entries({
    //         ID: cds.utils.uuid(),
    //         accessToken: token,
    //         expiresAt: expiresAt
    //     }));
    // }
    // Using UPSERT to either INSERT or UPDATE in one go
    try {
        console.log("Attempting to UPSERT token data...");        
        const existingToken = tokens.length ? tokens[0] : null;        
        await tx.run(
            UPSERT.into(CdsAuthTokens).entries({
                ID: existingToken ? existingToken.ID : cds.utils.uuid(),
                accessToken: token,
                expiresAt: expiresAt
            })
        );
        console.log("UPSERT successful.");
        return token;
    } catch (e) {
        console.error("UPSERT query failed. Error:", e.message);
        // throw e;
        return "";
    }    
}

async function fetchAndStoreIdocs(tx, AuthTokens, DailyFetches, DailyIdocData) {
    let response;
    let token = await getValidToken(tx, AuthTokens);
    if(!token) {
        return [];
    }
    try {
        response = await axios.get(secrets.OAPI_DATA_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log("Token expired. Fetching a new one and retrying.");
            token = await getValidToken(tx);
            response = await axios.get(secrets.OAPI_DATA_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } else {
            console.error("API call failed for a non-token-related reason:", error.message);
            return [];
            // throw error;
        }
    }
    // const arr = response.data;
    // await tx.run([
    //     DELETE.from(DailyIdocData),
    //     DELETE.from(DailyFetches),
    //     INSERT.into(DailyIdocData).entries(arr.map(o => ({
    //         ID: cds.utils.uuid(),
    //         ...o
    //     }))),
    //     INSERT.into(DailyFetches).entries({
    //         ID: cds.utils.uuid(),
    //         fetchedAt: new Date()
    //     })
    // ]);    
    // console.log("IdocData Refreshed...");
    try {
        console.log("Attempting to run transaction for IdocData...");
        const arr = response.data;
        await tx.run([
            DELETE.from(DailyIdocData),
            DELETE.from(DailyFetches),
            INSERT.into(DailyIdocData).entries(arr.map(o => ({
                ID: cds.utils.uuid(),
                ...o
            }))),
            INSERT.into(DailyFetches).entries({
                ID: cds.utils.uuid(),
                fetchedAt: new Date()
            })
        ]);
        console.log("IdocData Refreshed successfully.");
        return arr;
    } catch (e) {
        console.error("Failed to run IdocData transaction. Error:", e.message);
        // throw e; // Re-throw the error to halt the process and show the crash logs
        return [];
    }        
}

module.exports = { fetchAndStoreIdocs, getValidToken };
