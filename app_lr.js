const fetch = require('node-fetch');
require('dotenv').config();

const auth = require("@adobe/jwt-auth");

// Adobe related
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TECHNICAL_ACCOUNT_ID = process.env.TECHNICAL_ACCOUNT_ID;
const ORG_ID = process.env.ORGANIZATION_ID;
const KEY = process.env.KEY;

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

(async () => {

	let config = {
		clientId: CLIENT_ID,
		clientSecret: CLIENT_SECRET, 
		technicalAccountId: TECHNICAL_ACCOUNT_ID,
		orgId: ORG_ID,
		privateKey: KEY,
		metaScopes:'ent_ccas_sdk'
	}

	let { access_token } = await auth(config);

	let inputURL = `https://${STORAGE_HOST}.blob.core.windows.net/jedi/oldcan.jpg?${STORAGE_SAS}`;
	let outputURL = `https://${STORAGE_HOST}.blob.core.windows.net/jedi/oldcan-modified.jpg?${STORAGE_SAS}`;

	let data2 = {
		"inputs":{
			"storage":"azure",
			"href":inputURL
		},
		"outputs": [{
			"storage":"azure",
			"href":outputURL
		}]
	}

	let data = {
	"inputs": {
		"href": "https://uc0aa5b45714a8eb25db0b508660.dl.dropboxusercontent.com/cd/0/get/B5NKrYDHnTOzr6f2ayoShlekbZCrYasnP2mIIWe8lfzYsGENHZrgDXu8jZsw40Y2gWScFUPcQ9hIX2J1RXwfv5D4ctecc_v_zQmktG5fmWRQZq0EYGH3uqyOtbxzVRSPDblVJmjlKkAR0sejUjtVYTixBaRWuai-ali9Vq9PLdJLtQ/file",
		"storage": "dropbox"
	},
	"outputs": [
		{
		"storage": "dropbox",
		"type": "image/jpeg",
		"href": "https://content.dropboxapi.com/apitul/1/2THv6HBrcX0w5A"
		}
	]
	};

	let resp = await fetch('https://image.adobe.io/lrService/autoTone', {
		method: 'POST', 
		headers: {
			'Authorization':`Bearer ${access_token}`,
			'x-api-key': CLIENT_ID,
			'Content-Type':'application/json'
		}, 
		body: JSON.stringify(data)
	});

	let result = await resp.json();
	console.log(result);

	/*
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
	*/
})();