import { string, z } from "zod";
import {
    AllowCommentsEnum,
    AvailabilityEnum,
    LikeActionEnum,
} from "../../DB/models/Post.model";
import { generalFields } from "../../middleware/validation.middleware";
import { fileValidation } from "../../utils/multer/cloud.multer";

export const updatePost = {
    params: z.strictObject({
        postId: generalFields.id,
    }),
    body: z
        .strictObject({
            content: z.string().min(2).max(500000),
            attachments: z
                .array(generalFields.file(fileValidation.image))
                .max(2)
                .optional(),
            removedAttachments: z
                .array(z.string())
                .max(2)
                .optional(),
            availability: z.enum(AvailabilityEnum).optional(),
            allowComments: z.enum(AllowCommentsEnum).optional(),

            tags: z.array(generalFields.id).max(10).optional(),
            removedTags: z.array(generalFields.id).max(10).optional(),
        })
        .superRefine((data, ctx) => {
            if (!Object.values(data)) {
                ctx.addIssue({
                    code: "custom",
                    message: "all field are empty",
                });
            }
            if (
                data.tags?.length &&
                data.tags.length !== [...new Set(data.tags)].length
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicate tags are not allowed",
                });
            }
            if (
                data.removedTags?.length &&
                data.removedTags.length !== [...new Set(data.removedTags)].length
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["removedTags"],
                    message: "Duplicate removed-Tags are not allowed",
                });
            }
        }),
};

export const createPost = {
    body: z
        .strictObject({
            content: z.string().min(2).max(500000).optional(),
            attachments: z
                .array(generalFields.file(fileValidation.image))
                .max(2)
                .optional(),

            availability: z
                .enum(AvailabilityEnum)
                .default(AvailabilityEnum.public),
            allowComments: z
                .enum(AllowCommentsEnum)
                .default(AllowCommentsEnum.allow),

            tags: z.array(generalFields.id).max(10).optional(),
        })
        .superRefine((data, ctx) => {
            if (data.content?.length && data.attachments?.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["content"],
                    message:
                        "sorry we cannot make post without content or attachments",
                });
            }
            if (
                data.tags?.length &&
                data.tags.length !== [...new Set(data.tags)].length
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicate tags are not allowed",
                });
            }
        }),
};

export const likePost = {
    params: updatePost.params,

    query: z.strictObject({
        action: z.enum(LikeActionEnum).default(LikeActionEnum.like),
    }),
};
