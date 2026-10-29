terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.70"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

# Provider for ACM in us-east-1 (required for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "s3" {
  source = "./modules/s3"

  bucket_name = var.bucket_name
}

module "acm" {
  source = "./modules/acm"
  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  domain_name    = var.domain_name
  subdomain      = var.subdomain
  hosted_zone_id = var.route53_hosted_zone_id
}

module "cloudfront" {
  source = "./modules/cloudfront"

  # IMPORTANT: Use website_endpoint (includes bucket name) NOT website_domain (just regional domain)
  # website_endpoint: bucket-name.s3-website-us-west-2.amazonaws.com (correct)
  # website_domain: s3-website-us-west-2.amazonaws.com (wrong - redirects to AWS marketing page)
  bucket_domain_name = module.s3.website_endpoint
  bucket_id          = module.s3.bucket_id
  domain_name        = var.domain_name
  subdomain          = var.subdomain
  certificate_arn    = module.acm.certificate_arn

  depends_on = [
    module.s3,
    module.acm
  ]
}

