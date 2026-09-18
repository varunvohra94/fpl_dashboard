#!/usr/bin/env bash
# ==============================================================================
# FPL League Platform - GCP Project Bootstrap & Workload Identity Setup
# ==============================================================================
# This script performs the one-time Google Cloud Platform project initialization:
# 1. Enables essential GCP APIs.
# 2. Creates the GCS bucket for Terraform remote state with object versioning.
# 3. Configures Workload Identity Federation (WIF) for secure GitHub Actions OIDC.
# 4. Creates and binds IAM roles to the CI/CD Service Account.
# ==============================================================================

set -eo pipefail

# ANSI color codes for formatted terminal output
BOLD='\033[1m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
MAGENTA='\033[1;35m'
BLUE='\033[1;34m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║      ⚽  FPL Platform — One-Time GCP Bootstrap & WIF Setup             ║${NC}"
echo -e "${CYAN}${BOLD}╚════════════════════════════════════════════════════════════════════════╝${NC}\n"

# ------------------------------------------------------------------------------
# Configuration Variables
# ------------------------------------------------------------------------------
PROJECT_ID="${GCP_PROJECT_ID:-fpl-league-dashboard-prod}"
REGION="${GCP_REGION:-us-east1}"
GITHUB_REPO="${GITHUB_REPO:-varunvohra94/fpl_dashboard}"
TFSTATE_BUCKET="${PROJECT_ID}-tfstate"
WIF_POOL="github-actions-pool"
WIF_PROVIDER="github-actions-provider"
SA_NAME="github-actions-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${BOLD}Target Configuration:${NC}"
echo -e "  • Project ID:           ${GREEN}${PROJECT_ID}${NC}"
echo -e "  • Region:               ${GREEN}${REGION}${NC}"
echo -e "  • GitHub Repo:          ${GREEN}${GITHUB_REPO}${NC}"
echo -e "  • Terraform State GCS:  ${GREEN}gs://${TFSTATE_BUCKET}${NC}"
echo -e "  • Deployer SA:          ${GREEN}${SA_EMAIL}${NC}\n"

# ------------------------------------------------------------------------------
# 1. Verify Prerequisites
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ [1/6] Verifying gcloud CLI authentication...${NC}"

if ! command -v gcloud &>/dev/null; then
    echo -e "${RED}❌ Error: 'gcloud' CLI is not installed or not in PATH.${NC}"
    echo -e "${YELLOW}   Install it via: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

CURRENT_AUTH=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "$CURRENT_AUTH" ]; then
    echo -e "${RED}❌ Error: No active gcloud account found. Please run 'gcloud auth login'.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated as: ${CURRENT_AUTH}${NC}"

# Set default project
gcloud config set project "$PROJECT_ID" --quiet

# ------------------------------------------------------------------------------
# 2. Enable Required GCP APIs
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [2/6] Enabling essential Google Cloud APIs...${NC}"

SERVICES=(
    "serviceusage.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "iamcredentials.googleapis.com"
    "storage.googleapis.com"
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "secretmanager.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudscheduler.googleapis.com"
    "vpcaccess.googleapis.com"
    "servicenetworking.googleapis.com"
    "compute.googleapis.com"
)

for svc in "${SERVICES[@]}"; do
    echo -e "   Enabling ${svc}..."
    gcloud services enable "$svc" --project="$PROJECT_ID" --quiet
done
echo -e "${GREEN}✅ Core APIs enabled successfully.${NC}"

# ------------------------------------------------------------------------------
# 3. Create Remote Terraform State Bucket
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [3/6] Configuring Terraform remote state GCS bucket...${NC}"

if gcloud storage buckets describe "gs://${TFSTATE_BUCKET}" &>/dev/null; then
    echo -e "${YELLOW}   Bucket gs://${TFSTATE_BUCKET} already exists.${NC}"
else
    echo -e "   Creating GCS bucket gs://${TFSTATE_BUCKET} in ${REGION}..."
    gcloud storage buckets create "gs://${TFSTATE_BUCKET}" \
        --project="$PROJECT_ID" \
        --location="$REGION" \
        --uniform-bucket-level-access
fi

