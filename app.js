const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const todoAppDatabaseFilePath = path.join(__dirname, "todoApplication.db");
const sqliteDriver = sqlite3.Database;

let todoAppDBConnectionObj = null;

const initializeDBAndServer = async () => {
  try {
    todoAppDBConnectionObj = await open({
      filename: todoAppDatabaseFilePath,
      driver: sqliteDriver,
    });

    app.listen(3000, () => {
      console.log("Server running and listening on port 3000 !");
      console.log("Base URL - http://localhost:3000");
    });
  } catch (exception) {
    console.log(`Error initializing database or server: ${exception.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

/*
    End-Point 1      : GET /todos
    Query Parameters : search_q, priority,
                       status, category
    ------------------
    To fetch todo items based on the
    search criteria in the query parameters.
*/

module.exports = app;
