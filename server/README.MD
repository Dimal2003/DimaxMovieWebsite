# Server Setup Guide

This guide will help you get the server running for your Netflix project.

## Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [MongoDB](https://www.mongodb.com/) database (local or cloud, e.g., MongoDB Atlas)

## 1. Install Dependencies
Open a terminal and run:

```
npm install
```

This will install all required packages listed in `package.json`.

## 2. Configure Environment Variables
Create a `.env` file in the `server` directory with the following content:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```
- Replace `your_mongodb_connection_string` with your actual MongoDB URI.
- You can change the `PORT` if needed.

## 3. Start the Server
Run the following command in the `server` directory:

```
npm start
```

Or, if there is no start script, use:

```
node app.js
```

The server should now be running at [http://localhost:5000](http://localhost:5000) (or your chosen port).

## 4. API Endpoints
- User signup: `POST /signup`
- User login: `POST /login`
- Admin login: `POST /admin/login`
- Get users/admins: `GET /admin/users?role=user|admin|both`
- Support: `POST /api/help/support`
- Reports: `GET /admin/reports`

Refer to the code in `app.js` for more details on available endpoints.

---
If you have any issues, make sure your MongoDB server is running and your `.env` file is correctly configured.
