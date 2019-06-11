provider "aws" {
  region  = "eu-west-1"
  version = "~> 2.0"
}

resource "aws_iam_role" "dec_aws_iam_role_lambda" {
  tags = {
    Name    = "dec_aws_iam_role_lambda"
    Project = "data-engineering-comparator"
    Owner   = "mhooper"
  }

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "dec_aws_iam_role_lambda_inline_policy" {
  name        = "dec_aws_iam_role_lambda_inline_policy"
  path        = "/"
  description = "dec lambda iam policy"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecs:CreateCluster",
                "ecs:DeregisterContainerInstance",
                "ecs:DiscoverPollEndpoint",
                "ecs:Poll",
                "ecs:RegisterContainerInstance",
                "ecs:StartTelemetrySession",
                "ecs:Submit*",
                "ecs:StartTask",
                "logs:*",
                "ecr:Get*",
                "*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kinesis:*",
                "dynamodb:*",
                "cloudwatch:PutMetricData",
                "s3:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

data "aws_iam_policy" "dec_aws_iam_role_lambda_execute" {
  arn = "arn:aws:iam::aws:policy/AWSLambdaExecute"
}

resource "aws_iam_role_policy_attachment" "dec_aws_iam_role_lambda-role-policy-attach" {
  role       = "${aws_iam_role.dec_aws_iam_role_lambda.name}"
  policy_arn = "${data.aws_iam_policy.dec_aws_iam_role_lambda_execute.arn}"
}

resource "aws_iam_role_policy_attachment" "dec_aws_iam_role_lambda-role-inlinepolicy-attach" {
  role       = "${aws_iam_role.dec_aws_iam_role_lambda.name}"
  policy_arn = "${aws_iam_policy.dec_aws_iam_role_lambda_inline_policy.arn}"
}

output "role-arn" {
  value = "${aws_iam_role.dec_aws_iam_role_lambda.arn}"
}
