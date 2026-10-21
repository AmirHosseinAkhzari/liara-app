const app = require('express')(); const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL);
app.listen(process.env.PORT || 4000);
