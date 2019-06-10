const sh = require('shelljs');  
const AWS = require('aws-sdk');
const fs = require('fs');
const extract = require('extract-zip');

const TERRAFORM_APP_LAYER_LOC = '/opt/terraform_app/terraform';
const TERRAFORM = '/tmp/terraform';
const TERRAFORM_PLUGIN_LAYER_LOC = '/opt/terraform_plugin/.terraform/plugins/linux_amd64';
const TERRAFORM_PLUGIN = '/tmp/linux_amd64';
const SHARED_MODULES_KEY = 'shared-modules';


// get reference to S3 client 
const s3 = new AWS.S3();

// setup terraform 
const setupTerraform = () => {
    sh.exec(`cp ${TERRAFORM_APP_LAYER_LOC} ${TERRAFORM}`);
    sh.exec(`cp -r ${TERRAFORM_PLUGIN_LAYER_LOC} ${TERRAFORM_PLUGIN}`);
    sh.exec(`chmod +x ${TERRAFORM}`);
    sh.exec(`chmod -R +x ${TERRAFORM_PLUGIN}`);
    console.log(sh.exec(`${TERRAFORM} -version`, {silent:true}).stdout);
}

const downloadZipFromS3AndUnPack = async (bucket, workspace, file_key) => {
    const params = {
      Bucket: `${bucket}`, 
      Key: `${workspace}-${file_key}.zip`
    };
    
    try {
        const data = await s3.getObject(params).promise();
        await writeAndUnpackFile(data, file_key);
    }
    catch (err) {
        console.log(`An error occurred during download. Bucket: ${bucket}. File: ${file_key}.zip.`, err, err.stack); // an error occurred
        throw new Error('Download error.'); 
    };
} 

const writeAndUnpackFile = async (data, file_key) => {
    const zipFile = `/tmp/${file_key}.zip`;
    const target = `/tmp/${file_key}`;
    fs.writeFileSync(zipFile, data.Body);
    try {
        await new Promise((resolve, reject) => {
            extract(zipFile, {dir: target}, err => {
                if (err) reject(err);
                else resolve();
            });  
        });
    }
    catch(err) {
        console.log(`An error occurred during Unpack. File: ${file_key}.zip.`, err, err.stack); // an error occurred
        throw new Error('Unpack error.');
    }
    
}

const runTerraform = (action, workspace, script_key) => {
    
    sh.cd(`/tmp/${script_key}`);
    sh.exec(`${TERRAFORM} init -input=false -force-copy -plugin-dir=${TERRAFORM_PLUGIN}`);
    sh.exec(`${TERRAFORM} workspace select ${workspace} || ${TERRAFORM} workspace new ${workspace}`);
    sh.exec(`${TERRAFORM} ${action} -auto-approve -lock=false`);
 }

exports.handler = async (event, context) => {
    
    const action = event.action || 'apply';
    const script_key = event.script_key || 'simple';
    const workspace = event.workspace || 'lambda';
    const bucket = event.bucket_name || 'dec-mhooper-terraform-scripts';
    
    let scriptCount = 0;
    
    console.log(`Action: ${action}. Script: ${script_key}. Workspace: ${workspace}`);
    
    setupTerraform();
    
    // download shared modules
    await downloadZipFromS3AndUnPack(bucket, workspace, SHARED_MODULES_KEY);
    
    // download target script
    await downloadZipFromS3AndUnPack(bucket, workspace, script_key);

    runTerraform(action, workspace, script_key);
    scriptCount++;
        
    console.log(`Scripts processed: `, scriptCount);   
    
    const response = {
        statusCode: 200,
        body: {
          scripts_processed: scriptCount,
          description: `terraform ${action} complete`
        },
    };
    return response;
};