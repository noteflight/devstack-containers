// The ARN of the AWS secrets manager holding the credentials for
// logging into DockerHub
DOCKER_HUB_CREDENTIALS_ARN = "arn:aws:secretsmanager:us-east-1:915434789528:secret:dockerhub/account/arista-bDIz6P"
GITHUB_CONNECTION_ARN = "arn:aws:codestar-connections:us-east-1:915434789528:connection/f92a8a58-c747-49f9-9392-fdfd88444e30"
GITHUB_REPO_NAME = "noteflight/devstack-containers"
GITHUB_REPO = `https://github.com/${GITHUB_REPO_NAME}.git`
GITHUB_BRANCH = "main"

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
function Join(values, delimiter = "") {
  return { "Fn::Join" : [ delimiter || "", values ] }
}

function generateSpec() {
  const Resources = {}
  const Outputs = {}

  const containers = ["dynamodblocal"]

  // Add the S3 bucket for storing build logs
  addBuildBucket(Resources, Outputs)

  // Create the IAM roles
  addCodeBuildIAMRole(Resources, Outputs, containers)
  addCodePipelineIAMRole(Resources, Outputs, containers)
  
  // Add the components that are container-specific
  containers.forEach(container=>{
    addContainerComponents(Resources, Outputs, container)
  })

  // Add the CodePipeline
  addCodePipeline(Resources, Outputs, containers)

  return {Resources, Outputs}
}

function addBuildBucket(Resources, Outputs) {
  Resources.BuildBucket = {
      Type: "AWS::S3::Bucket",
  }
  Outputs.BuildBucket = {
    Description: "The bucket containing codepipeline artifacts, build results, and logs",
    Value: Ref("BuildBucket"),
  }
  Outputs.BuildBucketArn = {
    Description: "The arn of the bucket containing codepipeline artifacts, build results, and logs",
    Value: Arn("BuildBucket"),
  }
}

function addCodeBuildIAMRole(Resources, Outputs, containers) {
  // Create the IAM role that CodePipeline and CodeBuild will use
  Resources.CodeBuildRole = {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          // Allow CodeBuild to use this role
          {
            Effect: "Allow",
            Principal: {
              Service: "codebuild.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          },
        ]
      },
      Policies: [
        {
          PolicyName: "DevstackContainersCodeBuildRolePolicy",
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

              // Allow docker login with ECR
              {
                Sid: "AllowECRLogin",
                Effect: "Allow",
                Action: [
                  "ecr:GetAuthorizationToken",
                ],
                Resource: "*"
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

              // Permissions for writing logs to CloudWatch
              {
                Effect: "Allow",
                Action: [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents"
                ],
                Resource: containers.map(container=>Arn(`CloudWatchLogGroup${container}`)),
              },

              // Permissions for writing logs to the S3 build bucket
              {
                Effect: "Allow",            
                Action: [
                  "s3:PutObject",
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:GetBucketAcl",
                  "s3:GetBucketLocation",
                ],
                Resource: [
                  Join([Arn("BuildBucket"), "*"], "/"),
                ],
              },
            ]
          }
        }
      ]
    },
  }

  Outputs.CodeBuildRoleArn = {
    Description: "The arn of the IAM role running CodeBuild",
    Value: Arn("CodeBuildRole"),
  }
}

function addCodePipelineIAMRole(Resources, Outputs, containers) {
  // Create the IAM role that CodePipeline and CodeBuild will use
  Resources.CodePipelineRole = {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          // Allow CodePipeline to use this role
          {
            Effect: "Allow",
            Principal: {
              Service: "codepipeline.amazonaws.com"
            },
            Action: "sts:AssumeRole"
          },
        ]
      },
      Policies: [
        {
          PolicyName: "DevstackContainersCodePipelineRolePolicy",
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              // Permissions for accessing the S3 build bucket
              {
                Effect: "Allow",            
                Action: [
                  "s3:PutObject",
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:GetBucketAcl",
                  "s3:GetBucketLocation",
                  // CodePipeline apparently uses this too, in
                  // addition to the "regular" permissions above
                  "s3:PutObjectAcl",
                ],
                Resource: [
                  Arn("BuildBucket"),
                  Join([Arn("BuildBucket"), "*"], "/"),
                ],
              },

              // Allow reading from GitHub using CodeStar
              {
                Effect: "Allow",
                Action: [
                  "codestar-connections:UseConnection"
                ],
                Resource: "*",
              },              

              // Allow CodePipeline to start CodeBuild builds
              {
                Effect: "Allow",
                Action: [
                  "codebuild:StartBuild",
                  "codebuild:BatchGetBuilds",
                ],
                Resource: containers.map(container=>Arn(`CodeBuild${container}`))
              },              
            ]
          }
        }
      ]
    },
  }

  Outputs.CodePipelineRoleArn = {
    Description: "The arn of the IAM role running CodePipeline",
    Value: Arn("CodePipelineRole"),
  }
}

