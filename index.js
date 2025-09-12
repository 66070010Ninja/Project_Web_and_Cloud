// index.js
const router = require('./routes/page_router');

const express = require('express');
const app = express();
app.use(express.json());
app.use('/page', router);

const port = 3000;

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