# Enable Object Versioning for disaster recovery
echo -e "   Enabling Object Versioning on state bucket..."
gcloud storage buckets update "gs://${TFSTATE_BUCKET}" --versioning

echo -e "${GREEN}✅ Terraform remote state bucket configured: gs://${TFSTATE_BUCKET}${NC}"

# ------------------------------------------------------------------------------
# 4. Create CI/CD Service Account
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [4/6] Creating GitHub Actions CI/CD Service Account...${NC}"

if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}   Service Account ${SA_EMAIL} already exists.${NC}"
else
    gcloud iam service-accounts create "$SA_NAME" \
        --project="$PROJECT_ID" \
        --display-name="GitHub Actions Deployment & Terraform Automation" \
        --description="Used by GitHub Actions Workload Identity Federation for Terraform & Cloud Run CI/CD"
fi

# ------------------------------------------------------------------------------
# 5. Bind IAM Roles to Service Account
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [5/6] Assigning IAM roles to CI/CD Service Account...${NC}"

ROLES=(
    "roles/run.admin"
    "roles/cloudsql.admin"
    "roles/secretmanager.admin"
    "roles/artifactregistry.admin"
    "roles/cloudscheduler.admin"
    "roles/vpcaccess.admin"
    "roles/compute.networkAdmin"
    "roles/iam.serviceAccountAdmin"
    "roles/iam.serviceAccountUser"
    "roles/resourcemanager.projectIamAdmin"
    "roles/storage.admin"
)

for role in "${ROLES[@]}"; do
    echo -e "   Assigning ${role}..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="$role" \
        --condition=None \
        --quiet &>/dev/null || true
done
echo -e "${GREEN}✅ IAM roles bound to ${SA_EMAIL}.${NC}"

# ------------------------------------------------------------------------------
# 6. Configure Workload Identity Federation (WIF)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [6/6] Configuring Workload Identity Federation for GitHub...${NC}"

# Get GCP Project Number
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

# 6a. Create Workload Identity Pool
if gcloud iam workload-identity-pools describe "$WIF_POOL" --location="global" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}   Workload Identity Pool '${WIF_POOL}' already exists.${NC}"
else
    echo -e "   Creating Workload Identity Pool '${WIF_POOL}'..."
    gcloud iam workload-identity-pools create "$WIF_POOL" \
        --project="$PROJECT_ID" \
        --location="global" \
        --display-name="GitHub Actions Pool"
fi

# 6b. Create Workload Identity Provider
if gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" --workload-identity-pool="$WIF_POOL" --location="global" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}   Workload Identity Provider '${WIF_PROVIDER}' already exists.${NC}"
else
    echo -e "   Creating Workload Identity Provider '${WIF_PROVIDER}'..."
    gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$WIF_POOL" \
        --display-name="GitHub Actions Provider" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
        --attribute-condition="attribute.repository == '${GITHUB_REPO}'"
fi

# 6c. Allow GitHub Actions repository to impersonate the Service Account
WIF_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_REPO}"

echo -e "   Binding Workload Identity User role to GitHub repo '${GITHUB_REPO}'..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --project="$PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="$WIF_PRINCIPAL" \
    --condition=None \
    --quiet

WIF_PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"

# ------------------------------------------------------------------------------
# Summary & GitHub Secrets Output
# ------------------------------------------------------------------------------
echo -e "\n"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}🎉  GCP Bootstrap & Workload Identity Federation Complete!              ${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "  Add the following secrets to your GitHub Repository settings:"
echo -e "  ${BOLD}GitHub Repo:${NC} https://github.com/${GITHUB_REPO}/settings/secrets/actions"
echo -e ""
echo -e "  ${BOLD}1. GCP_PROJECT_ID:${NC}"
echo -e "     ${CYAN}${PROJECT_ID}${NC}"
echo -e ""
echo -e "  ${BOLD}2. GCP_WORKLOAD_IDENTITY_PROVIDER:${NC}"
echo -e "     ${MAGENTA}${WIF_PROVIDER_RESOURCE}${NC}"
echo -e ""
echo -e "  ${BOLD}3. GCP_SERVICE_ACCOUNT:${NC}"
echo -e "     ${YELLOW}${SA_EMAIL}${NC}"
echo -e ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════════════${NC}\n"
