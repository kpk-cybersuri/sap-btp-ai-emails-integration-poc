# Inbound Email Auto-Response and Data Query POC

A SAP BTP proof-of-concept for making operational report emails interactive.

Instead of treating a generated report email as the end of a workflow, this project allows the recipient to reply to the email and continue interacting with the underlying report data using natural language.

NOTE: This is an old codebase, which I worked on primarily and developed code inside it in 2025.

## Purpose

The idea behind the project was simple:

> If a system already sends users operational data by email, the user should be able to reply to that same email and ask follow-up questions about the data.

For example, a system may initially send an IDoc failure report, HR consistency report, or another dataset collected from an SAP or external API.

A recipient can then reply with requests such as:

- Show only failed records for a particular system
- Give me the records matching a specific condition
- Send the filtered data as an Excel file
- Ask a normal question related to the report
- Ask a general question that does not require querying the dataset

The application determines how the reply should be handled and generates an appropriate response.

If the request cannot be interpreted with sufficient confidence, it sends a controlled fallback response instead of attempting an unreliable action.

## High-Level Architecture

```text
SAP / External Source APIs
          |
          v
   CAP Email Service
          |
          +---- Build report body
          +---- Generate Excel
          +---- Cache report data
          |
          v
    AWS SES / SMTP
          |
          v
       User / DL
          |
       Email Reply
          |
          v
       AWS SES
          |
          v
       AWS SNS
          |
          v
  SNS Webhook Service
          |
          +---------------------------+
          |                           |
          v                           v
 Natural-Language Query          General Message
          |                           |
          v                           v
 Hugging Face Inference          LLM Response
          |
          v
    Generated Query
          |
          v
    SQLite Report Cache
          |
          v
 Filtered Result / Excel
          |
          +-------------+
                        |
                        v
                 Response Email
````

## How It Works

### 1. Initial Report Generation

The application can consume report data from different source APIs.

The source does not need to be tied to one business process. During development, the same pattern was designed to work with reports such as:

* SAP IDoc monitoring data
* HR master-data consistency reports
* Other application or API-based datasets

The CAP service processes the source response, prepares the email body and can generate an Excel representation of the report.

### 2. Outbound Email

Emails are sent using Node.js and Nodemailer through an AWS SES-enabled domain.

A separately owned domain was used during the POC, allowing different sender prefixes to be used for different report or service scenarios.

### 3. Inbound Email Processing

Replies are received through AWS SES and forwarded through AWS SNS.

SNS invokes the CAP application's webhook endpoint.

Unlike a conventional application API, the webhook service is event-driven: its primary entry point is an incoming email reply rather than a UI or direct client request.

### 4. Natural-Language Data Queries

The original report data is stored as a local SQLite cache.

When a reply appears to contain a data request:

1. The email text is extracted.
2. The report context and available data structure are identified.
3. A Hugging Face inference/chat-completions API interprets the request.
4. The natural-language request is translated into a query against the cached dataset.
5. The query is executed.
6. The matching data is formatted for the user.
7. An Excel attachment can be generated when appropriate.
8. The result is sent back by email.

This allows users to interact with report data without opening a separate reporting application.

## Response Routing

Not every email is treated as a database query.

The application separates responses into different paths:

### Data Request

A request that can be answered from the report data is translated into a query and executed against the cache.

### General Request

A normal conversational or informational message can be answered directly using the language model without querying the report data.

### Unclear Request

If the request cannot be understood reliably, the application returns a controlled acknowledgement rather than generating an arbitrary query or response.

## CAP Services

The project was separated into small services with different responsibilities.

### Email Service

Handles initial report generation and outbound email delivery.

### SNS Webhook Service

Receives inbound email events forwarded by AWS SNS and coordinates reply processing.

This is the central service behind the inbound-email workflow.

### AI Chat Service

Provides a standalone interface for testing prompts and communication with the Hugging Face inference API independently of the email flow.

### Files Service

Handles file-processing utilities, including Base64 encoding and decoding.

This was useful when integrating file-producing APIs with SAP Build Process Automation flows where binary files could not be passed directly between some steps.

### Visualisation Service

Generates visual representations of report data using JavaScript visualisation libraries, including charts and analytical summaries.

## Reference Python Application

The repository also contains an earlier Python web application that was built before the CAP implementation.

It served as a reference implementation for:

* Source-data APIs
* Email sending
* Basic request flows
* Infrastructure experimentation

The Python application was deployed to an AWS EC2 instance behind NGINX and used the same test domain infrastructure.

The later CAP implementation evolved these ideas into a service-oriented application designed for SAP BTP.

## Technology

* SAP Cloud Application Programming Model
* SAP BTP Cloud Foundry
* Node.js
* AWS SES
* AWS SNS
* Nodemailer
* Hugging Face Inference / Chat Completions API
* SQLite
* ExcelJS
* JavaScript data-visualisation libraries
* REST APIs
* Python
* AWS EC2
* NGINX

## Design Notes

The project was built as a proof-of-concept rather than a production email-processing platform.

SQLite and the Cloud Foundry application filesystem were intentionally sufficient for demonstrating the interaction model, but would not be appropriate as the long-term persistence design of a production deployment.

A production implementation would typically move report state and conversation context into a persistent database or managed service and introduce stronger controls around query generation, authorisation, auditing and data access.

## Project Status

The architecture and working proof-of-concept were developed to demonstrate the feasibility of interactive report emails.

The concept was reviewed and accepted for further implementation in a development environment, but this repository represents the independent POC rather than a production company implementation.