// Adds the components specific to each container image being built
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
    Value: Arn(repositoryResource),
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
    Value: Arn(logGroupResource),
  }

  // Add the CodeBuild 
  const codeBuildResource = `CodeBuild${container}`
  Resources[codeBuildResource] = {
    Type : "AWS::CodeBuild::Project",
    Properties: {
      Name: `devstack-${container}`,
      Description: `Builds the devstack-${container} Docker image and pushes it to the nf-devstack-${container} ECR repository`,
      Source: {
        Type: "CODEPIPELINE",
        BuildSpec: `build-ci/codebuild/buildspec-${container}.yml`,
      },
      SourceVersion: GITHUB_BRANCH,
      Artifacts: {
        Type: "CODEPIPELINE",
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
          Location: Join([Arn("BuildBucket"), "build-log"], "/"),
        }
      },
      ServiceRole: Arn("CodeBuildRole"),
    },
  }
  Outputs[codeBuildResource] = {
    Description: `The CodeBuild project for the ${container} builds`,
    Value: Ref(codeBuildResource),
  }
  Outputs[`${codeBuildResource}Arn`] = {
    Description: `The arn of the CodeBuild project for the ${container} builds`,
    Value: Arn(codeBuildResource),
  }
}

function addCodePipeline(Resources, Outputs, containers) {
  Resources.CodePipeline = {
    Type: "AWS::CodePipeline::Pipeline",
    Properties: {
      Name: "devstack-containers",
      ArtifactStore: {
        Type: "S3",
        Location: Ref("BuildBucket"),
      },
      RoleArn: Arn("CodePipelineRole"),
      Stages: [
        {
          Name: "Source",
          Actions: [
            {
              Name: "Source",
              Namespace: "SourceVariables",
              Region: "us-east-1",
              // Use the new (GitHub 2) "CodeStar" connection to
              // github (supersedes the old OAuth-based connection)
              ActionTypeId: {
                Owner: "AWS",
                Category: "Source",
                Version: "1",
                Provider: "CodeStarSourceConnection"
              },
              Configuration: {
                FullRepositoryId: GITHUB_REPO_NAME,
                ConnectionArn: GITHUB_CONNECTION_ARN,
                BranchName: GITHUB_BRANCH,
                OutputArtifactFormat: "CODE_ZIP"
              },
              OutputArtifacts: [
                {
                  Name: "SourceArtifact"
                }
              ],
            }
          ]
        },
        {
          Name: "Build",
          Actions: containers.map(container=>{return {
            Name: `Build-${container}`,
            Namespace: "BuildVariables",
            Region: "us-east-1",
            InputArtifacts: [
              {
                Name: "SourceArtifact"
              }
            ],
            // Run the CodeBuild action.  Currently it pushes the
            // built images directly to ECR, so there is no separate
            // "deploy" step
            ActionTypeId: {
              Owner: "AWS",
              Category: "Build",
              Version: "1",
              Provider: "CodeBuild"
            },
            Configuration: {
              ProjectName: Ref(`CodeBuild${container}`),
              EnvironmentVariables: JSON.stringify([
                {name: "GIT_COMMIT", value: "#{SourceVariables.CommitId}"},
                {name: "GIT_BRANCH", value: "#{SourceVariables.BranchName}"},
              ]),
            },
            OutputArtifacts: [
              {
                Name: "BuildArtifact"
              }
            ],
          }}),
        }
      ]
    }
  }
  Outputs.CodePipeline = {
    Description: `The CodePipeline for building the containers`,
    Value: Ref("CodePipeline"),
  }
}

const spec = generateSpec()
console.log(JSON.stringify(spec, null, 2))
