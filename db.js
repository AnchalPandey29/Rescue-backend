const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DB = process.env.DB;

const connectDB= async ()=>{
    try{
        await mongoose.connect(DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log("Database connected successfully");
    }
    catch(error)
    {
        console.error('Error connecting to database' , error.message);
    }
};

module.exports = connectDB;

