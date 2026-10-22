variable "bucket_name" {
  description = "Name of the S3 bucket for static website hosting"
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

variable "route53_hosted_zone_id" {
  description = "Route 53 hosted zone ID for automatic certificate validation (optional)"
  type        = string
  default     = ""
}
