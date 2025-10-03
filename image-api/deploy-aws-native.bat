@echo off
REM Native AWS Deployment Script for TB365 Image API (Windows)
REM This replaces Serverless Framework with direct AWS CLI commands
REM Usage: deploy-aws-native.bat [stage]

setlocal enabledelayedexpansion

set STAGE=%1
if "%STAGE%"=="" set STAGE=stage

set REGION=us-east-1
set SERVICE_NAME=tb365-image-api
set FUNCTION_NAME=%SERVICE_NAME%-%STAGE%-imageLibrary
set HEALTH_FUNCTION_NAME=%SERVICE_NAME%-%STAGE%-healthCheck
set API_NAME=%SERVICE_NAME%-%STAGE%
set ROLE_NAME=%SERVICE_NAME%-%STAGE%-execution-role

echo 🚀 Deploying TB365 Image API to stage: %STAGE%
echo 📍 Region: %REGION%
echo ⚡ Function: %FUNCTION_NAME%

REM Step 1: Create deployment package
echo 📋 Step 1: Creating deployment package...
if exist function.zip del function.zip
powershell -Command "Compress-Archive -Path functions/, node_modules/, package.json -DestinationPath function.zip -Force"

REM Step 2: Deploy Lambda function
echo 📋 Step 2: Deploying Lambda function...

REM Check if function exists
aws lambda get-function --function-name "%FUNCTION_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo 🔄 Updating existing function %FUNCTION_NAME%
    aws lambda update-function-code --function-name "%FUNCTION_NAME%" --zip-file fileb://function.zip
) else (
    echo ❌ Function does not exist. Please run the full deployment script first.
    echo Run: bash deploy-aws-native.sh %STAGE%
    exit /b 1
)

REM Step 3: Get API Gateway ID
echo 📋 Step 3: Finding API Gateway...
for /f "delims=" %%i in ('aws apigatewayv2 get-apis --query "Items[?Name=='%API_NAME%'].ApiId" --output text') do set API_ID=%%i

if "%API_ID%"=="" (
    echo ❌ API Gateway not found. Please run the full deployment script first.
    echo Run: bash deploy-aws-native.sh %STAGE%
    exit /b 1
)

echo ✅ Found API Gateway: %API_ID%

REM Step 4: Create new deployment
echo 📋 Step 4: Creating new deployment...
for /f "delims=" %%i in ('aws apigatewayv2 create-deployment --api-id "%API_ID%" --description "Windows deployment %date% %time%" --query "DeploymentId" --output text') do set DEPLOYMENT_ID=%%i

echo ✅ Created deployment: %DEPLOYMENT_ID%

REM Step 5: Update stage
echo 📋 Step 5: Updating stage...
aws apigatewayv2 update-stage --api-id "%API_ID%" --stage-name "$default" --deployment-id "%DEPLOYMENT_ID%" >nul

REM Cleanup
if exist function.zip del function.zip

set API_ENDPOINT=https://%API_ID%.execute-api.%REGION%.amazonaws.com

echo.
echo 🎉 Deployment completed successfully!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📍 API Endpoint: %API_ENDPOINT%
echo 🆔 API Gateway ID: %API_ID%
echo ⚡ Lambda Function: %FUNCTION_NAME%
echo 💊 Health Check: %API_ENDPOINT%/health
echo 🖼️  Image API: %API_ENDPOINT%/api/images
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

endlocal