// index.js
const router = require('./routes/page_router');
const user_router = require('./routes/user_router');
const game_router = require('./routes/game_router');

const express = require('express');
const app = express();
app.use(express.json());
app.use('/', router);
app.use('/user', user_router);
app.use('/game', game_router);

const port = 3000;

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
