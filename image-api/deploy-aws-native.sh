#!/bin/bash

# Native AWS Deployment Script for TB365 Image API
# This replaces Serverless Framework with direct AWS CLI commands
# Usage: ./deploy-aws-native.sh [stage]

set -e

STAGE=${1:-stage}
REGION=us-east-1
SERVICE_NAME=tb365-image-api
FUNCTION_NAME="${SERVICE_NAME}-${STAGE}-imageLibrary"
HEALTH_FUNCTION_NAME="${SERVICE_NAME}-${STAGE}-healthCheck"
API_NAME="${SERVICE_NAME}-${STAGE}"
ROLE_NAME="${SERVICE_NAME}-${STAGE}-execution-role"

echo "🚀 Deploying TB365 Image API to stage: $STAGE"
echo "📍 Region: $REGION"
echo "⚙️  Function: $FUNCTION_NAME"

# Step 1: Create IAM Role for Lambda
echo "📋 Step 1: Creating IAM execution role..."

# Check if role exists
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    echo "✅ Role $ROLE_NAME already exists"
else
    echo "🔧 Creating role $ROLE_NAME"

    # Create trust policy
    cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file://trust-policy.json \
        --description "Execution role for TB365 Image API Lambda functions"

    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    # Create and attach custom policy for S3 and DynamoDB
    cat > permissions-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::tb365-designs-${STAGE}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::tb365-designs-${STAGE}"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:${REGION}:*:table/TemplateBuilder365-Data-${STAGE}",
                "arn:aws:dynamodb:${REGION}:*:table/TemplateBuilder365-Data-${STAGE}/index/*"
            ]
        }
    ]
}
EOF

    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "${SERVICE_NAME}-permissions" \
        --policy-document file://permissions-policy.json

    echo "⏳ Waiting for role to be available..."
    sleep 10
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "✅ Role ARN: $ROLE_ARN"

# Step 2: Package and Deploy Lambda Function
echo "📋 Step 2: Packaging Lambda function..."

# Create deployment package
zip -r function.zip functions/ node_modules/ package.json

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
    echo "🔄 Updating existing function $FUNCTION_NAME"
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://function.zip

    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --environment Variables="{
            STAGE=$STAGE,
            REGION=$REGION,
            NODE_ENV=$STAGE,
            COGNITO_USER_POOL_ID=us-east-1_RIOPGg1Cq,
            COGNITO_CLIENT_ID=2addji24p0obg5sqedgise13i4,
            DYNAMODB_TABLE=TemplateBuilder365-Data-$STAGE,
            TB365_BUCKET=tb365-designs-$STAGE,
            USE_DYNAMODB=false
        }"
else
    echo "🆕 Creating new function $FUNCTION_NAME"
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime nodejs18.x \
        --role "$ROLE_ARN" \
        --handler functions/image-library.handler \
        --zip-file fileb://function.zip \
        --timeout 29 \
        --memory-size 512 \
        --environment Variables="{
            STAGE=$STAGE,
            REGION=$REGION,
            NODE_ENV=$STAGE,
            COGNITO_USER_POOL_ID=us-east-1_RIOPGg1Cq,
            COGNITO_CLIENT_ID=2addji24p0obg5sqedgise13i4,
            DYNAMODB_TABLE=TemplateBuilder365-Data-$STAGE,
            TB365_BUCKET=tb365-designs-$STAGE,
            USE_DYNAMODB=false
        }" \
        --description "TB365 Image API - Main handler"
fi

# Create health check function
if aws lambda get-function --function-name "$HEALTH_FUNCTION_NAME" >/dev/null 2>&1; then
    echo "🔄 Updating health check function"
    aws lambda update-function-code \
        --function-name "$HEALTH_FUNCTION_NAME" \
        --zip-file fileb://function.zip
else
    echo "🆕 Creating health check function"
    aws lambda create-function \
        --function-name "$HEALTH_FUNCTION_NAME" \
        --runtime nodejs18.x \
        --role "$ROLE_ARN" \
        --handler functions/image-library.health \
        --zip-file fileb://function.zip \
        --timeout 10 \
        --memory-size 128 \
        --description "TB365 Image API - Health check"
fi

echo "✅ Lambda functions deployed successfully"

# Step 3: Create API Gateway
echo "📋 Step 3: Creating API Gateway..."

# Check if API exists
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ "$API_ID" != "" ] && [ "$API_ID" != "None" ]; then
    echo "✅ API Gateway $API_NAME already exists with ID: $API_ID"
