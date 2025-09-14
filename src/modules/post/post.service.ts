import { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";




class PostService {
  constructor(){}


  createPost = async (req:Request , res:Response):Promise<Response> => {
    return successResponse({res , statusCode:201})
  }
}

export default new PostService()