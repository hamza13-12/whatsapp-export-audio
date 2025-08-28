import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Derive stage from stack name (InfraStack-dev -> dev, InfraStack-prod -> prod)
    const stage = id.toLowerCase().includes('-prod') ? 'prod' : 'dev';
    // Keep PascalCase for internal use (SIDs, etc)
    const appName = 'whatsappExport';
    // Use lowercase with hyphens for resource names (S3 buckets, etc)
    const appNameKebabCase = 'whatsapp-export';

    // 1. S3 Bucket for voice notes
    const voiceNotesBucket = new s3.Bucket(this, 'VoiceNotesBucket', {
      bucketName: `${appNameKebabCase}-voice-notes-${stage}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD
          ],
          allowedOrigins: ['*'], 
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          id: `${appName}MultipartUploadCleanup${stage.charAt(0).toUpperCase() + stage.slice(1)}`,
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        }
      ]
    });

    // 2. DynamoDB table for tracking uploads
    const uploadsTable = new dynamodb.Table(this, 'UploadsTable', {
      tableName: `${appNameKebabCase}-uploads-${stage}`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'fileHash',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Add GSI for querying by fileHash
    uploadsTable.addGlobalSecondaryIndex({
      indexName: 'FileHashIndex',
      partitionKey: {
        name: 'fileHash',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 3. Lambda Function to generate pre-signed URLs
    const uploadHandler = new lambda.NodejsFunction(this, 'UploadHandler', {
      functionName: `${appNameKebabCase}-presigned-url-generator-${stage}`,
      description: 'Generates pre-signed URLs for voice note uploads',
      runtime: Runtime.NODEJS_LATEST,
      entry: 'lib/lambda/upload.ts',
      handler: 'handler',
      environment: {
        BUCKET_NAME: voiceNotesBucket.bucketName,
        MAX_FILE_SIZE: MAX_FILE_SIZE.toString(),
        STAGE: stage,
        UPLOADS_TABLE_NAME: uploadsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // 4. Lambda Function to check uploads
    const checkUploadsHandler = new lambda.NodejsFunction(this, 'CheckUploadsHandler', {
      functionName: `${appNameKebabCase}-check-uploads-${stage}`,
      description: 'Checks which files have been uploaded',
      runtime: Runtime.NODEJS_LATEST,
      entry: 'lib/lambda/check-uploads.ts',
      handler: 'handler',
      environment: {
        UPLOADS_TABLE_NAME: uploadsTable.tableName,
        STAGE: stage
      },
      timeout: cdk.Duration.seconds(10),
    });

    // 5. Grant Lambda permissions
    voiceNotesBucket.grantPut(uploadHandler);
    uploadsTable.grantReadWriteData(uploadHandler);
    uploadsTable.grantReadData(checkUploadsHandler);
    
    // The following allows the lambda to generate a presigned URL for PUT operations.
    const s3PutObjectPolicy = new iam.PolicyStatement({
      sid: `${appName}S3PutObject${stage.charAt(0).toUpperCase() + stage.slice(1)}`,
      actions: ['s3:putObject'],
      resources: [`${voiceNotesBucket.bucketArn}/*`],
    });
    uploadHandler.addToRolePolicy(s3PutObjectPolicy);

    // 6. API Gateway to trigger the Lambda
    const api = new apigw.RestApi(this, 'VoiceNotesApi', {
      restApiName: `${appNameKebabCase}-voice-notes-api-${stage}`,
      description: 'API for WhatsApp voice notes upload service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: stage,
        description: `${stage} environment deployment`
      }
    });

    // Upload endpoint
    const uploadResource = api.root.addResource('upload');
    uploadResource.addMethod('POST', new apigw.LambdaIntegration(uploadHandler), {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigw.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    // Check uploads endpoint
    const checkResource = api.root.addResource('check-uploads');
    checkResource.addMethod('POST', new apigw.LambdaIntegration(checkUploadsHandler), {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigw.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    // 7. Output the API URL and other important information
    new cdk.CfnOutput(this, 'ApiUrl', {
      exportName: `${appName}ApiUrl${stage.charAt(0).toUpperCase() + stage.slice(1)}`,
      value: api.url,
      description: 'URL of the voice notes upload API'
    });

    new cdk.CfnOutput(this, 'BucketName', {
      exportName: `${appName}BucketName${stage.charAt(0).toUpperCase() + stage.slice(1)}`,
      value: voiceNotesBucket.bucketName,
      description: 'Name of the S3 bucket storing voice notes'
    });

    new cdk.CfnOutput(this, 'UploadsTableName', {
      exportName: `${appName}UploadsTableName${stage.charAt(0).toUpperCase() + stage.slice(1)}`,
      value: uploadsTable.tableName,
      description: 'Name of the DynamoDB table tracking uploads'
    });
  }
}