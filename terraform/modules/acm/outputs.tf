output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.site.arn
}

output "certificate_domain" {
  description = "Domain name of the certificate"
  value       = aws_acm_certificate.site.domain_name
}

output "validation_records" {
  description = "DNS validation records for the certificate"
  value = var.hosted_zone_id == "" ? {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}
}

output "certificate_validation_status" {
  description = "Certificate validation status"
  value       = var.hosted_zone_id != "" ? (length(aws_acm_certificate_validation.site) > 0 ? "validated" : "pending") : "pending_manual_validation"
}

