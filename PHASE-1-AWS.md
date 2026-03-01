# Phase 1: AWS Provisioning

Date: 2026-02-27  
Status: Pending

## Objective
Provision only the AWS infrastructure needed for `capture-init` so the function can mint pre-signed `captures/*` URLs without exposing permanent credentials to the app.

- Keep objects private and encrypted.
- Issue least-privilege IAM credentials only for required object keys.
- Leave a clear, secure handoff for later phases.

## Scope (Do not do in this phase)
- No Netlify function implementation.
- No website JavaScript or HTML edits.
- No iOS code changes.
- No changes to Netlify forms or mail template config.

## Required Outputs
1. Unique private S3 bucket name and region.
2. Bucket ARN: `arn:aws:s3:::<bucket>`.
3. IAM user and attached policy ARNs.
4. Access key ID / secret for signer user.
5. Netlify env var values:
   - `AWCS_S3_BUCKET`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWCS_CAPTURE_API_KEY` (only if you enforce it)

## Preflight Checklist
1. Confirm repo context and no unrelated environment assumptions.
   - `pwd` → should be `/Users/jonahgrigoryan/GP_EA`
   - `aws --version`
   - `netlify --version`
   - `git status --short` (informational only, do not revert other edits)
2. Confirm AWS identity and region.
   - `aws sts get-caller-identity`
   - `AWS_REGION=$(aws configure get region || true)`
   - If empty, run: `export AWS_REGION=us-east-1`
   - If not empty, keep that value.
3. Confirm required local parsers.
   - `jq --version`
   - `openssl version`
4. Decide whether to enforce `AWCS_CAPTURE_API_KEY` now.
   - If yes, generate and record a random value in secure notes.
   - If no, leave unset for now.

## Step 1 — Initialize variables (required for reproducibility)
1. Pick deterministic naming context.
   - `export PROJECT_SLUG=awcs-wound-capture`
2. Generate bucket suffix once and reuse for all phase 1 commands.
   - `export AWS_SUFFIX=$(date +%s | tr -d '\n')`
   - `export AWCS_S3_BUCKET="${PROJECT_SLUG}-prod-${AWS_SUFFIX}"`
   - `export IAM_USER=awcs-wound-capture-signer`
   - `export IAM_POLICY_NAME=awcs-wound-capture-signer-policy-${AWS_SUFFIX}`
3. Save these in a local, non-committed note file.
   - Keep in a file you never commit.

```bash
cat > .aws-phase1.env <<ENVVARS
export PROJECT_SLUG=awcs-wound-capture
export AWS_REGION=${AWS_REGION}
export AWCS_S3_BUCKET=${AWCS_S3_BUCKET}
export IAM_USER=${IAM_USER}
export IAM_POLICY_NAME=${IAM_POLICY_NAME}
ENVVARS
```

## Step 2 — Create private S3 bucket
1. Create the bucket with ownership controls.
   - For `us-east-1`:

```bash
aws s3api create-bucket --bucket "$AWCS_S3_BUCKET" --region "$AWS_REGION" --object-ownership BucketOwnerEnforced
```

   - For other regions:

```bash
aws s3api create-bucket --bucket "$AWCS_S3_BUCKET" --region "$AWS_REGION" --object-ownership BucketOwnerEnforced --create-bucket-configuration LocationConstraint="$AWS_REGION"
```

2. Block all public access.

```bash
aws s3api put-public-access-block --bucket "$AWCS_S3_BUCKET" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

3. Enforce SSE-S3 encryption by default.

```bash
aws s3api put-bucket-encryption --bucket "$AWCS_S3_BUCKET" --server-side-encryption-configuration '{
  "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]
}'
```

4. Optional lifecycle policy for PHI retention.

```bash
aws s3api put-bucket-lifecycle-configuration --bucket "$AWCS_S3_BUCKET" --lifecycle-configuration '{
  "Rules":[{
    "ID":"expire-captures",
    "Status":"Enabled",
    "Filter":{"Prefix":"captures/"},
    "Expiration":{"Days":90}
  }]
}'
```

5. Verify bucket security.

```bash
aws s3api get-public-access-block --bucket "$AWCS_S3_BUCKET"
aws s3api get-bucket-encryption --bucket "$AWCS_S3_BUCKET"
aws s3 ls "s3://$AWCS_S3_BUCKET/"
```

## Step 3 — Create IAM signer user and policy (least privilege)
1. Ensure signer user exists (create once; if exists, continue).

```bash
aws iam create-user --user-name "$IAM_USER" || true
```

2. Read signer user ARN.

```bash
IAM_USER_ARN=$(aws iam get-user --user-name "$IAM_USER" --query 'User.Arn' --output text)
echo "IAM_USER_ARN=$IAM_USER_ARN"
```

3. Build policy JSON for only capture paths.

```bash
cat > /tmp/awcs-capture-signer-policy.json <<'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCaptureObjectIO",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::REPLACE_BUCKET/captures/*"
    },
    {
      "Sid": "AllowCaptureListPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::REPLACE_BUCKET",
      "Condition": {
        "StringLike": {
          "s3:prefix": "captures/*"
        }
      }
    }
  ]
}
POLICY

sed -i.bak "s/REPLACE_BUCKET/$AWCS_S3_BUCKET/g" /tmp/awcs-capture-signer-policy.json  # on Linux: -i; on macOS: -i.bak
```

