require('dotenv').config();

const Dropbox = require('dropbox').Dropbox;


// Adobe related
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Storage related
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

const dbx = new Dropbox({accessToken: DROPBOX_ACCESS_TOKEN });

async function delay(x) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, x);
	});
}

async function getAccessToken(clientId, clientSecret) {

	const params = new URLSearchParams();
	params.append('client_secret', clientSecret);
	params.append('grant_type', 'client_credentials');
	params.append('scope', 'openid,AdobeID,read_organizations');

	let resp = await fetch(`https://ims-na1.adobelogin.com/ims/token/v2?client_id=${clientId}`, 
		{ 
			method: 'POST', 
			body: params
		}
	);
	let data = await resp.json();
	return data.access_token;
}

(async () => {

	let access_token = await getAccessToken(CLIENT_ID, CLIENT_SECRET);
	console.log('Got an access token.');

	let linkRequest = await dbx.filesGetTemporaryLink({path: '/source.jpg' });
	let inputURL = linkRequest.result.link;

	linkRequest = await dbx.filesGetTemporaryUploadLink({ commit_info: {path: '/source_modified2.jpg', mode:'overwrite'}});
	let outputURL = linkRequest.result.link;
	
	console.log('Got Dropbox links to read and write.');

	let actionJSON = [
		{"_obj":"gaussianBlur","radius":{"_unit":"pixelsUnit","_value":10.0}},
		{"_obj":"photoFilter","color":{"_obj":"HSBColorClass","brightness":67.45098039215686,"hue":{"_unit":"angleUnit","_value":35.123291015625},"saturation":70.58823529411765},"density":100,"preserveLuminosity":true}
	];

	// don't blur
	actionJSON.shift();

	let data = {
		"inputs":[{
			"storage":"dropbox",
			"href":inputURL
		}],
		"options":{
			actionJSON
		},
		"outputs":[ {
			"storage":"dropbox",
			"type":"image/vnd.adobe.photoshop",
			"href":outputURL
		}]
	}

	let resp = await fetch('https://image.adobe.io/pie/psdService/actionJSON', {
		method: 'POST', 
		headers: {
			'Authorization':`Bearer ${access_token}`,
			'x-api-key': CLIENT_ID
		}, 
		body: JSON.stringify(data)
	});

	let result = await resp.json();
	console.log('Fired off my job!');

	let status = 'running';
	let jobResult;
	while(status === 'running' || status === 'pending' || status === 'starting') {
		console.log('\tDelaying while checking job.');
		await delay(1000);

		let jobReq = await fetch(result['_links']['self']['href'], {
			headers: {
				'Authorization':`Bearer ${access_token}`,
				'x-api-key': CLIENT_ID
			}
		})
		
		jobResult = await jobReq.json();
		
		status = jobResult.outputs[0]['status'];
	}


	console.log('\nFinal result', JSON.stringify(jobResult.outputs,null,'\t'));
	
})();