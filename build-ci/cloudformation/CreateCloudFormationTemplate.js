
// The ARN of the AWS secrets manager holding the credentials for
// logging into DockerHub
GITHUB_REPO = "https://github.com/noteflight/devstack-containers.git"
DOCKER_HUB_CREDENTIALS_ARN = "arn:aws:secretsmanager:us-east-1:915434789528:secret:dockerhub/account/arista-bDIz6P"

// Helper functions for generating common CF constructs
function GetAtt(resource, attributeName) {
  return {"Fn::GetAtt": [resource, attributeName]}
}
function Arn(resource) {
  return GetAtt(resource, "Arn")
}
function Ref(resource) {
  return {"Ref": resource}
}
function Join(delimiter, values) {
  return { "Fn::Join" : [ delimiter || "", values ] }
}

function generateSpec() {
  const Resources = {}
  const Outputs = {}

  const containers = ["dynamodblocal"]

  // Add the S3 bucket for storing build logs
  addBuildBucket(Resources, Outputs)

  // Create the IAM role
  addIAMRole(Resources, Outputs, containers)
  
  // Add the components that are container-specific
  containers.forEach(container=>{
    addContainerComponents(Resources, Outputs, container)
  })

  return {Resources, Outputs}
}

function addBuildBucket(Resources, Outputs) {
  Resources.BuildBucket = {
      Type: "AWS::S3::Bucket",
  }
  Outputs.BuildBucket = {
    Description: "The bucket containing build results and logs",
    Value: Ref("BuildBucket"),
  }
  Outputs.BuildBucketArn = {
    Description: "The arn of the bucket containing build results and logs",
    Value: Arn("BuildBucket"),
  }
}

function addIAMRole(Resources, Outputs, containers) {
  // Create the IAM role that CodeBuild will use.  It needs the
  // ability to write to the ECR repositories, and to read the docker
  // hub secret
  Resources.BuildRole = {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "codebuild.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          }
        ]
      },
      Policies: [
        {
          PolicyName: "DevstackContainersBuildRolePolicy",
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              // Allow push/pull from the ECR repositories
              {
                Sid: "AllowECRPushPull",
                Effect: "Allow",
                Action: [
                  "ecr:BatchGetImage",
                  "ecr:BatchCheckLayerAvailability",
                  "ecr:CompleteLayerUpload",
                  "ecr:GetDownloadUrlForLayer",
                  "ecr:InitiateLayerUpload",
                  "ecr:PutImage",
                  "ecr:UploadLayerPart",
                ],
                Resource: containers.map(container=>Arn(`Repository${container}`))
              },
              // Allow access to the DockerHub account credentials
              {
                Sid: "AllowDockerHubSecret",
                Effect: "Allow",
                Action: [
                  "secretsmanager:GetResourcePolicy",
                  "secretsmanager:GetSecretValue",
                  "secretsmanager:DescribeSecret",
                  "secretsmanager:ListSecretVersionIds"
                ],
                Resource: [
                  DOCKER_HUB_CREDENTIALS_ARN
                ]
              },

              // Permissions for writing logs to CloudWatch and S3
              {
                Effect: "Allow",
                Resource: containers.map(container=>Arn(`CloudWatchLogGroup${container}`)),
                Action: [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents"
                ]
              },
              {
                Effect: "Allow",            
                Action: [
                  "s3:PutObject",
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:GetBucketAcl",
                  "s3:GetBucketLocation"
                ],
                Resource: [
                  Arn("BuildBucket"),
                ],
              },
            ]
          }
        }
      ]
    },
  }

  Outputs.BuildRoleArn = {
    Description: "The arn of the IAM role running the build",
    Value: GetAtt("BuildRole", "Arn"),
  }
}

function addContainerComponents(Resources, Outputs, container) {
  // Add the ECR Repository
  const repositoryResource = `Repository${container}`
  Resources[repositoryResource] = {
    Type : "AWS::ECR::Repository",
    Properties: {
      RepositoryName: `nf-devstack-${container}`
    }
  }
  Outputs[repositoryResource] = {
    Description: `The ECR containing the built ${container} images`,
    Value: Ref(repositoryResource),
  }
  Outputs[`${repositoryResource}Arn`] = {
    Description: `The arn of the ECR containing the built ${container} images`,
    Value: GetAtt(repositoryResource, "Arn"),
  }

  // Add the CloudWatch logs Log Group
  const logGroupName = `/aws/codebuild/devstack-${container}`
  const logGroupResource = `CloudWatchLogGroup${container}`
  Resources[logGroupResource] = {
    Type : "AWS::Logs::LogGroup",
    Properties: {
      LogGroupName: logGroupName,
      RetentionInDays: 180,
    }
  }
  Outputs[logGroupResource] = {
    Description: `The CloudWatch LogGroup for the ${container} builds`,
    Value: Ref(logGroupResource),
  }
  Outputs[`${logGroupResource}Arn`] = {
    Description: `The arn of the CloudWatch LogGroup for the ${container} builds`,
    Value: GetAtt(logGroupResource, "Arn"),
  }

  // Add the Codebuild 
  const codeBuildResource = `CodeBuild${container}`
  Resources[codeBuildResource] = {
    Type : "AWS::CodeBuild::Project",
    Properties: {
      Name: `devstack-${container}`,
      Description: `Builds the devstack-${container} Docker image and pushes it to the nf-devstack-${container} ECR repository`,
      Source: {
        Type: "GITHUB",
        Location: GITHUB_REPO,
        GitCloneDepth: 1,
        BuildSpec: `build-ci/codebuild/buildspec-${container}.yml`,
      },
      SourceVersion: "main",
      Artifacts: {
        Type: "NO_ARTIFACTS"
      },
      Cache: {
        Type: "NO_CACHE"
      },
      Environment: {
        Type: "LINUX_CONTAINER",
        Image: "aws/codebuild/standard:4.0",
        ImagePullCredentialsType: "CODEBUILD",
        ComputeType: "BUILD_GENERAL1_SMALL",
        // This is needed in order for Docker commands to run in the
        // build
        PrivilegedMode: true,
      },
      TimeoutInMinutes: 60,
      LogsConfig: {
        CloudWatchLogs: {
          Status: "ENABLED",
          GroupName: logGroupName,
        },
        S3Logs: {
          Status: "ENABLED",
          EncryptionDisabled: true,
          Location: Join("/", [GetAtt("BuildBucket", "Arn"), "build-log"]),
        }
      },
      ServiceRole: GetAtt("BuildRole", "Arn"),
    },
  }
  Outputs[codeBuildResource] = {
    Description: `The CodeBuild project for the ${container} builds`,
    Value: Ref(codeBuildResource),
  }
  Outputs[`${codeBuildResource}Arn`] = {
    Description: `The arn of the CodeBuild project for the ${container} builds`,
    Value: GetAtt(codeBuildResource, "Arn"),
  }
}

const spec = generateSpec()
console.log(JSON.stringify(spec, null, 2))
