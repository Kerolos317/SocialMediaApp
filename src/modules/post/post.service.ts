import { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { PostRepository, UserRepository } from "../../DB/repository";
import * as PostModel from "../../DB/models/Post.model";
import { UserModel } from "../../DB/models/User.model";
import {
    BadRequestException,
    NotFoundException,
} from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { v4 as uuid } from "uuid";
import { LikePostQueryInputDto } from "./post.dto";
import { UpdateQuery } from "mongoose";
import { LikeActionEnum } from "../../DB/models/Post.model";

class PostService {
    private postModel = new PostRepository(PostModel.PostModel);
    private userModel = new UserRepository(UserModel);

    constructor() {}

    createPost = async (req: Request, res: Response): Promise<Response> => {
        if (
            req.body.tags?.length &&
            (
                await this.userModel.find({
                    filter: { _id: { $in: req.body.tags } },
                })
            ).length !== req.body.tags.length
        ) {
            throw new NotFoundException("some mentioned users are not exist");
        }

        let attachments: string[] = [];
        let assetsFolderId: string = uuid();
        if (req.files?.length) {
            attachments = await uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${req.user?._id}/post/${assetsFolderId}`,
            });
        }
        const [post] =
            (await this.postModel.create({
                data: [
                    {
                        ...req.body,
                        attachments,
                        assetsFolderId,
                        createdBy: req.user?._id,
                    },
                ],
            })) || [];
        if (!post) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments });
            }
            throw new BadRequestException("post not created");
        }

        return successResponse({ res, statusCode: 201 });
    };

    likePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as { postId: string };
        const {action} = req.query as LikePostQueryInputDto
        let updateData:UpdateQuery<PostModel.HPostDocument> = {}
        if (action === LikeActionEnum.like) {
          updateData = {
            $addToSet:{
              likes:req.user?._id
            }
          }
        }else{
          updateData = {
            $pull:{
              likes:req.user?._id
            }
          }
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: { _id: postId },
            update:updateData
        });
        if (!post) {
          throw new NotFoundException("invalid post id or post not exist")
        }
        return successResponse({ res });
    };
}

export default new PostService();
