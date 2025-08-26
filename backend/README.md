# RBAC Project

This project implements Role-Based Access Control (RBAC) in a Node.js application using Express. It provides authentication and authorization features to manage user roles and permissions.

## Features
- User authentication (login, registration)
- Role-based authorization middleware
- Protected routes for different user roles
- MongoDB integration for user data

## Project Structure
```
src/
  server.js                # Main server file
  config/
    dbConnect.js           # Database connection setup
  controllers/
    authController.js      # Authentication logic
  middlewares/
    authMiddleware.js      # Authentication middleware
    roleMiddleware.js      # Role-based access middleware
  models/
    userModel.js           # User schema/model
  routes/
    authRoutes.js          # Auth routes (login, register)
    userRoutes.js          # User-related routes
```

## Getting Started

### Prerequisites
- Node.js
- MongoDB

### Installation
1. Clone the repository:
   ```
   git clone <repo-url>
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your MongoDB connection in `src/config/dbConnect.js`.
4. Start the server:
   ```
   node src/server.js
   ```

## Usage
- Register a new user via `/api/auth/register`
- Login via `/api/auth/login`
- Access protected routes based on user roles

## License
This project is licensed under the MIT License.
