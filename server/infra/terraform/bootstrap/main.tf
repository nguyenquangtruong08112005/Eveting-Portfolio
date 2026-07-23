terraform {
  required_version = ">= 1.6.0"

  # Local state backend by design for bootstrap to avoid chicken-and-egg remote state dependencies.

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_r2_bucket" "tf_state" {
  account_id = var.cloudflare_account_id
  name       = var.state_r2_bucket_name
}
