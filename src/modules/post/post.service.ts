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
import { Types, UpdateQuery } from "mongoose";
import { AvailabilityEnum, LikeActionEnum } from "../../DB/models/Post.model";
import { StorageEnum } from "../../utils/multer/cloud.multer";

export const postAvailability = (req: Request) => {
    return [
        { availability: AvailabilityEnum.public },
        {
            availability: AvailabilityEnum.onlyMe,
            createdBy: req.user?._id,
        },
        {
            availability: AvailabilityEnum.friends,
            createdBy: {
                $in: [...(req.user?.friends || []), req.user?._id],
            },
        },
        {
            availability: { $ne: AvailabilityEnum.onlyMe },
            tags: { $in: req.user?._id },
        },
    ];
};

class PostService {
    private postModel = new PostRepository(PostModel.PostModel);
    private userModel = new UserRepository(UserModel);

    constructor() {}

    updatePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id,
            },
        });
        if (!post) {
            throw new NotFoundException("post not found");
        }

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
        if (req.files?.length) {
            attachments = await uploadFiles({
                storageApproach: StorageEnum.memory,
                files: req.files as Express.Multer.File[],
                path: `users/${req.user?._id}/post/${post.assetsFolderId}`,
            });
        }

        const updatedPost = await this.postModel.updateOne({
            filter: { _id: postId },
            update: [
                {
                    $set: {
                        content: req.body.content,
                        allowComments:
                            req.body.allowComments || post.allowComments,
                        availability:
                            req.body.availability || post.availability,
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$attachments",
                                        req.body.removedAttachments || [],
                                    ],
                                },
                                attachments,
                            ],
                        },

                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$tags",
                                        (req.body.removedTags || []).map(
                                            (tag: string) => {
                                                return Types.ObjectId.createFromHexString(
                                                    tag
                                                );
                                            }
                                        ),
                                    ],
                                },
                                (req.body.tags || []).map((tag: string) => {
                                    return Types.ObjectId.createFromHexString(
                                        tag
                                    );
                                }),
                            ],
                        },
                    },
                },
            ],
        });

        if (!updatedPost.matchedCount) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments });
            }
            throw new BadRequestException("fail to generate this post ");
        } else {
            if (req.body.removedAttachments) {
                await deleteFiles({ urls: req.body.removedAttachments });
            }
        }

        return successResponse({ res, statusCode: 201 });
    };

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

    likePost = async ( req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as { postId: string };
        const { action } = req.query as LikePostQueryInputDto;
        let updateData: UpdateQuery<PostModel.HPostDocument> = {};
        if (action === LikeActionEnum.like) {
            updateData = {
                $addToSet: {
                    likes: req.user?._id,
                },
            };
        } else {
            updateData = {
                $pull: {
                    likes: req.user?._id,
                },
            };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: postAvailability(req),
            },
            update: updateData,
        });
        if (!post) {
            throw new NotFoundException("invalid post id or post not exist");
        }
        return successResponse({ res });
    };

    postList = async (req: Request, res: Response): Promise<Response> => {
        let { page, size } = req.query as unknown as {
            page: number;
            size: number;
        };
        const posts = await this.postModel.paginate({
            filter: {
                $or: postAvailability(req),
            },
            page,
            size,
        });
        return successResponse({ res, data: { posts } });
    };
}

export default new PostService();
