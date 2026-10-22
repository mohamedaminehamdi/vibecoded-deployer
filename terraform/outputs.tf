output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.s3.bucket_id
}

output "s3_website_endpoint" {
  description = "S3 website endpoint (used as CloudFront origin)"
  value       = module.s3.website_endpoint
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront Route 53 zone ID"
  value       = module.cloudfront.hosted_zone_id
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = module.acm.certificate_arn
}

output "certificate_validation_records" {
  description = "DNS validation records for the certificate (if manual validation needed)"
  value       = module.acm.validation_records
}

output "certificate_validation_status" {
  description = "Certificate validation status"
  value       = module.acm.certificate_validation_status
}
