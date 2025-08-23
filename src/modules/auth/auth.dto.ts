import {z} from 'zod'
import * as validators from './auth.validation'




// export interface ISignupBodyInputDTO{username:string , email:string , password:string}

export type ISignupBodyInputDTO = z.infer<typeof validators.signup.body>