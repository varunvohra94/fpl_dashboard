---
name: terraform-validator
description: Validates Terraform modules for Google Cloud Platform deployments, focusing on Cloud Run and Cloud SQL.
---
# Goal
Maintain secure, cost-effective, and reproducible Google Cloud Platform infrastructure.

# Instructions
1. Analyze the provided Terraform (.tf) configuration files.
2. Ensure all Cloud Run services are configured to scale to zero (`min_instances = 0`) to minimize costs.
3. Verify that database passwords or sensitive environment variables are not hardcoded, but instead referenced via Google Secret Manager.
4. Check that Required Identity and Access Management (IAM) roles follow the principle of least privilege.
5. Output any security or cost-saving warnings, followed by the corrected Terraform blocks.

# Constraints
* Do not modify the `terraform.tfstate` file directly.
* Only suggest Google Cloud Platform (GCP) resources; do not suggest AWS or Azure alternatives.