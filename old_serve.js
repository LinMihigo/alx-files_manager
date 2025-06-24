// server.js
import express from 'express';
import routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 5000;

// Enables passing JSON bodies into post request
app.use(express.json());

// Loads all the API routes
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
