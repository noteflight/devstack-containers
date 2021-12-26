
// Helper functions for generating common CF constructs
function GetAtt(resource, attributeName) {
  return {"Fn::GetAtt": [resource, attributeName]}
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
  Resources.BuildBucket = {
      Type: "AWS::S3::Bucket",
  }
  Outputs.BuildBucket = {
    Description: "The bucket containing build results and logs",
    Value: Ref("BuildBucket"),
  }
  Outputs.BuildBucketArn = {
    Description: "The arn of the bucket containing build results and logs",
    Value: Join("", ["arn:aws:s3:::", Ref("BuildBucket")])
  }

  // Add the components that are container-specific
  containers.forEach(container=>{
    addContainerComponents(Resources, Outputs, container)
  })

  
  // CloudWatch
  // CodeBuilds
  // IAM role
  // IAM policy for ECR writing
  // IAM policy for Secrets file writing

  return {Resources, Outputs}
}

function addContainerComponents(Resources, Outputs, container) {
  // Add the ECR Repository
  Resources[`Repository${container}`] = {
    Type : "AWS::ECR::Repository",
    Properties: {
      RepositoryName: `nf-devstack-${container}`
    }
  }

  // Add the CloudWatch logs Log Group
  Resources[`CloudWatchLogGroup${container}`] = {
    Type : "AWS::Logs::LogGroup",
    Properties: {
      LogGroupName: `/aws/codebuild/devstack-${container}`,
      RetentionInDays: 180,
    }
  }
}

