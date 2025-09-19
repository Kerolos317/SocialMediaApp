"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.postAvailability = void 0;
const success_response_1 = require("../../utils/response/success.response");
const repository_1 = require("../../DB/repository");
const PostModel = __importStar(require("../../DB/models/Post.model"));
const User_model_1 = require("../../DB/models/User.model");
const error_response_1 = require("../../utils/response/error.response");
const s3_config_1 = require("../../utils/multer/s3.config");
const uuid_1 = require("uuid");
const mongoose_1 = require("mongoose");
const Post_model_1 = require("../../DB/models/Post.model");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const postAvailability = (req) => {
    return [
        { availability: Post_model_1.AvailabilityEnum.public },
        {
            availability: Post_model_1.AvailabilityEnum.onlyMe,
            createdBy: req.user?._id,
        },
        {
            availability: Post_model_1.AvailabilityEnum.friends,
            createdBy: {
                $in: [...(req.user?.friends || []), req.user?._id],
            },
        },
        {
            availability: { $ne: Post_model_1.AvailabilityEnum.onlyMe },
            tags: { $in: req.user?._id },
        },
    ];
};
exports.postAvailability = postAvailability;
class PostService {
    postModel = new repository_1.PostRepository(PostModel.PostModel);
    userModel = new repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    updatePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id,
            },
        });
        if (!post) {
            throw new error_response_1.NotFoundException("post not found");
        }
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: { _id: { $in: req.body.tags } },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some mentioned users are not exist");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${req.user?._id}/post/${post.assetsFolderId}`,
            });
        }
        const updatedPost = await this.postModel.updateOne({
            filter: { _id: postId },
            update: [
                {
                    $set: {
                        content: req.body.content,
                        allowComments: req.body.allowComments || post.allowComments,
                        availability: req.body.availability || post.availability,
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
                                        (req.body.removedTags || []).map((tag) => {
                                            return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                        }),
                                    ],
                                },
                                (req.body.tags || []).map((tag) => {
                                    return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                }),
                            ],
                        },
                    },
                },
            ],
        });
        if (!updatedPost.matchedCount) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("fail to generate this post ");
        }
        else {
            if (req.body.removedAttachments) {
                await (0, s3_config_1.deleteFiles)({ urls: req.body.removedAttachments });
            }
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    createPost = async (req, res) => {
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: { _id: { $in: req.body.tags } },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some mentioned users are not exist");
        }
        let attachments = [];
        let assetsFolderId = (0, uuid_1.v4)();
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `users/${req.user?._id}/post/${assetsFolderId}`,
            });
        }
        const [post] = (await this.postModel.create({
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
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("post not created");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    likePost = async (req, res) => {
        const { postId } = req.params;
        const { action } = req.query;
        let updateData = {};
        if (action === Post_model_1.LikeActionEnum.like) {
            updateData = {
                $addToSet: {
                    likes: req.user?._id,
                },
            };
        }
        else {
            updateData = {
                $pull: {
                    likes: req.user?._id,
                },
            };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, exports.postAvailability)(req),
            },
            update: updateData,
        });
        if (!post) {
            throw new error_response_1.NotFoundException("invalid post id or post not exist");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    postList = async (req, res) => {
        let { page, size } = req.query;
        const posts = await this.postModel.paginate({
            filter: {
                $or: (0, exports.postAvailability)(req),
            },
            page,
            size,
        });
        return (0, success_response_1.successResponse)({ res, data: { posts } });
    };
}
exports.default = new PostService();
