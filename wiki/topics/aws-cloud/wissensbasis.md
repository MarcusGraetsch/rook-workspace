# AWS Cloud — Überblick

## Überblick

Amazon Web Services Grundlagen, Services, Security.

## Wichtige Services

| Kategorie | Services |
|-----------|----------|
| Compute | EC2, Lambda, ECS/EKS |
| Storage | S3, EBS, EFS, Glacier |
| Database | RDS, DynamoDB, ElastiCache |
| Networking | VPC, CloudFront, Route 53, API Gateway |

## SQS & SNS

```bash
# Queue erstellen
aws sqs create-queue --queue-name my-queue --region eu-central-1

# Message senden
aws sqs send-message --queue-url <url> --message-body "Hello"

# SNS Topic
aws sns create-topic --name my-topic
aws sns subscribe --topic-arn <arn> --protocol email --notification-endpoint marcus@example.com
aws sns publish --topic-arn <arn> --message "Alert!"
```

## Compliance mit Prowler

```bash
pip install prowler
prowler aws -o report
prowler aws -c NIST
```

## Learning Plan (ML auf AWS)

| Phase | Services | Dauer |
|-------|----------|-------|
| 1 | SageMaker Basics, ML Fundamentals | 2 Wochen |
| 2 | Built-in Algorithms | 2 Wochen |
| 3 | Custom Models, Studio | 3 Wochen |
| 4 | MLOps, Monitoring | 2 Wochen |

## Relevant Conversations

- `AWS Secure Messaging Solution.md`
- `Automate AWS Compliance Reports.md`
