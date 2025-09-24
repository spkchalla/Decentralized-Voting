import express from "express"
import cors from "cors"
import connectDB from "./Database/config.js";
import AdminRoute from "./Route/Admin_Routes.js";
import userRoute from "./Route/User_Routes.js";
import LoginRouter from "./Route/Login_Routes.js";
import PartyRouter from "./Route/Party_Routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

app.get('/',(req,res)=>{
    res.send('Workingu');
});

app.use(
    '/admin', AdminRoute
);

app.use(
    '/user', userRoute
);

app.use(
    '/login', LoginRouter
);

app.use(
    '/admin', AdminRoute
)

app.use(
    '/party', PartyRouter
)

app.listen(PORT,() =>{
    console.log(`Server started at ${PORT}`)
})
