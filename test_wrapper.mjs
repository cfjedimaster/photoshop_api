import 'dotenv/config';

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: 'us-east-1' });
const bucket = 'psapitestrkc';

import ServicesWrapper from './ServicesWrapper.js';

async function getSignedDownloadUrl(path) {
	let command = new GetObjectCommand({ Bucket: bucket, Key:path });
	return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

async function getSignedUploadUrl(path) {
	let command = new PutObjectCommand({ Bucket: bucket, Key:path });
	return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

(async () => {


	let psAPI = new ServicesWrapper({ clientId: process.env.CLIENT_ID, clientSecret: process.env.CLIENT_SECRET });
	//let test = await psAPI.hello();
	//console.log('hello test', test);

	let inputURL, uploadURL, status;

	//TEST CASE 1 - remove BG
	inputURL = await getSignedDownloadUrl('input/cats.jpg');
	uploadURL = await getSignedUploadUrl('output/cats_nobg.jpg');
	console.log('Creating BG job');
	let removeBGJob = await psAPI.removeBackground(inputURL, uploadURL);

	status = await psAPI.pollJob(removeBGJob);
	console.log(status);
	
	//TEST CASE 2 - get document manifest on a psd
	inputURL = await getSignedDownloadUrl('input/paperclips.psd');
	let maniJob = await psAPI.getDocumentManifest(inputURL);
	console.log(maniJob);

	status = await psAPI.pollJob(maniJob);
	console.log(JSON.stringify(status,null,'\t'));
	

})();