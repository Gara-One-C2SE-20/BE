require("dotenv").config();

process.env.TZ = 'Asia/Bangkok';

const app = require("./app.js");
const { connectDB } = require("./config/db.js");

const PORT = process.env.PORT || 3000;

(async () => {
    await connectDB();
    app.listen(PORT, () =>
        console.log(`Server running on port ${PORT}`)
    );
})();
