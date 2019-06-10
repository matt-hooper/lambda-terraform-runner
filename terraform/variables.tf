variable "project-name-value" {
  description = "Project tag value, used for tracking costs"
  default     = "data-engineering-comparator"
}

variable "lambda-function-name" {
  default = "terraform_runner"
}

variable "lambda-handler" {
  default = "index"
}

# variable "lambda-file-location" {}

variable "lambda-iam-role" {
  default = "lambda-s3-role"
}

variable "lambda-timeout" {
  default = 900
}

variable "lambda-memory" {
  default = 512
}
