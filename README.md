# SpendWise – Personal Finance Management System

SpendWise is a full-stack web application designed to help users manage their personal finances by tracking income and expenses, setting budgets, and reviewing financial summaries.

## Features

- User registration and login
- Secure password hashing and JWT-based authentication
- Dashboard for an overview of financial activity
- Add and delete transactions
- Budget management by category
- Financial analytics and summaries
- CSV export of transaction data
- User-specific transaction records

## Technology Stack

**Frontend**
- React
- JavaScript
- HTML and CSS
- Vite
- Lucide React

**Backend**
- Node.js
- Express.js
- REST API

**Database and Authentication**
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)
- bcryptjs

## Project Structure

```text
SpendWise/
├── client/          # React frontend
│   ├── public/
│   └── src/
├── server/          # Node.js and Express backend
│   ├── model/
│   └── server.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB running locally or a MongoDB connection URI

### 1. Clone the repository

```bash
git clone https://github.com/devdnikhil5/SpendWise.git
cd SpendWise
```

### 2. Start the backend

```bash
cd server
npm install
```

Configure the required environment variables in a local `.env` file according to the backend configuration. Never upload credentials or secret keys to GitHub.

Start the backend using the command configured in your project. If no start script is defined, use:

```bash
node server.js
```

### 3. Start the frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Purpose

This project demonstrates full-stack web development, REST API integration, database operations, authentication, and personal finance management.

## Author

**Nikhil Devari**  
Master of Computer Applications (MCA)  
Chandigarh University

## Repository

https://github.com/devdnikhil5/SpendWise
