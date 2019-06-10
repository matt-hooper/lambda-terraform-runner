# lambda-terraform-runner
Run S3 hosted terraform scripts via an aws lambda function

# Getting started
## Install Node modules
1. Navigate to the layers/node/nodejs folder: \
   `cd layers/node/nodejs`
2. Run npm install \
   `npm install`


## Setting up linux_amd64 Terraform layer
The terraform lambda layer should contain the terraform executable and the aws plugins for linux_amd64 (as this is what the lambda will run on). The following should therefore be done on a linux machine or by utilising the linux subsystem for windows.

The system currently supports terraform v0.11.x

1. Download the latest 0.11 version of terraform from the terraform releases page: https://releases.hashicorp.com/terraform/0.11.14/ and copy it to the `%PROJECT%/layers/terraform/terraform_app` directory
   e.g. \
   ```
   wget https://releases.hashicorp.com/terraform/0.11.14/terraform_0.11.14_linux_amd64.zip
   unzip terraform_0.11.14_linux_amd64.zip
   cp terraform /home/$user/project/layers/terraform/terraform_app
   ```

2. In a directory with access to terraform, create a `setup.tf` file that references the aws provider and run `terraform init`.
3. Copy the hidden `.terraform` directory to the `%PROJECT%/layers/terraform/terraform_plugin` directory
   
   ```
   mkdir setup
   cd setup/
   echo 'provider "aws" {}' > setup.tf
   terraform init
   cp -r .terraform layers/terraform/terraform_plugin
   ```

## Run the terraform script to deploy the lambda
```
cd terraform
terraform init
terraform apply
```