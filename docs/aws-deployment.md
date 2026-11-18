# Optional AWS preview: S3 + CloudFront (not the production domain)

This is a **manual, opt-in AWS portfolio deployment** for Amazing Grace Home Living.
Production **remains Vercel** on `amazinggracehl.org`. This setup does not modify
DNS, Firebase, Google Cloud, or production secrets. AWS services may incur charges.

## Architecture and security
- Build the existing `dist/` with Node 22 and the repository tests.
- Store only static web assets in an **S3 bucket with public access blocked**.
- Serve through **CloudFront using signed Origin Access Control (OAC)**.
- Rewrite `/listings/` and similar routes to `/listings/index.html` at the edge.
- Deploy only on deliberate `workflow_dispatch`, with **short-lived OIDC credentials**.
- No AWS access keys or credentials are committed or stored as long-lived GitHub secrets.
- The CloudFormation bucket has **Retain** protection: deleting the stack does not
  automatically delete the bucket or uploaded objects. Clean up retained resources
  deliberately to avoid ongoing charges.

## 1. Provision an independent preview

In an AWS account you administer, review `infrastructure/aws-static-preview.yml`
and create a CloudFormation stack in your preferred AWS region. Example
using an already authenticated AWS CLI (never paste keys into chat):

```bash
aws cloudformation deploy \
  --stack-name amazing-grace-static-preview \
  --template-file infrastructure/aws-static-preview.yml \
  --parameter-overrides SiteBucketName=REPLACE-WITH-UNIQUE-PRIVATE-BUCKET
```

Get the stack's `BucketName`, `DistributionId` and `PreviewUrl` outputs.
The URL is a CloudFront default domain; do **not** change the production DNS.

## 2. Create a least-privilege GitHub OIDC deployment role

In IAM, configure `token.actions.githubusercontent.com` as an OIDC identity
provider, audience `sts.amazonaws.com`, then a role that trusts **only**
GitHub Actions for this repository and the `aws-preview` environment.
Use the trust-policy condition `token.actions.githubusercontent.com:aud` =
`sts.amazonaws.com` and `token.actions.githubusercontent.com:sub` =
`repo:Amazing-Grace-Home-Living/website:environment:aws-preview`.
Check the current actual GitHub OIDC token claims for your organization
before applying this condition, and restrict allowed branches to `main`
under the GitHub environment protection rules.

The role needs permissions **only** to upload/list/delete objects in the
preview bucket and create CloudFront invalidations on the preview distribution:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListPreviewBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::REPLACE-WITH-PRIVATE-BUCKET"
    },
    {
      "Sid": "ManagePreviewObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::REPLACE-WITH-PRIVATE-BUCKET/*"
    },
    {
      "Sid": "InvalidatePreviewCloudFront",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::REPLACE-WITH-AWS-ACCOUNT-ID:distribution/REPLACE-WITH-DISTRIBUTION-ID"
    }
  ]
}
```

Do **not** grant S3 public access, admin rights, or permanent IAM user keys.

## 3. Configure the GitHub environment

Create a GitHub Actions environment named `aws-preview`, restrict deployment
to `main`, and optionally require reviewer approval.

Add these **environment variables**:

| Variable | Value |
| --- | --- |
| `AWS_REGION` | CloudFormation deployment region (e.g. `us-east-1`) |
| `AWS_S3_BUCKET` | `BucketName` output |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` output |

Add this **environment secret**:

| Secret | Value |
| --- | --- |
| `AWS_PREVIEW_ROLE_ARN` | ARN of the least-privilege GitHub OIDC role |

If client-side Firebase authentication is needed in the AWS preview, also
configure the six public Firebase application configuration variables
(`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
`FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`,
`FIREBASE_APP_ID`) matching the working Vercel environment. These are
public client config identifiers, **not** a Firebase Admin service-account
private key. Verify authorized domains for Firebase Auth separately.

## 4. Deploy and verify

From Actions, manually run **AWS static preview (manual)** on `main`.
The workflow runs lint, tests, build, and link audit before OIDC authentication,
then syncs `dist/` to the private S3 bucket and requests CloudFront invalidation.

Visit the `PreviewUrl` from CloudFormation and check:
- Home page and correct CSS/images.
- `/listings/`, `/arcade/`, `/lms/` and other directory-style routes.
- Browser console for missing assets/auth settings.
- Public requests to the S3 bucket are denied; access is via CloudFront only.

Do not claim an AWS deployment is live until the account is connected,
resources provisioned, successful workflow run and CloudFront URLs verified.

## Why this is useful for a portfolio

This gives a concrete example of AWS S3, CloudFront, CloudFormation, least-
privilege IAM, GitHub Actions OIDC and basic edge routing. Include a diagram,
infrastructure code and deployment validation in a portfolio only after you
have implemented and tested the AWS environment.

References: AWS CloudFront OAC documentation and GitHub's AWS OIDC guide.
