const REST_API = "https://image.adobe.io/";

class ServicesWrapper {

	/*
	creds is an object with: 

		clientId:
		clientSecret
	*/

	constructor(creds) {

		if(!creds) throw('No creds object when creating a new ServicesWrapper object.');

		let issues = this.validateCreds(creds);
		if(issues.length) {
			throw(`Invalid creds object passed: ${issues.join('\n')}`);
		}
		this.creds = creds;

		this._cachedToken = null;

	}

	/*
	Given a URL, we try to guess the input type. Idea is to make it simpler, ie if I pass an 
	dropbox url, sniff it. Otherwise default to external. For v1, that's what I'll do
	*/
	#createFileRef(url) {
		return {
			href:url,
			storage:'external'
		}
	}

	get accessToken() {

		if(this._cachedToken) return this._cachedToken;

		return new Promise(async (resolve, reject) => {

			const params = new URLSearchParams();
			params.append('client_secret', this.creds.clientSecret);
			params.append('grant_type', 'client_credentials');
			params.append('scope', 'openid,AdobeID,read_organizations');

			let resp = await fetch(`https://ims-na1.adobelogin.com/ims/token/v2?client_id=${this.creds.clientId}`, 
				{ 
					method: 'POST', 
					body: params
				}
			);
			let data = await resp.json();
			this._cachedToken = data.access_token;
			resolve(data.access_token);
		});

	}

	// Not really useful unless you just want to quickly validate your auth
	async hello() {
		let access_token = await this.accessToken;

		let resp = await fetch('https://image.adobe.io/pie/psdService/hello', {
			headers: {
				'Authorization':`Bearer ${access_token}`,
				'x-api-key': this.creds.clientId
			}
		});

		return await resp.text();
	}

	async getJob(url) {

		let access_token = await this.accessToken;

		let jobReq = await fetch(url, {
			headers: {
				'Authorization':`Bearer ${access_token}`,
				'x-api-key': this.creds.clientId
			}
		});

		return await jobReq.json();

	}

	/*
	options (with defaults):
		optimize: 'performance'
		outputOverwrite:true,
		outputColor:rgba,
		outputMask: soft
	*/
	async removeBackground(inputURL, outputURL, options={}) {

		let token = await this.accessToken;

		let outputRef = this.#createFileRef(outputURL);
		let body = {
			input: this.#createFileRef(inputURL),
			options: {
				optimize: options.optimize ?? 'performance'
			},
			output: {
				href: outputRef.href,
				storage: outputRef.storage, 
				overwrite:options.outputOverwrite ?? true,
				color: { space: options.outputColor ?? 'rgba' },
				mask: { format: options.outputMask ?? 'soft' }
			}
		};

		body = JSON.stringify(body);

		let req = await fetch(REST_API+'sensei/cutout', {
			method:'post',
			headers: {
				'x-api-key':this.creds.clientId,
				'Authorization':`Bearer ${token}`,
				'Content-Type':'application/json'
			},
			body: body
		});

		let result = await req.json();
		// todo: better error handling
		if(result.code) throw new Error(`Error in call: ${result.reason[0].message}`);
		return result._links.self.href;
	}

	// Lame function to add a delay to my polling calls
	async delay(x) {
		return new Promise(resolve => {
			setTimeout(() => resolve(), x);
		});
	}

	/*
	I return an array of exceptions, things missing basically
	*/
	validateCreds(c) {
		let issues = [];
		if(!c.clientId) issues.push('clientId missing');
		if(!c.clientSecret) issues.push('clientSecret missing');
		return issues;
	}

}

module.exports = ServicesWrapper;