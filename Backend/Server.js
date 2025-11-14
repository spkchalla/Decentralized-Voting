import express from "express"
import cors from "cors"
import connectDB from "./Database/config.js";
import AdminRoute from "./Route/Admin_Routes.js";
import userRoute from "./Route/User_Routes.js";
import LoginRouter from "./Route/Login_Routes.js";
import PartyRouter from "./Route/Party_Routes.js";
import CandidateRouter from "./Route/Candidate_Routes.js";
import ApprovalRouter from "./Route/Approval_Route.js";
import electionRouter from "./Route/Election_Routes.js";
import ipfsRouter from "./Route/Ipfs_Routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: "http://localhost:5173",  // allow only your frontend
    credentials: true,                // allow cookies / auth headers
}));
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

app.use(
    '/candidate', CandidateRouter
)

app.use(
    '/approval', ApprovalRouter
)

app.use(
    '/election', electionRouter
)

app.use('/ipfs', ipfsRouter);

app.listen(PORT,() =>{
    console.log(`Server started at ${PORT}`)
})
