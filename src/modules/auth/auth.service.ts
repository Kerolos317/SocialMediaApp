import type {Request ,Response} from 'express';
import type { ISignupBodyInputDTO } from './auth.dto';
import { UserModel } from '../../DB/models/User.model';
import { ApplicationException, NotFoundException } from '../../utils/response/error.response';
import { customAlphabet } from "nanoid";
import { emailEvent } from '../../utils/events/email.event';





class AuthenticationService {
  constructor(){

  }


  signup = async(req:Request , res:Response):Promise<Response> =>{

    const {username , email , password}:ISignupBodyInputDTO = req.body

    if (await UserModel.findOne({email:email})) {
        throw new ApplicationException("Email already Exist" , 409)
    }

    const otp:string = customAlphabet(`0123456789`, 6)();
    const confirmEmailOtp = otp


    const user = await UserModel.create({
      username,
      email,
      password,
      confirmEmailOtp
    });


    emailEvent.emit("confirmEmail", { to: email, otp: otp });

    return res.status(201).json({message:"Done" , data:user})
}


  confirmEmail = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp } = req.body;

    const user = await UserModel.findOne({
      email,
      confirmEmail: { $exists: false },
      confirmEmailOtp: { $exists: true },
    });

    if (!user) {
      throw new NotFoundException("Invalid account or already verified");
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      {
        email: email,
        confirmEmail: { $in: [null, undefined] },
        confirmEmailOtp: otp,
      },
      {
        $set: { confirmEmail: new Date() },
        $unset: { confirmEmailOtp: 1 },
        $inc: { __v: 1 },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApplicationException("Invalid or expired OTP", 400);
    }

    return res.status(200).json({ message: "Email confirmed successfully" });
  };



  login = async(req:Request , res:Response):Promise<Response> =>{

    const {email , password}:ISignupBodyInputDTO = req.body

    const user = await UserModel.findOne({email:email , password:password})
    if (!user) {
        throw new NotFoundException("User not found")
    }

    if (!user.confirmEmail) {
        throw new ApplicationException("Please verify your account",400)
    }

    return res.status(201).json({message:"Done" , data:user})
  }

}

export default new AuthenticationService()