/*
const spec = {
  Resources: {
    AssetsBucket: {
      Type: "AWS::S3::Bucket",
    },
    RequestQueue: {
      Type: "AWS::SQS::Queue",
    },
    ResponseQueue: {
      Type: "AWS::SQS::Queue",
    },
    FargateVPC: {
      Type: "AWS::EC2::VPC",
      Properties: {
        CidrBlock: "10.0.0.0/16"
      }
    },
    // Note I think it's recommended to have at least two subnets in different AZ's
    FargateSubnet: {
      Type: "AWS::EC2::Subnet",
      Properties: {
        CidrBlock: "10.0.0.0/16",
        MapPublicIpOnLaunch: true,
        VpcId: Ref("FargateVPC"),
      }
    },
    FargateSecurityGroup: {
      Type: "AWS::EC2::SecurityGroup",
      Properties: {
        GroupDescription: "Access for Fargate service",
        VpcId: Ref("FargateVPC"),
      }
    },
    FargateSecurityGroupIngress: {
      Type: "AWS::EC2::SecurityGroupIngress",
      Properties: {
        GroupId: Ref("FargateSecurityGroup"),
        IpProtocol: "tcp",
        FromPort: 8080,
        ToPort: 8080,
        CidrIp: "0.0.0.0/0"
      }
    },
    FargateInternetGateway: {
      Type: "AWS::EC2::InternetGateway",
      Properties: {
      }
    },
    FargateInternetGatewayAttachment: {
      Type: "AWS::EC2::VPCGatewayAttachment",
      Properties: {
        InternetGatewayId: Ref("FargateInternetGateway"),
        VpcId: Ref("FargateVPC"),
      }
    },
    // I think this is needed for fargate to access the container registry
    FargatePublicRouteTable: {
      Type: "AWS::EC2::RouteTable",
      Properties: {
        VpcId: Ref("FargateVPC"),
      }
    },
    FargateDefaultPublicRoute: {
      Type: "AWS::EC2::Route",
      Properties: {
        RouteTableId: Ref("FargatePublicRouteTable"),
        DestinationCidrBlock: "0.0.0.0/0",
        GatewayId: Ref("FargateInternetGateway"),
      }
    },
    FargateSubnetPublicRouteAssociation: {
      Type: "AWS::EC2::SubnetRouteTableAssociation",
      Properties: {
        RouteTableId: Ref("FargatePublicRouteTable"),
        SubnetId: Ref("FargateSubnet"),
      }
    },
    FargateRole: {
      Type: "AWS::IAM::Role",
      Properties: {
        AssumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "ecs-tasks.amazonaws.com"
              },
              Action: "sts:AssumeRole"
            }
          ]
        },
        ManagedPolicyArns: [
          // For accessing ECR to get the image
          "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        ],
        Policies: [
          {
            PolicyName: "FargatePolicy",
            PolicyDocument: {
              Version: "2012-10-17",
              Statement: [
                {
                  Sid: "S3Access",
                  Effect: "Allow",
                  Action: ["s3:ListBucket", "s3:GetObject", "s3:PutObject"],
                  Resource: [
                    Join("", ["arn:aws:s3:::", Ref("AssetsBucket")]),
                    Join("", ["arn:aws:s3:::", Ref("AssetsBucket"), "/*"]),
                  ]
                },
                {
                  Sid: "SQSRequestQueueAccess",
                  Effect: "Allow",
                  Action: ["sqs:ReceiveMessage", "sqs:DeleteMessage"],
                  Resource: [GetAtt("RequestQueue", "Arn")]
                },
                {
                  Sid: "SQSResponseQueueAccess",
                  Effect: "Allow",
                  Action: ["sqs:SendMessage"],
                  Resource: [GetAtt("ResponseQueue", "Arn")]
                },
              ]
            }
          }
        ]
      },
    },
    FargateCluster: {
      Type: "AWS::ECS::Cluster",
      Properties: {
        CapacityProviders: ["FARGATE"]
      }
    },
    FargateLogs: {
      Type: "AWS::Logs::LogGroup",
      Properties: {
        LogGroupName: logGroupName,
        RetentionInDays: 3,
      }
    },
    FargateTask: {
      Type: "AWS::ECS::TaskDefinition",
      Properties: {
        RequiresCompatibilities: ["FARGATE"],
        NetworkMode: "awsvpc",
        Cpu: 256,
        Memory: 1024,
        TaskRoleArn: Ref("FargateRole"),
        ExecutionRoleArn: Ref("FargateRole"),
        ContainerDefinitions: [
          {
            Image: imageName,
            Name: "FargateTaskContainer",
            LogConfiguration: {
              LogDriver: "awslogs",
              Options: {
                "awslogs-group": logGroupName,
                "awslogs-region": "us-east-1",
                "awslogs-stream-prefix": logStreamPrefix,
              }
            },
            PortMappings: [
              {
                ContainerPort: 8080,
              },
            ],
            Environment: [
              {
                Name: "REQUEST_QUEUE_URL",
                Value: Ref("RequestQueue"),
              },
              {
                Name: "RESPONSE_QUEUE_URL",
                Value: Ref("ResponseQueue"),
              },
              {
                Name: "ASSETS_BUCKET",
                Value: Ref("AssetsBucket"),
              },
            ],
          }
        ]
      }
    },
    FargateService: {
      Type: "AWS::ECS::Service",
      Properties: {
        Cluster: GetAtt("FargateCluster", "Arn"),
        DesiredCount: desiredCount,
        TaskDefinition: Ref("FargateTask"),
        LaunchType: "FARGATE",
        NetworkConfiguration: {
          AwsvpcConfiguration: {
            AssignPublicIp: "ENABLED",
            Subnets: [Ref("FargateSubnet")],
            SecurityGroups: [Ref("FargateSecurityGroup")],
          }
        }
      }
    },
  },
  Outputs: {
    RequestQueueArn: {
      Description: "The arn of the request queue",
      Value: GetAtt("RequestQueue", "Arn"),
    },
    RequestQueueUrl: {
      Description: "The url of the request queue",
      Value: Ref("RequestQueue"),
    },
    ResponseQueueArn: {
      Description: "The arn of the response queue",
      Value: GetAtt("ResponseQueue", "Arn"),
    },
    ResponseQueueUrl: {
      Description: "The url of the response queue",
      Value: Ref("ResponseQueue"),
    },
    AssetsBucket: {
      Description: "The asset bucket",
      Value: Ref("AssetsBucket"),
    },
    AssetsBucketArn: {
      Description: "The asset bucket arn",
      Value: Join("", ["arn:aws:s3:::", Ref("AssetsBucket")])
    },
  }
}
*/

const spec = generateSpec()
console.log(JSON.stringify(spec, null, 2))