else
    echo "🆕 Creating new API Gateway $API_NAME"
    API_ID=$(aws apigatewayv2 create-api \
        --name "$API_NAME" \
        --protocol-type HTTP \
        --description "TB365 Image API - Native AWS deployment" \
        --cors-configuration AllowOrigins=["*"],AllowHeaders=["Content-Type","Authorization","X-Amz-Date"],AllowMethods=["GET","POST","PUT","DELETE","OPTIONS"],MaxAge=300 \
        --query 'ApiId' --output text)
    echo "✅ Created API Gateway with ID: $API_ID"
fi

# Get Lambda function ARNs
MAIN_FUNCTION_ARN=$(aws lambda get-function --function-name "$FUNCTION_NAME" --query 'Configuration.FunctionArn' --output text)
HEALTH_FUNCTION_ARN=$(aws lambda get-function --function-name "$HEALTH_FUNCTION_NAME" --query 'Configuration.FunctionArn' --output text)

echo "📋 Step 4: Creating API Gateway integrations..."

# Create integrations
MAIN_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$MAIN_FUNCTION_ARN" \
    --payload-format-version "2.0" \
    --query 'IntegrationId' --output text)

HEALTH_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$HEALTH_FUNCTION_ARN" \
    --payload-format-version "2.0" \
    --query 'IntegrationId' --output text)

echo "✅ Created integrations: $MAIN_INTEGRATION_ID, $HEALTH_INTEGRATION_ID"

# Step 5: Create routes
echo "📋 Step 5: Creating API routes..."

# Define routes
declare -a routes=(
    "POST /api/images/upload"
    "GET /api/images"
    "GET /api/images/{imageId}"
    "PUT /api/images/{imageId}"
    "DELETE /api/images/{imageId}"
    "GET /api/images/search"
)

# Create main API routes
for route in "${routes[@]}"; do
    echo "🔧 Creating route: $route"
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "$route" \
        --target "integrations/$MAIN_INTEGRATION_ID" >/dev/null
done

# Create health check route
echo "🔧 Creating health check route"
aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "GET /health" \
    --target "integrations/$HEALTH_INTEGRATION_ID" >/dev/null

# Step 6: Grant API Gateway permission to invoke Lambda
echo "📋 Step 6: Setting up Lambda permissions..."

# Add permissions for main function
aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "apigateway-invoke-main" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*/*" \
    --no-cli-pager 2>/dev/null || echo "Permission already exists"

# Add permissions for health function
aws lambda add-permission \
    --function-name "$HEALTH_FUNCTION_NAME" \
    --statement-id "apigateway-invoke-health" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*/*" \
    --no-cli-pager 2>/dev/null || echo "Permission already exists"

# Step 7: Create deployment
echo "📋 Step 7: Deploying API to stage..."

DEPLOYMENT_ID=$(aws apigatewayv2 create-deployment \
    --api-id "$API_ID" \
    --description "Native AWS deployment $(date)" \
    --query 'DeploymentId' --output text)

echo "✅ Created deployment: $DEPLOYMENT_ID"

# Create or update stage
if aws apigatewayv2 get-stage --api-id "$API_ID" --stage-name '$default' >/dev/null 2>&1; then
    echo "🔄 Updating existing stage"
    aws apigatewayv2 update-stage \
        --api-id "$API_ID" \
        --stage-name '$default' \
        --deployment-id "$DEPLOYMENT_ID" >/dev/null
else
    echo "🆕 Creating new stage"
    aws apigatewayv2 create-stage \
        --api-id "$API_ID" \
        --stage-name '$default' \
        --deployment-id "$DEPLOYMENT_ID" \
        --description "Default stage for TB365 Image API" >/dev/null
fi

# Get API endpoint
API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

# Cleanup temporary files
rm -f trust-policy.json permissions-policy.json function.zip

echo ""
echo "🎉 Deployment completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 API Endpoint: $API_ENDPOINT"
echo "🆔 API Gateway ID: $API_ID"
echo "⚡ Lambda Function: $FUNCTION_NAME"
echo "💊 Health Check: $API_ENDPOINT/health"
echo "🖼️  Image API: $API_ENDPOINT/api/images"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Available endpoints:"
echo "  GET    $API_ENDPOINT/health"
echo "  POST   $API_ENDPOINT/api/images/upload"
echo "  GET    $API_ENDPOINT/api/images"
echo "  GET    $API_ENDPOINT/api/images/{imageId}"
echo "  PUT    $API_ENDPOINT/api/images/{imageId}"
echo "  DELETE $API_ENDPOINT/api/images/{imageId}"
echo "  GET    $API_ENDPOINT/api/images/search"
echo ""