import {resolve} from 'node:path'
import {config} from 'dotenv'
config({path : resolve("./config/.env.development")})


import express  from 'express';
import type { Response ,   Request ,   Express} from 'express';
import connectDB from './DB/connection.db';
import cors from 'cors';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';

import authController from './modules/auth/auth.controller' 
import { globalErrorHandling } from './utils/response/error.response';
import userController from './modules/user/user.controller';


const bootstrap = async():Promise<void> => {

  const app :Express = express()
  const port:number | string = process.env.PORT ||5000
  await connectDB()
  
  const limiter =rateLimit({
    windowMs: 60 *60000,
    limit:2000,
    message:{error: "Too many request please try again later"},
    statusCode:429,
  });

  app.use(cors() ,limiter ,helmet() ,express.json())


  //app-routing
  app.get("/" , (req: Request , res :Response)=>{
    res.json({message:`welcome to ${process.env.APPLICATION_NAME} landing page`})
  })

  //sub-app-routing-modules
  app.use("/auth" , authController)
  app.use("/user" , userController)

  //In-valid routing
    app.use("{/*dummy}" , (req: Request , res :Response)=>{
    res.status(404).json({message:"In-valid routing"})
  })

  // global-error-handling
  app.use(globalErrorHandling)

  app.listen(3000 , () =>{
    console.log(`Server is running :::${port} 🚀 `);
    
  })
}


export default bootstrap