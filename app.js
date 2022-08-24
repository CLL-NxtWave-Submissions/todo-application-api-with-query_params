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

const validTodoItemPriorityValues = ["HIGH", "MEDIUM", "LOW"];
const validTodoItemStatusValues = ["TO DO", "IN PROGRESS", "DONE"];
const validTodoItemCategoryValues = ["WORK", "HOME", "LEARNING"];

/*
    Function Name        : isValidValue
    Input Parameters     : 
        - validValues    : Array of valid values
        - inputValue     : Input query parameter
                           value.
    Return Value         : Boolean (true/false)
    ---------------------------------------------
    Description : Function expression to check if
                  input value in a query parameter
                  matches an entry in the array/set
                  of valid values.
*/
const isValidValue = (validValues, inputValue) => {
  return validValues.includes(inputValue);
};

/*
    Function Name        : checkQueryParametersValidity
    Input Parameters     : 
        - validValues    : Array of valid values
        - inputValue     : Input query parameter
                           value.
    Return Value         : Boolean (true/false)
    ----------------------------------------------------
    Description : Function to check validity of
                  input query parameter values:
                  priority, status, category and
                  return info on first instance
                  of invalid input value.
*/
const checkQueryParametersValidity = (queryParameterValues) => {
  let validityCheckResult = {
    isSuccess: true,
    checkFailedMessage: "",
  };

  const { priority, status, category } = queryParameterValues;
  if (priority !== "" && !isValidValue(validTodoItemPriorityValues, priority)) {
    validityCheckResult.isSuccess = false;
    validityCheckResult.checkFailedMessage = "Invalid Todo Priority";
  } else if (
    status !== "" &&
    !isValidValue(validTodoItemStatusValues, status)
  ) {
    validityCheckResult.isSuccess = false;
    validityCheckResult.checkFailedMessage = "Invalid Todo Status";
  } else if (
    category !== "" &&
    !isValidValue(validTodoItemCategoryValues, category)
  ) {
    validityCheckResult.isSuccess = false;
    validityCheckResult.checkFailedMessage = "Invalid Todo Category";
  }

  return validityCheckResult;
};

/*
    End-Point 1      : GET /todos
    Query Parameters : search_q, priority,
                       status, category
    ------------------
    To fetch todo items based on the
    search criteria in the query parameters.
*/
app.get("/todos", async (req, res) => {
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
  } = req.query;

  const queryParametersValidityCheckResult = checkQueryParametersValidity({
    priority,
    status,
    category,
  });

  if (!queryParametersValidityCheckResult.isSuccess) {
    res.status(400);
    res.send(queryParametersValidityCheckResult.checkFailedMessage);
  } else {
    // Valid query parameter input
    const queryToFilterAndFetchTodoData = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE '%${search_q}%'
        AND
            priority LIKE '%${priority}%'
        AND 
            status LIKE '%${status}%'
        AND
            category LIKE '%${category}%';
        `;

    const filteredTodoItemData = await todoAppDBConnectionObj.all(
      queryToFilterAndFetchTodoData
    );
    res.send(filteredTodoItemData);
  }
});
module.exports = app;
