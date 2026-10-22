variable "domain_name" {
  description = "Root domain name (e.g., example.com)"
  type        = string
}

variable "subdomain" {
  description = "Subdomain (e.g., www)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for DNS validation (optional)"
  type        = string
  default     = ""
}

