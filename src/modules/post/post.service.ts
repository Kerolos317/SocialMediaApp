import { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { PostRepository, UserRepository } from "../../DB/repository";
import { PostModel } from "../../DB/models/Post.model";
import { UserModel } from "../../DB/models/User.model";




class PostService {
  private postModel = new PostRepository(PostModel);
  private userModel = new UserRepository(UserModel);

  constructor(){}


  createPost = async (req:Request , res:Response):Promise<Response> => {
    return successResponse({res , statusCode:201})
  }
}

export default new PostService()