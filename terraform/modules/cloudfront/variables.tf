variable "bucket_domain_name" {
  description = "Domain name of the S3 bucket website endpoint (e.g., bucket-name.s3-website-us-west-2.amazonaws.com)"
  type        = string
}

variable "bucket_id" {
  description = "ID of the S3 bucket"
  type        = string
}

variable "domain_name" {
  description = "Root domain name (e.g., example.com)"
  type        = string
}

variable "subdomain" {
  description = "Subdomain (e.g., www)"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate (optional, uses CloudFront default if not provided)"
  type        = string
  default     = ""
}