4. Create and attach policy.

```bash
aws iam create-policy --policy-name "$IAM_POLICY_NAME" --policy-document file:///tmp/awcs-capture-signer-policy.json || true
IAM_POLICY_ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='$IAM_POLICY_NAME'].Arn" --output text | head -n1)
aws iam attach-user-policy --user-name "$IAM_USER" --policy-arn "$IAM_POLICY_ARN"
```

5. Append policy ARN to note file.

```bash
echo "export IAM_USER_ARN=$IAM_USER_ARN" >> .aws-phase1.env
echo "export IAM_POLICY_ARN=$IAM_POLICY_ARN" >> .aws-phase1.env
echo "export BUCKET_ARN=arn:aws:s3:::$AWCS_S3_BUCKET" >> .aws-phase1.env
rm -f /tmp/awcs-capture-signer-policy.json /tmp/awcs-capture-signer-policy.json.bak
```

## Step 4 — Create access key for signer
1. Create one long-lived access key pair.

```bash
aws iam create-access-key --user-name "$IAM_USER" > /tmp/awcs-capture-access-key.json
```

2. Extract values and keep in secure local store.

```bash
AWS_ACCESS_KEY_ID=$(jq -r '.AccessKey.AccessKeyId' /tmp/awcs-capture-access-key.json)
AWS_SECRET_ACCESS_KEY=$(jq -r '.AccessKey.SecretAccessKey' /tmp/awcs-capture-access-key.json)

echo "export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" >> .aws-phase1.env
echo "export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" >> .aws-phase1.env
```

3. Securely delete raw secret file as soon as copied.

```bash
rm -f /tmp/awcs-capture-access-key.json
```

## Step 5 — Optional capture API key (security toggle)
1. If you decided to enforce a function API key, choose one now.

```bash
AWCS_CAPTURE_API_KEY=$(openssl rand -hex 24)
echo "export AWCS_CAPTURE_API_KEY=$AWCS_CAPTURE_API_KEY" >> .aws-phase1.env
```

2. If not enforcing, leave unset and do not add it to Netlify env.

## Step 6 — Smoke test with signer credentials
1. Use temporary variables for the signer credential test session.

```bash
set +x  # hide secret in logs
source .aws-phase1.env
unset AWS_SESSION_TOKEN AWS_SECURITY_TOKEN
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_REGION="$AWS_REGION"
```

2. Verify credentials are valid.

```bash
aws sts get-caller-identity
```

3. Verify `captures/*` write permission with signer credentials.

```bash
TEST_KEY="captures/verify-${AWS_SUFFIX}/smoke.txt"
printf "phase-1 smoke test" | aws s3 cp - "s3://$AWCS_S3_BUCKET/$TEST_KEY"
```

4. Unset signer creds and use your default AWS identity for the delete step.

```bash
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_SECURITY_TOKEN
aws sts get-caller-identity
aws s3 rm "s3://$AWCS_S3_BUCKET/$TEST_KEY"
```

## Step 7 — Configure Netlify environment variables
1. Open Netlify UI (recommended) and set:
   - `AWCS_S3_BUCKET`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - optional `AWCS_CAPTURE_API_KEY`
2. If site is linked to CLI, use CLI equivalents:

```bash
netlify env:set AWCS_S3_BUCKET "$AWCS_S3_BUCKET"
netlify env:set AWS_REGION "$AWS_REGION"
netlify env:set AWS_ACCESS_KEY_ID "$AWS_ACCESS_KEY_ID"
netlify env:set AWS_SECRET_ACCESS_KEY "$AWS_SECRET_ACCESS_KEY"
netlify env:set AWCS_CAPTURE_API_KEY "$AWCS_CAPTURE_API_KEY"   # only if enabled
```

3. Verify set without printing secrets.

```bash
netlify env:list
```

## Step 8 — Final handoff to Phase 2
- Update `PHASE-2-NETLIFY-FUNCTION.md` with:
  - `AWCS_S3_BUCKET`
  - `AWS_REGION`
  - `IAM_USER_ARN`
  - `IAM_POLICY_ARN`
  - Any decision on `AWCS_CAPTURE_API_KEY`
- Confirm bucket and policy names exactly match in function code and docs.
- Only after all checks pass, move to Phase 2 (`capture-init` function implementation).

## Failure and recovery instructions
- Bucket already exists: regenerate suffix and rerun Step 1 onward.
- Duplicate policy name conflict: regenerate `AWS_SUFFIX` and rerun Step 1 so `IAM_POLICY_NAME` and bucket name are both unique.
- Access key already exists quota issue: check IAM account limits or use a new IAM user.
- Any `AccessDenied` on `aws s3 cp`: review policy scope; ensure action/resource includes `captures/*` and object key starts with that prefix.

## Keep this strict
- Do not embed keys in `README`, `script.js`, `netlify.toml`, or committed files.
- Keep `.aws-phase1.env` out of git (`.gitignore` should already exclude sensitive temp files; if not, do not commit it).
- Do not proceed to website or iOS tasks until bucket and key are fully usable.
