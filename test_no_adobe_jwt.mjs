/*
An example of using the PS API w/o the Adobe JWT package. It does use jsonwebtoken.


*/

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
const { sign, verify } = jwt;

import dotenv from 'dotenv';
dotenv.config();

const KEY = process.env.KEY;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TECHNICAL_ACCOUNT_ID = process.env.TECHNICAL_ACCOUNT_ID;
const ORG_ID = process.env.ORGANIZATION_ID;

// Storage related
const STORAGE_HOST = process.env.STORAGE_HOST;
const STORAGE_SAS = process.env.STORAGE_SAS;

async function delay(x) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, x);
	});
}

async function getAccessToken(config) {

	let scope = `https://ims-na1.adobelogin.com/s/${config.metaScopes}`;
	let cred = {
		"iss":config.orgId, 
		"sub":config.technicalAccountId,
		"aud":`https://ims-na1.adobelogin.com/c/${config.clientId}`
	};

	cred[scope] = true;

	const token = sign(cred, config.privateKey, {expiresIn: 300, algorithm: 'RS256'});

	let body = `client_id=${config.clientId}&client_secret=${config.clientSecret}&jwt_token=${token}`;
    let getATReq = await fetch('https://ims-na1.adobelogin.com/ims/exchange/jwt', {
      method:'POST', 
      headers: {
        'Content-Type':' application/x-www-form-urlencoded'
      },
      body: body
    });
    
    return await getATReq.json();

}

(async () => {

	let config = {
		clientId: CLIENT_ID,
		clientSecret: CLIENT_SECRET, 
		technicalAccountId: TECHNICAL_ACCOUNT_ID,
		orgId: ORG_ID,
		privateKey: KEY,
		metaScopes:'ent_ccas_sdk'
	}

	let { access_token } = await getAccessToken(config);

	// this is a copy from app.js
	let inputURL = `https://${STORAGE_HOST}.blob.core.windows.net/jedi/oldcan.jpg?${STORAGE_SAS}`;
	let outputURL = `https://${STORAGE_HOST}.blob.core.windows.net/jedi/oldcan-modified.jpg?${STORAGE_SAS}`;

	let data = {
		"input":{
			"storage":"azure",
			"href":inputURL
		},
		"output": {
			"storage":"azure",
			"href":outputURL
		}
	}

	let resp = await fetch('https://image.adobe.io/sensei/cutout', {
		method: 'POST', 
		headers: {
			'Authorization':`Bearer ${access_token}`,
			'x-api-key': CLIENT_ID
		}, 
		body: JSON.stringify(data)
	});

	let result = await resp.json();
	console.log(result);

	let status = 'running';
	let jobResult;
	while(status === 'running' || status === 'pending' || status === 'starting') {
		console.log('delaying while checking');
		await delay(5000);

		let jobReq = await fetch(result['_links']['self']['href'], {
			headers: {
				'Authorization':`Bearer ${access_token}`,
				'x-api-key': CLIENT_ID
			}
		})
		
		jobResult = await jobReq.json();
		
		status = jobResult['status'];
	}

	console.log('Final result', jobResult);

})()