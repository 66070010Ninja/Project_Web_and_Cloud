const router = require('./routes/Routes');

const app = express();
app.use(express.json());
app.use('/api', router);
const PORT = 3000;

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
