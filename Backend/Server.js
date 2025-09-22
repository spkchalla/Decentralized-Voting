import express from "express"
import cors from "cors"

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/',(req,res)=>{
    res.send('Workingu');
});

app.listen(PORT,() =>{
    console.log(`Server started at ${PORT}`)
})
