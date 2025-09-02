import {z} from 'zod'
import * as validators from './auth.validation'




// export interface ISignupBodyInputDTO{username:string , email:string , password:string}

export type ISignupBodyInputDTO = z.infer<typeof validators.signup.body>
export type ILoginBodyInputDTO = z.infer<typeof validators.login.body>
export type IForgotCodeBodyInputDTO = z.infer<typeof validators.sendForgotPasswordCode.body>
export type IVerifyForgotCodeBodyInputDTO = z.infer<typeof validators.verifyForgotPassword.body>
export type IResetForgotCodeBodyInputDTO = z.infer<typeof validators.resetForgotPassword.body>
export type IConfirmEmailBodyInputDTO = z.infer<typeof validators.confirmEmail.body>
export type IGmail = z.infer<typeof validators.signupWithGmail.body>