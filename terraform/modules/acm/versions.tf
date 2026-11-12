terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 6.72"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

