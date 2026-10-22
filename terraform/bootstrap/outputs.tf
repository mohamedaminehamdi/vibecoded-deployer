# Bootstrap Outputs

output "s3_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

output "next_steps" {
  description = "Instructions for next steps"
  value       = <<-EOT
  
  ✅ Backend created successfully!
  
  S3 Bucket: ${aws_s3_bucket.terraform_state.id}
  Region: ${var.aws_region}
  Locking: S3 native (use_lockfile = true)
  
  Next steps:
  1. cd .. (go back to terraform/ directory)
  2. Update backend.tf with these values (or copy backend.tf.example)
  3. terraform init -migrate-state
  4. terraform plan (verify state migration)
  
  EOT
}



