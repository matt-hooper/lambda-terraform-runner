provider "aws" {
  region  = "eu-west-1"
  version = "~> 2.0"
}

resource "aws_s3_bucket" "repo_bucket" {
  bucket = "dec-repository-bucket-${terraform.workspace}"
  acl    = "private"

  tags = {
    Name        = "dec-repository-bucket-${terraform.workspace}"
    Environment = "${terraform.workspace}"
    Project     = "${var.project-name-value}"
  }
}

data "archive_file" "lambda-archive" {
  type        = "zip"
  source_dir  = "../source"
  output_path = "${path.module}/files/source.zip"
}

resource "aws_s3_bucket_object" "lambda-archive-s3-object" {
  bucket = "${aws_s3_bucket.repo_bucket.bucket}"
  key    = "${terraform.workspace}-${var.lambda-function-name}-source.zip"
  source = "${data.archive_file.lambda-archive.output_path}"
}

data "archive_file" "node-layer-archive" {
  type        = "zip"
  source_dir  = "../layers/node"
  output_path = "${path.module}/files/node.zip"
}

resource "aws_s3_bucket_object" "node-layer-archive-s3-object" {
  bucket = "${aws_s3_bucket.repo_bucket.bucket}"
  key    = "${terraform.workspace}-layers-node.zip"
  source = "${data.archive_file.node-layer-archive.output_path}"
}

data "archive_file" "terraform-layer-archive" {
  type        = "zip"
  source_dir  = "../layers/terraform"
  output_path = "${path.module}/files/terraform.zip"
}

resource "aws_s3_bucket_object" "terraform-layer-archive-s3-object" {
  bucket = "${aws_s3_bucket.repo_bucket.bucket}"
  key    = "${terraform.workspace}-layers-terraform.zip"
  source = "${data.archive_file.terraform-layer-archive.output_path}"
}

resource "aws_lambda_layer_version" "node_layer" {
  s3_bucket        = "${aws_s3_bucket.repo_bucket.bucket}"
  s3_key           = "${aws_s3_bucket_object.node-layer-archive-s3-object.key}"
  source_code_hash = "${data.archive_file.node-layer-archive.output_base64sha256}"
  layer_name       = "${terraform.workspace}-node-modules"
  description      = "Shared Node modules (e.g. shelljs and other useful utilities)"

  compatible_runtimes = ["nodejs8.10", "nodejs10.x"]
}

resource "aws_lambda_layer_version" "terraform_layer" {
  s3_bucket        = "${aws_s3_bucket.repo_bucket.bucket}"
  s3_key           = "${aws_s3_bucket_object.terraform-layer-archive-s3-object.key}"
  source_code_hash = "${data.archive_file.terraform-layer-archive.output_base64sha256}"
  layer_name       = "${terraform.workspace}-terraform"
  description      = "terraform application and aws plugins"

  compatible_runtimes = ["nodejs8.10", "nodejs10.x"]
}

# data "aws_iam_role" "lambda-iam_role" {
#   name = "lambda-s3-role"
# }

module "lambda-iam_role" {
  source = "./role"
}

resource "aws_lambda_function" "lambda" {
  function_name = "DEC-${terraform.workspace}-${var.lambda-function-name}"

  s3_bucket        = "${aws_s3_bucket.repo_bucket.bucket}"
  s3_key           = "${aws_s3_bucket_object.lambda-archive-s3-object.key}"
  source_code_hash = "${data.archive_file.lambda-archive.output_base64sha256}"

  role        = "${module.lambda-iam_role.role-arn}"
  handler     = "${var.lambda-handler}.handler"
  runtime     = "nodejs10.x"
  description = "Terraform runner"
  timeout     = "${var.lambda-timeout}"
  memory_size = "${var.lambda-memory}"

  layers = ["${aws_lambda_layer_version.node_layer.arn}", "${aws_lambda_layer_version.terraform_layer.arn}"]

  environment {
    variables = {
      WORKSPACE = "${terraform.workspace}"
    }
  }

  tags {
    Project     = "${var.project-name-value}"
    Environment = "${terraform.workspace}"
  }
}

# This isn't really required but it means the logs will be removed when the lambda is
resource "aws_cloudwatch_log_group" "lamba_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.lambda.function_name}"
  retention_in_days = 7
}
