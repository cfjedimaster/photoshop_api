/*
I wrote this script as a quick way to check a job status.
*/

const fetch = require('node-fetch');
require('dotenv').config();

const auth = require("@adobe/jwt-auth");

// Adobe related
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TECHNICAL_ACCOUNT_ID = process.env.TECHNICAL_ACCOUNT_ID;
const ORG_ID = process.env.ORGANIZATION_ID;
const KEY = process.env.KEY;

async function delay(x) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, x);
	});
}

(async () => {


	const input = process.argv[2];
	if(!input) {
		console.log('Pass me the URL of the job.');
		process.exit(1);
	}

	let config = {
		clientId: CLIENT_ID,
		clientSecret: CLIENT_SECRET, 
		technicalAccountId: TECHNICAL_ACCOUNT_ID,
		orgId: ORG_ID,
		privateKey: KEY,
		metaScopes:'ent_ccas_sdk'
	}

	let { access_token } = await auth(config);


	let status = 'running';
	let jobResult;
	while(status === 'running' || status === 'pending' || status === 'starting') {

		let jobReq = await fetch(input, {
			headers: {
				'Authorization':`Bearer ${access_token}`,
				'x-api-key': CLIENT_ID
			}
		})
		
		jobResult = await jobReq.json();
		
		status = jobResult['status'];

		if(status === 'running' || status === 'pending' || status === 'starting') {
			console.log('delaying while checking');
			await delay(5000);
		}

	}

	console.log('Final result', JSON.stringify(jobResult,null,'\t'));
})();