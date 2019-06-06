const sh = require('shelljs');  
const AWS = require('aws-sdk');
const fs = require('fs');
const extract = require('extract-zip');

const TERRAFORM_OPT = '/opt/terraform_app/terraform';
const TERRAFORM = '/tmp/terraform';
const TERRAFORM_PLUGIN_OPT = '/opt/terraform_plugin/.terraform/plugins/linux_amd64';
const TERRAFORM_PLUGIN = '/tmp/linux_amd64';


// get reference to S3 client 
const s3 = new AWS.S3();

const writeAndUnPackFile = async (data, file_key) => {
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
        console.log(err);
    }
    
}

const processS3Object = (data, action, workspace, script_key) => {
    //fs.writeFileSync('/tmp/terraform-script.tf', data.Body); 
    sh.cd(`/tmp/${script_key}`);
    //sh.cd('/tmp/shared-modules');
    //sh.cd(`/tmp`);
    //sh.exec('ls');
    //sh.exec('ls -la /opt/terraform_app');
    sh.exec(`${TERRAFORM} init -input=false -force-copy -plugin-dir=${TERRAFORM_PLUGIN}`);
    //sh.exec(`${TERRAFORM} workspace delete ${workspace}`);
    sh.exec(`${TERRAFORM} workspace select ${workspace} || ${TERRAFORM} workspace new ${workspace}`);
    //sh.exec(`${TERRAFORM} init -input=false -force-copy`);
    sh.exec(`${TERRAFORM} ${action} -auto-approve -lock=false`);
    //sh.exec(`${TERRAFORM} plan`);
 }

exports.handler = async (event, context) => {
    
    const action = event.action || 'apply';
    const script_key = event.script_key || 'simple';
    const workspace = event.workspace || 'lambda';
    const bucket = 'dec-mhooper-terraform-scripts';
    
    let scriptCount = 0;
    
    console.log(`Action: ${action}. Script: ${script_key}. Workspace: ${workspace}`);
    
    sh.exec(`cp ${TERRAFORM_OPT} ${TERRAFORM}`);
    sh.exec(`cp -r ${TERRAFORM_PLUGIN_OPT} ${TERRAFORM_PLUGIN}`);
    sh.exec(`chmod +x ${TERRAFORM}`);
    sh.exec(`chmod -R +x ${TERRAFORM_PLUGIN}`);
    console.log(sh.exec(`${TERRAFORM} -version`, {silent:true}).stdout);
    
    let data; 
    let params;
    
    const shared_key = 'shared-modules';
    
    params = {
      Bucket: `${bucket}`, 
      Key: `${shared_key}.zip`
    };
    
    try {
        data = await s3.getObject(params).promise();
        await writeAndUnPackFile(data, shared_key);
    }
    catch (err) {
        console.log('an error occurred', err, err.stack); // an error occurred
        throw new Error('an error occurred'); 
    };
    
    params = {
      Bucket: `${bucket}`, 
      Key: `${script_key}.zip`
    };
    
    
    try {
        data = await s3.getObject(params).promise();
        await writeAndUnPackFile(data, script_key);
    }
    catch (err) {
        console.log('an error occurred', err, err.stack); // an error occurred
        throw new Error('an error occurred'); 
    };
    
    params = {
      Bucket: `${bucket}`, 
      Key: `simple.tf`
    };
    
    try {
        data = await s3.getObject(params).promise();
    }
    catch (err) {
        console.log('an error occurred', err, err.stack); // an error occurred
        throw new Error('an error occurred'); 
    };
    
    processS3Object(data, action, workspace, script_key);
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


