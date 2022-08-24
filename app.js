const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

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

/*
    End-Point 2: GET /todos/:todoId
    ------------
    To get specific todo item data
    with id: todoId
*/
app.get("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const queryToFetchSpecificTodoItem = `
    SELECT
        *
    FROM
        todo
    WHERE
        id = ${todoId};
    `;

  const specificTodoItemData = await todoAppDBConnectionObj.get(
    queryToFetchSpecificTodoItem
  );
  const processedSpecificTodoItemData = {
    id: specificTodoItemData.id,
    todo: specificTodoItemData.todo,
    priority: specificTodoItemData.priority,
    status: specificTodoItemData.status,
    category: specificTodoItemData.category,
    dueDate: specificTodoItemData.due_date,
  };

  res.send(processedSpecificTodoItemData);
});

/*
    End-Point 3     : GET /agenda
    Query Parameter : date
    -----------------
    To get all todo items with 
    due date matching the value
    in the query parameter: date
*/
app.get("/agenda", async (req, res) => {
  const { date } = req.query;

  const requestedDueDate = new Date(date);
  const requestedDueDateAsString = requestedDueDate.toString();
  if (requestedDueDateAsString === "Invalid Date") {
    res.status(400);
    res.send("Invalid Due Date");
  } else {
    // Valid due date
    const formattedDueDateString = format(requestedDueDate, "yyyy-MM-dd");
    const queryToFetchAgendaForSpecificDueDate = `
        SELECT
            *
        FROM
            todo
        WHERE
            due_date = '${formattedDueDateString}';
        `;

    console.log(queryToFetchAgendaForSpecificDueDate);
    const agendaForRequestedDueDate = await todoAppDBConnectionObj.all(
      queryToFetchAgendaForSpecificDueDate
    );
    res.send(agendaForRequestedDueDate);
  }
});

/*
    End-Point 4: POST /todos
    ------------
    To add new todo item
    to the todo table
*/
app.post("/todos", async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const queryToAddNewTodoItem = `
        INSERT INTO
            todo (id, todo, priority, status, category, due_date)
        VALUES
            (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');
    `;

  const addNewTodoItemDBResponse = await todoAppDBConnectionObj.run(
    queryToAddNewTodoItem
  );
  res.send("Todo Successfully Added");
});

/*
    Function Name         : generateSetColumnsPartOfUpdateAndSuccessMsg
    Input Parameters      :
      - dataForTodoUpdate : Data in request body for todo item update
    Return Value          : Object with SET column values part of
                            update sql, as a string and update success
                            message
    -------------------------------------------------------------------
    Description: To generate the SET part of sql query
                 to update specific todo item, as a string
                 and also the update success message based
                 on the column being updated.
*/
const generateSetColumnsPartOfUpdateAndSuccessMsg = (dataForTodoUpdate) => {
  const { todo, priority, status, category, dueDate } = dataForTodoUpdate;

  const arrOfSetColumnValuesStringPartsForUpdateSql = [];
  let updateSuccessMessage = "";

  if (todo !== undefined) {
    arrOfSetColumnValuesStringPartsForUpdateSql.push(`todo = '${todo}'`);
    updateSuccessMessage = "Todo Updated";
  }

  if (priority !== undefined) {
    arrOfSetColumnValuesStringPartsForUpdateSql.push(
      `priority = '${priority}'`
    );
    updateSuccessMessage = "Priority Updated";
  }

  if (status !== undefined) {
    arrOfSetColumnValuesStringPartsForUpdateSql.push(`status = '${status}'`);
    updateSuccessMessage = "Status Updated";
  }

  if (category !== undefined) {
    arrOfSetColumnValuesStringPartsForUpdateSql.push(
      `category = '${category}'`
    );
    updateSuccessMessage = "Category Updated";
  }

  if (dueDate !== undefined) {
    arrOfSetColumnValuesStringPartsForUpdateSql.push(`due_date = '${dueDate}'`);
    updateSuccessMessage = "Due Date Updated";
  }

  const setColumnValuesString = arrOfSetColumnValuesStringPartsForUpdateSql.join(
    ","
  );

  return {
    setColumnsValuesStringForUpdateSql: setColumnValuesString,
    todoItemUpdateSuccessMessage: updateSuccessMessage,
  };
};

/*
    End-Point 5: PUT /todos/:todoId
    ------------
    To update specific todo item
    with id: todoId
*/
app.put("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const setSqlStringAndSuccessMsg = generateSetColumnsPartOfUpdateAndSuccessMsg(
    req.body
  );

  const queryToUpdateSpecificTodoItem = `
    UPDATE 
        todo
    SET
        ${setSqlStringAndSuccessMsg.setColumnsValuesStringForUpdateSql}
    WHERE
        id = ${todoId};
    `;

  console.log(queryToUpdateSpecificTodoItem);

  await todoAppDBConnectionObj.run(queryToUpdateSpecificTodoItem);
  res.send(setSqlStringAndSuccessMsg.todoItemUpdateSuccessMessage);
});

module.exports = app;
