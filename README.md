# Ads API - Serverless Application

A serverless AWS application built with Node.js and TypeScript that allows authenticated users to create advertisement records. When an ad is created, the service stores the record in DynamoDB, optionally uploads an image to S3, and publishes an SNS notification.

## Technologies Used

- **Runtime**: Node.js 24.x with TypeScript
- **Compute**: AWS Lambda
- **API**: Amazon API Gateway (REST API)
- **Authentication**: AWS Cognito User Pool
- **Database**: Amazon DynamoDB (AdsTable)
- **Storage**: Amazon S3 (for image uploads)
- **Messaging**: Amazon SNS (for notifications)
- **Infrastructure as Code**: AWS SAM (Serverless Application Model)
- **Testing**: Jest with TypeScript
- **CI/CD**: GitHub Actions
- **Build Tool**: esbuild


### Key Directories

- **`src/`** - Contains all application source code organized by responsibility
  - **`handlers/`** - Lambda function entry points that handle API Gateway events
  - **`services/`** - Business logic and AWS service integrations
  - **`types/`** - TypeScript interfaces and type definitions
  - **`utils/`** - Reusable utility functions and helpers

- **`tests/`** - Unit tests mirroring the source code structure

- **`template.yaml`** - AWS SAM template defining the serverless infrastructure (Lambda, API Gateway, DynamoDB, S3, SNS, Cognito)



## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 24.x** - [Download Node.js](https://nodejs.org/)
- **AWS CLI** - [Install AWS CLI](https://aws.amazon.com/cli/)
- **AWS SAM CLI** - [Install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- **Docker** - [Install Docker](https://www.docker.com/get-started) (required for local testing)
- **Git** - For cloning the repository

## Setup Instructions

### 1. Clone the Repository

- https://github.com/PamalSahanJay/ads-api-serverless.git
- cd ads-api-serverless

### 2. Install Dependencies

- npm install

### 3. Configure AWS Credentials

Configure your AWS credentials using one of the following methods:

**Option A: Interactive AWS CLI Configuration**

aws configure

This will prompt you for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

**Option B: Non-Interactive AWS CLI Configuration**

- aws configure set aws_access_key_id YOUR_AWS_ACCESS_KEY
- aws configure set aws_secret_access_key YOUR_AWS_SECRET_KEY
- aws configure set default.region us-east-1

## Deployment to AWS

### First-Time Deployment

sam build
sam deploy --guidedThe guided deployment will prompt you for:
- **Stack Name**: Name for your CloudFormation stack (e.g., `ads-api-stack`)
- **AWS Region**: AWS region to deploy to (e.g., `us-east-1`)
- **Confirm changes before deploy**: Review changes before applying
- **Allow SAM CLI IAM role creation**: Required for Lambda permissions
- **Save arguments to samconfig.toml**: Save configuration for future deployments

### Subsequent Deployments

After the first deployment, you can use:

- sam build
- sam deploy

### Deployment Outputs

After deployment, the following outputs will be displayed:

- **Api**: API Gateway endpoint URL
- **CognitoHostedURL**: Cognito Hosted UI URL for authentication
- **CognitoPoolId**: Cognito User Pool ID
- **CognitoPoolClientId**: Cognito User Pool Client ID
- **SNSTopicArn**: SNS Topic ARN for notifications

### Test the Endpoint
